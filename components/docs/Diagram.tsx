"use client";

// Renders a Mermaid diagram in the browser. Mermaid is large, so it is
// imported on first use and only docs pages ever pull it in. Colours come
// from the OSS theme tokens so diagrams match the rest of the dashboard.
import { useEffect, useId, useState } from "react";

function token(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.startsWith("#") ? value : fallback;
}

let initialised = false;

async function loadMermaid() {
  const { default: mermaid } = await import("mermaid");
  if (!initialised) {
    const ink = token("--oss-ink", "#242635");
    const line = token("--oss-line", "#e3e5ef");
    const card = token("--oss-card", "#ffffff");
    const tint = token("--oss-tint", "#faf6fd");
    const primaryTint = token("--oss-primary-tint", "#eceafa");
    const primaryInk = token("--oss-primary-ink", "#5045aa");
    const muted = token("--oss-muted", "#6b6e85");
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "base",
      fontFamily: getComputedStyle(document.body).fontFamily,
      themeVariables: {
        fontSize: "13px",
        background: card,
        primaryColor: primaryTint,
        primaryBorderColor: primaryInk,
        primaryTextColor: ink,
        secondaryColor: tint,
        tertiaryColor: card,
        lineColor: muted,
        textColor: ink,
        clusterBkg: tint,
        clusterBorder: line,
        edgeLabelBackground: card,
        actorBkg: primaryTint,
        actorBorder: primaryInk,
        actorTextColor: ink,
        signalColor: muted,
        signalTextColor: ink,
        labelBoxBkgColor: tint,
        labelBoxBorderColor: line,
        noteBkgColor: tint,
        noteBorderColor: line,
      },
    });
    initialised = true;
  }
  return mermaid;
}

export function Diagram({ chart }: { chart: string }) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMermaid()
      .then((mermaid) => mermaid.render(id, chart.trim()))
      .then((result) => {
        if (!cancelled) setSvg(result.svg);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, chart]);

  if (failed) {
    return (
      <pre className="docs-diagram docs-diagram-source">
        {chart.trim()}
      </pre>
    );
  }
  if (!svg) {
    return <div className="docs-diagram docs-diagram-loading">Drawing diagram…</div>;
  }
  return <div className="docs-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}
