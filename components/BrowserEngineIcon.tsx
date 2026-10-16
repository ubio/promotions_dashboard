import {
  BROWSER_ENGINE_LABEL,
  type BrowserEngine,
} from "@/lib/validation-setup";

function CloakIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="#3c4156"
        d="M8 1.2C5.6 2.6 3.2 3.4 1.6 3.6c.5 4.4 2.4 7.5 6.4 10 4-2.5 5.9-5.6 6.4-10C12.8 3.4 10.4 2.6 8 1.2z"
      />
      <path
        fill="#d9dbe8"
        d="M8 4.4c-1.3.7-2.6 1.1-3.4 1.2.3 2.2 1.3 3.8 3.4 5.1 2.1-1.3 3.1-2.9 3.4-5.1-0.8-.1-2.1-.5-3.4-1.2z"
      />
    </svg>
  );
}

function CamoufoxIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path fill="#e07a2f" d="M3.2 2.2 6.4 6.2 2.4 7.2z" />
      <path fill="#e07a2f" d="M12.8 2.2 9.6 6.2 13.6 7.2z" />
      <path
        fill="#f4a261"
        d="M8 5.2c-2.6 0-4.4 1.8-4.6 4.2-.1 2.2 1.6 4.4 4.6 4.4s4.7-2.2 4.6-4.4C12.4 7 10.6 5.2 8 5.2z"
      />
      <circle cx="6.2" cy="8.6" r="0.7" fill="#242635" />
      <circle cx="9.8" cy="8.6" r="0.7" fill="#242635" />
      <path fill="#242635" d="M7.3 10.2h1.4l-.7 1z" />
    </svg>
  );
}

function VeilIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="#6d63c4"
        d="M3 2.2h10c-.2 2.2-.6 4.2-1.2 6.2-.7 2.2-1.6 4-2.8 5.4-1.2-1.4-2.1-3.2-2.8-5.4C3.6 6.4 3.2 4.4 3 2.2z"
      />
      <path fill="#eceafa" d="M5.2 2.2h5.6c-.15 1.6-.45 3.1-.9 4.6H6.1c-.45-1.5-.75-3-0.9-4.6z" />
      <path fill="#5045aa" d="M4.2 1.4h7.6v1.2H4.2z" />
    </svg>
  );
}

function ChromiumfishIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="#0f8f8a"
        d="M1.6 8c2.2-2.6 4.8-3.8 8.2-3.6 1.2.1 2.2.4 3.2.9-.6.5-1.2 1.1-1.2 2.7s.6 2.2 1.2 2.7c-1 .5-2 .8-3.2.9-3.4.2-6-1-8.2-3.6z"
      />
      <path fill="#9ee7e2" d="M2.4 8c1.2.9 2.2 1.2 3.4 1.1-1.1-.2-2.2-.6-3.4-1.1z" />
      <circle cx="10.4" cy="7.5" r="0.7" fill="#242635" />
    </svg>
  );
}

function ChromatonIcon() {
  return (
    // Favicon from the Chromaton repo (branding/chromaton/icon.png).
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/browsers/chromaton.png" alt="" width={16} height={16} aria-hidden="true" />
  );
}

function glyph(engine: BrowserEngine) {
  switch (engine) {
    case "cloak":
      return <CloakIcon />;
    case "camoufox":
      return <CamoufoxIcon />;
    case "veil":
      return <VeilIcon />;
    case "chromiumfish":
      return <ChromiumfishIcon />;
    case "chromaton":
      return <ChromatonIcon />;
  }
}

export default function BrowserEngineIcon({ engine }: { engine: BrowserEngine }) {
  const label = BROWSER_ENGINE_LABEL[engine];
  return (
    <span title={label} role="img" aria-label={label} className="inline-flex shrink-0">
      {glyph(engine)}
    </span>
  );
}
