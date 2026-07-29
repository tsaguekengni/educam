"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Dashboard from "./dashboard";
import { OFFLINE_ENABLED, PROFILES_ENABLED } from "../lib/flags";
import { setGrant, getGrant, clearGrant } from "../lib/offline";

export default function Home() {
  const [session, setSession] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [parent, setParent] = useState(null); // parent profile (profiles mode)
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
  const [parentCode, setParentCode] = useState(""); // class passcode (parent signup)

  // Session restore (offline mode only). When the flag is off this never runs,
  // so behaviour is unchanged: the login form shows as before.
  useEffect(() => {
    if (!OFFLINE_ENABLED) return;
    let cancelled = false;
    (async () => {
      try {
        const online = typeof navigator === "undefined" ? true : navigator.onLine;
        if (online) {
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

    // Profiles mode: PARENT signup via the class passcode. No child data collected.
    if (PROFILES_ENABLED && accountType === "parent") {
      if (!parentCode.trim()) {
        setError("Entrez le code parents fourni par l'enseignant");
        setLoading(false);
        return;
      }
      const { data: t } = await supabase.from("teachers").select("id")
        .eq("parent_passcode", parentCode.trim()).maybeSingle();
      if (!t) {
        setError("Code parents invalide");
        setLoading(false);
        return;
      }
      const { data: pData, error: pSignUp } = await supabase.auth.signUp({ email, password });
      if (pSignUp) {
        setError(pSignUp.message === "User already registered"
          ? "Un compte existe déjà avec cet email"
          : "Erreur lors de l'inscription: " + pSignUp.message);
        setLoading(false);
        return;
      }
      const { error: pErr } = await supabase.from("parents").insert({
        id: pData.user.id, full_name: fullName.trim(), linked_teacher_id: t.id,
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
      const { data: sch } = await supabase.from("schools").select("id, name")
        .eq("staff_code", schoolCode.trim()).maybeSingle();
      if (!sch) {
        setError("Code école invalide");
        setLoading(false);
        return;
      }
      joinedSchool = sch;
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

  // Brief boot screen while restoring a session (offline mode only).
  if (OFFLINE_ENABLED && booting) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0F4C35 0%, #1A7A56 50%, #0F4C35 100%)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "white"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
          <p style={{ fontSize: 14, opacity: 0.85 }}>Chargement…</p>
        </div>
      </div>
    );
  }

  if (session && teacher) {
    return <Dashboard teacher={teacher} onLogout={() => { clearGrant(); setSession(null); setTeacher(null); }} />;
  }

  if (session && parent) {
    return <Dashboard parent={parent} onLogout={() => { clearGrant(); setSession(null); setParent(null); }} />;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0F4C35 0%, #1A7A56 50%, #0F4C35 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}>
      <div style={{
        width: "100%",
        maxWidth: 420,
        background: "white",
        borderRadius: 16,
        padding: "2.5rem 2rem",
        boxShadow: "0 25px 50px rgba(0,0,0,0.3)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0F4C35", margin: 0, letterSpacing: -1 }}>
            EduCam
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>
            Plateforme éducative du Cameroun
          </p>
        </div>

        {/* Toggle between login and register */}
        <div style={{
          display: "flex", background: "#F3F4F6", borderRadius: 8,
          padding: 4, marginBottom: 20
        }}>
          <button
            onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: 6,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              background: mode === "login" ? "white" : "transparent",
              color: mode === "login" ? "#0F4C35" : "#6B7280",
              boxShadow: mode === "login" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}
          >
            Se connecter
          </button>
          <button
            onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
            style={{
              flex: 1, padding: "10px", border: "none", borderRadius: 6,
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              background: mode === "register" ? "white" : "transparent",
              color: mode === "register" ? "#0F4C35" : "#6B7280",
              boxShadow: mode === "register" ? "0 1px 3px rgba(0,0,0,0.1)" : "none"
            }}
          >
            S'inscrire
          </button>
        </div>

        {error && (
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8,
            padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#DC2626"
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8,
            padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#16A34A"
          }}>
            {success}
          </div>
        )}

        {/* Registration-only fields */}
        {mode === "register" && (
          <>
            {PROFILES_ENABLED && (
              <div style={{ display: "flex", background: "#F3F4F6", borderRadius: 8, padding: 4, marginBottom: 16 }}>
                <button type="button" onClick={() => { setAccountType("teacher"); setError(""); }}
                  style={{ flex: 1, padding: "8px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: accountType === "teacher" ? "white" : "transparent",
                    color: accountType === "teacher" ? "#0F4C35" : "#6B7280",
                    boxShadow: accountType === "teacher" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Enseignant</button>
                <button type="button" onClick={() => { setAccountType("parent"); setError(""); }}
                  style={{ flex: 1, padding: "8px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: accountType === "parent" ? "white" : "transparent",
                    color: accountType === "parent" ? "#0F4C35" : "#6B7280",
                    boxShadow: accountType === "parent" ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>Parent</button>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Nom complet *
              </label>
              <input
                type="text"
                placeholder="Ex: Jean-Pierre Nguema"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", border: "1.5px solid #D1D5DB",
                  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box"
                }}
              />
            </div>

            {(!PROFILES_ENABLED || accountType === "teacher") && (
              <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Nom de l'école
              </label>
              <input
                type="text"
                placeholder="Ex: École Primaire de Bastos"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", border: "1.5px solid #D1D5DB",
                  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                Niveau enseigné
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                style={{
                  width: "100%", padding: "12px 14px", border: "1.5px solid #D1D5DB",
                  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
                  background: "white", cursor: "pointer"
                }}
              >
                <option value="ce1">CE1 — Primary 3</option>
                <option value="ce2">CE2 — Primary 4</option>
                <option value="cm1">CM1 — Primary 5</option>
                <option value="cm2">CM2 — Primary 6</option>
              </select>
            </div>

            {PROFILES_ENABLED && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  Code école
                </label>
                <input
                  type="text"
                  placeholder="Code fourni par votre école"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  style={{
                    width: "100%", padding: "12px 14px", border: "1.5px solid #D1D5DB",
                    borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>
            )}
              </>
            )}

            {PROFILES_ENABLED && accountType === "parent" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  Code parents *
                </label>
                <input
                  type="text"
                  placeholder="Code fourni par l'enseignant de votre enfant"
                  value={parentCode}
                  onChange={(e) => setParentCode(e.target.value.toUpperCase())}
                  style={{
                    width: "100%", padding: "12px 14px", border: "1.5px solid #D1D5DB",
                    borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Shared fields */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Adresse email *
          </label>
          <input
            type="email"
            placeholder="enseignant@ecole.cm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", border: "1.5px solid #D1D5DB",
              borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Mot de passe *
          </label>
          <input
            type="password"
            placeholder={mode === "register" ? "Minimum 6 caractères" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                mode === "login" ? handleLogin() : handleRegister();
              }
            }}
            style={{
              width: "100%", padding: "12px 14px", border: "1.5px solid #D1D5DB",
              borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box"
            }}
          />
        </div>

        <button
          onClick={mode === "login" ? handleLogin : handleRegister}
          disabled={loading}
          style={{
            width: "100%", padding: "14px",
            background: loading ? "#6B7280" : "#0F4C35",
            color: "white", border: "none", borderRadius: 8,
            fontSize: 16, fontWeight: 700,
            cursor: loading ? "default" : "pointer"
          }}
        >
          {loading
            ? (mode === "login" ? "Connexion..." : "Inscription...")
            : (mode === "login" ? "Se connecter" : "Créer mon compte")
          }
        </button>
      </div>
    </div>
  );
}
