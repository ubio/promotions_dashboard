// Placeholder brand mark: a tag (the offer) with a check (validated).
// To use the official artwork instead, drop it in public/ and swap the <svg>
// here for an <Image>; nothing else references the mark directly.
export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="UBIO Promotions"
    >
      <path
        d="M3.2 10.4V4.9A1.7 1.7 0 0 1 4.9 3.2h5.5c.45 0 .88.18 1.2.5l8.6 8.6a1.7 1.7 0 0 1 0 2.4l-5.5 5.5a1.7 1.7 0 0 1-2.4 0l-8.6-8.6a1.7 1.7 0 0 1-.5-1.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="7.7" cy="7.7" r="1.35" fill="currentColor" />
      <path
        d="m10.9 13.4 1.9 1.9 3.9-3.9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ subdued = false }: { subdued?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className={`h-6 w-6 ${subdued ? "text-sky-600" : "text-sky-400"}`} />
      <span className="font-semibold tracking-tight whitespace-nowrap">
        UBIO <span className={subdued ? "text-sky-600" : "text-sky-400"}>Promotions</span>
      </span>
    </span>
  );
}
