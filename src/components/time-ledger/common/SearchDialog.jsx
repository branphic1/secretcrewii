import { useEffect, useMemo, useState } from 'react';
import { Search, X, Calendar, AlertTriangle } from 'lucide-react';
import { search } from '@/lib/time-ledger/analysis.js';
import { formatKoreanDate } from '@/lib/time-ledger/dates.js';

export default function SearchDialog({
  open,
  onClose,
  entries,
  blindspots,
  categories,
  blindspotCategories,
  onPickDate,
  onOpenBlindSpot,
}) {
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const result = useMemo(
    () => search(q, { entries, blindspots, categories, blindspotCategories }),
    [q, entries, blindspots, categories, blindspotCategories]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto z-50"
      style={{ background: 'rgba(28,25,23,0.35)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg w-full max-w-2xl mt-16 fade-in"
        style={{ background: '#FFFBF3', border: '1px solid #EFE7D4' }}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #EFE7D4' }}>
          <Search size={16} style={{ color: '#8A7F73' }} />
          <input
            autoFocus
            type="text"
            placeholder="기록, 블라인드 스팟 전체 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 bg-transparent text-base outline-none"
            style={{ color: '#2B2620' }}
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-100" style={{ color: '#8A7F73' }}>
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {!q.trim() ? (
            <div className="text-center text-sm py-12" style={{ color: '#A8A29E' }}>
              검색어를 입력하세요. 기록 내용, 계획 메모, 블라인드 스팟 제목/설명/교훈이 모두 검색됩니다.
            </div>
          ) : result.logs.length === 0 && result.blindspots.length === 0 ? (
            <div className="text-center text-sm py-12" style={{ color: '#A8A29E' }}>
              일치하는 항목이 없습니다.
            </div>
          ) : (
            <>
              {result.logs.length > 0 && (
                <section className="p-3">
                  <div className="text-xs px-2 pb-2" style={{ color: '#8A7F73' }}>
                    기록 · <span className="display italic">{result.logs.length}</span>건
                  </div>
                  <ul className="space-y-1">
                    {result.logs.map((l) => {
                      const cat = categories.find((c) => c.id === l.categoryId);
                      return (
                        <li key={l.id}>
                          <button
                            onClick={() => { onPickDate(l.dateStr); onClose(); }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition hover:bg-stone-100"
                          >
                            <Calendar size={14} style={{ color: '#A8A29E' }} />
                            <span className="display italic text-xs" style={{ color: '#8A7F73', minWidth: '5.5rem' }}>
                              {formatKoreanDate(l.dateStr)}
                            </span>
                            <span
                              className="rounded-full shrink-0"
                              style={{ background: cat?.color ?? '#E0D4B8', width: 8, height: 8 }}
                            />
                            <span className="text-xs" style={{ color: '#8A7F73', minWidth: '5rem' }}>
                              {l.categoryName}
                            </span>
                            <span className="flex-1 text-sm truncate" style={{ color: '#2B2620' }}>
                              {l.content}
                              {l.isPlan && <span className="ml-2 text-[10px]" style={{ color: '#D4883F' }}>(계획)</span>}
                            </span>
                            <span className="display italic text-xs" style={{ color: '#57534E' }}>
                              {(l.hours || 0).toFixed(1)}h
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {result.blindspots.length > 0 && (
                <section className="p-3" style={{ borderTop: '1px solid #F3EDE1' }}>
                  <div className="text-xs px-2 pb-2" style={{ color: '#8A7F73' }}>
                    블라인드 스팟 · <span className="display italic">{result.blindspots.length}</span>건
                  </div>
                  <ul className="space-y-1">
                    {result.blindspots.map((b) => (
                      <li key={b.id}>
                        <button
                          onClick={() => { onOpenBlindSpot(b); onClose(); }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition hover:bg-stone-100"
                        >
                          <AlertTriangle size={14} style={{ color: '#D4883F' }} />
                          <span className="text-xs" style={{ color: '#8A7F73', minWidth: '6rem' }}>
                            {b.category}
                          </span>
                          <span className="flex-1 text-sm truncate" style={{ color: '#2B2620' }}>
                            {b.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#F3EDE1', color: '#57534E' }}>
                            {b.type}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
