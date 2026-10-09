"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "./Icon";

const CAT_ICON = { Repairing: "wrench", Washing: "droplet", Modification: "sparkles", Maintenance: "settings" };

// data[type][category] = [{ id, name, price }]
export default function HomeServices({ types, categories, blurbs, data, mine, vehicleByType, showPrices }) {
  const available = types.filter((t) => data[t.key]);
  const start = mine.filter((k) => data[k]).length ? mine.filter((k) => data[k]) : available.slice(0, 1).map((t) => t.key);
  const [sel, setSel] = useState(start);
  const toggle = (k) => setSel((s) => (s.includes(k) ? (s.length > 1 ? s.filter((x) => x !== k) : s) : [...s, k]));
  const money = (n) => "$" + Number(n).toLocaleString("en-US");

  return (
    <>
      <div className="chips" style={{ margin: "0 0 18px", justifyContent: "center" }}>
        {available.map((t) => (
          <button key={t.key} type="button" className="chip" aria-pressed={sel.includes(t.key)}
            style={sel.includes(t.key) ? { background: "var(--ink)", color: "var(--cream)", borderColor: "var(--ink)" } : undefined}
            onClick={() => toggle(t.key)}>
            {t.label}{mine.includes(t.key) ? " · your vehicle" : ""}
          </button>
        ))}
      </div>

      {sel.map((k) => {
        const t = types.find((x) => x.key === k);
        const vid = vehicleByType[k];
        const book = (q) => `/book?q=${encodeURIComponent(q)}${vid ? `&vehicle=${vid}` : ""}`;
        return (
          <div key={k} style={{ marginBottom: 28 }}>
            <h3 style={{ margin: "0 0 12px" }}>Services for your {t.label}</h3>
            <div className="grid grid-4">
              {categories.map((cat) => {
                const list = data[k][cat] || [];
                return (
                  <div className="card service-card" key={cat}>
                    <div className="ico"><Icon name={CAT_ICON[cat]} size={24} /></div>
                    <h3>{cat}</h3>
                    <p className="muted small">{blurbs[cat]}</p>
                    <ul className="svc-scroll">
                      {list.map((s) => (
                        <li key={s.id}>
                          <Link href={book(s.name)}>
                            <span>{s.name}</span>
                            {showPrices && <span>{money(s.price)}</span>}
                          </Link>
                        </li>
                      ))}
                      <li className="others">
                        <Link href={vid ? `/book?other=1&vehicle=${vid}` : "/book?other=1"}><span>Others — write your own</span><Icon name="arrow" size={14} /></Link>
                      </li>
                    </ul>
                    <Link href={book(`${cat.toLowerCase()} service`)} className="btn-link">
                      Get {cat.toLowerCase()} estimate <Icon name="arrow" size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
