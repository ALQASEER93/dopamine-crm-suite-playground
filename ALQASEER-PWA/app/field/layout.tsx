import FieldNav from "../../components/FieldNav";

export const metadata = {
  title: "Field PWA",
  description: "Mobile-first flow for field reps",
};

export default function FieldLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="field-shell">
      <header className="field-hero">
        <div>
          <p className="eyebrow">Field reps</p>
          <h1>On-the-go PWA</h1>
          <p className="muted">
            Quick access to today&apos;s route, live positioning, and visit
            history. Built to stay consistent with the API base configuration.
          </p>
        </div>
        <div className="field-hero__meta">
          <span className="pill">GPS friendly</span>
          <span className="pill pill--dark">Offline tolerant</span>
        </div>
      </header>

      <FieldNav />

      <div className="field-content">{children}</div>
    </section>
  );
}
