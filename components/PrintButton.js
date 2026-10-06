"use client";

import Icon from "./Icon";

export default function PrintButton() {
  return (
    <button className="btn btn-dark" onClick={() => window.print()}>
      <Icon name="print" size={18} /> Print / Save as PDF
    </button>
  );
}
