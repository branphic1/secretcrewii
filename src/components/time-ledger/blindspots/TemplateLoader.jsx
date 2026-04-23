import { useState } from 'react';
import { X } from 'lucide-react';
import { BLINDSPOT_TEMPLATE } from '@/lib/time-ledger/categories.js';

const FREQ_LABEL = { weekly: '주간', monthly: '월간', quarterly: '분기', yearly: '연간' };
const TYPE_LABEL = { deadline: '데드라인', recurring: '주기', incident: '이슈' };

export default function TemplateLoader({ onClose, onAdd }) {
  const [selected, setSelected] = useState(() => BLINDSPOT_TEMPLATE.map((_, i) => i));

  const toggle = (idx) => {
    setSelected((s) => (s.includes(idx) ? s.filter((x) => x !== idx) : [...s, idx]));
  };

  const apply = () => {
    const items = selected.map((i) => BLINDSPOT_TEMPLATE[i]);
    onAdd(items);
  };

  return (
    <div
      className="fixed inset-0 flex items-start justify-center p-4 overflow-y-auto z-40"
      style={{ background: 'rgba(28,25,23,0.35)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg w-full max-w-2xl my-8 fade-in"
        style={{ background: '#FAF8F3', border: '1px solid #E7E5E0' }}
      >
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid #E7E5E0' }}
        >
          <h3 className="display italic text-lg" style={{ color: '#1C1917' }}>이커머스 운영 템플릿</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-100" style={{ color: '#78716C' }}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs mb-3" style={{ color: '#78716C' }}>
            체크한 항목이 대기 리스트에 추가됩니다. 이후 개별 편집으로 기한·심각도 조정 가능합니다.
          </p>
          <ul className="space-y-1">
            {BLINDSPOT_TEMPLATE.map((t, i) => {
              const on = selected.includes(i);
              return (
                <li
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition"
                  style={{ background: on ? '#FFFDF8' : 'transparent', border: '1px solid #E7E5E0' }}
                  onClick={() => toggle(i)}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(i)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ accentColor: '#5C8A6E' }}
                  />
                  <span className="text-sm flex-1" style={{ color: '#1C1917' }}>{t.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#F0EEE8', color: '#57534E' }}>
                    {TYPE_LABEL[t.type]}
                  </span>
                  <span className="text-xs" style={{ color: '#78716C', minWidth: '3rem' }}>
                    {t.frequency ? FREQ_LABEL[t.frequency] : '개별'}
                  </span>
                  <span className="text-xs" style={{ color: '#78716C' }}>· {t.category}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid #E7E5E0' }}
        >
          <div className="text-xs" style={{ color: '#78716C' }}>
            {selected.length} / {BLINDSPOT_TEMPLATE.length} 선택됨
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-sm px-3 py-1.5 rounded-md transition"
              style={{ color: '#57534E', border: '1px solid #E7E5E0' }}
            >
              취소
            </button>
            <button
              onClick={apply}
              disabled={selected.length === 0}
              className="text-sm px-3 py-1.5 rounded-md transition disabled:opacity-50"
              style={{ background: '#1C1917', color: '#FAF8F3' }}
            >
              선택 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
