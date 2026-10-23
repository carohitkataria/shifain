import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { CareDesk } from "@/components/desk/CareDesk";
import { isAuthenticated } from "@/lib/auth";
import { deskCase } from "@/lib/desk";

export const dynamic = "force-dynamic";

/** One case at the owner console: the same desk a coordinator works, plus assigning the coordinator. */
export default async function AdminCaseDesk({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ done?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { ref } = await params;
  const { done } = await searchParams;
  const found = await deskCase(ref);
  if (!found) notFound();
  return (
    <AdminShell
      title={`Care desk · ${found.record.patient.name}`}
      subtitle={found.record._id}
      action={
        <Link href="/admin/cases" className="btn btn-secondary text-sm">
          All cases
        </Link>
      }
      fullWidth
    >
      <CareDesk record={found.record} actor={found.actor} back={`/admin/cases/${found.record._id}`} done={done} />
    </AdminShell>
  );
}
