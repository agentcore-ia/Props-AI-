import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CurrentUserContext = {
  user: {
    id: string;
    email: string | null;
  };
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    role: "superadmin" | "agency_admin" | "agent";
    agency_slug: string | null;
  };
};

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name, role, agency_slug")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
    },
    profile,
  };
}
