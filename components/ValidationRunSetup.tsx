import BrowserEngineIcon from "@/components/BrowserEngineIcon";
import { networkTypeLabel, parseBrowserEngine, parseBrowserEngines } from "@/lib/validation-setup";

export function BrowserCell({ browser }: { browser?: string }) {
  const engine = parseBrowserEngine(browser);
  if (!engine) return <span className="text-faint">—</span>;
  return <BrowserEngineIcon engine={engine} />;
}

export function BrowserSequence({ browsers }: { browsers: unknown }) {
  const engines = parseBrowserEngines(browsers);
  if (engines.length === 0) return <span className="text-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-1">
      {engines.map((engine, index) => (
        <span key={`${engine}-${index}`} className="inline-flex items-center gap-1">
          {index > 0 ? <span className="text-faint">→</span> : null}
          <BrowserEngineIcon engine={engine} />
        </span>
      ))}
    </span>
  );
}

export function ProxyTypeCell({ networkMode }: { networkMode?: string }) {
  const label = networkTypeLabel(networkMode);
  if (!label) return <span className="text-faint">—</span>;
  return <span className="text-xs">{label}</span>;
}
