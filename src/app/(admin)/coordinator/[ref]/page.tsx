import { notFound, redirect } from "next/navigation";
import { CareDesk } from "@/components/desk/CareDesk";
import { deskActor, deskCase } from "@/lib/desk";
import { CoordinatorShell } from "../CoordinatorShell";

export const dynamic = "force-dynamic";

export default async function CoordinatorCase({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ done?: string }> }) {
  const actor = await deskActor();
  if (!actor) redirect("/coordinator/login");
  const { ref } = await params;
  const { done } = await searchParams;
  const found = await deskCase(ref);
  if (!found) notFound();
  return (
    <CoordinatorShell name={actor.name} title={found.record.patient.name} back="/coordinator">
      <CareDesk record={found.record} actor={found.actor} back={`/coordinator/${found.record._id}`} done={done} />
    </CoordinatorShell>
  );
}
