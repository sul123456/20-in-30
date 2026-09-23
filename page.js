"use client";
import { useEffect, useMemo, useState } from "react";
import { useTracker } from "@/useTracker";
import { makeLogic } from "@/logic";
import { APP_TITLE } from "@/config";
import Dashboard from "@/Dashboard";
import VideoForm from "@/VideoForm";

export default function Home() {
  const { videos, statuses, loading, error, live, reload, saveVideo, loadHistory } = useTracker();
  const L = useMemo(() => makeLogic(statuses), [statuses]);
  const [tab, setTab] = useState("dashboard");
  const [openId, setOpenId] = useState(null);

  // Deep links: ?tab=update opens the form, ?video=12 opens video #12 for updating
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("tab") === "update" || p.get("video")) setTab("update");
  }, []);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const sno = Number(p.get("video"));
    if (sno && videos.length) {
      const v = videos.find((x) => x.sno === sno);
      if (v) setOpenId(v.id);
    }
  }, [videos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTab = (t) => { setTab(t); window.scrollTo(0, 0); };

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <h1>{APP_TITLE}</h1>
          </div>
          <span className={"live" + (live ? " on" : "")} title={live ? "Live: updates appear automatically" : "Connecting…"}>
            <i />{live ? "Live" : "Connecting"}
          </span>
          <nav className="tabs" role="tablist">
            <button role="tab" className="tab" aria-selected={tab === "dashboard"} onClick={() => goTab("dashboard")}>Dashboard</button>
            <button role="tab" className="tab" aria-selected={tab === "update"} onClick={() => goTab("update")}>Add / Update</button>
          </nav>
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
        ) : tab === "dashboard" ? (
          <Dashboard videos={videos} statuses={statuses} L={L} loadHistory={loadHistory}
            onEdit={(id) => { setOpenId(id); goTab("update"); }} />
        ) : (
          <VideoForm videos={videos} statuses={statuses} L={L} saveVideo={saveVideo}
            openId={openId} onOpenHandled={() => setOpenId(null)} />
        )}
      </main>
    </>
  );
}
