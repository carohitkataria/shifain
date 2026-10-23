"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { deleteProvider, saveProvider } from "@/lib/journey";
import type { ProviderKind } from "@/lib/journey-rules";

const text = (formData: FormData, name: string, max = 200) => {
  const value = String(formData.get(name) ?? "").trim().slice(0, max);
  return value || null;
};
const number = (formData: FormData, name: string) => {
  const value = Number(text(formData, name, 12) ?? "");
  return Number.isFinite(value) && value > 0 ? value : null;
};

export async function saveProviderAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const kind = (["driver", "hotel", "interpreter"].includes(String(formData.get("kind"))) ? formData.get("kind") : "driver") as ProviderKind;
  const name = text(formData, "name", 120);
  if (!name) redirect(`/admin/providers?kind=${kind}&error=name`);
  await saveProvider({
    _id: text(formData, "id", 60),
    kind,
    name: name!,
    phone: text(formData, "phone", 40),
    telegram: text(formData, "telegram", 60)?.replace(/^@/, "") ?? null,
    whatsapp: text(formData, "whatsapp", 40),
    city: text(formData, "city", 80),
    languages: String(formData.get("languages") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8),
    vehicle:
      kind === "driver"
        ? { model: text(formData, "model", 60), plate: text(formData, "plate", 20)?.toUpperCase() ?? null, colour: text(formData, "colour", 30), seats: number(formData, "seats") }
        : null,
    address: kind === "hotel" ? text(formData, "address", 240) : null,
    hospitalIds: kind === "hotel" ? formData.getAll("hospitalIds").map(String).filter(Boolean).slice(0, 10) : [],
    distanceKm: kind === "hotel" ? number(formData, "distanceKm") : null,
    checkInTime: kind === "hotel" ? text(formData, "checkInTime", 5) : null,
    checkOutTime: kind === "hotel" ? text(formData, "checkOutTime", 5) : null,
    note: text(formData, "note", 300),
    active: formData.get("active") !== "off",
  });
  revalidatePath("/admin/providers");
  redirect(`/admin/providers?kind=${kind}&saved=1`);
}

export async function deleteProviderAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const id = text(formData, "id", 60);
  if (id) await deleteProvider(id);
  revalidatePath("/admin/providers");
  redirect(`/admin/providers?kind=${text(formData, "kind", 20) ?? "driver"}&saved=1`);
}
