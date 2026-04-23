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

// 성장 마스코트 — 달성률에 따라 씨앗 → 새싹 → 잎 → 봉오리 → 꽃
function GrowingMascot({ rate, size = 56 }) {
  const stage = rate >= 1 ? 4
    : rate >= 0.7 ? 3
      : rate >= 0.4 ? 2
        : rate >= 0.15 ? 1
          : 0;

  // 공통: 화분 (모든 스테이지)
  const pot = (
    <g>
      <path
        d="M 18 44 Q 20 52 28 52 L 44 52 Q 52 52 54 44 L 50 42 L 22 42 Z"
        fill="#D4A574"
      />
      <rect x="20" y="40" width="32" height="4" rx="1" fill="#C89664" />
    </g>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 72 60" style={{ overflow: 'visible' }}>
      {/* 흙 */}
      <ellipse cx="36" cy="42" rx="14" ry="2" fill="#8B5A3B" />

      {stage === 0 && (
        <>
          <circle cx="36" cy="40" r="2.5" fill="#8B5A3B" />
          <path d="M 36 40 L 36 36" stroke="#86C49A" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}

      {stage === 1 && (
        <>
          <path d="M 36 42 L 36 30" stroke="#5AD2B3" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="32" cy="32" rx="4" ry="2.5" fill="#5AD2B3" transform="rotate(-25 32 32)" />
          <ellipse cx="40" cy="30" rx="4" ry="2.5" fill="#5AD2B3" transform="rotate(25 40 30)" />
        </>
      )}

      {stage === 2 && (
        <>
          <path d="M 36 42 L 36 22" stroke="#29C7B9" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="30" cy="32" rx="5.5" ry="3" fill="#5AD2B3" transform="rotate(-30 30 32)" />
          <ellipse cx="42" cy="30" rx="5.5" ry="3" fill="#5AD2B3" transform="rotate(30 42 30)" />
          <ellipse cx="32" cy="24" rx="4" ry="2.5" fill="#86C49A" transform="rotate(-20 32 24)" />
          <ellipse cx="40" cy="22" rx="4" ry="2.5" fill="#86C49A" transform="rotate(20 40 22)" />
        </>
      )}

      {stage === 3 && (
        <>
          <path d="M 36 42 L 36 16" stroke="#29C7B9" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="28" cy="32" rx="6" ry="3" fill="#5AD2B3" transform="rotate(-30 28 32)" />
          <ellipse cx="44" cy="30" rx="6" ry="3" fill="#5AD2B3" transform="rotate(30 44 30)" />
          <ellipse cx="30" cy="22" rx="5" ry="3" fill="#86C49A" transform="rotate(-25 30 22)" />
          <ellipse cx="42" cy="20" rx="5" ry="3" fill="#86C49A" transform="rotate(25 42 20)" />
          {/* 봉오리 */}
          <circle cx="36" cy="14" r="4" fill="#FF8FAB" />
          <circle cx="36" cy="14" r="2.5" fill="#FFB547" />
        </>
      )}

      {stage === 4 && (
        <>
          <path d="M 36 42 L 36 18" stroke="#29C7B9" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="26" cy="34" rx="7" ry="3.5" fill="#5AD2B3" transform="rotate(-30 26 34)" />
          <ellipse cx="46" cy="32" rx="7" ry="3.5" fill="#5AD2B3" transform="rotate(30 46 32)" />
          {/* 꽃잎 */}
          <circle cx="36" cy="10" r="5" fill="#FF8FAB" />
          <circle cx="28" cy="14" r="5" fill="#FFB547" />
          <circle cx="44" cy="14" r="5" fill="#A78BFA" />
          <circle cx="30" cy="4" r="5" fill="#4D96FF" />
          <circle cx="42" cy="4" r="5" fill="#FF6B6B" />
          <circle cx="36" cy="9" r="3.5" fill="#FFF5D1" />
        </>
      )}

      {pot}
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

// 4 그룹(진행 중/대기/즉석/완료) 분리된 카테고리 리스트
function GroupedCategoryList({ rows }) {
  const inProgress = rows.filter((r) => r.planned > 0 && r.actual > 0 && r.actual < r.planned);
  const pending    = rows.filter((r) => r.planned > 0 && r.actual === 0);
  const spontaneous = rows.filter((r) => r.planned === 0 && r.actual > 0);
  const done       = rows.filter((r) => r.planned > 0 && r.actual >= r.planned);

  const GroupHeader = ({ label, count, color }) => (
    <div className="flex items-center gap-2 mt-2 first:mt-0 mb-1.5">
      <span
        className="rounded-full"
        style={{ width: 6, height: 6, background: color }}
      />
      <span className="text-[11px] uppercase tracking-wider" style={{ color }}>
        {label}
      </span>
      <span className="display italic text-[11px]" style={{ color: '#8A7F73' }}>
        {count}
      </span>
      <span className="flex-1 border-t" style={{ borderColor: '#F3EDE1' }} />
    </div>
  );

  return (
    <div className="space-y-1">
      {inProgress.length > 0 && (
        <>
          <GroupHeader label="지금 진행 중" count={inProgress.length} color="#FFB547" />
          {inProgress.map((r) => <InProgressRow key={r.categoryId} row={r} />)}
        </>
      )}

      {pending.length > 0 && (
        <>
          <GroupHeader label="아직 안 한 일" count={pending.length} color="#8A7F73" />
          {pending.map((r) => <PendingRow key={r.categoryId} row={r} />)}
        </>
      )}

      {spontaneous.length > 0 && (
        <>
          <GroupHeader label="계획 외 보너스" count={spontaneous.length} color="#A78BFA" />
          {spontaneous.map((r) => <SpontaneousRow key={r.categoryId} row={r} />)}
        </>
      )}

      {done.length > 0 && (
        <>
          <GroupHeader label="완료된 일" count={done.length} color="#29C7B9" />
          {done.map((r) => <DoneRow key={r.categoryId} row={r} />)}
        </>
      )}
    </div>
  );
}

function InProgressRow({ row: r }) {
  const pct = Math.min(100, (r.actual / r.planned) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-full shrink-0" style={{ width: 10, height: 10, background: r.color }} />
      <span className="text-sm truncate" style={{ color: '#2B2620', minWidth: '6rem' }}>{r.name}</span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#F3EDE1' }}>
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, background: r.color }}
        />
      </div>
      <span className="display italic tabular-nums text-xs" style={{ color: '#57534E', minWidth: '4.5rem', textAlign: 'right' }}>
        {r.actual.toFixed(1)}<span style={{ color: '#A89D8E' }}> / {r.planned.toFixed(1)}h</span>
      </span>
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-full"
        style={{ background: r.color + '22', color: r.color }}
      >
        {Math.round(pct)}%
      </span>
    </div>
  );
}

function PendingRow({ row: r }) {
  return (
    <div className="flex items-center gap-3 opacity-75">
      <span
        className="rounded-full shrink-0"
        style={{ width: 10, height: 10, border: `1.5px dashed ${r.color}`, background: 'transparent' }}
      />
      <span className="text-sm truncate" style={{ color: '#57534E', minWidth: '6rem' }}>{r.name}</span>
      <span className="flex-1 text-[11px]" style={{ color: '#A89D8E' }}>
        — 아직 시작 전
      </span>
      <span className="display italic tabular-nums text-xs" style={{ color: '#8A7F73', minWidth: '4.5rem', textAlign: 'right' }}>
        {r.planned.toFixed(1)}h
      </span>
    </div>
  );
}

function SpontaneousRow({ row: r }) {
  return (
    <div className="flex items-center gap-3">
      <span className="relative shrink-0" style={{ width: 10, height: 10 }}>
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: r.color, opacity: 0.9 }}
        />
        <span
          className="absolute"
          style={{
            top: -3, right: -3, width: 6, height: 6,
            background: '#A78BFA', borderRadius: '50%',
          }}
        />
      </span>
      <span className="text-sm truncate" style={{ color: '#2B2620', minWidth: '6rem' }}>{r.name}</span>
      <span className="flex-1 text-[11px] italic" style={{ color: '#8A7F73' }}>
        ✦ 계획에 없던 기록
      </span>
      <span className="display italic tabular-nums text-xs" style={{ color: '#A78BFA', minWidth: '4.5rem', textAlign: 'right' }}>
        +{r.actual.toFixed(1)}h
      </span>
    </div>
  );
}

function DoneRow({ row: r }) {
  const over = r.actual > r.planned ? r.actual - r.planned : 0;
  return (
    <div
      className="flex items-center gap-3 rounded-full px-2 py-0.5"
      style={{ background: 'linear-gradient(90deg, #E8F9EE, transparent 70%)' }}
    >
      <span
        className="rounded-full shrink-0 flex items-center justify-center"
        style={{ width: 14, height: 14, background: r.color }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M 2 5 L 4 7 L 8 3" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span
        className="text-sm truncate"
        style={{ color: '#57534E', minWidth: '6rem', textDecoration: 'line-through', textDecorationColor: '#C6BDB0' }}
      >
        {r.name}
      </span>
      <span className="flex-1 text-[11px]" style={{ color: '#8A7F73' }}>
        계획 {r.planned.toFixed(1)}h 완료
        {over > 0 && (
          <span className="ml-1 display italic" style={{ color: '#29C7B9' }}>
            (+{over.toFixed(1)}h 더)
          </span>
        )}
      </span>
      <span
        className="display italic tabular-nums text-xs px-2 py-0.5 rounded-full"
        style={{ background: '#D1F5E4', color: '#1F7A5A' }}
      >
        ✓ {r.actual.toFixed(1)}h
      </span>
    </div>
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

        <div className="relative flex items-start justify-between mb-5 gap-3">
          <div className="flex items-center gap-3">
            <GrowingMascot rate={rate} size={52} />
            <div>
              <div className="flex items-center gap-2">
                {allDone ? (
                  <PartyPopper size={14} style={{ color: '#FF8FAB' }} />
                ) : (
                  <Sparkles size={12} style={{ color: '#FFB547' }} />
                )}
                <h2 className="display italic text-xl" style={{ color: '#2B2620' }}>
                  오늘의 진행
                </h2>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: '#8A7F73' }}>
                {rate >= 1 && totalPlans > 0 && '꽃이 활짝 피었어요'}
                {rate >= 0.7 && rate < 1 && '봉오리가 올라왔어요'}
                {rate >= 0.4 && rate < 0.7 && '잎이 자라고 있어요'}
                {rate >= 0.15 && rate < 0.4 && '새싹이 돋았어요'}
                {rate < 0.15 && '오늘의 씨앗을 심어볼까요'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-end">
            {totalPlans > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full"
                style={{ background: '#D1F5E4', color: '#1F7A5A' }}
              >
                <span className="display italic">{completedCount}</span>
                <span style={{ opacity: 0.7 }}>/ {totalPlans}</span>
                완료
              </span>
            )}
            <span
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full"
              style={{ background: '#FFF3E6', color: '#B8860B' }}
            >
              <span className="display italic">{logTotal.toFixed(1)}</span>h 기록
            </span>
            {planTotal > 0 && (
              <span
                className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full"
                style={{ background: '#FFFDF6', color: '#8A7F73', border: '1px solid #EFE7D4' }}
              >
                <span className="display italic">{planTotal.toFixed(1)}</span>h 계획
              </span>
            )}
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
              // 4 그룹으로 나눠서 보여주기
              <GroupedCategoryList rows={rows} />
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
