import { Plus, Trash2 } from 'lucide-react';
import { uid } from '@/lib/time-ledger/id.js';

export default function QuarterThemes({ quarters, onChange }) {
  const update = (q, patch) => {
    onChange(quarters.map((x) => (x.q === q ? { ...x, ...patch } : x)));
  };

  const addProject = (q) => {
    const title = window.prompt('프로젝트 제목을 입력하세요');
    if (!title?.trim()) return;
    const qr = quarters.find((x) => x.q === q);
    update(q, { projects: [...qr.projects, { id: uid('prj'), title: title.trim(), done: false }] });
  };

  const toggleProject = (q, id) => {
    const qr = quarters.find((x) => x.q === q);
    update(q, {
      projects: qr.projects.map((p) => (p.id === id ? { ...p, done: !p.done } : p)),
    });
  };

  const removeProject = (q, id) => {
    if (!window.confirm('이 프로젝트를 삭제할까요?')) return;
    const qr = quarters.find((x) => x.q === q);
    update(q, { projects: qr.projects.filter((p) => p.id !== id) });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {quarters.map((qr) => {
        const progress = qr.projects.length
          ? Math.round((qr.projects.filter((p) => p.done).length / qr.projects.length) * 100)
          : 0;
        return (
          <div
            key={qr.q}
            className="rounded-lg p-4"
            style={{ background: '#FFFDF8', border: '1px solid #E7E5E0' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="display italic text-lg" style={{ color: '#1C1917' }}>Q{qr.q}</div>
              <span className="display italic text-xs" style={{ color: '#78716C' }}>{progress}%</span>
            </div>
            <input
              type="text"
              placeholder={`Q${qr.q} 테마 (예: 인증·법무 정비)`}
              value={qr.theme}
              onChange={(e) => update(qr.q, { theme: e.target.value })}
              className="w-full rounded-md px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid #F0EEE8', background: '#FAF8F3', color: '#1C1917' }}
            />
            <ul className="mt-3 space-y-1">
              {qr.projects.map((p) => (
                <li
                  key={p.id}
                  className="row-hover flex items-center gap-2 px-2 py-1.5 rounded text-sm"
                  style={{ background: '#FAF8F3' }}
                >
                  <input
                    type="checkbox"
                    checked={p.done}
                    onChange={() => toggleProject(qr.q, p.id)}
                    style={{ accentColor: '#5C8A6E' }}
                  />
                  <span
                    className="flex-1 truncate"
                    style={{
                      color: p.done ? '#A8A29E' : '#1C1917',
                      textDecoration: p.done ? 'line-through' : 'none',
                    }}
                  >
                    {p.title}
                  </span>
                  <button
                    onClick={() => removeProject(qr.q, p.id)}
                    className="on-hover p-0.5 rounded transition hover:bg-stone-200"
                    style={{ color: '#C85450' }}
                    aria-label="삭제"
                  >
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => addProject(qr.q)}
              className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md transition hover:bg-stone-100"
              style={{ color: '#57534E', border: '1px solid #E7E5E0' }}
            >
              <Plus size={12} /> 프로젝트 추가
            </button>
          </div>
        );
      })}
    </div>
  );
}
