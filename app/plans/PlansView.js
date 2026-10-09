"use client";

import { SHOW_PRICES } from "@/lib/settings";
import { useState } from "react";
import Link from "next/link";
import { subscribePlan } from "@/app/actions";
import { money } from "@/lib/format";
import Icon from "@/components/Icon";

export default function PlansView({ plans, vehicles, loggedIn }) {
  const [period, setPeriod] = useState("MONTHLY");
  const [open, setOpen] = useState(null);
  const shown = plans.filter((p) => p.period === period);

  return (
    <>
      <div className="center" style={{ marginBottom: 30 }}>
        <div className="toggle">
          <button className={period === "MONTHLY" ? "on" : ""} onClick={() => setPeriod("MONTHLY")}>Monthly</button>
          <button className={period === "YEARLY" ? "on" : ""} onClick={() => setPeriod("YEARLY")}>Yearly · save 2 months</button>
        </div>
      </div>
      <div className="grid grid-3" style={{ alignItems: "stretch" }}>
        {shown.map((p) => (
          <div key={p.id} className={`card plan ${p.popular ? "popular" : ""}`}>
            {p.popular && <span className="tag">MOST POPULAR</span>}
            <h3>{p.name}</h3>
            {SHOW_PRICES.plans && <div className="price">{money(p.price)}<small> / {period === "YEARLY" ? "year" : "month"}</small></div>}
            {SHOW_PRICES.plans && period === "YEARLY" && <div className="tiny muted">That is {money(Math.round(p.price / 12))} a month</div>}
            <ul>
              {p.perks.map((x) => (
                <li key={x}><Icon name="check" size={16} stroke={2.4} /> {x}</li>
              ))}
            </ul>
            {!loggedIn ? (
              <Link href="/login?next=/plans" className="btn btn-dark">Log in to subscribe</Link>
            ) : vehicles.length === 0 ? (
              <Link href="/vehicles/new" className="btn btn-dark">Add a vehicle first</Link>
            ) : open === p.id ? (
              <form action={subscribePlan}>
                <input type="hidden" name="planId" value={p.id} />
                <div className="field">
                  <label>Apply to which vehicle?</label>
                  <select name="vehicleId">
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary btn-block">Confirm {p.name}</button>
                <p className="tiny muted" style={{ marginTop: 8 }}>You pay at the garage — no online payment needed.</p>
              </form>
            ) : (
              <button className={`btn ${p.popular ? "btn-primary" : "btn-dark"}`} onClick={() => setOpen(p.id)}>Choose {p.name}</button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
