export type BrowserEngine = "cloak" | "camoufox" | "veil" | "chromiumfish" | "chromaton";

const BROWSER_ENGINES: BrowserEngine[] = [
  "cloak",
  "camoufox",
  "veil",
  "chromiumfish",
  "chromaton",
];

export const BROWSER_ENGINE_LABEL: Record<BrowserEngine, string> = {
  cloak: "Cloak",
  camoufox: "Camoufox",
  veil: "Veil",
  chromiumfish: "Chromiumfish",
  chromaton: "Chromaton",
};

export function parseBrowserEngine(value: string | undefined): BrowserEngine | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  for (const engine of BROWSER_ENGINES) {
    if (engine === normalized) return engine;
  }
  return undefined;
}

// `proxy` is a Chrome proxy on the browser. `tun` is the host network (sing-box),
// with no browser proxy. Logs written before the field existed have neither.
export function networkTypeLabel(mode: string | undefined): "browser proxy" | "system proxy" | undefined {
  if (mode === "proxy") return "browser proxy";
  if (mode === "tun") return "system proxy";
  return undefined;
}
