import { NextResponse } from "next/server";

import { getCurrentUserContext } from "@/lib/auth/current-user";
import { markTaskDone } from "@/lib/crm-automation";

export async function POST(
  _request: Request,
  { params }: { params: { taskId: string } }
) {
  const current = await getCurrentUserContext();
  if (!current || !["superadmin", "agency_admin", "agent"].includes(current.profile.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  await markTaskDone(params.taskId);
  return NextResponse.json({ ok: true });
}
