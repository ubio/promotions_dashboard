// Docs diagrams are static SVG markup in ./diagrams, drawn once with Mermaid.
// They are inlined rather than served as image files so they use the page
// font and the --oss-* colours (and so follow dark mode), and so they stay
// behind the docs' internal sign-in instead of sitting in public/.
export function Diagram({ svg }: { svg: string }) {
  return <div className="docs-diagram" dangerouslySetInnerHTML={{ __html: svg }} />;
}
