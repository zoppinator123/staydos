import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function WorkLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  return <div className="flex h-screen overflow-hidden">{children}</div>;
}
