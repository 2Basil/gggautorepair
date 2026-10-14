import { getUser } from "@/lib/auth";
import HeaderClient, { Brand } from "./HeaderClient";

export { Brand };

export default async function Header() {
  const user = await getUser();
  return <HeaderClient user={user} />;
}
