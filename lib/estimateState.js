// Estimate state for a job. Uses real fields (quotedAt / acceptedAt / ownerNote);
// falls back to the old log-text markers only for rows created before the fields existed.
const QUOTE_RE = /^Estimate sent:\s*\$[^.]*\.\s*/i;

export function estimateState(job) {
  const logs = job?.logs || [];
  const legacyQuote = logs.find((l) => l.note?.startsWith("Estimate sent:"));
  const quoted = Boolean(job?.quotedAt) || Boolean(legacyQuote);
  const accepted =
    Boolean(job?.acceptedAt) ||
    logs.some((l) => {
      const n = l.note?.toLowerCase() || "";
      return n.includes("customer accepted") || n.includes("booked service");
    });
  const ownerNote = job?.ownerNote ?? (legacyQuote?.note ? legacyQuote.note.replace(QUOTE_RE, "") : "");
  return { quoted, accepted, ownerNote };
}
