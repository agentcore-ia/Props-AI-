import { InvoicesWorkspace } from "@/components/operations/invoices-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listSupplierInvoices, listSuppliers } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) return null;
  const scope = getAgencyScopeFromUser(currentUser);
  const [suppliers, invoices] = await Promise.all([
    listSuppliers({ ...scope, limit: 50 }),
    listSupplierInvoices({ ...scope, limit: 50 }),
  ]);
  return <InvoicesWorkspace suppliers={suppliers} invoices={invoices} />;
}
