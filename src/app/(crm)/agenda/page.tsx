import { AgendaWorkspace } from "@/components/agenda/agenda-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { getAgencyScopeFromUser } from "@/lib/crm-automation";
import { listEmployeeTasks, listVisitAppointments } from "@/lib/props-data";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const currentUser = await getCurrentUserContext();
  if (!currentUser) {
    return null;
  }

  const scope = getAgencyScopeFromUser(currentUser);
  const [visits, tasks] = await Promise.all([
    listVisitAppointments(scope),
    listEmployeeTasks(scope),
  ]);

  return <AgendaWorkspace visits={visits} tasks={tasks} />;
}
