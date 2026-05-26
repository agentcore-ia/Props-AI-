import { redirect } from "next/navigation";

import {
  AppContactRequestsWorkspace,
  type AppContactRequest,
} from "@/components/admin/app-contact-requests-workspace";
import { getCurrentUserContext } from "@/lib/auth/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ContactRequestRow = {
  id: string;
  full_name: string;
  agency_name: string;
  email: string;
  phone: string;
  message: string;
  source: string;
  status: string;
  notes: string;
  created_at: string;
};

export default async function AppContactRequestsPage() {
  const currentUser = await getCurrentUserContext();

  if (!currentUser) {
    return null;
  }

  if (currentUser.profile.role !== "superadmin") {
    redirect("/dashboard");
  }

  const { data } = await createAdminClient()
    .from("app_contact_requests")
    .select("id, full_name, agency_name, email, phone, message, source, status, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const requests: AppContactRequest[] = ((data ?? []) as ContactRequestRow[]).map((request) => ({
    id: request.id,
    fullName: request.full_name,
    agencyName: request.agency_name,
    email: request.email,
    phone: request.phone,
    message: request.message,
    source: request.source,
    status: request.status,
    notes: request.notes,
    createdAt: request.created_at,
  }));

  return <AppContactRequestsWorkspace requests={requests} />;
}
