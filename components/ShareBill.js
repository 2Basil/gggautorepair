import { waLink, mailLink } from "@/lib/contact";
import { baseUrl } from "@/lib/baseUrl";
import { money } from "@/lib/format";
import { GARAGE } from "@/lib/config";

// Opens WhatsApp / the mail app with the bill message and a link to the bill the customer can open after logging in.
export default async function ShareBill({ bill, user, vehicle, size = "btn-sm" }) {
  const url = `${await baseUrl()}/bills/${bill.id}`;
  const text = `Hello ${user.name}, your bill ${bill.number} from ${GARAGE.name} for your ${vehicle.make} ${vehicle.model} (${vehicle.regNo}) is ready. Total: ${money(bill.total)}${bill.paid ? " (paid)" : " — payment due at the garage"}. View it here (log in to see it): ${url}`;
  const wa = waLink(user.phone, text);
  const mail = mailLink(user.email, `Your bill ${bill.number} — ${GARAGE.name}`, text);
  return (
    <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {wa && <a className={`btn btn-ghost ${size}`} href={wa} target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>}
      {mail && <a className={`btn btn-ghost ${size}`} href={mail}>Share by email</a>}
    </span>
  );
}
