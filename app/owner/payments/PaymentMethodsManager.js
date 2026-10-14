"use client";

import { useState, useTransition } from "react";
import { saveReceivingMethod, toggleReceivingMethodActive, deleteReceivingMethod } from "@/app/actions";
import Icon from "@/components/Icon";

const METHOD_TYPES = [
  { type: "CARD", label: "Credit / Debit Card", icon: "💳", defaultBadge: "Stripe & Square" },
  { type: "ZELLE", label: "Zelle Transfer", icon: "⚡", defaultBadge: "Instant / $0 Fee" },
  { type: "PAYPAL", label: "PayPal & Venmo", icon: "🅿️", defaultBadge: "PayPal / Venmo" },
  { type: "CASHAPP", label: "Cash App Pay", icon: "🟢", defaultBadge: "Square Cash" },
  { type: "APPLE_PAY", label: "Apple Pay & Google Pay", icon: "🍎", defaultBadge: "Digital Wallets" },
  { type: "BANK", label: "Direct Bank Wire / ACH", icon: "🏦", defaultBadge: "US Banking" },
  { type: "CASH", label: "Counter / POS Cash", icon: "💵", defaultBadge: "In-Person" },
  { type: "CUSTOM", label: "Other Custom Gateway", icon: "🪙", defaultBadge: "Direct Pay" },
];

export default function PaymentMethodsManager({ initialMethods = [] }) {
  const [methods, setMethods] = useState(initialMethods);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [pending, startTransition] = useTransition();

  // Form states for creating a new method
  const [newType, setNewType] = useState("ZELLE");
  const [newTitle, setNewTitle] = useState("Zelle Instant Transfer");
  const [newBadge, setNewBadge] = useState("Instant / $0 Fee");
  const [newDetails, setNewDetails] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newInstructions, setNewInstructions] = useState("");

  const activeCount = methods.filter((m) => m.active).length;

  function handleTypeChange(t) {
    setNewType(t);
    const meta = METHOD_TYPES.find((m) => m.type === t);
    if (meta) {
      setNewTitle(meta.label);
      setNewBadge(meta.defaultBadge);
    }
  }

  function handleToggle(id, currentActive) {
    const nextActive = !currentActive;
    setMethods((prev) =>
      prev.map((m) => (m.id === id ? { ...m, active: nextActive } : m))
    );
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", id);
      fd.append("active", String(nextActive));
      await toggleReceivingMethodActive(fd);
    });
  }

  function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this receiving method?")) return;
    setMethods((prev) => prev.filter((m) => m.id !== id));
    startTransition(async () => {
      const fd = new FormData();
      fd.append("id", id);
      await deleteReceivingMethod(fd);
    });
  }

  return (
    <div className="stack" style={{ gap: 22 }}>
      {/* Overview Status Bar */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          padding: "16px 22px",
          background: "linear-gradient(135deg, #181c24, #12151c)",
          color: "#fff",
          borderRadius: 16,
        }}
      >
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          <span className="pulse" style={{ width: 10, height: 10, background: "#4ade80" }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>
              {activeCount} Active Receiving {activeCount === 1 ? "Method" : "Methods"}
            </div>
            <div className="tiny" style={{ color: "#a8a29e", marginTop: 2 }}>
              Customers can choose from these options when settling their invoices.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
          }}
          className="btn btn-primary btn-sm"
          style={{ gap: 6 }}
        >
          <Icon name="plus" size={16} />
          {showAddForm ? "Close Form" : "Add Receiving Method"}
        </button>
      </div>

      {/* Add New Method Drawer / Card */}
      {showAddForm && (
        <form
          action={async (fd) => {
            startTransition(async () => {
              await saveReceivingMethod(fd);
              setShowAddForm(false);
              // Optimistic update
              const newMethod = {
                id: `${newType.toLowerCase()}_${Date.now()}`,
                type: newType,
                title: newTitle,
                badge: newBadge,
                details: newDetails,
                accountName: newAccountName,
                instructions: newInstructions,
                active: true,
              };
              setMethods((prev) => [...prev, newMethod]);
            });
          }}
          className="card"
          style={{
            background: "#fff",
            border: "2px solid var(--accent)",
            borderRadius: 16,
            padding: 22,
          }}
        >
          <h3 style={{ margin: "0 0 4px", fontSize: "1.15rem" }}>+ Add Receiving Account or Method</h3>
          <p className="muted small" style={{ margin: "0 0 16px" }}>
            Add your garage&apos;s Zelle, PayPal, Cash App, Bank Account, or custom payment details.
          </p>

          <div className="grid grid-2" style={{ gap: 14 }}>
            <div className="field">
              <label>Method Type</label>
              <select
                name="type"
                value={newType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                {METHOD_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Title Displayed to Customer</label>
              <input
                name="title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Zelle Instant Transfer"
                required
              />
            </div>

            <div className="field">
              <label>Receiving Details (Email / Phone / $cashtag / Account)</label>
              <input
                name="details"
                value={newDetails}
                onChange={(e) => setNewDetails(e.target.value)}
                placeholder="e.g. payments@zzzauto.com or $ZZZAutoRepair"
                required
              />
            </div>

            <div className="field">
              <label>Beneficiary / Account Name (Optional)</label>
              <input
                name="accountName"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="e.g. ZZZ Auto Care LLC"
              />
            </div>

            <div className="field">
              <label>Badge / Network Tag</label>
              <input
                name="badge"
                value={newBadge}
                onChange={(e) => setNewBadge(e.target.value)}
                placeholder="e.g. Instant / $0 Fee"
              />
            </div>

            <div className="field">
              <label>Payment Instructions for Customer</label>
              <input
                name="instructions"
                value={newInstructions}
                onChange={(e) => setNewInstructions(e.target.value)}
                placeholder="e.g. Include invoice number in payment memo."
              />
            </div>
          </div>

          <input type="hidden" name="active" value="true" />

          <div className="row" style={{ gap: 10, marginTop: 16 }}>
            <button className="btn btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save & Enable Receiving Method"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Methods List */}
      <div style={{ display: "grid", gap: 14 }}>
        {methods.map((m) => {
          const typeMeta = METHOD_TYPES.find((t) => t.type === m.type) || { icon: "💳" };
          const isEditing = editingId === m.id;

          return (
            <div
              key={m.id}
              className="card"
              style={{
                border: m.active ? "1.5px solid rgba(200, 69, 43, 0.25)" : "1px solid var(--line)",
                background: m.active ? "#ffffff" : "#fcfbf9",
                borderRadius: 16,
                padding: "18px 22px",
                opacity: m.active ? 1 : 0.72,
                transition: "all 0.16s ease",
              }}
            >
              {!isEditing ? (
                <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                  <div className="row" style={{ gap: 14, alignItems: "flex-start", flex: 1, minWidth: 260 }}>
                    <span style={{ fontSize: "1.9rem", lineHeight: 1 }}>{typeMeta.icon}</span>
                    <div>
                      <div className="row" style={{ gap: 8, alignItems: "center" }}>
                        <h4 style={{ margin: 0, fontSize: "1.05rem" }}>{m.title}</h4>
                        <span
                          className="badge"
                          style={{
                            fontSize: "0.72rem",
                            background: m.active ? "rgba(200, 69, 43, 0.1)" : "#f3f4f6",
                            color: m.active ? "var(--accent)" : "#6b7280",
                            fontWeight: 700,
                          }}
                        >
                          {m.badge || m.type}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            padding: "2px 7px",
                            borderRadius: 6,
                            background: m.active ? "#dcfce7" : "#fee2e2",
                            color: m.active ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {m.active ? "ACTIVE" : "DISABLED"}
                        </span>
                      </div>

                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
                        {m.details}
                      </div>

                      {m.accountName && (
                        <div className="tiny muted" style={{ marginTop: 2 }}>
                          Account: <b>{m.accountName}</b>
                        </div>
                      )}

                      {m.instructions && (
                        <div className="tiny muted" style={{ marginTop: 2, fontStyle: "italic" }}>
                          “{m.instructions}”
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => handleToggle(m.id, m.active)}
                      className={`btn btn-sm ${m.active ? "btn-dark" : "btn-primary"}`}
                      disabled={pending}
                    >
                      {m.active ? "Turn Off" : "Turn On"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(m.id);
                        setShowAddForm(false);
                      }}
                      className="btn btn-ghost btn-sm"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(m.id)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: "#b91c1c" }}
                      title="Delete method"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                /* Inline Editor */
                <form
                  action={async (fd) => {
                    startTransition(async () => {
                      await saveReceivingMethod(fd);
                      setEditingId(null);
                      // Update local state
                      setMethods((prev) =>
                        prev.map((item) =>
                          item.id === m.id
                            ? {
                                ...item,
                                title: fd.get("title"),
                                badge: fd.get("badge"),
                                details: fd.get("details"),
                                accountName: fd.get("accountName"),
                                instructions: fd.get("instructions"),
                                active: fd.get("active") === "true",
                              }
                            : item
                        )
                      );
                    });
                  }}
                >
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="type" value={m.type} />
                  <input type="hidden" name="active" value={String(m.active)} />

                  <h4 style={{ margin: "0 0 12px" }}>Edit {m.title}</h4>

                  <div className="grid grid-2" style={{ gap: 12 }}>
                    <div className="field">
                      <label>Title</label>
                      <input name="title" defaultValue={m.title} required />
                    </div>
                    <div className="field">
                      <label>Badge / Network Tag</label>
                      <input name="badge" defaultValue={m.badge || ""} />
                    </div>
                    <div className="field">
                      <label>Receiving Details (Account / Email / Tag)</label>
                      <input name="details" defaultValue={m.details} required />
                    </div>
                    <div className="field">
                      <label>Account Name</label>
                      <input name="accountName" defaultValue={m.accountName || ""} />
                    </div>
                    <div className="field" style={{ gridColumn: "1 / -1" }}>
                      <label>Instructions to Customer</label>
                      <input name="instructions" defaultValue={m.instructions || ""} />
                    </div>
                  </div>

                  <div className="row" style={{ gap: 10, marginTop: 14 }}>
                    <button className="btn btn-primary btn-sm" disabled={pending}>
                      {pending ? "Saving…" : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
