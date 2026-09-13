"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { hashPassword, type PartnerUser } from "@/lib/partner-auth";
import { getDb } from "@/lib/db";

/**
 * A generated password is shown to the admin exactly once. It travels in a
 * short-lived httpOnly cookie rather than the URL, so it never reaches the
 * browser history, a referrer header or a server access log.
 */
const FLASH_COOKIE = "shifain_partner_secret";

export async function readGeneratedPassword(): Promise<{ email: string; password: string } | null> {
  const jar = await cookies();
  const raw = jar.get(FLASH_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export async function clearGeneratedPassword(): Promise<void> {
  const jar = await cookies();
  jar.delete(FLASH_COOKIE);
}

export async function savePartnerAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "doctor");
  const doctorId = String(formData.get("doctorId") ?? "").trim() || null;
  const hospitalId = String(formData.get("hospitalId") ?? "").trim() || null;
  const typed = String(formData.get("password") ?? "").trim();

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

  if (!typed) {
    const jar = await cookies();
    jar.set(FLASH_COOKIE, Buffer.from(JSON.stringify({ email, password })).toString("base64url"), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/admin",
      maxAge: 300,
    });
  }

  revalidatePath("/admin/access");
  redirect(`/admin/access?saved=${existing ? "updated" : "created"}`);
}

export async function setPartnerStatusAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

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
