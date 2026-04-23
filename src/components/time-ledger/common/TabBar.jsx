const TABS = [
  { id: 'today', label: '오늘', en: 'Today' },
  { id: 'monthly', label: '월간', en: 'Monthly' },
  { id: 'yearly', label: '연간', en: 'Yearly' },
  { id: 'blindspots', label: '블라인드 스팟', en: 'Blind Spots' },
  { id: 'settings', label: '설정', en: 'Settings' },
];

export default function TabBar({ active, onChange, blindspotAlert = 0 }) {
  return (
    <nav className="w-full" style={{ borderBottom: '1px solid #E7E5E0', background: '#FAF8F3' }}>
      <div className="mx-auto px-6" style={{ maxWidth: '64rem' }}>
        <ul className="flex gap-6 overflow-x-auto">
          {TABS.map((t) => {
            const isActive = active === t.id;
            return (
              <li key={t.id}>
                <button
                  onClick={() => onChange(t.id)}
                  className="relative py-3 text-sm transition-colors whitespace-nowrap"
                  style={{
                    color: isActive ? '#1C1917' : '#78716C',
                    fontWeight: isActive ? 600 : 400,
                    borderBottom: isActive ? '1.5px solid #1C1917' : '1.5px solid transparent',
                  }}
                >
                  <span>{t.label}</span>
                  {t.id === 'blindspots' && blindspotAlert > 0 && (
                    <span
                      className="ml-2 inline-flex items-center justify-center rounded-full"
                      style={{
                        background: '#C85450',
                        color: '#fff',
                        fontSize: '10px',
                        height: '16px',
                        minWidth: '16px',
                        padding: '0 5px',
                        fontWeight: 600,
                      }}
                    >
                      {blindspotAlert}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
