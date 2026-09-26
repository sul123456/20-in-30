"use client";
import { useEffect, useMemo, useState } from "react";
import { useTracker } from "@/useTracker";
import { supabase } from "@/supabase";
import { makeLogic } from "@/logic";
import { APP_TITLE, OCTOBER_STAGES } from "@/config";
import Dashboard from "@/Dashboard";
import VideoForm from "@/VideoForm";

function identityFromUser(user) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "";
}

function SignInPrompt({ onSignIn, error, signingIn }) {
  return (
    <div className="form-wrap">
      <div className="card confirm">
        <h2>Sign in to Add / Update</h2>
        <p className="sub">Dashboards are public. A Google sign-in is required only when you add or change tracker data.</p>
        <div className="actions">
          <button className="btn btn-primary" type="button" onClick={onSignIn} disabled={signingIn}>
            {signingIn ? "Opening Google…" : "Sign in with Google"}
          </button>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
      </div>
    </div>
  );
}

export default function Home() {
  const { videos, statuses, loading, error, live, reload, saveVideo, loadHistory } = useTracker();
  const L = useMemo(() => makeLogic(statuses), [statuses]);
  const LOct = useMemo(() => makeLogic(statuses, OCTOBER_STAGES), [statuses]);
  const [tab, setTab] = useState("september");
  const [openId, setOpenId] = useState(null);
  const [editMonth, setEditMonth] = useState("2026-09");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user || null);
        setAuthReady(true);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthReady(true);
      if (session) setAuthError("");
    });
    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("video")) setTab("update");
    else if (p.get("tab") === "update") setTab("update");
    else if (p.get("tab") === "october") setTab("october");
    else setTab("september");
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sno = Number(p.get("video"));
    if (sno && videos.length) {
      const v = videos.find((x) => x.sno === sno);
      if (v) setOpenId(v.id);
    }
  }, [videos.length]);

  const signIn = async () => {
    if (!supabase) {
      setAuthError("Authentication is not available because the database is not connected.");
      return;
    }
    setSigningIn(true);
    setAuthError("");
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname + "?tab=update" },
    });
    if (e) {
      setAuthError(e.message || "Could not start Google sign-in.");
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setTab("september");
    setOpenId(null);
  };

  const goTab = (t) => { setTab(t); window.scrollTo(0, 0); };

  const updateTab = () => { setTab("update"); window.scrollTo(0, 0); };

  const identity = identityFromUser(user);

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <div className="hero-banner">
            <img src="/300-in-30-wide-opt.png" alt="300 in 30 Project Tracker" />
            <div className="hero-banner-title">{APP_TITLE}</div>
          </div>
          <div className="topbar-controls">
            <span className={"live" + (live ? " on" : "")} title={live ? "Live: updates appear automatically" : "Connecting…"}>
              <i />{live ? "Live" : "Connecting"}
            </span>
            <nav className="tabs" role="tablist">
              <button role="tab" className="tab" aria-selected={tab === "september"} onClick={() => goTab("september")}>September Dashboard</button>
              <button role="tab" className="tab tab-oct" aria-selected={tab === "october"} onClick={() => goTab("october")}>October Dashboard</button>
              <button role="tab" className="tab" aria-selected={tab === "update"} onClick={updateTab}>Add / Update</button>
            </nav>
            {authReady && user && (
              <div className="auth-mini">
                <span title={user.email || ""}>Signed in: {identity}</span>
                <button className="btn btn-sm" type="button" onClick={signOut}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="notice" role="alert">
          {error} <button className="btn btn-sm" onClick={reload}>Try again</button>
        </div>
      )}

      <main>
        {loading ? (
          <div className="loading">Loading the tracker…</div>
        ) : tab === "september" ? (
          <Dashboard videos={videos} statuses={statuses} L={L} loadHistory={loadHistory} month="2026-09" title="September Dashboard"
            onEdit={(id) => { setEditMonth("2026-09"); setOpenId(id); goTab("update"); }} />
        ) : tab === "october" ? (
          <Dashboard videos={videos} statuses={statuses} L={LOct} stages={OCTOBER_STAGES} month="2026-10" title="October Dashboard" approverDashboard loadHistory={loadHistory}
            onEdit={(id) => { setEditMonth("2026-10"); setOpenId(id); goTab("update"); }} />
        ) : !authReady ? (
          <div className="loading">Checking sign-in…</div>
        ) : !user ? (
          <SignInPrompt onSignIn={signIn} error={authError} signingIn={signingIn} />
        ) : (
          <VideoForm videos={videos} statuses={statuses} L={editMonth === "2026-10" ? LOct : L} stages={editMonth === "2026-10" ? OCTOBER_STAGES : undefined} october={editMonth === "2026-10"} saveVideo={saveVideo}
            openId={openId} onOpenHandled={() => setOpenId(null)} identity={identity} onMonthChange={(m) => setEditMonth(m)} />
        )}
      </main>
    </>
  );
}
