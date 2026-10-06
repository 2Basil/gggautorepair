import { VEHICLE_TYPES } from "./config";

const STOP = new Set(["the", "a", "an", "my", "is", "are", "and", "to", "of", "in", "on", "it", "for", "with", "when", "car", "please"]);

function norm(s) {
  return " " + String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim() + " ";
}

const round10 = (n) => Math.round(n / 10) * 10;

/**
 * Keyword-match a free-text query against the service catalogue and price it for a vehicle type.
 * Pure function — safe to call on server or client.
 */
export function estimateFor(query, services, vehicleType = "HATCHBACK") {
  const q = norm(query);
  const words = q.trim().split(" ").filter((w) => w && !STOP.has(w));
  const mult = (VEHICLE_TYPES[vehicleType] || VEHICLE_TYPES.HATCHBACK).multiplier;

  const scored = [];
  for (const s of services) {
    if (!s.active) continue;
    let score = 0;
    const kws = s.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    for (const k of kws) {
      if (k.includes(" ")) {
        if (q.includes(" " + k + " ")) score += 3; // phrase match is strong
        else if (q.includes(k)) score += 2;
      } else if (q.includes(" " + k + " ")) score += 2;
      else if (k.length >= 5 && words.some((w) => w.length >= 5 && w.startsWith(k.slice(0, 5)))) score += 1;
    }
    if (norm(s.name).includes(q) && q.trim().length > 3) score += 3;
    if (score > 0) scored.push({ s, score });
  }
  scored.sort((a, b) => b.score - a.score);

  let picked = scored.slice(0, 4).map((x) => x.s);
  let matched = picked.length > 0;
  if (!matched) {
    const fallback = services.find((s) => s.active && /diagnos|inspection/i.test(s.name));
    picked = fallback ? [fallback] : [];
  }

  const items = picked.map((s) => {
    const price = s.basePrice * mult;
    return {
      serviceId: s.id,
      name: s.name,
      category: s.category,
      description: s.description,
      min: round10(price * 0.9),
      max: round10(price * 1.25),
      mid: round10(price * 1.05),
    };
  });
  return {
    matched,
    items,
    min: items.reduce((a, i) => a + i.min, 0),
    max: items.reduce((a, i) => a + i.max, 0),
  };
}
