const STYLES: Record<string, string> = {
  valid: "bg-ok-bg text-ok",
  invalid: "bg-bad-bg text-bad",
  cannot_validate: "bg-warn-bg text-warn",
  merchant_automation_issues: "bg-warn-bg text-warn",
  client_facing: "bg-ok-bg text-ok",
  automation_issues: "bg-warn-bg text-warn",
  no_result: "bg-warn-bg text-warn",
  other: "bg-rule text-muted",
  insufficient_validations: "bg-line text-text",
  unknown: "bg-rule text-muted",
  success: "bg-ok-bg text-ok",
  fail: "bg-bad-bg text-bad",
  conclusion: "bg-primary-tint text-primary-ink",
  error: "bg-warn-bg text-warn",
  code: "bg-rule text-text font-mono",
};

export default function Badge({
  children,
  variant = "unknown",
}: {
  children: React.ReactNode;
  variant?: string;
}) {
  const style = STYLES[variant] ?? STYLES.unknown;
  // Fail codes are long identifiers: insert zero-width spaces after underscores
  // so they wrap at segment boundaries instead of mid-word or overflowing.
  const isCode = variant === "code";
  const content =
    isCode && typeof children === "string" ? children.replaceAll("_", "_​") : children;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        isCode ? "max-w-full" : "whitespace-nowrap"
      } ${style}`}
    >
      {content}
    </span>
  );
}
