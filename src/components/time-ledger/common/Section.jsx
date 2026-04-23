export default function Section({ title, subtitle, right, children }) {
  return (
    <section className="fade-in">
      <header className="flex items-end justify-between mb-3">
        <div>
          <h2 className="display italic text-xl" style={{ color: '#1C1917' }}>{title}</h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: '#78716C' }}>{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}
