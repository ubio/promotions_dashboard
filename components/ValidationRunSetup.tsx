import BrowserEngineIcon from "@/components/BrowserEngineIcon";
import { networkTypeLabel, parseBrowserEngine } from "@/lib/validation-setup";

export function BrowserCell({ browser }: { browser?: string }) {
  const engine = parseBrowserEngine(browser);
  if (!engine) return <span className="text-faint">—</span>;
  return <BrowserEngineIcon engine={engine} />;
}

export function ProxyTypeCell({ networkMode }: { networkMode?: string }) {
  const label = networkTypeLabel(networkMode);
  if (!label) return <span className="text-faint">—</span>;
  return <span className="text-xs">{label}</span>;
}
