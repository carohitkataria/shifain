"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

type Tab = "otp" | "email";

const FIELD =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";

export function LoginCard({
  locale,
  googleEnabled,
}: {
  locale: string;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("otp");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("shifain_plan_input");
      if (raw) {
        const input = JSON.parse(raw);
        if (input.contact?.phone) setPhone(input.contact.phone);
        if (input.contact?.email) setEmail(input.contact.email);
      }
    } catch {}
  }, []);

  const sendOtp = useCallback(() => {
    if (!phone.trim()) return;
    setOtpSent(true);
    setError("");
    setOtp(["", "", "", "", "", ""]);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, [phone]);

  const handleOtpChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleOtpKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  const verifyOtp = useCallback(() => {
    const code = otp.join("");
    if (code === "123456") {
      setError("");
      router.push(`/${locale}/portal/patient/dashboard`);
    } else {
      setError("Incorrect code. For this demo, use 123456.");
    }
  }, [otp, locale, router]);

  const emailSignIn = useCallback(() => {
    if (!email.trim()) return;
    router.push(`/${locale}/portal/patient/dashboard`);
  }, [email, locale, router]);

  return (
    <div className="card w-full max-w-md p-8 shadow-xl shadow-ink/5">
      <h2 className="text-center text-2xl font-extrabold tracking-tight text-ink">
        Sign in to Shifain
      </h2>
      <p className="mt-1 text-center text-sm text-ink-soft">
        Your plan, estimates and care — all in one place.
      </p>

      {/* Segmented toggle */}
      <div className="mt-5 flex gap-1 rounded-full bg-surface-muted p-1">
        <button
          type="button"
          className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
            tab === "otp"
              ? "bg-white text-ink shadow-sm"
              : "text-ink-soft hover:text-ink"
          }`}
          onClick={() => { setTab("otp"); setError(""); }}
        >
          Mobile OTP
        </button>
        <button
          type="button"
          className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition ${
            tab === "email"
              ? "bg-white text-ink shadow-sm"
              : "text-ink-soft hover:text-ink"
          }`}
          onClick={() => { setTab("email"); setError(""); }}
        >
          Email / Google
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {/* Mobile OTP tab */}
      {tab === "otp" && (
        <div className="mt-5">
          {!otpSent ? (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Mobile number
                </span>
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="+234 801 234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={FIELD}
                />
              </label>
              <button
                type="button"
                className="btn btn-accent mt-4 w-full"
                onClick={sendOtp}
              >
                Send code
              </button>
            </>
          ) : (
            <>
              <p className="mb-3 text-center text-sm text-ink-soft">
                Enter the 6-digit code sent to <b>{phone}</b>
              </p>
              <div className="flex justify-center gap-2">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="h-[54px] w-[46px] rounded-xl2 border-[1.5px] border-line text-center text-xl font-bold focus:border-brand focus:bg-brand-tint focus:outline-none"
                  />
                ))}
              </div>
              <p className="mt-2 text-center text-[13px] text-ink-soft">
                Demo code: <b className="rounded-md bg-saffron-tint px-2 py-0.5 text-saffron">123456</b>
              </p>
              <button
                type="button"
                className="btn btn-accent mt-4 w-full"
                onClick={verifyOtp}
              >
                Verify &amp; continue
              </button>
              <button
                type="button"
                className="mt-3 block w-full text-center text-sm font-semibold text-brand hover:underline"
                onClick={() => { setOtpSent(false); setError(""); }}
              >
                Use a different number
              </button>
            </>
          )}
        </div>
      )}

      {/* Email / Google tab */}
      {tab === "email" && (
        <div className="mt-5">
          {googleEnabled && (
            <>
              <a
                href={`/api/auth/google?locale=${locale}`}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border border-line bg-white px-3 py-2.5 text-sm font-bold text-ink transition hover:bg-surface-muted"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
                  <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3 0-5.6-2-6.6-4.8h-4v3.1A12 12 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6v-3H1.4a12 12 0 0 0 0 10.7z" />
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 12 0 12 12 0 0 0 1.4 6.6l4 3.1C6.4 6.8 9 4.8 12 4.8z" />
                </svg>
                Continue with Google
              </a>
              <div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>
            </>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
              Email address
            </span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={FIELD}
            />
            <span className="mt-1.5 block text-xs text-ink-muted">
              We&apos;ll email you a sign-in link. No password needed.
            </span>
          </label>
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            onClick={emailSignIn}
          >
            Email me a sign-in link
          </button>
          <p className="mt-3 text-center text-[13px] text-ink-soft">
            Demo: the link opens your dashboard directly.
          </p>
        </div>
      )}

      <p className="mt-5 text-center text-[12.5px] text-ink-soft">
        By continuing you agree to Shifain&apos;s Terms &amp; Privacy Policy.
      </p>
    </div>
  );
}
