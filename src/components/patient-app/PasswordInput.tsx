"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";

/** The password box of the sign-in page, with the eye that shows what was typed. */
export function PasswordInput({ show, hide, placeholder }: { show: string; hide: string; placeholder: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="pl-input">
      <LockKeyhole size={18} strokeWidth={1.75} aria-hidden="true" />
      <input id="pl-password" name="password" type={visible ? "text" : "password"} required autoComplete="current-password" maxLength={200} placeholder={placeholder} />
      <button type="button" className="pl-eye" onClick={() => setVisible((value) => !value)} aria-label={visible ? hide : show} aria-pressed={visible} aria-controls="pl-password">
        {visible ? <Eye size={18} strokeWidth={1.75} aria-hidden="true" /> : <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" />}
      </button>
    </span>
  );
}
