import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { coordinatorReply, setWebIntakeProfileExtras } from "@/lib/web-intake";

/**
 * POST /api/admin/web-chat
 *   { sessionId, text }         a coordinator replies; the assistant pauses
 *   { sessionId, handoff: false } hand the chat back to the assistant
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const sessionId = String(body.sessionId ?? "");
  if (!/^web-[a-f0-9]{16}$/.test(sessionId)) return NextResponse.json({ error: "Unknown chat." }, { status: 400 });

  if (body.handoff === false) {
    await setWebIntakeProfileExtras(sessionId, { handoff: false });
    return NextResponse.json({ ok: true });
  }
  const text = String(body.text ?? "").trim();
  if (!text) return NextResponse.json({ error: "Write a message first." }, { status: 400 });
  const ok = await coordinatorReply(sessionId, text);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
