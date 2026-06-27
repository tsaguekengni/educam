"use client";
import { useState } from "react";
import { supabase } from "../lib/supabase";
import Dashboard from "./dashboard";

export default function Home() {
  const [session, setSession] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    // Fetch teacher profile
    const { data: teacherData } = await supabase
      .from("teachers")
      .select("*")
      .eq("id", data.user.id)
      .single();

    setSession(data.session);
    setTeacher(teacherData);
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
        maxWidth: 400,
        background: "white",
        borderRadius: 16,
        padding: "2.5rem 2rem",
        boxShadow: "0 25px 50px rgba(0,0,0,0.3)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#0F4C35", margin: 0, letterSpacing: -1 }}>
            EduCam
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>
            Plateforme éducative du Cameroun
          </p>
        </div>

        {error && (
          <div style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 13,
            color: "#DC2626"
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Adresse email
          </label>
          <input
            type="email"
            placeholder="enseignant@ecole.cm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1.5px solid #D1D5DB",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Mot de passe
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1.5px solid #D1D5DB",
              borderRadius: 8,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: loading ? "#6B7280" : "#0F4C35",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? "default" : "pointer"
          }}
        >
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF", marginTop: 16 }}>
          Compte test: test@educam.cm / educam123
        </p>
      </div>
    </div>
  );
}