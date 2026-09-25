"use client";
import { useEffect, useMemo, useState } from "react";
import { useTracker } from "@/useTracker";
import { makeLogic } from "@/logic";
import { APP_TITLE, OCTOBER_STAGES } from "@/config";
import Dashboard from "@/Dashboard";
import VideoForm from "@/VideoForm";

export default function Home() {
  const { videos, statuses, loading, error, live, reload, saveVideo, loadHistory } = useTracker();
  const L = useMemo(() => makeLogic(statuses), [statuses]);
  const LOct = useMemo(() => makeLogic(statuses, OCTOBER_STAGES), [statuses]);
  const [tab, setTab] = useState("september");
  const [openId, setOpenId] = useState(null);
  const [editMonth, setEditMonth] = useState("2026-09");

  // Deep links: ?tab=update opens the form, ?video=12 opens video #12 for updating
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("tab") === "update" || p.get("video")) setTab("update");
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
  }, [videos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const goTab = (t) => { setTab(t); window.scrollTo(0, 0); };

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <div className="brand">
            <img className="brand-image" src="/300-in-30.jpg" alt="300 in 30 Project Tracker" />
            <h1>{APP_TITLE}</h1>
          </div>
          <span className={"live" + (live ? " on" : "")} title={live ? "Live: updates appear automatically" : "Connectingâ€¦"}>
            <i />{live ? "Live" : "Connecting"}
          </span>
          <nav className="tabs" role="tablist">
            <button role="tab" className="tab" aria-selected={tab === "september"} onClick={() => goTab("september")}>September Dashboard</button>
            <button role="tab" className="tab tab-oct" aria-selected={tab === "october"} onClick={() => goTab("october")}>October Dashboard</button>
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
          <div className="loading">Loading the trackerâ€¦</div>
         ) : tab === "september" ? (
          <Dashboard videos={videos} statuses={statuses} L={L} loadHistory={loadHistory} month="2026-09" title="September Dashboard"
            onEdit={(id) => { setEditMonth("2026-09"); setOpenId(id); goTab("update"); }} />
        ) : tab === "october" ? (
          <Dashboard videos={videos} statuses={statuses} L={LOct} stages={OCTOBER_STAGES} month="2026-10" title="October Dashboard" approverDashboard loadHistory={loadHistory}
            onEdit={(id) => { setEditMonth("2026-10"); setOpenId(id); goTab("update"); }} />
        ) : (
          <VideoForm videos={videos} statuses={statuses} L={editMonth === "2026-10" ? LOct : L} stages={editMonth === "2026-10" ? OCTOBER_STAGES : undefined} october={editMonth === "2026-10"} saveVideo={saveVideo}
            openId={openId} onOpenHandled={() => setOpenId(null)} />
        )}
      </main>
    </>
  );
}
