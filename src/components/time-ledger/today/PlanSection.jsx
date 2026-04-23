import { useEffect, useState } from 'react';
import { Plus, Trash2, Play, Pause, Square, Check, Timer, X } from 'lucide-react';
import Section from '../common/Section.jsx';
import CategoryPicker from '../common/CategoryPicker.jsx';
import BlindSpotHint from '../common/BlindSpotHint.jsx';
import { plansWithProgress } from '@/lib/time-ledger/analysis.js';
import { formatMMSS, remainingMs, isPaused, elapsedMs } from '@/lib/time-ledger/timer.js';

function formatDuration(h) {
  if (h <= 0) return '0분';
  const mins = Math.round(h * 60);
  if (mins < 60) return `${mins}분`;
  const hr = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${hr}시간`;
  return `${hr}시간 ${m}분`;
}

// 진행 중 plan 카드에 삽입되는 라이브 타이머 컨트롤
function LivePlanTimer({ timer, color, onPause, onResume, onStop, onCancel }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const rem = remainingMs(timer, now);
  const el = Math.max(0, elapsedMs(timer, now));
  const total = timer.planMinutes * 60_000;
  const pct = Math.min(100, (el / total) * 100);
  const overtime = rem < 0;
  const paused = isPaused(timer);

  return (
    <div className="mt-3">
      {/* 시각화 — 남은 시간을 색 게이지로 */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{ background: '#F3EDE1', height: 10 }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 transition-all"
          style={{
            width: `${pct}%`,
            background: overtime
              ? 'linear-gradient(90deg, #FF6B6B, #FF8FAB)'
              : `linear-gradient(90deg, ${color}, ${color}AA)`,
          }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="display italic tabular-nums"
            style={{ fontSize: 22, color: overtime ? '#FF6B6B' : color, lineHeight: 1 }}
          >
            {overtime ? '+' : ''}{formatMMSS(overtime ? -rem : rem)}
          </span>
          <span className="text-xs" style={{ color: '#8A7F73' }}>
            {overtime ? '초과' : '남음'}
            {paused && <span className="ml-1" style={{ color: '#A89D8E' }}>· 일시정지</span>}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {paused ? (
            <button
              onClick={onResume}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition"
              style={{ background: color, color: '#fff', boxShadow: `0 2px 8px ${color}66` }}
            >
              <Play size={12} fill="currentColor" /> 재개
            </button>
          ) : (
            <button
              onClick={onPause}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition"
              style={{
                background: '#FFF5E1', color: '#B8860B', border: '1px solid #F3C969',
              }}
            >
              <Pause size={12} /> 잠시 멈춤
            </button>
          )}
          <button
            onClick={onStop}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition"
            style={{
              background: '#D1F5E4', color: '#1F7A5A', border: '1px solid #5AD2B3',
            }}
          >
            <Square size={12} fill="currentColor" /> 완료
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs transition hover:bg-stone-100"
            style={{ color: '#A89D8E' }}
            aria-label="기록 없이 취소"
            title="기록 없이 취소"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PlanSection({
  plan, logs = [], categories, onChange, incidentsByCat = {},
  onStartTimer, onStartBlankTimer, activeTimer, date,
  onPauseTimer, onResumeTimer, onStopTimer, onCancelTimer,
}) {
  const [catId, setCatId] = useState(categories[0]?.id ?? '');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');

  const add = () => {
    if (!catId) return;
    const h = Number(hours);
    if (!h || h <= 0) return;
    onChange([...plan, { categoryId: catId, hours: h, note: note.trim() }]);
    setHours('');
    setNote('');
  };

  const remove = (idx) => {
    if (!window.confirm('이 계획 항목을 삭제할까요?')) return;
    onChange(plan.filter((_, i) => i !== idx));
  };

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  };

  const byId = (id) => categories.find((c) => c.id === id);

  const rows = plansWithProgress({ plan, logs });

  return (
    <Section title="오늘의 할 일" subtitle="계획을 추가하고 준비되면 ▶ 시작하세요">
      <div className="space-y-3">
        {/* 빠른 추가 */}
        <div
          className="rounded-2xl p-3"
          style={{ background: '#FFFDF6', border: '1px solid #EFE7D4' }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <CategoryPicker categories={categories} value={catId} onChange={setCatId} />
            <input
              type="number"
              step="0.5"
              min="0"
              placeholder="시간"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              onKeyDown={onKey}
              className="rounded-xl px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid #EFE7D4', width: '5.5rem', background: '#fff' }}
            />
            <input
              type="text"
              placeholder="무엇을 할 건가요? (메모)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={onKey}
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style={{ border: '1px solid #EFE7D4', background: '#fff', minWidth: '12rem' }}
            />
            <button
              onClick={add}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm transition"
              style={{ background: '#2B2620', color: '#FFFBF3' }}
            >
              <Plus size={14} /> 추가
            </button>
          </div>
          {catId && incidentsByCat[catId] > 0 && (
            <div className="mt-2">
              <BlindSpotHint categoryId={catId} incidentsByCat={incidentsByCat} />
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <div
            className="text-center py-8 rounded-2xl text-sm"
            style={{ background: '#FFFDF6', color: '#A89D8E', border: '1px dashed #EFE7D4' }}
          >
            아직 계획이 없어요. 위에 오늘 할 일을 추가해보세요.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((p) => {
              const cat = byId(p.categoryId);
              const color = cat?.color ?? '#9DB0B8';
              const running = !!(activeTimer && activeTimer.planRef && activeTimer.planRef.date === date && activeTimer.planRef.index === p.index);
              return (
                <li
                  key={p.index}
                  className="row-hover rounded-2xl p-4 transition"
                  style={{
                    background: running
                      ? `linear-gradient(135deg, ${color}15, ${color}08)`
                      : '#FFFDF6',
                    border: running
                      ? `2px solid ${color}`
                      : p.done
                        ? `1.5px solid #5AD2B3`
                        : '1px solid #EFE7D4',
                    boxShadow: running ? `0 4px 16px ${color}33` : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="shrink-0 rounded-full flex items-center justify-center"
                      style={{
                        background: p.done ? '#5AD2B3' : color,
                        width: 28,
                        height: 28,
                      }}
                    >
                      {p.done ? (
                        <Check size={14} color="#fff" strokeWidth={3} />
                      ) : (
                        <span className="display italic text-xs" style={{ color: '#fff' }}>
                          {p.index + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: '#2B2620' }}>
                          {cat?.name ?? '?'}
                        </span>
                        <span
                          className="display italic text-xs px-2 py-0.5 rounded-full"
                          style={{ background: color + '22', color: color }}
                        >
                          {formatDuration(p.hours)}
                        </span>
                        {running && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                            style={{ background: color, color: '#fff' }}
                          >
                            <Timer size={10} /> 진행 중
                          </span>
                        )}
                        {p.done && !running && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: '#D1F5E4', color: '#1F7A5A' }}
                          >
                            완료
                          </span>
                        )}
                      </div>
                      {p.note && (
                        <div className="text-sm mt-0.5 truncate" style={{ color: '#57534E' }}>
                          {p.note}
                        </div>
                      )}
                    </div>
                    {onStartTimer && p.hours > 0 && !p.done && !running && (
                      <button
                        onClick={() => onStartTimer(p.index)}
                        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition"
                        style={{
                          background: color,
                          color: '#fff',
                          boxShadow: `0 2px 8px ${color}66`,
                        }}
                        aria-label="타이머 시작"
                        title={`${formatDuration(p.hours)} 타이머 시작`}
                      >
                        <Play size={14} fill="currentColor" />
                        시작
                      </button>
                    )}
                    <button
                      onClick={() => remove(p.index)}
                      className="on-hover p-1.5 rounded-full transition hover:bg-stone-100"
                      aria-label="삭제"
                      style={{ color: '#C85450' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* 진행 바 (비활성 상태) */}
                  {p.hours > 0 && !running && (
                    <div className="mt-3">
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: '#F3EDE1' }}
                      >
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${p.progress * 100}%`,
                            background: p.done
                              ? 'linear-gradient(90deg, #5AD2B3, #29C7B9)'
                              : color,
                          }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span style={{ color: '#8A7F73' }}>
                          <span className="display italic" style={{ color: '#2B2620' }}>
                            {formatDuration(p.actual)}
                          </span>
                          {' '}완료
                          {p.remaining > 0 && (
                            <>
                              {' · '}
                              <span className="display italic">{formatDuration(p.remaining)}</span>
                              {' 남음'}
                            </>
                          )}
                        </span>
                        <span className="display italic tabular-nums" style={{ color: color }}>
                          {Math.round(p.progress * 100)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 진행 중: 라이브 타이머 컨트롤 */}
                  {running && activeTimer && (
                    <LivePlanTimer
                      timer={activeTimer}
                      color={color}
                      onPause={onPauseTimer}
                      onResume={onResumeTimer}
                      onStop={onStopTimer}
                      onCancel={onCancelTimer}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {onStartBlankTimer && (
          <div className="text-right">
            <button
              onClick={onStartBlankTimer}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition hover:bg-stone-100"
              style={{ color: '#57534E', border: '1px solid #EFE7D4', background: '#FFFDF6' }}
            >
              <Timer size={12} /> 계획 없이 타이머
            </button>
          </div>
        )}
      </div>
    </Section>
  );
}
