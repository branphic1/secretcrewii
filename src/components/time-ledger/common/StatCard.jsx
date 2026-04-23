export default function StatCard({ label, value, suffix, accent, gauge, note }) {
  const pct = typeof gauge === 'number' ? Math.max(0, Math.min(100, gauge)) : null;
  return (
    <div
      className="rounded-lg p-5 flex flex-col"
      style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}
    >
      <div className="text-xs" style={{ color: '#8A7F73' }}>{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="display text-3xl italic" style={{ color: '#2B2620' }}>{value}</span>
        {suffix && <span className="text-sm" style={{ color: '#8A7F73' }}>{suffix}</span>}
      </div>
      {pct !== null && (
        <div className="mt-3 h-1.5 w-full rounded-full" style={{ background: '#F3EDE1' }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, background: accent || '#2B2620' }}
          />
        </div>
      )}
      {note && <div className="mt-2 text-xs" style={{ color: '#A8A29E' }}>{note}</div>}
    </div>
  );
}
