"use client";

import { useMemo, useState } from "react";

const ADMIN_EMAIL = "sulbhaaneja@gmail.com";

function actor(a) {
  return a.actor_name || a.actor_email || "Unknown";
}

function rowData(a) {
  const row = a.new_row || a.old_row || {};
  return { sno: row.sno || "—", feature: row.feature || "—", month: row.month || "—" };
}

export default function AdminAudit({ user, audit, loading, error, reload }) {
  const [search, setSearch] = useState("");
  const [op, setOp] = useState("");
  const [days, setDays] = useState("30");

  const rows = useMemo(() => {
    const cutoff = Date.now() - Number(days) * 86400000;
    const q = search.trim().toLowerCase();
    return (audit || []).filter((a) => {
      if (new Date(a.changed_at).getTime() < cutoff) return false;
      if (op && a.operation !== op) return false;
      if (!q) return true;
      const d = rowData(a);
      return [actor(a), a.actor_email, a.operation, d.sno, d.feature, d.month, a.table_name]
        .some((x) => String(x || "").toLowerCase().includes(q));
    });
  }, [audit, search, op, days]);

  if (!user || String(user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return <div className="dash"><section className="panel"><div className="empty-state"><b>Access denied</b>This section is restricted to the tracker administrator.</div></section></div>;
  }

  return (
    <div className="dash">
      <section className="hero">
        <div>
          <p className="hero-kicker">Admin Console</p>
          <p className="hero-head">Audit <span>Trail</span></p>
          <p className="hero-sub">Append-only record of tracker data changes. Only {ADMIN_EMAIL} can view this console.</p>
        </div>
        <div className="audit-summary"><b>{rows.length}</b><span>events shown</span></div>
      </section>

      <section className="filters">
        <div className="filters-top"><h3>Audit filters</h3><button className="btn btn-sm" onClick={reload}>Refresh</button></div>
        <div className="filters-grid audit-filters">
          <div className="field"><label>Search</label><input className="input" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Person, S.No., feature…" /></div>
          <div className="field"><label>Action</label><select className="input" value={op} onChange={(e)=>setOp(e.target.value)}><option value="">All actions</option><option value="INSERT">INSERT</option><option value="UPDATE">UPDATE</option><option value="DELETE">DELETE</option></select></div>
          <div className="field"><label>Period</label><select className="input" value={days} onChange={(e)=>setDays(e.target.value)}><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head"><h3>Activity log <span className="muted num">({rows.length})</span></h3></div>
        {loading ? <div className="loading">Loading audit trail…</div> : error ? <div className="empty-state"><b>Couldn’t load audit trail</b>{error}</div> : rows.length === 0 ? (
          <div className="empty-state"><b>No audit events in this period</b>New changes will appear here automatically.</div>
        ) : (
          <div className="scroll-x"><table className="audit-tbl"><thead><tr><th>Time</th><th>Action</th><th>Person</th><th>S.No.</th><th>Feature</th><th>Month</th><th>Record</th></tr></thead>
            <tbody>{rows.map((a) => { const d=rowData(a); return <tr key={a.id}><td className="num">{new Date(a.changed_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</td><td><span className={"audit-op audit-"+String(a.operation).toLowerCase()}>{a.operation}</span></td><td><b>{actor(a)}</b>{a.actor_email && <small>{a.actor_email}</small>}</td><td className="num">{d.sno}</td><td>{d.feature}</td><td>{d.month}</td><td className="audit-id">{a.row_id || "—"}</td></tr>; })}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
