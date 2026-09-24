import { STAGES, STALE_DAYS } from "./config";

// ---------- dates & formatting ----------
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const thisMonth = () => todayISO().slice(0, 7);

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
export function monthLabel(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || "");
  return m ? `${MONTHS[+m[2] - 1]} ${m[1]}` : ym || "";
}
export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
export function fmtWhen(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
export function fmtCost(v) {
  if (v.cost !== null && v.cost !== undefined && v.cost !== "") return "₹" + Number(v.cost).toLocaleString("en-IN");
  return v.cost_note || "—";
}
export function durText(v) {
  const d = (v.durations || []).slice().sort((a, b) => a - b);
  return d.length ? d.map((x) => x + "s").join(", ") : "";
}
export const pctText = (n) => Math.round(n) + "%";
export const wText = (w) => String(Math.round(w * 10) / 10).replace(/\.0$/, "") + "%";

// ---------- calculations (built from the stage_statuses table) ----------
export function makeLogic(statuses) {
  const cat = {};
  statuses.forEach((s) => (cat[s.name] = s.category));
  const catOf = (val) => cat[val] || (val === "Done" ? "done" : val === "Pending" || !val ? "pending" : "progress");
  const isDone = (val) => catOf(val) === "done";
  const isPending = (val) => catOf(val) === "pending";

  // Overall status is always calculated, never typed in.
  function overall(v) {
    if (isDone(v.stage_all_edits)) return "Completed";
    if (v.go_live_date && v.go_live_date < todayISO()) return "Overdue";
    if (STAGES.every((s) => isPending(v[s.col]))) return "Pending";
    return "In Progress";
  }
  const completion = (v) => STAGES.reduce((t, s) => t + (isDone(v[s.col]) ? s.weight : 0), 0);
  function currentStage(v) {
    const s = STAGES.find((s) => !isDone(v[s.col]));
    return s ? s.short : "All done";
  }
  function attentionReasons(v) {
    const st = overall(v);
    if (st === "Completed") return [];
    const out = [];
    if (st === "Overdue") out.push("Go-live date passed");
    if (v.delivery_date && v.delivery_date < todayISO()) out.push("Delivery date passed");
    const stale = v.updated_at && Date.now() - new Date(v.updated_at).getTime() > STALE_DAYS * 86400000;
    if (stale) out.push(`No update for ${STALE_DAYS}+ days`);
    return out;
  }
  return { catOf, isDone, isPending, overall, completion, currentStage, attentionReasons };
}
