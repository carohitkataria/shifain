import { redirect } from "next/navigation";

/** Coordinators sign in on the team page, with their email and password. */
export default function CoordinatorLogin() {
  redirect("/admin/login");
}
