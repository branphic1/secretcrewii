'use client';

import { useEffect, useState, useMemo } from 'react';
import { Play, Pause, Square, X, Sparkles, Timer as TimerIcon, PartyPopper } from 'lucide-react';
import { dayGap, plansWithProgress, nextTodo } from '@/lib/time-ledger/analysis.js';
import { formatMMSS, remainingMs, isPaused, elapsedMs } from '@/lib/time-ledger/timer.js';

// 다층 도넛: 전체 달성률 + (선택) 카테고리별 스택
function MultiRing({ size = 160, stroke = 14, rate, rows }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, rate));

  const innerR = r - stroke - 4;
  const innerCirc = 2 * Math.PI * innerR;

  const stackTotal = rows.reduce((s, x) => s + Math.max(x.planned, x.actual), 0);
  let offset = 0;
  const segments = rows
    .map((x) => ({ ...x, weight: Math.max(x.planned, x.actual) }))
    .filter((x) => x.weight > 0)
    .map((x) => {
      const len = (x.weight / stackTotal) * innerCirc;
      const seg = { ...x, len, offset };
      offset += len;
      return seg;
    });

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#F3EDE1"
        strokeWidth={stroke}
      />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="url(#tl-hero-rainbow)"
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        style={{
          transform: `rotate(-90deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: 'stroke-dashoffset 0.5s ease',
        }}
      />
      <defs>
        <linearGradient id="tl-hero-rainbow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#FF8FAB" />
          <stop offset="25%"  stopColor="#FFB547" />
          <stop offset="50%"  stopColor="#5AD2B3" />
          <stop offset="75%"  stopColor="#4D96FF" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>

      {segments.length > 0 && (
        <g
          style={{
            transform: `rotate(-90deg)`,
            transformOrigin: `${cx}px ${cy}px`,
          }}
        >
          {segments.map((s) => (
            <circle
              key={s.categoryId}
              cx={cx} cy={cy} r={innerR}
              fill="none"
              stroke={s.color}
              strokeWidth={6}
              strokeDasharray={`${s.len} ${innerCirc}`}
              strokeDashoffset={-s.offset}
              opacity={s.actual >= s.planned && s.planned > 0 ? 1 : 0.55}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

// 경량 색종이 점
function ConfettiDots() {
  const dots = [
    { x: '8%',  y: '18%', c: '#FF8FAB', size: 8 },
    { x: '92%', y: '12%', c: '#5AD2B3', size: 10 },
    { x: '18%', y: '85%', c: '#FFB547', size: 9 },
    { x: '88%', y: '80%', c: '#4D96FF', size: 7 },
    { x: '50%', y: '8%',  c: '#A78BFA', size: 6 },
    { x: '5%',  y: '55%', c: '#F9C74F', size: 6 },
    { x: '95%', y: '50%', c: '#FF6B6B', size: 8 },
    { x: '45%', y: '92%', c: '#29C7B9', size: 7 },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: d.x,
            top: d.y,
            width: d.size,
            height: d.size,
            borderRadius: '50%',
            background: d.c,
            opacity: 0.8,
            transform: `rotate(${(i * 40) % 360}deg)`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

// 큰 타이머 배너 — Hero 내부에서 사용
function HeroTimerBanner({ timer, categories, onPause, onResume, onStop, onCancel }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  const cat = categories.find((c) => c.id === timer.categoryId);
  const color = cat?.color ?? '#FFB547';
  const rem = remainingMs(timer, now);
  const el = Math.max(0, elapsedMs(timer, now));
  const total = timer.planMinutes * 60_000;
  const progress = Math.min(1, el / total);
  const overtime = rem < 0;
  const paused = isPaused(timer);

  // 원형 링
  const size = 72;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div
      className="relative rounded-2xl p-4"
      style={{
        background: overtime
          ? 'linear-gradient(135deg, #FFE4E1, #FFD0DC)'
          : `linear-gradient(135deg, ${color}22, ${color}0A)`,
        border: `2px solid ${overtime ? '#FF6B6B' : color}`,
      }}
    >
      <div className="flex items-center gap-4 flex-wrap">
        {/* 원형 링 */}
        <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
          <svg width={size} height={size}>
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none" stroke="#F3EDE1" strokeWidth={stroke}
            />
            <circle
              cx={size / 2} cy={size / 2} r={r}
              fill="none"
              stroke={overtime ? '#FF6B6B' : color}
              strokeWidth={stroke}
              strokeDasharray={circ}
              strokeDashoffset={overtime ? 0 : circ * (1 - progress)}
              strokeLinecap="round"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: `${size / 2}px ${size / 2}px`,
                transition: 'stroke-dashoffset 0.5s linear',
              }}
            />
          </svg>
          {paused && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ color: '#8A7F73' }}
            >
              <Pause size={18} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="text-[11px] uppercase tracking-wider"
              style={{ color: color }}
            >
              {overtime ? '초과 시간' : '남은 시간'}
            </span>
            {paused && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: '#FFF5E1', color: '#B8860B' }}
              >
                일시정지
              </span>
            )}
          </div>
          <div
            className="display italic tabular-nums"
            style={{
              color: overtime ? '#FF6B6B' : '#2B2620',
              fontSize: 36,
              lineHeight: 1.1,
            }}
          >
            {overtime ? '+' : ''}{formatMMSS(overtime ? -rem : rem)}
          </div>
          <div className="text-xs mt-0.5 truncate" style={{ color: '#57534E' }}>
            {cat?.name} · {timer.taskName || '타이머'}
            <span className="ml-2 display italic" style={{ color: '#8A7F73' }}>
              {timer.planMinutes}분 중 {Math.round(el / 60000)}분 경과
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {paused ? (
            <button
              onClick={onResume}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition"
              style={{ background: color, color: '#fff', boxShadow: `0 2px 8px ${color}66` }}
            >
              <Play size={14} fill="currentColor" /> 재개
            </button>
          ) : (
            <button
              onClick={onPause}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition"
              style={{
                background: '#FFF5E1', color: '#B8860B', border: '1.5px solid #F3C969',
              }}
              title="잠시 멈춤"
            >
              <Pause size={14} /> 잠시 멈춤
            </button>
          )}
          <button
            onClick={onStop}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition"
            style={{
              background: '#D1F5E4', color: '#1F7A5A', border: '1.5px solid #5AD2B3',
            }}
            title="완료하고 기록"
          >
            <Square size={14} fill="currentColor" /> 완료
          </button>
          <button
            onClick={onCancel}
            className="p-2 rounded-full transition hover:bg-stone-100"
            style={{ color: '#A89D8E' }}
            aria-label="기록 없이 취소"
            title="기록 없이 취소"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProgressHero({
  entry, categories, timer, onStartNext, onOpenTimerDialog,
  onPauseTimer, onResumeTimer, onStopTimer, onCancelTimer,
}) {
  const gaps = useMemo(() => dayGap(entry), [entry]);
  const rows = useMemo(() => {
    return gaps.map((r) => {
      const cat = categories.find((c) => c.id === r.categoryId);
      return { ...r, name: cat?.name ?? '?', color: cat?.color ?? '#9DB0B8' };
    });
  }, [gaps, categories]);

  const planTotal = rows.reduce((s, r) => s + r.planned, 0);
  const logTotal = rows.reduce((s, r) => s + r.actual, 0);
  const rate = planTotal > 0 ? (logTotal / planTotal) : (logTotal > 0 ? 1 : 0);
  const ratePct = Math.round(rate * 100);

  const next = useMemo(() => nextTodo(entry), [entry]);
  const nextCat = next ? categories.find((c) => c.id === next.categoryId) : null;
  const nextColor = nextCat?.color ?? '#FFB547';

  const completedCount = useMemo(
    () => plansWithProgress(entry).filter((p) => p.done).length,
    [entry]
  );
  const totalPlans = (entry.plan || []).length;
  const allDone = totalPlans > 0 && completedCount === totalPlans;

  const emptyState = planTotal === 0 && logTotal === 0;

  return (
    <section className="fade-in">
      <div
        className="relative rounded-3xl p-5 md:p-6 overflow-hidden"
        style={{
          background: allDone
            ? 'linear-gradient(135deg, #FFF5D1 0%, #FFE0EC 50%, #E3F4FF 100%)'
            : 'linear-gradient(145deg, #FFFBF3 0%, #FFF3E6 100%)',
          border: '1px solid #EFE7D4',
          boxShadow: '0 4px 24px rgba(255,143,171,0.08)',
        }}
      >
        {allDone && <ConfettiDots />}

        <div className="relative flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {allDone ? (
              <PartyPopper size={16} style={{ color: '#FF8FAB' }} />
            ) : (
              <Sparkles size={14} style={{ color: '#FFB547' }} />
            )}
            <h2 className="display italic text-xl" style={{ color: '#2B2620' }}>
              오늘의 진행
            </h2>
          </div>
          <div className="text-xs" style={{ color: '#8A7F73' }}>
            {totalPlans > 0 && (
              <span className="mr-2">
                <span className="display italic" style={{ color: '#2B2620' }}>
                  {completedCount}/{totalPlans}
                </span>
                {' '}할 일
              </span>
            )}
            <span>{logTotal.toFixed(1)}h 기록 · {planTotal.toFixed(1)}h 계획</span>
          </div>
        </div>

        <div className="relative flex flex-col md:flex-row items-center gap-6">
          {/* 링 */}
          <div className="relative" style={{ width: 160, height: 160, flexShrink: 0 }}>
            <MultiRing size={160} stroke={14} rate={rate} rows={rows} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className="display italic tabular-nums"
                style={{
                  color: allDone ? '#29C7B9' : rate >= 0.7 ? '#5AD2B3' : rate >= 0.4 ? '#FFB547' : '#FF8FAB',
                  fontSize: 44,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {ratePct}
              </span>
              <span className="text-xs mt-0.5" style={{ color: '#8A7F73' }}>달성률</span>
              <span className="display italic text-xs mt-1.5" style={{ color: '#57534E' }}>
                {logTotal.toFixed(1)} / {planTotal === 0 ? '—' : planTotal.toFixed(1) + 'h'}
              </span>
            </div>
          </div>

          {/* 오른쪽: 지금 할 일 or 카테고리 미니바 */}
          <div className="flex-1 w-full min-w-0 space-y-3">
            {emptyState ? (
              <div
                className="rounded-2xl p-5 text-center"
                style={{
                  background: 'linear-gradient(135deg, #FFF5E1, #FFE5EE)',
                  color: '#57534E',
                  border: '1px dashed #FFD5C2',
                }}
              >
                <div className="text-sm mb-2">오늘 할 일을 하나 추가하고 ▶ 시작해보세요</div>
                <button
                  onClick={() => onOpenTimerDialog?.('')}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition"
                  style={{ background: '#FFB547', color: '#fff', boxShadow: '0 2px 8px #FFB54766' }}
                >
                  <TimerIcon size={14} /> 바로 타이머 시작
                </button>
              </div>
            ) : next && !timer ? (
              // 다음 할 일 원클릭 카드
              <div
                className="rounded-2xl p-4 flex items-center gap-3"
                style={{
                  background: `linear-gradient(135deg, ${nextColor}20, ${nextColor}08)`,
                  border: `1.5px solid ${nextColor}55`,
                }}
              >
                <div
                  className="rounded-full flex items-center justify-center shrink-0"
                  style={{ background: nextColor, width: 40, height: 40 }}
                >
                  <Play size={18} color="#fff" fill="#fff" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs" style={{ color: '#8A7F73' }}>다음 할 일</div>
                  <div className="text-sm font-medium truncate" style={{ color: '#2B2620' }}>
                    {nextCat?.name ?? '?'}
                    {next.note && <span style={{ color: '#57534E' }}> · {next.note}</span>}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: '#8A7F73' }}>
                    계획 {next.hours.toFixed(1)}h
                    {next.actual > 0 && (
                      <>
                        {' · '}
                        <span className="display italic" style={{ color: nextColor }}>
                          {Math.round(next.progress * 100)}%
                        </span>
                        {' 진행됨'}
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onStartNext?.(next.index)}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition"
                  style={{
                    background: nextColor,
                    color: '#fff',
                    boxShadow: `0 4px 12px ${nextColor}66`,
                  }}
                >
                  <Play size={14} fill="currentColor" /> 시작
                </button>
              </div>
            ) : (
              // 카테고리별 미니 요약 (기본)
              <ul className="space-y-2">
                {rows.slice(0, 5).map((r) => {
                  const base = Math.max(r.planned, r.actual, 0.01);
                  const actualPct = Math.min(100, (r.actual / base) * 100);
                  const plannedPct = Math.min(100, (r.planned / base) * 100);
                  const met = r.planned > 0 && r.actual >= r.planned;
                  return (
                    <li key={r.categoryId} className="flex items-center gap-3">
                      <span
                        className="rounded-full shrink-0"
                        style={{ width: 10, height: 10, background: r.color }}
                      />
                      <span className="text-sm truncate" style={{ color: '#2B2620', minWidth: '6rem' }}>
                        {r.name}
                      </span>
                      <div className="flex-1 relative h-2.5 rounded-full" style={{ background: '#F3EDE1' }}>
                        <div
                          className="absolute left-0 top-0 bottom-0 rounded-full"
                          style={{ width: `${plannedPct}%`, background: r.color + '33' }}
                        />
                        <div
                          className="absolute left-0 top-0 bottom-0 rounded-full transition-all"
                          style={{ width: `${actualPct}%`, background: r.color }}
                        />
                      </div>
                      <span
                        className="display italic tabular-nums text-xs"
                        style={{ color: '#57534E', minWidth: '4.5rem', textAlign: 'right' }}
                      >
                        {r.actual.toFixed(1)}
                        {r.planned > 0 && (
                          <span style={{ color: '#A89D8E' }}> / {r.planned.toFixed(1)}h</span>
                        )}
                      </span>
                      {met && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: '#D1F5E4', color: '#1F7A5A' }}
                        >
                          완료
                        </span>
                      )}
                    </li>
                  );
                })}
                {rows.length > 5 && (
                  <li className="text-xs text-center" style={{ color: '#A89D8E' }}>
                    +{rows.length - 5}개 카테고리 더 있음
                  </li>
                )}
              </ul>
            )}

          </div>
        </div>

        {/* 큰 타이머 배너 — 진행 중일 때 눈에 확 띄게 */}
        {timer && (
          <div className="relative mt-5">
            <HeroTimerBanner
              timer={timer}
              categories={categories}
              onPause={onPauseTimer}
              onResume={onResumeTimer}
              onStop={onStopTimer}
              onCancel={onCancelTimer}
            />
          </div>
        )}

        {allDone && (
          <div
            className="relative mt-5 rounded-2xl text-center py-3"
            style={{
              background: 'linear-gradient(90deg, #FFE3EF, #FFF0D1, #D9F2E5)',
              color: '#2B2620',
              border: '1.5px dashed #FF8FAB',
            }}
          >
            <span className="display italic text-sm">오늘 할 일 모두 완료! 수고하셨어요 ✦</span>
          </div>
        )}
      </div>
    </section>
  );
}
