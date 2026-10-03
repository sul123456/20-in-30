"use client";

import { useState } from "react";
import { supabase } from "@/supabase";

const SUGGESTIONS = [
  "How many videos are completed?",
  "Show completion by maker",
  "What is the average video cost?",
  "Which videos are overdue?",
  "Compare September and October",
];

export default function AIAnalytics({ user }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ask = async (text = question) => {
    const q = String(text || "").trim();
    if (!q || busy) return;
    setQuestion("");
    setError("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("Your admin session has expired. Please sign in again.");

      const res = await fetch("/api/video-analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: q }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Could not get an analytics answer.");

      setMessages((m) => [...m, { role: "assistant", text: payload.answer }]);
    } catch (e) {
      setError(e?.message || "Could not get an analytics answer.");
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <button
        className="btn btn-sm ai-analytics-trigger"
        type="button"
        onClick={() => setOpen(true)}
        title="Ask questions about Video data"
      >
        ✨ Ask Me Anything
      </button>

      {open && (
        <div className="ai-analytics-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <section className="ai-analytics-panel" role="dialog" aria-modal="true" aria-label="Video Analytics Agent">
            <div className="ai-analytics-head">
              <div>
                <strong>✨ Ask Me Anything</strong>
                <div className="ai-analytics-sub">Read-only Video Analytics</div>
              </div>
              <button className="ai-analytics-close" type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="ai-analytics-note">
              Ask questions about the permitted Video data only. This agent cannot modify tracker data.
            </div>

            <div className="ai-analytics-messages">
              {messages.length === 0 && (
                <div className="ai-analytics-welcome">
                  <div className="ai-analytics-title">What would you like to know?</div>
                  <div className="ai-analytics-suggestions">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" onClick={() => ask(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`ai-analytics-message ${m.role}`}>
                  <div>{m.text}</div>
                </div>
              ))}

              {busy && <div className="ai-analytics-message assistant">Analysing the Video data…</div>}
            </div>

            {error && <div className="ai-analytics-error">{error}</div>}

            <form
              className="ai-analytics-form"
              onSubmit={(e) => { e.preventDefault(); ask(); }}
            >
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about the videos…"
                disabled={busy}
                aria-label="Analytics question"
              />
              <button className="btn btn-primary" type="submit" disabled={busy || !question.trim()}>
                {busy ? "…" : "Ask"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
