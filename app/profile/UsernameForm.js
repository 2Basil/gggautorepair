"use client";

import { useActionState, useEffect, useState } from "react";
import { updateUsername } from "@/app/actions";
import Icon from "@/components/Icon";

export default function UsernameForm({ current }) {
  const [state, action, pending] = useActionState(updateUsername, null);
  const [val, setVal] = useState(current || "");

  // Keep the input in sync if the server refreshes the page with a new value
  useEffect(() => {
    if (state?.ok && !pending) {
      // state.ok includes the new @handle, extract it
      const match = state.ok.match(/@(\S+)/);
      if (match) setVal(match[1]);
    }
  }, [state, pending]);

  const isValid = /^[a-z0-9_]{3,28}$/.test(val);
  const unchanged = val === (current || "");

  return (
    <form action={action} className="username-form">
      <label htmlFor="username-input" className="field-label">
        <Icon name="at-sign" size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
        Username
      </label>

      {state?.error && (
        <div className="alert err" style={{ marginBottom: 10 }}>{state.error}</div>
      )}
      {state?.ok && (
        <div className="alert ok" style={{ marginBottom: 10 }}>{state.ok}</div>
      )}

      <div className="row" style={{ gap: 8, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <span style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "var(--muted)", fontWeight: 600, pointerEvents: "none", fontSize: "0.95rem",
          }}>@</span>
          <input
            id="username-input"
            name="username"
            value={val}
            minLength={3}
            maxLength={28}
            required
            autoComplete="username"
            style={{ paddingLeft: 28, width: "100%" }}
            onChange={(e) => setVal(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
          disabled={pending || !isValid || unchanged}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>

      <p className="tiny muted" style={{ marginTop: 6 }}>
        {val.length > 0
          ? isValid
            ? unchanged
              ? "This is your current username."
              : `Your handle will be @${val}`
            : "3–28 characters: lowercase letters, numbers, and underscores only."
          : "Choose a unique username (3–28 chars)."}
      </p>
    </form>
  );
}
