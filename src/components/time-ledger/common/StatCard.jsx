export default function StatCard({ label, value, suffix, accent, gauge, note }) {
  const pct = typeof gauge === 'number' ? Math.max(0, Math.min(100, gauge)) : null;
  return (
    <div
      className="rounded-lg p-5 flex flex-col"
      style={{ background: '#FFFDF8', border: '1px solid #E7E5E0' }}
    >
      <div className="text-xs" style={{ color: '#78716C' }}>{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="display text-3xl italic" style={{ color: '#1C1917' }}>{value}</span>
        {suffix && <span className="text-sm" style={{ color: '#78716C' }}>{suffix}</span>}
      </div>
      {pct !== null && (
        <div className="mt-3 h-1.5 w-full rounded-full" style={{ background: '#F0EEE8' }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%`, background: accent || '#1C1917' }}
          />
        </div>
      )}
      {note && <div className="mt-2 text-xs" style={{ color: '#A8A29E' }}>{note}</div>}
    </div>
  );
}
