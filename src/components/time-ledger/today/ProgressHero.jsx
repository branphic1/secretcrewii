'use client';

import { useEffect, useState, useMemo } from 'react';
import { Sparkles, Timer as TimerIcon } from 'lucide-react';
import { dayGap } from '@/lib/time-ledger/analysis.js';
import { formatMMSS, remainingMs, isPaused } from '@/lib/time-ledger/timer.js';

// 다층 도넛: 전체 달성률 + (선택) 카테고리별 스택
function MultiRing({ size = 160, stroke = 14, rate, rows }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, rate));

  const innerR = r - stroke - 4;
  const innerCirc = 2 * Math.PI * innerR;

  // 카테고리별 스택: 계획이 있는 것들을 비율대로
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
      {/* 바깥 링: 전체 달성률 */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="#F3EDE1"
        strokeWidth={stroke}
      />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="url(#tl-hero-grad)"
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
        <linearGradient id="tl-hero-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F3B36A" />
          <stop offset="60%" stopColor="#EF8B7F" />
          <stop offset="100%" stopColor="#C3A2D6" />
        </linearGradient>
      </defs>

      {/* 안쪽 링: 카테고리별 비중 (계획 기반) */}
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

export default function ProgressHero({ entry, categories, timer }) {
  const rows = useMemo(() => {
    const g = dayGap(entry);
    return g.map((r) => {
      const cat = categories.find((c) => c.id === r.categoryId);
      return { ...r, name: cat?.name ?? '?', color: cat?.color ?? '#B8AFA4' };
    });
  }, [entry, categories]);

  const planTotal = rows.reduce((s, r) => s + r.planned, 0);
  const logTotal = rows.reduce((s, r) => s + r.actual, 0);
  const rate = planTotal > 0 ? (logTotal / planTotal) : (logTotal > 0 ? 1 : 0);
  const ratePct = Math.round(rate * 100);

  // 라이브 타이머 표시용 틱
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer]);

  const timerCat = timer ? categories.find((c) => c.id === timer.categoryId) : null;
  const timerRem = timer ? remainingMs(timer, now) : 0;
  const timerOvertime = timerRem < 0;
  const paused = timer ? isPaused(timer) : false;

  const emptyState = planTotal === 0 && logTotal === 0;

  const isBlindspotGood = rate >= 0.7;

  return (
    <section className="fade-in">
      <div
        className="rounded-2xl p-5 md:p-6"
        style={{
          background: 'linear-gradient(145deg, #FFFBF3 0%, #FBF3E4 100%)',
          border: '1px solid #EFE7D4',
          boxShadow: '0 2px 10px rgba(239,139,127,0.05)',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: '#EF8B7F' }} />
            <h2 className="display italic text-xl" style={{ color: '#2B2620' }}>
              오늘의 진행
            </h2>
          </div>
          <div className="text-xs" style={{ color: '#8A7F73' }}>
            {logTotal.toFixed(1)}h 기록 · {planTotal.toFixed(1)}h 계획
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* 링 + 중앙 숫자 */}
          <div className="relative" style={{ width: 160, height: 160, flexShrink: 0 }}>
            <MultiRing size={160} stroke={14} rate={rate} rows={rows} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span
                className="display italic tabular-nums"
                style={{
                  color: isBlindspotGood ? '#86C49A' : rate >= 0.4 ? '#F3B36A' : '#EF8B7F',
                  fontSize: 42,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {ratePct}
              </span>
              <span className="text-xs mt-0.5" style={{ color: '#8A7F73' }}>달성률</span>
              <span className="display italic text-xs mt-2" style={{ color: '#57534E' }}>
                {logTotal.toFixed(1)} / {planTotal === 0 ? '—' : planTotal.toFixed(1) + 'h'}
              </span>
            </div>
          </div>

          {/* 오른쪽: 카테고리 미니 바 */}
          <div className="flex-1 w-full min-w-0">
            {emptyState ? (
              <div
                className="rounded-xl p-4 text-center text-sm"
                style={{ background: 'rgba(255,255,255,0.6)', color: '#8A7F73', border: '1px dashed #EFE7D4' }}
              >
                계획을 세우거나 기록을 남기면, 여기 진행 상황이 쌓입니다.
              </div>
            ) : (
              <ul className="space-y-2">
                {rows.slice(0, 6).map((r) => {
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
                        {/* planned ghost */}
                        <div
                          className="absolute left-0 top-0 bottom-0 rounded-full"
                          style={{ width: `${plannedPct}%`, background: r.color + '33' }}
                        />
                        {/* actual */}
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
                          <span style={{ color: '#A8A29E' }}> / {r.planned.toFixed(1)}h</span>
                        )}
                      </span>
                      {met && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: '#D5EED9', color: '#4A8E5E' }}
                        >
                          완료
                        </span>
                      )}
                    </li>
                  );
                })}
                {rows.length > 6 && (
                  <li className="text-xs text-center" style={{ color: '#A8A29E' }}>
                    +{rows.length - 6}개 카테고리 더 있음
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* 타이머 라이브 배너 */}
        {timer && (
          <div
            className="mt-5 rounded-xl flex items-center gap-3 px-4 py-3"
            style={{
              background: (timerCat?.color ?? '#EF8B7F') + '18',
              border: `1px solid ${(timerCat?.color ?? '#EF8B7F')}44`,
            }}
          >
            <TimerIcon size={14} style={{ color: timerCat?.color ?? '#EF8B7F' }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs" style={{ color: '#57534E' }}>
                진행 중 {paused && <span style={{ color: '#A8A29E' }}>· 일시정지</span>}
              </div>
              <div className="text-sm truncate" style={{ color: '#2B2620' }}>
                {timer.taskName || timerCat?.name || '타이머'}
              </div>
            </div>
            <div
              className="display italic tabular-nums"
              style={{
                color: timerOvertime ? '#EF8B7F' : timerCat?.color ?? '#2B2620',
                fontSize: 20,
              }}
            >
              {timerOvertime ? '+' : ''}{formatMMSS(timerOvertime ? -timerRem : timerRem)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
