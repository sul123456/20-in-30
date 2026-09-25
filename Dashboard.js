"use client";
import { useEffect, useMemo, useState } from "react";
import { STAGES, LIST_FIELDS, STALE_DAYS } from "./config";
import { monthLabel, fmtDate, fmtWhen, fmtCost, durText, pctText, wText, todayISO, thisMonth } from "./logic";
import { Badge, PBar, Modal, stageClass } from "./ui";

const EMPTY_FILTERS = { month: "", product: "", maker: "", agency: "", digital_fpr: "", brand_checker: "", status: "", liveFrom: "", liveTo: "" };
const OVERALL = ["Completed", "In Progress", "Pending", "Overdue"];

export default function Dashboard({ videos, statuses, L, stages = STAGES, onEdit, loadHistory, month, title = "Dashboard", approverDashboard = false }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "completion", dir: "desc" });
  const [openId, setOpenId] = useState(null);

  const rows = useMemo(() => videos.filter((v) => {
    const f = filters;
    if (month && v.month !== month) return false;
    if (f.month && v.month !== f.month) return false;
    for (const k of ["product", "maker", "agency", "digital_fpr", "brand_checker"]) if (f[k] && v[k] !== f[k]) return false;
    if (f.status && L.overall(v) !== f.status) return false;
    if (f.liveFrom && !(v.go_live_date && v.go_live_date >= f.liveFrom)) return false;
    if (f.liveTo && !(v.go_live_date && v.go_live_date <= f.liveTo)) return false;
    return true;
  }), [videos, filters, L]);

  // ---------- numbers (all calculated from the live Supabase rows) ----------
  const counts = { Completed: 0, "In Progress": 0, Pending: 0, Overdue: 0 };
  rows.forEach((v) => counts[L.overall(v)]++);
  const completedVideos = rows.filter((v) => L.overall(v) === "Completed");
  const wentLive = completedVideos.filter((v) => L.isDone(v.stage_go_live)).length;
  const completedPct = rows.length ? (counts.Completed / rows.length) * 100 : 0;
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const statusNames = statuses.map((s) => s.name);
  const colorOf = (name) => ({ pending: "var(--pending)", done: "var(--done)" }[L.catOf(name)] || (name === "In Progress" ? "var(--progress)" : "var(--other)"));

  const opts = (col) => [...new Set(videos.map((v) => v[col]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const sel = (k, label, options, fmt = (x) => x) => (
    <div className="field" key={k}>
      <label htmlFor={"flt_" + k}>{label}</label>
      <select className="input" id={"flt_" + k} value={filters[k]} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })}>
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{fmt(o)}</option>)}
      </select>
    </div>
  );

  const attention = rows.map((v) => ({ v, why: L.attentionReasons(v) })).filter((x) => x.why.length)
    .sort((a, b) => b.why.length - a.why.length || (a.v.delivery_date || "9").localeCompare(b.v.delivery_date || "9"));

  const q = search.trim().toLowerCase();
  const list = rows.filter((v) => !q || [v.feature, v.product, v.maker].some((x) => String(x || "").toLowerCase().includes(q)));
  const rank = { Overdue: 0, Pending: 1, "In Progress": 2, Completed: 3 };
  list.sort((a, b) => {
    const d = sort.dir === "asc" ? 1 : -1;
    switch (sort.field) {
      case "status": return (rank[L.overall(a)] - rank[L.overall(b)]) * d || a.sno - b.sno;
      case "completion": return (L.completion(a) - L.completion(b)) * d || a.sno - b.sno;
      case "updated_at": return (new Date(a.updated_at) - new Date(b.updated_at)) * d;
      case "delivery_date": case "go_live_date": {
        const x = a[sort.field] || "", y = b[sort.field] || "";
        if (!x && y) return 1; if (x && !y) return -1;
        return x.localeCompare(y) * d || a.sno - b.sno;
      }
      default: return (a.sno - b.sno) * d;
    }
  });
  const sortBy = (field) => setSort((s) => (s.field === field ? { field, dir: s.dir === "asc" ? "desc" : "asc" } : { field, dir: field === "completion" || field === "updated_at" ? "desc" : "asc" }));
  const Th = ({ field, children }) => (
    <th><button className="sortbtn" data-active={sort.field === field} onClick={() => sortBy(field)}>{children} {sort.field === field ? (sort.dir === "asc" ? "↑" : "↓") : ""}</button></th>
  );
  const today = todayISO();
  const isOctober = month === "2026-10";

  return (
    <div className="dash">
      {/* ---------- headline ---------- */}
      <section className="hero">
        <div>
          <p className="hero-kicker">{title}</p><p className="hero-head num">{pctText(completedPct)} <span>complete</span></p>
          <p className="hero-sub"><b>{counts.Completed} of {rows.length}</b> completed{activeFilters ? " (filtered)" : ""} · <b>{wentLive} of {completedVideos.length}</b> went live.</p>
        </div>
        <div>
          <div className="strip">
            {["Completed", "In Progress", "Pending", "Overdue"].flatMap((status) =>
              rows.filter((v) => L.overall(v) === status).sort((a, b) => L.completion(b) - L.completion(a) || a.sno - b.sno)
                .map((v) => {
                  const st = L.overall(v);
                  return <button key={v.id} className={"cell " + st.replace(/\s/g, "")} title={`#${v.sno} ${v.feature}: ${st}`} aria-label={`#${v.sno} ${v.feature}, ${st}`} onClick={() => setOpenId(v.id)} />;
                })
            )}
          </div>
          <div className="legend">
            <span><i style={{ background: "var(--done)" }} />Completed</span>
            <span><i style={{ background: "var(--progress)" }} />In progress</span>
            <span><i style={{ background: "var(--pending)" }} />Pending</span>
            <span><i style={{ background: "var(--overdue)" }} />Overdue</span>
          </div>
        </div>
      </section>

      <section className="kpis">
        <div className="kpi"><div className="v num">{rows.length}</div><div className="l">Total videos</div></div>
        <div className="kpi k-done"><div className="v num">{counts.Completed}</div><div className="l">Completed</div></div>
        <div className="kpi k-prog"><div className="v num">{counts["In Progress"]}</div><div className="l">In progress</div></div>
        <div className="kpi k-pend"><div className="v num">{counts.Pending}</div><div className="l">Not started</div></div>
        <div className="kpi k-over"><div className="v num">{counts.Overdue}</div><div className="l">Overdue</div></div>
        <div className="kpi k-live"><div className="v num">{wentLive}</div><div className="l">Went live</div></div>
        <div className="kpi k-pct"><div className="v num">{pctText(completedPct)}</div><div className="l">Completion</div></div>
      </section>

      {/* ---------- filters ---------- */}
      <section className={"filters" + (showFilters ? "" : " collapsed")}>
        <div className="filters-top">
          <h3>Filters {activeFilters > 0 && <span className="active-count">{activeFilters} on</span>}</h3>
          <button className="btn btn-sm toggle-filters" onClick={() => setShowFilters(!showFilters)}>{showFilters ? "Hide" : "Show"} filters</button>
          {activeFilters > 0 && <button className="btn btn-sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear all</button>}
        </div>
        <div className="filters-grid">
          {sel("month", "Month", opts("month"), monthLabel)}
          {LIST_FIELDS.filter((f) => f.col !== "usage").map((f) => sel(f.col, f.label, opts(f.col)))}
          {sel("status", "Status", OVERALL)}
          <div className="field span2">
            <span className="lbl">Go live date</span>
            <div className="range">
              <input className="input" type="date" aria-label="Go live from" value={filters.liveFrom} onChange={(e) => setFilters({ ...filters, liveFrom: e.target.value })} />
              <input className="input" type="date" aria-label="Go live to" value={filters.liveTo} onChange={(e) => setFilters({ ...filters, liveTo: e.target.value })} />
            </div>
          </div>
        </div>
      </section>

      {approverDashboard && <ApproverPanel rows={rows} L={L} />}

      <div className="grid-2">
        <GroupPanel title="Maker-wise completion" col="maker" rows={rows} L={L} />
        <GroupPanel title="Product-wise completion" col="product" rows={rows} L={L} />
      </div>

      {/* ---------- all videos ---------- */}
      <section className="panel">
        <div className="panel-head">
          <h3>All videos <span className="muted num">({list.length})</span></h3>
          <input className="input search" type="search" placeholder="Search feature, product or maker" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input sort-mobile" aria-label="Sort by" value={`${sort.field}:${sort.dir}`} onChange={(e) => { const [field, dir] = e.target.value.split(":"); setSort({ field, dir }); }}>
            <option value="completion:desc">Sort: completion</option>
            <option value="status:asc">Sort: status</option>
            <option value="sno:asc">Sort: S.NO</option>
            <option value="delivery_date:asc">Sort: delivery date</option>
            <option value="go_live_date:asc">Sort: go-live date</option>
            <option value="updated_at:desc">Sort: last updated</option>
          </select>
        </div>
        {list.length === 0 ? <div className="empty-state"><b>No videos match</b>Clear a filter or change the search.</div> : (
          <>
            <div className="scroll-x desktop-only">
              <table className="proj-tbl">
                <thead><tr>
                  <Th field="sno">S.NO</Th><th>Video</th><th>Maker</th><th>Brand Checker</th><th>Current step</th>
                  <Th field="completion">Completion</Th>{isOctober && <Th field="planned_delivery_date">Planned delivery</Th>}{isOctober && <th>Brand SR</th>}<Th field="delivery_date">Delivery</Th><Th field="go_live_date">Go live</Th>
                  <Th field="status">Status</Th><Th field="updated_at">Last updated</Th><th>Remarks</th>
                </tr></thead>
                <tbody>
                  {list.map((v) => {
                    const st = L.overall(v);
                    return (
                      <tr key={v.id} className={st === "Overdue" ? "is-overdue" : ""} tabIndex={0} onClick={() => setOpenId(v.id)} onKeyDown={(e) => e.key === "Enter" && setOpenId(v.id)}>
                        <td className="num">{v.sno}</td>
                        <td className="feat"><b>{v.feature}</b><small>{[v.product, v.usage, durText(v)].filter(Boolean).join(" · ")}</small></td>
                        <td>{v.maker || "—"}</td><td>{v.brand_checker || "—"}</td><td>{L.currentStage(v)}</td>
                        <td><PBar value={L.completion(v)} /></td>
                        {isOctober && <td className="num">{fmtDate(v.planned_delivery_date)}</td>}{isOctober && <td>{v.brand_sr || "—"}</td>}
                        <td className={"num" + (v.delivery_date && v.delivery_date < today && st !== "Completed" ? " late" : "")}>{fmtDate(v.delivery_date)}</td>
                        <td className={"num" + (st === "Overdue" ? " late" : "")}>{fmtDate(v.go_live_date)}</td>
                        <td><Badge status={st} /></td>
                        <td className="num muted">{fmtWhen(v.updated_at)}</td>
                        <td className="rem">{v.remarks || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="cards mobile-only">
              {list.map((v) => {
                const st = L.overall(v);
                return (
                  <li key={v.id} className={st === "Overdue" ? "is-overdue" : ""}>
                    <button onClick={() => setOpenId(v.id)}>
                      <div className="c-top"><b><span className="num muted">#{v.sno}</span> {v.feature}</b><Badge status={st} /></div>
                      <div className="c-meta">{[v.maker, v.product, L.currentStage(v)].filter(Boolean).join(" · ")}</div>
                      <div className="c-bot"><PBar value={L.completion(v)} /><span className={"num" + (v.delivery_date && v.delivery_date < today && st !== "Completed" ? " late" : " muted")}>Delivery {fmtDate(v.delivery_date)}</span></div>
                      {v.remarks && <div className="c-rem">{v.remarks}</div>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
      {/* ---------- needs attention ---------- */}
      <section className="panel">
        <div className="panel-head"><h3>Videos needing attention <span className="muted num">({attention.length})</span></h3></div>
        {attention.length ? (
          <ul className="att">
            {attention.map(({ v, why }) => (
              <li key={v.id}>
                <button onClick={() => setOpenId(v.id)}>
                  <span className="att-main"><b><span className="num muted">#{v.sno}</span> {v.feature}</b>
                    <small>{[v.maker, L.currentStage(v), `updated ${fmtWhen(v.updated_at)}`].filter(Boolean).join(" · ")}</small>
                    {v.remarks && <small className="att-rem">{v.remarks}</small>}
                  </span>
                  <span className="att-why">{why.map((w) => <span key={w} className="flag">{w}</span>)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <div className="empty-state">Nothing needs attention right now.</div>}
      </section>


      {openId && (
        <Detail v={videos.find((x) => x.id === openId)} L={L} stages={stages} loadHistory={loadHistory}
          onClose={() => setOpenId(null)} onEdit={() => { const id = openId; setOpenId(null); onEdit(id); }} />
      )}
    </div>
  );
}

function GroupPanel({ title, col, rows, L }) {
  const groups = {};
  rows.forEach((v) => { const k = v[col] || "Not set"; (groups[k] = groups[k] || []).push(v); });
  const list = Object.entries(groups).map(([k, vs]) => ({
    k, n: vs.length, done: vs.filter((v) => L.overall(v) === "Completed").length,
    avg: vs.reduce((t, v) => t + L.completion(v), 0) / vs.length,
  })).sort((a, b) => b.n - a.n || a.k.localeCompare(b.k));
  return (
    <section className="panel">
      <div className="panel-head"><h3>{title}</h3></div>
      {list.length ? (
        <table className="grp-tbl">
          <thead><tr><th>{title.replace("-wise completion", "")}</th><th className="n">Videos</th><th className="n">Done</th><th>Avg. completion</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.k}><td><b className={r.k === "Not set" ? "muted" : ""}>{r.k}</b></td><td className="n num">{r.n}</td><td className="n num">{r.done}</td><td><PBar value={r.avg} /></td></tr>
          ))}</tbody>
        </table>
      ) : <div className="empty-state">No videos to show.</div>}
    </section>
  );
}

function Detail({ v, L, stages = STAGES, onClose, onEdit, loadHistory }) {
  const [history, setHistory] = useState(null);
  const [histErr, setHistErr] = useState("");
  useEffect(() => {
    if (!v) return;
    loadHistory(v.id).then(setHistory).catch((e) => setHistErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v?.id, v?.updated_at]);
  if (!v) return null;
  const st = L.overall(v);
  const label = Object.fromEntries(stages.map((s) => [s.col, s.short]));
  const Row = ({ k, children, wide }) => <div className={wide ? "wide" : ""}><dt>{k}</dt><dd>{children || "—"}</dd></div>;
  return (
    <Modal title={`#${v.sno} ${v.feature}`} onClose={onClose}>
      <div className="detail-top"><Badge status={st} /><span className="muted">Current step: <b className="ink">{L.currentStage(v)}</b></span><span className="grow" /><PBar value={L.completion(v)} /></div>
      <button className="btn btn-primary wide-btn" onClick={onEdit}>Update this video</button>
      <div className="card"><h2>Workflow</h2>
        <div className="track">{stages.map((s) => (
          <div key={s.col} className={"tstep t-" + stageClass(L.catOf, v[s.col])}><span>{s.short} <small>{wText(s.weight)}</small></span><small>{v[s.col]}</small></div>
        ))}</div>
      </div>
      <div className="card"><dl className="dl">
        <Row k="S.NO">{v.sno}</Row><Row k="Month">{monthLabel(v.month)}</Row>
        <Row k="Product">{v.product}</Row><Row k="Usage">{v.usage}</Row>
        <Row k="Feature" wide>{v.feature}</Row>
        <Row k="Duration">{durText(v)}</Row><Row k="Cost">{fmtCost(v)}</Row>
        <Row k="Maker">{v.maker}</Row><Row k="Agency">{v.agency}</Row>
        <Row k="Digital FPR">{v.digital_fpr}</Row><Row k="Brand Checker">{v.brand_checker}</Row>
        <Row k="Planned delivery date">{fmtDate(v.planned_delivery_date)}</Row><Row k="Brand SR">{v.brand_sr}</Row><Row k="Delivery date">{fmtDate(v.delivery_date)}</Row><Row k="Go live date">{fmtDate(v.go_live_date)}</Row>
        <Row k="Remarks" wide>{v.remarks}</Row>
      </dl><div className="meta">Last updated {fmtWhen(v.updated_at)}{v.updated_by ? ` by ${v.updated_by}` : ""}</div></div>
      <div className="card"><h2>Status history</h2>
        {histErr ? <p className="muted">{histErr}</p> : history === null ? <p className="muted">Loading…</p> : history.length === 0 ? <p className="muted">No status changes recorded yet.</p> : (
          <ul className="hist">{history.map((h) => (
            <li key={h.id}><b>{label[h.stage] || h.stage}</b>: {h.previous_status || "new"} → <b>{h.new_status}</b>
              <small>{h.changed_by}, {fmtWhen(h.changed_at)}{h.comments ? ` · “${h.comments}”` : ""}</small></li>
          ))}</ul>
        )}
      </div>
    </Modal>
  );
}


const OCTOBER_APPROVERS = {
  "BAU (Activation vouchers Rs.2700 Ixigo & RD) Guy at aiport with headphones - AI": "Manan",
  "BAU (BMS) - AI": "Manan",
  "Card Control - AI": "Manan",
  "BAU (Activation + BMS) - Creator": "Varun",
  "Alumni (BMS) - AI": "Manan",
  "Top Alumni (Activation vouchers Rs.1200 Ixigo) - AI": "Manan",
  "Top Corp (Activation vouchers Rs.1200 Ixigo) - AI": "Manan",
  "Rupay Convenience (Simpler Bank Statement) - AI": "Manan",
  "Rupay Convenience (Simpler Bank Statement) - Creator": "Varun",
  "Rupay Convenience - Creator Repurposed": "Varun",
  "SmartLock on iMobile - AI": "Varun",
  "Retirement solution, Invest in NPS on iMobile - AI": "Varun",
  "SmartLock on iMobile, End slate super: No minimum balance - AI": "Varun",
  "Retirement solution, Invest in NPS on iMobile, End slate super: No minimum balance - AI": "Varun",
  "AL - Loan up to 100% of on-road price PL - Loan up to Rs. 50 L - AI": "Sulbha",
  "AL - Apply online and get quick disbursal, 3,500+ dealers PL - Apply online and get quick disbursement - AI": "Sulbha",
  "Loan up to Rs. 50 L, Tenure up to 74 months, Home Renovation - AI": "Sulbha",
  "Loan up to Rs. 50 L, Tenure up to 74 months, Dream Vacation": "Sulbha",
  "Loan up to Rs. 50 L, Tenure up to 74 months, Big-ticket Gadgets": "Sulbha",
  "HL NCA - Online sanction, minimal documentation, Festive Led - AI": "Sulbha",
  "HL NCA - Attractive interest rate, minimal documentation, Festive Led - AI": "Sulbha",
  "PAHL - Online sanction, No documentation - AI": "Sulbha",
  "LAP - Online application, OD facilitiy available": "Sulbha",
  "UPI for NRI": "Sulbha",
  "To be decided as per compliance meeting": "Sulbha",
  "InstaBIZ - AI": "Kruthi",
  "InstaBIZ - Creator": "Kruthi",
  "Insta OD - AI": "Kruthi",
  "Insta OD - Creator": "Kruthi",
  "Ease of Business Banking - AI": "Kruthi",
  "360 Business Banking - AI": "Kruthi",
};

function ApproverPanel({ rows, L }) {
  const names = [...new Set(rows.map((v) => v.brand_approver || OCTOBER_APPROVERS[v.feature]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const list = names.map((name) => ({
    name,
    assigned: rows.filter((v) => (v.brand_approver || OCTOBER_APPROVERS[v.feature]) === name).length,
    pending: rows.filter((v) => (v.brand_approver || OCTOBER_APPROVERS[v.feature]) === name && L.catOf(v.stage_brand_approval) === "pending").length,
  }));
  const totalAssigned = list.reduce((t, r) => t + r.assigned, 0);
  const totalPending = list.reduce((t, r) => t + r.pending, 0);
  return <section className="panel">
    <div className="panel-head"><h3>Brand approval dashboard <span className="muted num">({totalAssigned} videos assigned)</span></h3></div>
    {list.length ? <table className="grp-tbl"><thead><tr><th>Brand Approver</th><th className="n">Videos assigned for approval</th><th className="n">Pending approval</th></tr></thead>
      <tbody>{list.map(r => <tr key={r.name}><td><b>{r.name}</b></td><td className="n num">{r.assigned}</td><td className="n num">{r.pending}</td></tr>)}
      <tr><td><b>Total</b></td><td className="n num"><b>{totalAssigned}</b></td><td className="n num"><b>{totalPending}</b></td></tr>
      </tbody></table> : <div className="empty-state">No brand approvers assigned.</div>}
  </section>;
}
