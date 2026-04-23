export default function Section({ title, subtitle, right, children }) {
  return (
    <section className="fade-in">
      <header className="flex items-end justify-between mb-3">
        <div>
          <h2 className="display italic text-xl" style={{ color: '#2B2620' }}>{title}</h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: '#8A7F73' }}>{subtitle}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}
