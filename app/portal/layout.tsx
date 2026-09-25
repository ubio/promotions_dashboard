// Client-facing pages share this footer. Michael's ask: be explicit that the
// portal is a window onto our internal tooling rather than a product, so it
// does not attract feature requests or support expectations.
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1">{children}</div>
      <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400">
        This view comes from UBIO&rsquo;s internal validation tooling, shared so you can see
        results and evidence first-hand. It is not a supported product, so please raise anything
        you need — questions, data requests or changes — with your usual UBIO contact rather than
        here.
      </footer>
    </div>
  );
}
