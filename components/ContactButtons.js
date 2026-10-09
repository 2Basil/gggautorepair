import { telLink, waLink, mailLink } from "@/lib/contact";

// Plain links: they open the phone dialer / WhatsApp / mail app with the message ready.
export default function ContactButtons({ phone, email, text, subject, size = "btn-sm" }) {
  const tel = telLink(phone);
  const wa = waLink(phone, text);
  const mail = mailLink(email, subject, text);
  return (
    <span className="row" style={{ gap: 6, flexWrap: "wrap" }}>
      {tel && <a className={`btn btn-ghost ${size}`} href={tel}>Call</a>}
      {wa && <a className={`btn btn-ghost ${size}`} href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
      {mail && <a className={`btn btn-ghost ${size}`} href={mail}>Email</a>}
    </span>
  );
}
