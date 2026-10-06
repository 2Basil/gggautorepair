"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getJobStatus } from "@/app/actions";
import { STEPS, STATUS_LABEL } from "@/lib/config";
import { fmtDateTime, inr } from "@/lib/format";
import Icon from "./Icon";

function MiniCar() {
  return (
    <svg viewBox="0 0 70 36" aria-hidden="true">
      <path d="M4 26 L4 19 Q4 16 8 15 L18 14 C22 8 27 6 33 6 L43 6 C49 7 52 10 55 14 L63 16 Q67 17 67 21 L67 26 Z" fill="#C8452B" stroke="#F7F1E3" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M21 14 C24 10 28 9 33 9 L42 9 C46 10 49 12 51 14 Z" fill="#CFE3E6" />
      <circle cx="19" cy="27" r="6" fill="#22262E" stroke="#F7F1E3" strokeWidth="1.5" />
      <circle cx="53" cy="27" r="6" fill="#22262E" stroke="#F7F1E3" strokeWidth="1.5" />
      <circle cx="19" cy="27" r="2" fill="#F7F1E3" />
      <circle cx="53" cy="27" r="2" fill="#F7F1E3" />
    </svg>
  );
}

export default function StatusTracker({ jobId, initial, estMin, estMax, vehicleLabel, query, code, jobItems }) {
  const [data, setData] = useState(initial);

  useEffect(() => {
    if (["DELIVERED", "CANCELLED"].includes(data.status)) return;
    const t = setInterval(async () => {
      const next = await getJobStatus(jobId);
      if (next) setData(next);
    }, 8000);
    return () => clearInterval(t);
  }, [jobId, data.status]);

  const cancelled = data.status === "CANCELLED";
  const idx = Math.max(0, STEPS.findIndex((s) => s.key === data.status));
  const pct = (idx / (STEPS.length - 1)) * 100;
  const current = STEPS[idx];
  const logFor = (key) => [...data.logs].reverse().find((l) => l.status === key);
  const done = data.status === "DELIVERED";

  return (
    <div className="track-grid">
      <div className="stack">
        <div className="track-hero">
          <span className="pill">{!done && !cancelled && <i className="pulse" />} {code} · {vehicleLabel}</span>
          <h2>{cancelled ? "This request was cancelled" : current.title}</h2>
          <p>{cancelled ? "Please contact the garage if this was a mistake." : current.desc}</p>
          {!cancelled && (
            <div className="road">
              <div className="road-line" />
              <div className="road-fill" style={{ width: `${pct}%` }} />
              <div className="road-stops">
                {STEPS.map((s, i) => <i key={s.key} className={i <= idx ? "done" : ""} />)}
              </div>
              <div className="road-car" style={{ left: `${Math.min(Math.max(pct, 6), 94)}%` }}><MiniCar /></div>
            </div>
          )}
          {!cancelled && (
            <div className="row between tiny" style={{ color: "#cfc8b6" }}>
              {STEPS.map((s, i) => <span key={s.key} style={{ color: i <= idx ? "#fff" : undefined, fontWeight: i === idx ? 700 : 500 }}>{s.label}</span>)}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 18 }}>Progress</h3>
          <ol className="timeline">
            {STEPS.map((s, i) => {
              const state = i < idx || done ? "done" : i === idx ? "now" : "todo";
              const log = logFor(s.key);
              return (
                <li key={s.key} className={`tl ${state}`}>
                  <span className="dot">{state === "done" ? <Icon name="check" size={18} stroke={3} /> : <span style={{ fontWeight: 700, fontSize: 13 }}>{i + 1}</span>}</span>
                  <div>
                    <h4>{s.title}</h4>
                    <p>{log?.note && log.note !== "Request received" ? log.note : s.desc}</p>
                    {log && <div className="when">{fmtDateTime(log.at)}</div>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="stack">
        <div className="card">
          <h3>Your request</h3>
          <p className="muted" style={{ marginBottom: 0 }}>“{query}”</p>
        </div>
        <div className="card">
          <h3>Charges</h3>
          {data.bill ? (
            <>
              <div className="est-total" style={{ paddingTop: 0 }}>
                <span className="muted">Final bill</span>
                <b>{inr(data.bill.total)}</b>
              </div>
              <span className={`badge ${data.bill.paid ? "paid" : "unpaid"}`}>{data.bill.paid ? "Paid" : "Pay at garage"}</span>
              <Link href={`/bills/${data.bill.id}`} className="btn btn-primary btn-block" style={{ marginTop: 14 }}>View final bill</Link>
            </>
          ) : (
            <>
              <div className="est-total" style={{ paddingTop: 0 }}>
                <span className="muted">Estimate</span>
                <b style={{ fontSize: "1.3rem" }}>{inr(estMin)} – {inr(estMax)}</b>
              </div>
              <ul className="small muted" style={{ paddingLeft: 18, margin: "10px 0 0" }}>
                {jobItems.map((i, k) => <li key={k}>{i.description}</li>)}
              </ul>
              <p className="tiny muted" style={{ marginTop: 10 }}>Final charge appears here once the work is tested. Status: {STATUS_LABEL[data.status]}.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
