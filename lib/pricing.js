// Self-learning price estimator (no external AI service).
//
// How it works
//  1. UNDERSTAND: the customer's text is matched to services using (a) the keywords in the price list and
//     (b) words the system has *learned* from past bills ("squeaky brakes" -> "Brake Pad Replacement").
//  2. PRICE: for every service it finds, it looks at what that service really cost on past bills,
//     weighting bills of the same make+model most, then same make, then same body type, newer bills more.
//     Prices from other body types are scaled with the body-type multiplier first. The price list is
//     used as a starting guess and its influence fades as real bills accumulate.
//  3. LEARN: every generated bill is stored as PriceSample rows (see learnFromBill in lib/learn.js);
//     nothing to "retrain" — the next estimate already uses it.
//
// Pure functions only (no database access) so it can be unit-tested.

import { VEHICLE_TYPES } from "./config";

const STOP = new Set([
  "the", "a", "an", "my", "is", "are", "and", "to", "of", "in", "on", "it", "for", "with", "when", "car", "please", "need", "want",
  "i", "me", "has", "have", "had", "be", "this", "that", "at", "from", "very", "some", "also", "would", "like", "much", "little", "bit",
]);

const mult = (t) => (VEHICLE_TYPES[t] || VEHICLE_TYPES.HATCHBACK).multiplier;
const round10 = (n) => Math.max(0, Math.round(n / 10) * 10);
const key = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

function stem(w) {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP.has(w))
    .map(stem);
}

/* ------------------------------ 1. build model ----------------------------- */

export function buildModel(samples, services) {
  const byDesc = new Map(); // descKey -> { name, category, samples[] }
  const tokDesc = new Map(); // token -> Map(descKey -> bills containing both)
  const tokTotal = new Map(); // token -> bills containing token

  for (const s of samples) {
    const k = key(s.description);
    if (!k) continue;
    if (!byDesc.has(k)) byDesc.set(k, { name: s.description.trim(), category: s.category, samples: [] });
    byDesc.get(k).samples.push(s);

    for (const t of new Set(tokenize(s.queryText))) {
      if (!tokDesc.has(t)) tokDesc.set(t, new Map());
      const m = tokDesc.get(t);
      m.set(k, (m.get(k) || 0) + 1);
      tokTotal.set(t, (tokTotal.get(t) || 0) + 1);
    }
  }

  const catalogue = new Map();
  for (const s of services) if (s.active !== false) catalogue.set(key(s.name), s);

  return { byDesc, tokDesc, tokTotal, catalogue, sampleCount: samples.length };
}

/* ------------------------------ 2. understand ------------------------------ */

function keywordScore(service, q, words) {
  let score = 0;
  const kws = String(service.keywords || "").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  for (const k of kws) {
    if (k.includes(" ")) {
      if (q.includes(" " + k + " ")) score += 3;
      else if (q.includes(k)) score += 2;
    } else if (q.includes(" " + k + " ")) score += 2;
    else if (k.length >= 5 && words.some((w) => w.length >= 5 && w.startsWith(k.slice(0, 5)))) score += 1;
  }
  return score;
}

function normQuery(text) {
  return " " + String(text || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim() + " ";
}

function rankServices(model, queryText) {
  const q = normQuery(queryText);
  const words = q.trim().split(" ").filter((w) => w && !STOP.has(w));
  const qTokens = [...new Set(tokenize(queryText))];
  const keys = new Set([...model.catalogue.keys(), ...model.byDesc.keys()]);
  const out = [];

  for (const k of keys) {
    const svc = model.catalogue.get(k);
    const learned = model.byDesc.get(k);
    const name = svc ? svc.name : learned.name;

    const kw = svc ? keywordScore(svc, q, words) : 0;

    // learned association: how often this wording appeared on bills containing this service
    let assoc = 0;
    for (const t of qTokens) {
      const total = model.tokTotal.get(t);
      if (!total) continue;
      const hit = model.tokDesc.get(t)?.get(k) || 0;
      if (hit) assoc += hit / (total + 1);
    }

    // does the service name itself appear in the text? ("brake pad" in "need brake pad change")
    const nameTokens = [...new Set(tokenize(name))];
    const overlap = nameTokens.length ? nameTokens.filter((t) => qTokens.includes(t)).length / nameTokens.length : 0;

    const score = kw + 3 * assoc + (overlap >= 0.6 ? 2 * overlap : 0);
    if (score > 0) out.push({ k, name, svc, learned, score, category: svc?.category || learned?.category || "Repairing" });
  }
  return out.sort((a, b) => b.score - a.score);
}

/* --------------------------------- 3. price -------------------------------- */

const PRIOR_WEIGHT = 1.5; // how many "bills worth" the price list counts for
const HALF_LIFE_DAYS = 240;

function similarity(s, v) {
  const sameMake = key(s.make) === key(v.make);
  const sameModel = sameMake && key(s.model) === key(v.model);
  if (sameModel) return Math.abs((s.year || 0) - (v.year || 0)) <= 3 ? 1 : 0.85;
  if (sameMake) return s.vehicleType === v.type ? 0.6 : 0.45;
  return s.vehicleType === v.type ? 0.4 : 0.2;
}

function priceService(cand, vehicle, now) {
  const m = mult(vehicle.type);
  let wSum = 0, pSum = 0, sampleW = 0;
  const pts = [];
  let exact = 0, used = 0;

  if (cand.svc) {
    wSum += PRIOR_WEIGHT;
    pSum += PRIOR_WEIGHT * cand.svc.basePrice;
    pts.push({ w: PRIOR_WEIGHT, p: cand.svc.basePrice });
  }
  for (const s of cand.learned?.samples || []) {
    const sim = similarity(s, vehicle);
    const ageDays = Math.max(0, (now - new Date(s.createdAt).getTime()) / 864e5);
    const rec = Math.max(0.25, Math.pow(0.5, ageDays / HALF_LIFE_DAYS));
    const w = sim * rec;
    const norm = s.unitPrice / mult(s.vehicleType); // price as if it were a hatchback
    wSum += w; pSum += w * norm; sampleW += w;
    pts.push({ w, p: norm });
    used++;
    if (sim >= 0.85) exact++;
  }

  const base = pSum / wSum;
  const est = base * m;
  // weighted spread of the evidence
  let varSum = 0;
  for (const x of pts) varSum += x.w * (x.p - base) ** 2;
  const sd = Math.sqrt(varSum / wSum) * m;

  let low, high;
  if (sampleW < 1) { // mostly the price list: keep the original wide band
    low = est * 0.9; high = est * 1.25;
  } else {
    const spread = Math.max(est * 0.08, sd);
    low = est - spread; high = est + spread * 1.15;
    low = Math.max(low, est * 0.7); high = Math.min(high, est * 1.5);
  }

  const confidence = used === 0 ? "price-list" : sampleW < 1.5 ? "low" : sampleW < 4 ? "medium" : "high";
  return { min: round10(low), max: round10(high), mid: round10(est), confidence, samples: used, exact };
}

/* -------------------------------- public API ------------------------------- */

const CONF_ORDER = ["price-list", "low", "medium", "high"];

/**
 * @param {string} query   what the customer wrote
 * @param {{type:string, make:string, model:string, year:number, fuel?:string}} vehicle
 * @param {Array} services price list rows
 * @param {Array} samples  PriceSample rows (active only)
 */
export function predict(query, vehicle, services, samples, now = Date.now()) {
  const model = buildModel(samples, services);
  const ranked = rankServices(model, query);

  let picked = [];
  if (ranked.length) {
    const top = ranked[0].score;
    picked = ranked.filter((r) => r.score >= Math.max(1.5, top * 0.4)).slice(0, 4);
  }
  let matched = picked.length > 0;
  if (!matched) {
    const fb = [...model.catalogue.values()].find((s) => /diagnos|inspection/i.test(s.name));
    if (fb) picked = [{ k: key(fb.name), name: fb.name, svc: fb, learned: model.byDesc.get(key(fb.name)), category: fb.category }];
  }

  const items = picked.map((c) => {
    const pr = priceService(c, vehicle, now);
    return {
      serviceId: c.svc?.id ?? null,
      name: c.name,
      category: c.category,
      description: c.svc?.description || "Based on similar past jobs",
      ...pr,
    };
  });

  const min = items.reduce((a, i) => a + i.min, 0);
  const max = items.reduce((a, i) => a + i.max, 0);
  const overall = items.length ? items.map((i) => i.confidence).sort((a, b) => CONF_ORDER.indexOf(a) - CONF_ORDER.indexOf(b))[0] : "price-list";
  return {
    matched,
    items,
    min,
    max,
    confidence: overall,
    trainedOn: samples.length,
    vehicle: { make: vehicle.make, model: vehicle.model, year: vehicle.year, type: vehicle.type },
  };
}
