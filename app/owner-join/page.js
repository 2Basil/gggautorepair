import { redirect } from "next/navigation";

// Owner sign-up is closed: the owner logs in with the owner email on /login.
export default function OwnerJoin() {
  redirect("/login?next=/owner");
}
