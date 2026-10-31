"use server";

import { redirect } from "next/navigation";
import { endPartnerSession } from "@/lib/partner-auth";

// Coordinators sign in on the team page, /admin/login (loginAction there).

export async function coordinatorLogoutAction() {
  await endPartnerSession();
  redirect("/admin/login");
}
