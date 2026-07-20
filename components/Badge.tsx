const STYLES: Record<string, string> = {
  valid: "bg-green-100 text-green-800",
  invalid: "bg-red-100 text-red-700",
  cannot_validate: "bg-amber-100 text-amber-800",
  insufficient_validations: "bg-slate-200 text-slate-700",
  unknown: "bg-slate-100 text-slate-500",
  success: "bg-green-100 text-green-800",
  fail: "bg-red-100 text-red-700",
  conclusion: "bg-sky-100 text-sky-800",
  error: "bg-orange-100 text-orange-800",
  code: "bg-slate-100 text-slate-600 font-mono",
};

export default function Badge({
  children,
  variant = "unknown",
}: {
  children: React.ReactNode;
  variant?: string;
}) {
  const style = STYLES[variant] ?? STYLES.unknown;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${style}`}
    >
      {children}
    </span>
  );
}
