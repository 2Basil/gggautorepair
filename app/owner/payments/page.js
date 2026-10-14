import { requireStaff } from "@/lib/auth";
import { getPaymentMethods } from "@/lib/paymentMethods";
import PaymentMethodsManager from "./PaymentMethodsManager";

export const dynamic = "force-dynamic";

export default async function OwnerPaymentsPage() {
  await requireStaff();
  const methods = await getPaymentMethods(false);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Owner portal · Billing &amp; Finance</span>
          <h1>Receiving Methods &amp; Gateways</h1>
          <div className="muted small">
            Configure how your garage receives payments from customers. Active methods appear directly on the customer invoice &amp; payment page.
          </div>
        </div>
      </div>

      <PaymentMethodsManager initialMethods={methods} />
    </>
  );
}
