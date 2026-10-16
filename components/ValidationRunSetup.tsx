import BrowserEngineIcon from "@/components/BrowserEngineIcon";
import { networkTypeLabel, parseBrowserEngine } from "@/lib/validation-setup";

export default function ValidationRunSetup({
  browser,
  networkMode,
}: {
  browser?: string;
  networkMode?: string;
}) {
  const engine = parseBrowserEngine(browser);
  const network = networkTypeLabel(networkMode);
  if (!engine && !network) return <span className="text-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      {engine ? <BrowserEngineIcon engine={engine} /> : null}
      <span className="text-xs text-text">{network ?? "—"}</span>
    </span>
  );
}
