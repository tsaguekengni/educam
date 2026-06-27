"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import Dashboard from "./dashboard";

export default function Home() {
  const [session, setSession] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [mode, setMode] = useState("login"); // login or register
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [level, setLevel] = useState("cm1");

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
      .single();

    setSession(data.session);
    setTeacher(teacherData);
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

    // Create teacher profile
    const { error: profileError } = await supabase.from("teachers").insert({
      id: data.user.id,
      full_name: fullName.trim(),
      school_name: schoolName.trim() || null,
      level: level,
    });

    if (profileError) {
      setError("Erreur lors de la création du profil");
      setLoading(false);
      return;
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

      setSession(loginData.session);
      setTeacher(teacherData);
    }

    setLoading(false);
  };

  if (session && teacher) {
    return <Dashboard teacher={teacher} />;
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