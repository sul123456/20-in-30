"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured } from "./supabase";
import { FALLBACK_STATUSES } from "./config";

// Loads every video + the status options from Supabase and keeps them live.
// Supabase is the only store: nothing is cached in localStorage.
export function useTracker() {
  const [videos, setVideos] = useState([]);
  const [statuses, setStatuses] = useState(FALLBACK_STATUSES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [live, setLive] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setError("Almost there: the database isn't connected yet. In Vercel open this project → Storage → connect Supabase, then redeploy.");
      setLoading(false);
      return;
    }
    const [v, s] = await Promise.all([
      supabase.from("videos").select("*").order("sno", { ascending: true }),
      supabase.from("stage_statuses").select("*").order("sort_order", { ascending: true }),
    ]);
    if (!mounted.current) return;
    if (v.error) setError(/does not exist|schema cache|relation/i.test(v.error.message)
      ? "The database is connected but its tables aren't set up yet. Redeploy the project in Vercel (setup runs automatically), or run schema.sql and seed.sql in Supabase → SQL Editor."
      : "Couldn't load videos: " + v.error.message);
    else { setVideos(v.data || []); setError(null); }
    if (!s.error && s.data && s.data.length) setStatuses(s.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    if (!supabaseConfigured) return;

    const channel = supabase
      .channel("tracker-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, (p) => {
        setVideos((list) => {
          if (p.eventType === "DELETE") return list.filter((x) => x.id !== p.old.id);
          const row = p.new;
          const i = list.findIndex((x) => x.id === row.id);
          if (i === -1) return [...list, row].sort((a, b) => a.sno - b.sno);
          const next = list.slice();
          next[i] = row;
          return next;
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stage_statuses" }, () => load())
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
        // after a dropped connection, re-read so nothing is missed
        if (status === "SUBSCRIBED") load();
      });

    // phones pause background tabs: refresh when the page becomes visible again
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", load);

    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", load);
      supabase.removeChannel(channel);
    };
  }, [load]);

  // Save through the save_video() database function (updates the row and
  // writes status_history in one transaction). Returns the saved row.
  const saveVideo = useCallback(async (id, patch, changedBy, comment) => {
    const { data, error } = await supabase.rpc("save_video", {
      p_id: id || null,
      p_patch: patch,
      p_changed_by: changedBy,
      p_comment: comment || null,
    });
    if (error) throw new Error(friendlyError(error));
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      setVideos((list) => {
        const i = list.findIndex((x) => x.id === row.id);
        if (i === -1) return [...list, row].sort((a, b) => a.sno - b.sno);
        const next = list.slice();
        next[i] = row;
        return next;
      });
    }
    return row;
  }, []);

  const loadAudit = useCallback(async () => {
    const { data, error } = await supabase.from("audit_log").select("*").order("changed_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return data || [];
  }, []);

  const loadHistory = useCallback(async (videoId) => {
    const { data, error } = await supabase
      .from("status_history")
      .select("*")
      .eq("video_id", videoId)
      .order("changed_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data || [];
  }, []);

  return { videos, statuses, loading, error, live, reload: load, saveVideo, loadHistory, loadAudit };
}

function friendlyError(e) {
  const msg = e?.message || "";
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return "No connection. Check your internet and tap Save again.";
  if (/violates foreign key/i.test(msg)) return "One of the statuses isn't a valid option any more. Reload the page and try again.";
  if (/invalid input syntax for type numeric/i.test(msg)) return "Cost must be a number (or leave it blank / type TBC).";
  return msg || "Couldn't save. Please try again.";
}
