"use client";

import { useState, useCallback } from "react";

type BotInfo = { username?: string; name?: string } | null;

export function TelegramSetup({
  patientConfigured,
  partnerConfigured,
}: {
  patientConfigured: boolean;
  partnerConfigured: boolean;
}) {
  const [patientBot, setPatientBot] = useState<BotInfo>(null);
  const [partnerBot, setPartnerBot] = useState<BotInfo>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const setupWebhook = useCallback(async (role: "patient" | "partner") => {
    setLoading(role);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/telegram/setup?bot=${role}&action=register`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to register webhook");
        return;
      }
      if (role === "patient") setPatientBot(data.bot);
      else setPartnerBot(data.bot);
      setSuccess(`${role} bot webhook registered: ${data.webhook}`);
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }, []);

  const checkStatus = useCallback(async (role: "patient" | "partner") => {
    setLoading(`check-${role}`);
    setError("");
    try {
      const res = await fetch(`/api/telegram/setup?bot=${role}`);
      const data = await res.json();
      if (role === "patient") setPatientBot(data.bot);
      else setPartnerBot(data.bot);
      if (data.webhook?.url) {
        setSuccess(`${role} webhook: ${data.webhook.url}`);
      } else {
        setSuccess(`${role} bot: no webhook set`);
      }
    } catch {
      setError("Could not check status");
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-leaf-tint px-3 py-2 text-sm font-semibold text-leaf">{success}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Patient bot */}
        <div className="rounded-xl border border-line p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <h3 className="font-bold text-ink">Patient Bot</h3>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                patientConfigured ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-600"
              }`}
            >
              {patientConfigured ? "configured" : "not set"}
            </span>
          </div>
          {patientBot && (
            <p className="mt-2 text-sm text-ink-soft">
              @{patientBot.username} — {patientBot.name}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setupWebhook("patient")}
              disabled={!patientConfigured || loading !== null}
              className="btn btn-primary !px-3 !py-1.5 text-xs disabled:opacity-50"
            >
              {loading === "patient" ? "Registering..." : "Register webhook"}
            </button>
            <button
              onClick={() => checkStatus("patient")}
              disabled={!patientConfigured || loading !== null}
              className="btn btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-50"
            >
              {loading === "check-patient" ? "Checking..." : "Check status"}
            </button>
          </div>
        </div>

        {/* Partner bot */}
        <div className="rounded-xl border border-line p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤝</span>
            <h3 className="font-bold text-ink">Partner Bot</h3>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                partnerConfigured ? "bg-leaf/10 text-leaf" : "bg-red-50 text-red-600"
              }`}
            >
              {partnerConfigured ? "configured" : "not set"}
            </span>
          </div>
          {partnerBot && (
            <p className="mt-2 text-sm text-ink-soft">
              @{partnerBot.username} — {partnerBot.name}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setupWebhook("partner")}
              disabled={!partnerConfigured || loading !== null}
              className="btn btn-primary !px-3 !py-1.5 text-xs disabled:opacity-50"
            >
              {loading === "partner" ? "Registering..." : "Register webhook"}
            </button>
            <button
              onClick={() => checkStatus("partner")}
              disabled={!partnerConfigured || loading !== null}
              className="btn btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-50"
            >
              {loading === "check-partner" ? "Checking..." : "Check status"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-surface-muted p-4 text-sm text-ink-soft">
        <p className="font-bold text-ink">Setup instructions:</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Create bot(s) via <b>@BotFather</b> on Telegram</li>

          <li>Set <code className="rounded bg-white px-1.5 py-0.5 text-xs font-bold">TELEGRAM_BOT_TOKEN</code> (or separate patient/partner tokens) in your environment</li>
          <li>Deploy and click &ldquo;Register webhook&rdquo; above</li>
          <li>The bot will start receiving messages</li>
        </ol>
      </div>
    </div>
  );
}
