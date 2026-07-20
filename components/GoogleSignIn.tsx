"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (el: HTMLElement, options: object) => void;
        };
      };
    };
  }
}

export default function GoogleSignIn({ clientId, next }: { clientId: string; next: string }) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = () => {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          try {
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              setError(body.error ?? "Sign-in failed. Use your company account.");
              return;
            }
            window.location.assign(next);
          } catch {
            setError("Sign-in failed. Please try again.");
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 280,
      });
    };

    if (window.google) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = init;
    script.onerror = () => setError("Could not load Google sign-in.");
    document.head.appendChild(script);
  }, [clientId, next]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={buttonRef} />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
