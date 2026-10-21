"use client";
import { useEffect } from "react";
export default function AuthRedirect() {
  useEffect(() => {
    if (
      window.location.pathname !== "/admin" &&
      /(?:invite_token|recovery_token|confirmation_token|access_token|email_change_token)=/.test(
        window.location.hash,
      )
    ) {
      window.location.replace("/admin" + window.location.hash);
    }
  }, []);
  return null;
}
