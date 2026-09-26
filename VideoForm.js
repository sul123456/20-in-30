"use client";
import { useEffect, useMemo, useState } from "react";
import { STAGES, DURATIONS, LIST_FIELDS } from "./config";
import { monthLabel, thisMonth, pctText, fmtWhen } from "./logic";
import { Badge } from "./ui";

const NAME_KEY = "tracker_your_name"; // convenience only: pre-fills "Your name"

function toForm(v, stages = STAGES) {
  const f = {
    feature: v?.feature || "",
    month: v?.month || thisMonth(),
    product: v?.product || "", usage: v?.usage || "", maker: v?.maker || "", agency: v?.agency || "",
    digital_fpr: v?.digital_fpr || "", brand_checker: v?.brand_checker || "",
    cost: v?.cost !== null && v?.cost !== undefined ? String(Number(v.cost)) : v?.cost_note || "",
    delivery_date: v?.delivery_date || "", go_live_date: v?.go_live_date || "",
    remarks: v?.remarks || "",
    durations: (v?.durations || []).slice().sort((a, b) => a - b),
    planned_delivery_date: v?.planned_delivery_date || "",
    brand_sr: v?.brand_sr || "",
  };
  stages.forEach((s) => (f[s.col] = v?.[s.col] || "Pending"));
  return f;
}

// Turn form values into database fields.
function toFields(f) {
  const out = { ...f };
  const raw = f.cost.trim().replace(/[₹,\s]/g, "");
  delete out.cost;
  if (!f.cost.trim()) { out.cost = ""; out.cost_note = ""; }
  else if (raw !== "" && !isNaN(Number(raw))) { out.cost = String(Number(raw)); out.cost_note = ""; }
  else { out.cost = ""; out.cost_note = f.cost.trim(); }
  out.feature = f.feature.trim();
  return out;
}

// Only send what the person actually changed, so simultaneous edits to
// different steps of the same video don't overwrite each other.
function diff(original, current) {
  const a = toFields(original), b = toFields(current), patch = {};
  Object.keys(b).forEach((k) => {
    const same = Array.isArray(b[k]) ? JSON.stringify(a[k]) === JSON.stringify(b[k]) : (a[k] ?? "") === (b[k] ?? "");
    if (!same) patch[k] = b[k];
  });
  return patch;
}

function monthOptions(videos, extra) {
  const set = new Set();
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 6);
  for (let i = 0; i < 19; i++) { set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); d.setMonth(d.getMonth() + 1); }
  videos.forEach((v) => v.month && set.add(v.month));
  if (extra) set.add(extra);
  return [...set].sort();
}

export default function VideoForm({ videos, statuses, L, saveVideo, openId, onOpenHandled, stages = STAGES, october = false }) {
  const [mode, setMode] = useState("new"); // new | pick | edit | saved
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [original, setOriginal] = useState(() => toForm(null));
  const [form, setForm] = useState(() => toForm(null));
  const [adding, setAdding] = useState({}); // which dropdowns are in "add new" mode
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(null);

  useEffect(() => { try { setName(localStorage.getItem(NAME_KEY) || ""); } catch {} }, []);

  // opened from the dashboard / a ?video= link
  useEffect(() => {
    if (!openId) return;
    const v = videos.find((x) => x.id === openId);
    if (v) { startEdit(v); onOpenHandled && onOpenHandled(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, videos.length]);

  const current = editingId ? videos.find((v) => v.id === editingId) : null;
  const changedElsewhere = current && original._stamp && current.updated_at !== original._stamp;

  function startNew() {
    const f = toForm(null, stages);
    setMode("new"); setEditingId(null); setOriginal(f); setForm(f); setAdding({}); setComment(""); setErr("");
  }
  function startEdit(v) {
    const f = toForm(v, stages);
    setMode("edit"); setEditingId(v.id); setOriginal({ ...f, _stamp: v.updated_at }); setForm(f); setAdding({}); setComment(""); setErr("");
    window.scrollTo(0, 0);
  }
  const set = (k, val) => setForm((f) => ({ ...f, [k]: val }));

  const statusNames = statuses.map((s) => s.name);
  const preview = useMemo(() => {
    const v = { ...form, go_live_date: form.go_live_date };
    return { st: L.overall(v), pct: L.completion(v) };
  }, [form, L]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    if (!form.feature.trim()) { setErr("Add the feature (film name) so the team can recognise this video."); return; }
    if (!name.trim()) { setErr("Enter your name so the team knows who made this update."); return; }
    const { _stamp, ...orig } = original;
    const patch = mode === "new" ? toFields(form) : diff(orig, form);
    if (mode !== "new" && Object.keys(patch).length === 0 && !comment.trim()) { setErr("Nothing has changed yet."); return; }
    setSaving(true);
    try {
      try { localStorage.setItem(NAME_KEY, name.trim()); } catch {}
      const row = await saveVideo(mode === "new" ? null : editingId, patch, name.trim(), comment.trim());
      setSaved({ id: row?.id, sno: row?.sno, feature: row?.feature || form.feature, isNew: mode === "new" });
      setMode("saved");
      window.scrollTo(0, 0);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  // ---------- saved confirmation ----------
  if (mode === "saved" && saved) {
    const v = videos.find((x) => x.id === saved.id);
    return (
      <div className="form-wrap">
        <div className="card confirm" role="status">
          <div className="tick" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          </div>
          <h2>Update saved successfully.</h2>
          <p>#{saved.sno} {saved.feature} is saved for everyone. The dashboard has already updated.</p>
          <div className="actions">
            <button className="btn btn-primary" onClick={startNew}>Add another video</button>
            {v && <button className="btn" onClick={() => startEdit(v)}>Keep updating this one</button>}
            <button className="btn" onClick={() => { setMode("pick"); setQuery(""); }}>Update a different video</button>
          </div>
        </div>
      </div>
    );
  }

  const modeSwitch = (
    <div className="mode" role="group" aria-label="What do you want to do">
      <button type="button" aria-pressed={mode === "new"} onClick={startNew}>New video</button>
      <button type="button" aria-pressed={mode !== "new"} onClick={() => { setMode("pick"); setEditingId(null); setQuery(""); }}>Update a video</button>
    </div>
  );

  // ---------- pick a video ----------
  if (mode === "pick") {
    const q = query.trim().toLowerCase();
    const list = videos
      .filter((v) => !q || [v.feature, v.product, v.maker, v.agency, String(v.sno)].some((x) => String(x || "").toLowerCase().includes(q)))
      .sort((a, b) => L.completion(b) - L.completion(a) || a.sno - b.sno);
    return (
      <div className="form-wrap">
        {modeSwitch}
        <div className="card">
          <h2>Which video are you updating?<span className="sub">Search by name, product, maker or number.</span></h2>
          <input className="input" type="search" placeholder="Search videos" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
          <div className="picker-list">
            {list.length ? list.map((v) => (
              <button key={v.id} className="pick" onClick={() => startEdit(v)}>
                <span className="sno-pill num">#{v.sno}</span>
                <span className="grow"><b>{v.feature}</b><small>{[v.maker, v.product, L.currentStage(v)].filter(Boolean).join(" · ")}</small></span>
                <Badge status={L.overall(v)} />
              </button>
            )) : <div className="empty-state"><b>No videos match</b>Try a different word.</div>}
          </div>
        </div>
      </div>
    );
  }

  // ---------- the form ----------
  const months = monthOptions(videos, form.month);
  const optionsFor = (col) => [...new Set(videos.map((v) => v[col]).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const picker = (f) => {
    const opts = optionsFor(f.col);
    const isNew = adding[f.col] || (form[f.col] && !opts.includes(form[f.col]));
    return (
      <div className="field" key={f.col}>
        <label htmlFor={"f_" + f.col}>{f.label}</label>
        {!isNew ? (
          <select className="input" id={"f_" + f.col} value={form[f.col]}
            onChange={(e) => { if (e.target.value === "__new") { setAdding((a) => ({ ...a, [f.col]: true })); set(f.col, ""); } else set(f.col, e.target.value); }}>
            <option value="">Choose {f.label.toLowerCase()}</option>
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
            <option value="__new">+ Add a new {f.label.toLowerCase()}</option>
          </select>
        ) : (
          <div className="newrow">
            <input className="input" id={"f_" + f.col} autoFocus value={form[f.col]} placeholder={`Type the new ${f.label.toLowerCase()}`} onChange={(e) => set(f.col, e.target.value)} />
            <button type="button" className="btn btn-sm" onClick={() => { setAdding((a) => ({ ...a, [f.col]: false })); set(f.col, original[f.col] && opts.includes(original[f.col]) ? original[f.col] : ""); }}>List</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="form-wrap">
      {modeSwitch}
      {mode === "edit" && current && (
        <div className="editing-banner">
          <span>Updating <span className="num">#{current.sno}</span> {current.feature}<small>Last updated {fmtWhen(current.updated_at)}{current.updated_by ? ` by ${current.updated_by}` : ""}</small></span>
          <button type="button" className="btn btn-sm" onClick={() => setMode("pick")}>Choose another</button>
        </div>
      )}
      {changedElsewhere && (
        <div className="warn">Someone else just updated this video. Saving will only change the fields you edited.</div>
      )}
      <form onSubmit={onSubmit} noValidate>
        <div className="card">
          <h2>Workflow status<span className="sub">Tap the current status of each step.</span></h2>
          {stages.map((s, i) => {
            const cur = form[s.col];
            const opts = (october && s.col === "stage_ai_addendum") ? [...statusNames, "Not Applicable"].filter((x,i,a)=>a.indexOf(x)===i) : statusNames.filter((x) => x !== "Not Applicable");
            const safeOpts = opts.includes(cur) ? opts : [...opts, cur];
            const head = i === 0 || stages[i - 1].group !== s.group;
            return (
              <div key={s.col}>
                {head && <div className="stage-group">{s.group}</div>}
                <div className={"stage-row" + (head ? " first" : "")} role="group" aria-label={s.label}>
                  <div className="lbl"><i className="num">{i + 1}</i>{s.label}</div>
                  <div className="chips">
                    {safeOpts.map((o) => (
                      <button
                        type="button"
                        key={o}
                        className={"chip c-" + L.catOf(o)}
                        aria-pressed={o === cur}
                        onClick={() => {
                          if (s.col === "stage_all_edits" && o === "Done") {
                            const incomplete = stages.find((stage) => stage.col !== "stage_all_edits" && !L.isDone(form[stage.col]));
                            if (incomplete) {
                              setErr(`Stage ${incomplete.label} not completed.`);
                              return;
                            }
                          }
                          setErr("");
                          set(s.col, o);
                        }}
                      >{o}</button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card">
          <h2>Video details{mode === "new" && <span className="sub">S.NO is added automatically when you save.</span>}</h2>
          <div className="field">
            <label htmlFor="f_feature">Feature <span className="req">*</span></label>
            <input className="input" id="f_feature" value={form.feature} onChange={(e) => set("feature", e.target.value)} placeholder="Film / feature name" autoComplete="off" />
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="f_month">Month</label>
              <select className="input" id="f_month" value={form.month} onChange={(e) => set("month", e.target.value)}>
                {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
              </select>
            </div>
            {picker(LIST_FIELDS[0])}
            {picker(LIST_FIELDS[1])}
            {picker(LIST_FIELDS[2])}
            <div className="field span2">
              <span className="lbl">Duration (tick every cut being made)</span>
              <div className="chips">
                {DURATIONS.map((d) => {
                  const on = form.durations.includes(d);
                  return (
                    <button type="button" key={d} className="chip dur" aria-pressed={on}
                      onClick={() => set("durations", on ? form.durations.filter((x) => x !== d) : [...form.durations, d].sort((a, b) => a - b))}>
                      {d} sec
                    </button>
                  );
                })}
              </div>
            </div>
            {picker(LIST_FIELDS[3])}
            <div className="field">
              <label htmlFor="f_cost">Cost (₹)</label>
              <input className="input num" id="f_cost" inputMode="decimal" value={form.cost} onChange={(e) => set("cost", e.target.value)} placeholder="Amount, or TBC" />
            </div>
            {picker(LIST_FIELDS[4])}
            {picker(LIST_FIELDS[5])}
            <div className="field"><label htmlFor="f_planned_delivery">Planned Delivery Date</label><input className="input" id="f_planned_delivery" type="date" value={form.planned_delivery_date} onChange={(e) => set("planned_delivery_date", e.target.value)} /></div>
            {october && <div className="field"><label htmlFor="f_brand_sr">Brand SR</label><input className="input" id="f_brand_sr" value={form.brand_sr} onChange={(e) => set("brand_sr", e.target.value)} placeholder="Brand SR / approver" /></div>}
            <div className="field">
              <label htmlFor="f_delivery">Actual Delivery Date</label>
              <input className="input" id="f_delivery" type="date" value={form.delivery_date} onChange={(e) => set("delivery_date", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="f_golive">Go live date</label>
              <input className="input" id="f_golive" type="date" value={form.go_live_date} onChange={(e) => set("go_live_date", e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="f_remarks">Remarks</label>
            <textarea className="input" id="f_remarks" value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Anything the team should know" />
          </div>
        </div>

        <div className="card">
          <h2>Who is updating?</h2>
          <div className="grid2">
            <div className="field">
              <label htmlFor="f_name">Your name <span className="req">*</span></label>
              <input className="input" id="f_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kruthi" autoComplete="name" />
            </div>
            <div className="field">
              <label htmlFor="f_comment">Comment on this update</label>
              <input className="input" id="f_comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional, saved in the history" />
            </div>
          </div>
        </div>

        {err && <div className="form-error" role="alert">{err}</div>}

        <div className="savebar">
          <div className="savebar-in">
            <span className="status-preview"><Badge status={preview.st} /> <b className="num">{pctText(preview.pct)}</b></span>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : mode === "new" ? "Save video" : "Save update"}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
