import { waLink, mailLink } from "@/lib/contact";
import { baseUrl } from "@/lib/baseUrl";
import { money } from "@/lib/format";
import { GARAGE } from "@/lib/config";

// Opens WhatsApp / the mail app with the bill message and a link to the bill the customer can open after logging in.
export default async function ShareBill({ bill, user, vehicle, size = "btn-sm", reminder = false }) {
  const url = `${await baseUrl()}/bills/${bill.id}`;

  // Standard share message (used when bill is shared after generation)
  const shareText = `Hello ${user.name}, your bill ${bill.number} from ${GARAGE.name} for your ${vehicle.make} ${vehicle.model} (${vehicle.regNo}) is ready. Total: ${money(bill.total)}${bill.paid ? " (paid)" : " — payment due at the garage"}. View it here (log in to see it): ${url}`;

  // Payment due reminder message — more urgent tone
  const reminderText = `Hello ${user.name}, this is a friendly reminder from ${GARAGE.name}. Your bill ${bill.number} for your ${vehicle.make} ${vehicle.model} (${vehicle.regNo}) of ${money(bill.total)} is still outstanding. Please visit us or call ${GARAGE.phone} to settle the payment. You can view your bill here: ${url}`;

  const text = reminder ? reminderText : shareText;
  const subject = reminder
    ? `Payment Reminder — ${bill.number} (${money(bill.total)}) — ${GARAGE.name}`
    : `Your bill ${bill.number} — ${GARAGE.name}`;

  const wa = waLink(user.phone, text);
  const mail = mailLink(user.email, subject, text);

  if (reminder) {
    // Due reminder — shown only for unpaid bills, styled in warning colour
    return (
      <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        <span className="muted small" style={{ alignSelf: "center", color: "var(--warn)", fontWeight: 600 }}>
          ⚠ Due reminder:
        </span>
        {wa && (
          <a className={`btn ${size}`} href={wa} target="_blank" rel="noopener noreferrer"
            style={{ background: "#25d366", color: "#fff", border: "none" }}>
            WhatsApp reminder
          </a>
        )}
        {mail && (
          <a className={`btn btn-ghost ${size}`} href={mail}
            style={{ borderColor: "var(--warn)", color: "var(--warn)" }}>
            Email reminder
          </a>
        )}
      </span>
    );
  }

  return (
    <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {wa && <a className={`btn btn-ghost ${size}`} href={wa} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>}
      {mail && <a className={`btn btn-ghost ${size}`} href={mail}>Share by email</a>}
    </span>
  );
}
