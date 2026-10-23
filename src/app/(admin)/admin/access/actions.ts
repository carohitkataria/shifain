"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { hashPassword, type PartnerUser } from "@/lib/partner-auth";
import { getDb } from "@/lib/db";
import { FLASH_COOKIE, FLASH_MAX_AGE_SECONDS, FLASH_PATH } from "./flash";

/** Clearing a cookie is only legal from an action, never during a render. */
async function clearFlash(): Promise<void> {
  const jar = await cookies();
  // Deleted with the path it was set with, rather than relying on the jar to
  // match by name alone.
  jar.delete({ name: FLASH_COOKIE, path: FLASH_PATH });
}

/** The Done button under a freshly generated password. */
export async function dismissPasswordAction() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  await clearFlash();
  revalidatePath("/admin/access");
  redirect("/admin/access");
}

export async function savePartnerAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "doctor");
  const doctorId = String(formData.get("doctorId") ?? "").trim() || null;
  const hospitalId = String(formData.get("hospitalId") ?? "").trim() || null;
  const typed = String(formData.get("password") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40) || null;
  const telegram = String(formData.get("telegram") ?? "").trim().replace(/^@/, "").slice(0, 60) || null;
  const languages = String(formData.get("languages") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (!email || !name || !["doctor", "hospital", "coordinator"].includes(role)) {
    redirect("/admin/access?error=1");
  }

  const password = typed || crypto.randomBytes(12).toString("base64url");
  const db = await getDb();
  const users = db.collection<PartnerUser>("partner_users");
  const existing = await users.findOne({ email });

  await users.updateOne(
    { email },
    {
      $set: {
        email,
        name,
        role: role as PartnerUser["role"],
        doctorId,
        hospitalId,
        // Saving the form again keeps contact details already on file unless new ones are typed.
        ...(phone ? { phone } : {}),
        ...(telegram ? { telegram } : {}),
        ...(languages.length ? { languages } : {}),
        passwordHash: hashPassword(password),
        status: "active",
      },
      $setOnInsert: {
        _id: `pu-${crypto.randomBytes(8).toString("hex")}`,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      },
    },
    { upsert: true },
  );

  if (typed) {
    // A password the admin chose is never echoed back, so drop any stale one.
    await clearFlash();
  } else {
    const jar = await cookies();
    jar.set(FLASH_COOKIE, Buffer.from(JSON.stringify({ email, password })).toString("base64url"), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: FLASH_PATH,
      maxAge: FLASH_MAX_AGE_SECONDS,
    });
  }

  revalidatePath("/admin/access");
  redirect(`/admin/access?saved=${existing ? "updated" : "created"}`);
}

/**
 * Regenerates a password. The old one cannot be shown again — only its hash is
 * kept — so resetting and handing over the new one is the whole recovery path.
 */
export async function resetPartnerPasswordAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/access");

  const db = await getDb();
  const users = db.collection<PartnerUser>("partner_users");
  const user = await users.findOne({ _id: id });
  if (!user) redirect("/admin/access");

  const password = crypto.randomBytes(12).toString("base64url");
  await users.updateOne({ _id: id }, { $set: { passwordHash: hashPassword(password) } });

  const jar = await cookies();
  jar.set(
    FLASH_COOKIE,
    Buffer.from(JSON.stringify({ email: user.email, password })).toString("base64url"),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: FLASH_PATH,
      maxAge: FLASH_MAX_AGE_SECONDS,
    },
  );

  revalidatePath("/admin/access");
  redirect("/admin/access?saved=reset");
}

/** Removes a login outright. The cases they referred are not touched. */
export async function deletePartnerAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  await clearFlash();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/access");

  const db = await getDb();
  await db.collection<PartnerUser>("partner_users").deleteOne({ _id: id });

  revalidatePath("/admin/access");
  redirect("/admin/access?saved=deleted");
}

export async function setPartnerStatusAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  await clearFlash();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["active", "suspended"].includes(status)) redirect("/admin/access");

  const db = await getDb();
  await db
    .collection<PartnerUser>("partner_users")
    .updateOne({ _id: id }, { $set: { status: status as PartnerUser["status"] } });

  revalidatePath("/admin/access");
  redirect("/admin/access");
}
