"use server";

import { redirect } from "next/navigation";
import { authenticate, endPartnerSession, startPartnerSession } from "@/lib/partner-auth";

export async function coordinatorLoginAction(formData: FormData) {
  const user = await authenticate(String(formData.get("email") ?? ""), String(formData.get("password") ?? "")).catch((error) => {
    console.error("[shifain] coordinator sign-in failed", error);
    return null;
  });
  if (!user || user.role !== "coordinator") redirect("/coordinator/login?error=1");
  await startPartnerSession(user);
  redirect("/coordinator");
}

export async function coordinatorLogoutAction() {
  await endPartnerSession();
  redirect("/coordinator/login");
}
