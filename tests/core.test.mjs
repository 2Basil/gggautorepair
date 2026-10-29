import { test } from "node:test";
import assert from "node:assert/strict";
import { billTotals } from "../lib/format.js";
import { estimateState } from "../lib/estimateState.js";

test("billTotals: subtotal, discount, tax, total", () => {
  const t = billTotals([{ qty: 2, unitPrice: 50 }, { qty: 1, unitPrice: 20 }], 20, 10);
  assert.equal(t.subtotal, 120);
  assert.equal(t.discount, 20);
  assert.equal(t.tax, 10); // 10% of (120-20)
  assert.equal(t.total, 110);
});

test("billTotals: discount can never exceed subtotal", () => {
  const t = billTotals([{ qty: 1, unitPrice: 30 }], 500, 0);
  assert.equal(t.total, 0);
});

test("estimateState: uses real fields", () => {
  const s = estimateState({ quotedAt: new Date(), acceptedAt: null, ownerNote: "Bring it in", logs: [] });
  assert.deepEqual(s, { quoted: true, accepted: false, ownerNote: "Bring it in" });
});

test("estimateState: falls back to legacy log text", () => {
  const s = estimateState({ logs: [{ note: "Estimate sent: $50 – $80. Come by" }, { note: "Customer booked service & accepted" }] });
  assert.equal(s.quoted, true);
  assert.equal(s.accepted, true);
  assert.equal(s.ownerNote, "Come by");
});

test("estimateState: nothing sent yet", () => {
  assert.deepEqual(estimateState({ logs: [{ note: "Customer requested price estimate" }] }), { quoted: false, accepted: false, ownerNote: "" });
});

test("normReg strips spaces and uppercases", async () => {
  const { normReg } = await import("../lib/format.js");
  assert.equal(normReg("dl 3c ab-1234"), "DL3CAB1234");
});

test("money formats US dollars", async () => {
  const { money } = await import("../lib/format.js");
  assert.equal(money(1234), "$1,234");
});
