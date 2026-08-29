"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Dashboard from "./dashboard";
import { OFFLINE_ENABLED, PROFILES_ENABLED } from "../lib/flags";
import { setGrant, getGrant, clearGrant } from "../lib/offline";
import { COLORS, FONT } from "../lib/theme";
import { Button, Callout } from "../components/ui";
import { Field, PasswordField, SelectField, ChoiceGroup } from "../components/forms";

export default function Home() {
  const [session, setSession] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [parent, setParent] = useState(null); // parent profile (profiles mode)
  const [impersonation, setImpersonation] = useState(null); // admin "act as": { role:'teacher'|'parent', profile, name }
  const [mode, setMode] = useState("login"); // login or register
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Only used when offline mode is on: brief boot while we try to restore a session.
  const [booting, setBooting] = useState(OFFLINE_ENABLED);

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [level, setLevel] = useState("cm1");
  const [schoolCode, setSchoolCode] = useState(""); // staff join-code (profiles mode)
  const [accountType, setAccountType] = useState("teacher"); // teacher | parent (profiles mode)
  const [parentCode, setParentCode] = useState(""); // per-child access code (parent signup)

  // Le formulaire sait maintenant si l'appareil est hors ligne, pour ne plus
  // afficher « email ou mot de passe incorrect » quand c'est le réseau qui manque.
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Session restore (offline mode only). When the flag is off this never runs,
  // so behaviour is unchanged: the login form shows as before.
  useEffect(() => {
    if (!OFFLINE_ENABLED) return;
    let cancelled = false;
    (async () => {
      try {
        const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
        if (isOnline) {
          const { data } = await supabase.auth.getSession();
          const s = data?.session;
          if (s) {
            const { data: t } = await supabase.from("teachers").select("*").eq("id", s.user.id).maybeSingle();
            if (t && !cancelled) {
              setGrant(t);
              setSession(s);
              setTeacher(t);
              setBooting(false);
              return;
            }
            // Parent profile?
            const { data: p } = await supabase.from("parents").select("*").eq("id", s.user.id).maybeSingle();
            if (p && !cancelled) {
              setSession(s);
              setParent(p);
              setBooting(false);
              return;
            }
          }
        }
      } catch (_) { /* fall through to offline grant */ }
      // Offline (or no live session): trust a still-valid 7-day grant.
      const g = getGrant();
      if (g && g.teacher && !cancelled) {
        setSession({ offline: true });
        setTeacher(g.teacher);
      }
      if (!cancelled) setBooting(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    // Hors ligne : dire la vérité plutôt que d'accuser le mot de passe.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError(
        OFFLINE_ENABLED
          ? "Connexion indisponible. Votre accès hors ligne a peut-être expiré : reconnectez-vous une fois le réseau revenu."
          : "Connexion indisponible. Vérifiez votre réseau et réessayez."
      );
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
      return;
    }

    const { data: teacherData } = await supabase
      .from("teachers")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();

    if (teacherData) {
      setGrant(teacherData);
      setSession(data.session);
      setTeacher(teacherData);
      setLoading(false);
      return;
    }

    // Profiles mode: the account may be a parent.
    if (PROFILES_ENABLED) {
      const { data: parentData } = await supabase
        .from("parents").select("*").eq("id", data.user.id).maybeSingle();
      if (parentData) {
        setSession(data.session);
        setParent(parentData);
        setLoading(false);
        return;
      }
    }

    setError("Profil introuvable pour ce compte");
    setLoading(false);
  };

  const handleRegister = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("Inscription impossible hors ligne. Reconnectez-vous au réseau puis réessayez.");
      setLoading(false);
      return;
    }

    if (!fullName.trim()) {
      setError("Veuillez entrer votre nom complet");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setLoading(false);
      return;
    }

    // Profiles mode: PARENT signup via their CHILD's individual code. Links the
    // parent to ONE student (no parent name required).
    if (PROFILES_ENABLED && accountType === "parent") {
      if (!parentCode.trim()) {
        setError("Entrez le code de votre enfant");
        setLoading(false);
        return;
      }
      // Validate the per-child code. Under RLS a new user can't read `students`
      // directly, so we use a SECURITY DEFINER function; if it isn't there yet
      // (RLS not enabled / earlier phase), fall back to the direct lookup.
      let linkedStudentId = null;
      const rpcS = await supabase.rpc("educam_find_student_by_code", { code: parentCode.trim() });
      if (rpcS.error) {
        const { data: st } = await supabase.from("students").select("id")
          .eq("access_code", parentCode.trim()).maybeSingle();
        linkedStudentId = st?.id || null;
      } else {
        linkedStudentId = rpcS.data?.id || null;
      }
      if (!linkedStudentId) {
        setError("Code invalide");
        setLoading(false);
        return;
      }
      const { data: pData, error: pSignUp } = await supabase.auth.signUp({
        email, password,
        options: { data: { display_name: fullName.trim() || null, full_name: fullName.trim() || null } },
      });
      if (pSignUp) {
        setError(pSignUp.message === "User already registered"
          ? "Un compte existe déjà avec cet email"
          : "Erreur lors de l'inscription: " + pSignUp.message);
        setLoading(false);
        return;
      }
      const { error: pErr } = await supabase.from("parents").insert({
        id: pData.user.id, full_name: fullName.trim() || null, student_id: linkedStudentId,
      });
      if (pErr) {
        setError("Erreur lors de la création du profil");
        setLoading(false);
        return;
      }
      const { data: loginData } = await supabase.auth.signInWithPassword({ email, password });
      if (loginData?.session) {
        const { data: parentData } = await supabase.from("parents").select("*")
          .eq("id", loginData.user.id).maybeSingle();
        setSession(loginData.session);
        setParent(parentData);
      }
      setLoading(false);
      return;
    }

    // Create auth account
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: fullName.trim(), full_name: fullName.trim() } },
    });

    if (signUpError) {
      setError(signUpError.message === "User already registered"
        ? "Un compte existe déjà avec cet email"
        : "Erreur lors de l'inscription: " + signUpError.message);
      setLoading(false);
      return;
    }

    // Profiles mode: resolve the school from the staff join-code (validated if entered).
    let joinedSchool = null;
    if (PROFILES_ENABLED && schoolCode.trim()) {
      // Same pattern as the parent passcode: SECURITY DEFINER lookup under RLS,
      // with a fallback to the direct read when RLS isn't enabled yet.
      const rpcS = await supabase.rpc("educam_find_school_by_staff_code", { code: schoolCode.trim() });
      if (rpcS.error) {
        const { data: sch } = await supabase.from("schools").select("id, name")
          .eq("staff_code", schoolCode.trim()).maybeSingle();
        joinedSchool = sch || null;
      } else {
        joinedSchool = rpcS.data || null;
      }
      if (!joinedSchool) {
        setError("Code école invalide");
        setLoading(false);
        return;
      }
    }

    // Create teacher profile
    const { error: profileError } = await supabase.from("teachers").insert({
      id: data.user.id,
      full_name: fullName.trim(),
      school_name: schoolName.trim() || null,
      level: level,
      ...(joinedSchool ? { school_id: joinedSchool.id } : {}),
    });

    if (profileError) {
      setError("Erreur lors de la création du profil");
      setLoading(false);
      return;
    }

    // Provision this class's timetable by copying the standard schedule for their level.
    if (PROFILES_ENABLED && joinedSchool) {
      try {
        const { data: std } = await supabase.from("timetable_slots").select("*")
          .eq("level", level).is("owner_teacher_id", null);
        if (std && std.length) {
          const rows = std.map((s) => ({
            level: s.level, day_of_week: s.day_of_week, slot_order: s.slot_order,
            start_time: s.start_time, end_time: s.end_time,
            subject_id: s.subject_id, component_id: s.component_id,
            subject_name: s.subject_name, component_name: s.component_name,
            school_id: joinedSchool.id, owner_teacher_id: data.user.id,
          }));
          await supabase.from("timetable_slots").insert(rows);
        }
      } catch (_) {}
    }

    // Auto-login after registration
    const { data: loginData } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginData?.session) {
      const { data: teacherData } = await supabase
        .from("teachers")
        .select("*")
        .eq("id", loginData.user.id)
        .single();

      setGrant(teacherData);
      setSession(loginData.session);
      setTeacher(teacherData);
    }

    setLoading(false);
  };

  const submit = (e) => {
    e.preventDefault();
    if (loading) return;
    mode === "login" ? handleLogin() : handleRegister();
  };

  // Brief boot screen while restoring a session (offline mode only).
  if (OFFLINE_ENABLED && booting) {
    return (
      <div style={{
        minHeight: "100vh", background: COLORS.g700,
        display: "flex", alignItems: "center", justifyContent: "center", color: "white",
      }}>
        <div style={{ textAlign: "center" }} role="status" aria-live="polite">
          <div aria-hidden="true" style={{ fontSize: 44, marginBottom: 10 }}>📚</div>
          <p style={{ fontSize: "var(--ec-fs-3)", opacity: 0.85 }}>Chargement…</p>
        </div>
      </div>
    );
  }

  // Admin « Agir en tant que » : render the real dashboard AS the chosen
  // teacher/parent, with a banner + one-click return. The admin's own session
  // is untouched — we only swap which profile the dashboard runs on.
  if (impersonation) {
    const exit = () => setImpersonation(null);
    return impersonation.role === "parent"
      ? <Dashboard parent={impersonation.profile} impersonating impersonationName={impersonation.name} onExitImpersonation={exit} onLogout={exit} />
      : <Dashboard teacher={impersonation.profile} impersonating impersonationName={impersonation.name} onExitImpersonation={exit} onLogout={exit} />;
  }

  if (session && teacher) {
    return <Dashboard teacher={teacher}
      onLogout={() => { clearGrant(); setSession(null); setTeacher(null); }}
      onImpersonate={(role, profile, name) => setImpersonation({ role, profile, name })} />;
  }

  if (session && parent) {
    return <Dashboard parent={parent} onLogout={() => { clearGrant(); setSession(null); setParent(null); }} />;
  }

  const isParentSignup = PROFILES_ENABLED && mode === "register" && accountType === "parent";

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.page,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <main style={{ width: "100%", maxWidth: 440 }}>
        <div className="ec-card" style={{ padding: "26px 22px", borderRadius: 16 }}>

          {/* Bandeau de marque */}
          <div style={{
            background: COLORS.g700, borderRadius: 14,
            display: "grid", placeItems: "center", color: "rgba(255,255,255,.75)",
            fontSize: "var(--ec-fs-2)", textAlign: "center", padding: "24px 16px", marginBottom: 20,
          }}>
            {/* Emplacement de l'illustration à venir */}
            <div>
              <div aria-hidden="true" style={{ fontSize: "var(--ec-fs-7)", marginBottom: 6 }}>📚</div>
              <div style={{ fontSize: "var(--ec-fs-5)", fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>
                EduCam
              </div>
              <div style={{ fontSize: "var(--ec-fs-2)", marginTop: 3 }}>Plateforme éducative du Cameroun</div>
            </div>
          </div>

          <h1 style={{ fontSize: FONT.xl, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.2 }}>
            {mode === "login" ? "Bienvenue sur EduCam" : "Créer votre compte"}
          </h1>
          <p style={{ fontSize: FONT.sm, color: COLORS.ink3, marginTop: 6, lineHeight: 1.5 }}>
            {mode === "login"
              ? "Connectez-vous pour retrouver vos leçons et votre emploi du temps."
              : "Quelques informations, et vous pourrez commencer."}
          </p>

          {!online && (
            <Callout tone="warn" icon="📡" style={{ marginTop: 16 }}>
              Vous êtes hors ligne. La connexion nécessite un réseau.
            </Callout>
          )}

          {error && (
            <Callout tone="crit" icon="⚠" style={{ marginTop: 16 }}>{error}</Callout>
          )}
          {success && (
            <Callout tone="brand" icon="✓" style={{ marginTop: 16 }}>{success}</Callout>
          )}

          <form onSubmit={submit} style={{ marginTop: 18 }}>
            {/* Choix du rôle — d'abord, et non enfoui au milieu du formulaire */}
            {mode === "register" && PROFILES_ENABLED && (
              <ChoiceGroup
                label="Vous êtes"
                value={accountType}
                onChange={(v) => { setAccountType(v); setError(""); }}
                options={[
                  { value: "teacher", label: "Enseignant", description: "Leçons, emploi du temps, résultats", icon: "🧑🏾‍🏫" },
                  { value: "parent", label: "Parent", description: "Suivi de votre enfant", icon: "👨‍👩‍👦" },
                ]}
              />
            )}

            {mode === "register" && (
              <Field
                label="Nom complet"
                required
                placeholder="Ex : Jean-Pierre Nguema"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            )}

            {mode === "register" && !isParentSignup && (
              <>
                <Field
                  label="Nom de l'école"
                  placeholder="Ex : École Primaire de Bastos"
                  autoComplete="organization"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                />
                <SelectField
                  label="Niveau enseigné"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  options={[
                    { value: "ce1", label: "CE1 — Primary 3" },
                    { value: "ce2", label: "CE2 — Primary 4" },
                    { value: "cm1", label: "CM1 — Primary 5" },
                    { value: "cm2", label: "CM2 — Primary 6" },
                  ]}
                />
                {PROFILES_ENABLED && (
                  <Field
                    label="Code école"
                    placeholder="Code fourni par votre école"
                    hint="Il relie votre compte à votre établissement et installe votre emploi du temps."
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                  />
                )}
              </>
            )}

            {isParentSignup && (
              <Field
                label="Code de votre enfant"
                required
                placeholder="Code personnel reçu de l'école"
                hint="Ce code figure sur le document remis par l'enseignant de votre enfant."
                value={parentCode}
                onChange={(e) => setParentCode(e.target.value.toUpperCase())}
              />
            )}

            <Field
              label="Adresse email"
              required
              type="email"
              inputMode="email"
              placeholder="enseignant@ecole.cm"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <PasswordField
              required
              placeholder={mode === "register" ? "Minimum 6 caractères" : "••••••••"}
              hint={mode === "register" ? "Au moins 6 caractères." : undefined}
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" block disabled={loading} style={{ marginTop: 6 }}>
              {loading
                ? (mode === "login" ? "Connexion…" : "Inscription…")
                : (mode === "login" ? "Se connecter" : "Créer mon compte")}
            </Button>
          </form>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: FONT.sm, color: COLORS.ink3 }}>
            {mode === "login" ? "Pas encore de compte ? " : "Vous avez déjà un compte ? "}
            <button
              type="button"
              className="ec-link"
              style={{ minHeight: 36 }}
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
            >
              {mode === "login" ? "S'inscrire" : "Se connecter"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
