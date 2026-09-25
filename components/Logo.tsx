// The house mark, in the family used by Orbit, Beacon and the Hub: the same
// hexagon shell (ubio/oss-os packages/ui/src/brand.tsx) with a glyph inside
// that belongs to this product — a tag for the offer, a check for validated.
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="UBIO Promotions"
    >
      <path
        d="M24 3 42 13.5v21L24 45 6 34.5v-21Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M17 27.5v-8a1.5 1.5 0 0 1 1.5-1.5h8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m19.5 26.5 4 4 8-9"
        stroke="var(--oss-primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// `UBIO` carries the weight, the product name sits back from it — the same
// lockup the other platforms use in their sidebar and on their login card.
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="flex items-baseline gap-2 whitespace-nowrap">
        <span className="font-bold tracking-tight">UBIO</span>
        <span className="text-[0.95em] font-medium text-muted">Promotions</span>
      </span>
    </span>
  );
}
