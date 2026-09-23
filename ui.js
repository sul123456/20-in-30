"use client";
import { useEffect } from "react";
import { pctText } from "./logic";

const cls = (s) => String(s).replace(/\s+/g, "");

export function Badge({ status }) {
  return <span className={`badge b-${cls(status)}`}>{status}</span>;
}

export function PBar({ value }) {
  const color = value >= 100 ? "var(--done)" : value > 0 ? "var(--bar)" : "var(--empty)";
  return (
    <span className="pwrap" aria-label={`${pctText(value)} complete`}>
      <span className="pbar"><span style={{ width: `${Math.min(100, value)}%`, background: color }} /></span>
      <b className="num pct">{pctText(value)}</b>
    </span>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="xbtn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function stageClass(catOf, val) {
  const c = catOf(val);
  return c === "done" ? "Done" : c === "pending" ? "Pending" : val === "In Progress" ? "InProgress" : "Other";
}
