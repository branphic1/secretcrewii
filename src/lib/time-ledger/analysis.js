// 분석 공통 로직 — 갭 분석, 요일 패턴, 블라인드 스팟 역추적, 검색, 계획 진행

import { pad2 } from './dates.js';

// ---- 계획 항목별 진행률 ----
// 같은 카테고리 내 로그 시간을 계획 항목에 순서대로 배분 (첫 항목부터 채우기)
// 반환: 각 plan 항목에 { actual, remaining, progress(0~1), done } 덧붙임
export function plansWithProgress(entry) {
  const plan = entry?.plan || [];
  const logs = entry?.logs || [];

  // 카테고리별 로그 총합
  const logByCat = {};
  for (const l of logs) {
    logByCat[l.categoryId] = (logByCat[l.categoryId] || 0) + (Number(l.hours) || 0);
  }

  // 카테고리별 잔여 로그 시간 (순차 소모)
  const remainingLog = { ...logByCat };

  return plan.map((p, index) => {
    const planned = Number(p.hours) || 0;
    const pool = remainingLog[p.categoryId] || 0;
    const actual = Math.min(pool, planned);
    remainingLog[p.categoryId] = pool - actual;
    const progress = planned > 0 ? Math.min(1, actual / planned) : 0;
    return {
      ...p,
      index,
      actual,
      remaining: Math.max(0, planned - actual),
      progress,
      done: planned > 0 && actual >= planned,
    };
  });
}

// 다음에 할 일 (첫 번째 미완료 계획)
export function nextTodo(entry) {
  const rows = plansWithProgress(entry);
  return rows.find((r) => !r.done && r.hours > 0) || null;
}

// ---- 갭 분석 ----
// 일간: 카테고리별 { planned, actual, gap } 리스트
export function dayGap(entry) {
  const planned = {};
  const actual = {};
  for (const p of entry?.plan || []) {
    planned[p.categoryId] = (planned[p.categoryId] || 0) + (Number(p.hours) || 0);
  }
  for (const l of entry?.logs || []) {
    actual[l.categoryId] = (actual[l.categoryId] || 0) + (Number(l.hours) || 0);
  }
  const allIds = new Set([...Object.keys(planned), ...Object.keys(actual)]);
  return Array.from(allIds)
    .map((id) => ({
      categoryId: id,
      planned: planned[id] || 0,
      actual: actual[id] || 0,
      gap: (actual[id] || 0) - (planned[id] || 0),
    }))
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
}

// 월간: 해당 월 전체에 대한 카테고리별 합계 gap
export function monthGap(entries, year, monthIndex0) {
  const prefix = `${year}-${pad2(monthIndex0 + 1)}`;
  const planned = {};
  const actual = {};
  for (const [dateStr, entry] of Object.entries(entries)) {
    if (!dateStr.startsWith(prefix)) continue;
    for (const p of entry.plan || []) {
      planned[p.categoryId] = (planned[p.categoryId] || 0) + (Number(p.hours) || 0);
    }
    for (const l of entry.logs || []) {
      actual[l.categoryId] = (actual[l.categoryId] || 0) + (Number(l.hours) || 0);
    }
  }
  const allIds = new Set([...Object.keys(planned), ...Object.keys(actual)]);
  return Array.from(allIds)
    .map((id) => ({
      categoryId: id,
      planned: planned[id] || 0,
      actual: actual[id] || 0,
      gap: (actual[id] || 0) - (planned[id] || 0),
    }))
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
}

// 연간: 분기 테마 vs 실제 카테고리 비중 비교
// quarter(1..4)에 해당하는 카테고리(goals 연결)와 실제 기록 비중 비교
export function quarterThemeAlignment(entries, yearlyPlan, categories) {
  const result = [];
  const year = yearlyPlan.year;
  for (const qr of yearlyPlan.quarters || []) {
    const startMonth = (qr.q - 1) * 3;
    const endMonth = startMonth + 2;
    // 해당 분기의 목표 카테고리 집합
    const targetCatIds = new Set();
    for (const g of yearlyPlan.goals || []) {
      if (g.status !== 'active' && g.status !== 'done') continue;
      for (const cid of g.relatedCategoryIds || []) targetCatIds.add(cid);
    }
    // 분기 실제 카테고리 비중
    const actual = {};
    let totalQ = 0;
    for (const [dateStr, entry] of Object.entries(entries)) {
      if (!dateStr.startsWith(`${year}-`)) continue;
      const m = Number(dateStr.slice(5, 7)) - 1;
      if (m < startMonth || m > endMonth) continue;
      for (const l of entry.logs || []) {
        const h = Number(l.hours) || 0;
        actual[l.categoryId] = (actual[l.categoryId] || 0) + h;
        totalQ += h;
      }
    }
    const rows = categories.map((c) => {
      const hrs = actual[c.id] || 0;
      return {
        categoryId: c.id,
        name: c.name,
        color: c.color,
        hours: hrs,
        share: totalQ > 0 ? hrs / totalQ : 0,
        isTarget: targetCatIds.has(c.id),
      };
    }).sort((a, b) => b.hours - a.hours);
    const targetHours = rows.filter((r) => r.isTarget).reduce((s, r) => s + r.hours, 0);
    result.push({
      q: qr.q,
      theme: qr.theme,
      totalHours: totalQ,
      targetShare: totalQ > 0 ? targetHours / totalQ : 0,
      rows,
    });
  }
  return result;
}

// ---- 요일 패턴 (월간) ----
// 요일(0=일 ~ 6=토) × 카테고리 매트릭스의 시간 합계
export function weekdayPattern(entries, year, monthIndex0, categories) {
  const prefix = `${year}-${pad2(monthIndex0 + 1)}`;
  // matrix[dayOfWeek][categoryId] = hours
  const matrix = Array.from({ length: 7 }, () => ({}));
  const byDay = Array.from({ length: 7 }, () => 0);
  for (const [dateStr, entry] of Object.entries(entries)) {
    if (!dateStr.startsWith(prefix)) continue;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    for (const l of entry.logs || []) {
      const h = Number(l.hours) || 0;
      matrix[dow][l.categoryId] = (matrix[dow][l.categoryId] || 0) + h;
      byDay[dow] += h;
    }
  }
  // 각 요일의 상위 카테고리
  const perDay = matrix.map((row, dow) => {
    const sorted = Object.entries(row)
      .map(([id, h]) => ({
        categoryId: id,
        hours: h,
        color: categories.find((c) => c.id === id)?.color ?? '#8A8A8A',
        name: categories.find((c) => c.id === id)?.name ?? '?',
      }))
      .sort((a, b) => b.hours - a.hours);
    return { dow, total: byDay[dow], top: sorted.slice(0, 3), all: sorted };
  });
  return perDay;
}

// ---- 블라인드 스팟 역추적 ----
// Time Ledger 카테고리 ID에 연결된 "과거 놓친 이슈(incident)" 개수
export function incidentsByTimeCategory(blindspots) {
  const byCat = {};
  for (const bs of blindspots) {
    if (bs.type !== 'incident') continue;
    for (const cid of bs.relatedCategoryIds || []) {
      byCat[cid] = (byCat[cid] || 0) + 1;
    }
  }
  return byCat;
}

// ---- 전문 검색 ----
// entries, blindspots에서 전문 검색 (카테고리 이름은 Time Ledger 쪽만 보조 매치에 사용)
export function search(query, { entries, blindspots, categories }) {
  const q = query.trim().toLowerCase();
  if (!q) return { logs: [], blindspots: [] };
  const catName = (id) => categories.find((c) => c.id === id)?.name ?? '';

  const logs = [];
  for (const [dateStr, entry] of Object.entries(entries)) {
    for (const l of entry.logs || []) {
      const hay = `${l.content} ${catName(l.categoryId)}`.toLowerCase();
      if (hay.includes(q)) {
        logs.push({ dateStr, ...l, categoryName: catName(l.categoryId) });
      }
    }
    for (const p of entry.plan || []) {
      const hay = `${p.note || ''} ${catName(p.categoryId)}`.toLowerCase();
      if (hay.includes(q)) {
        logs.push({
          dateStr,
          id: `plan-${dateStr}-${p.categoryId}`,
          content: p.note || '(계획)',
          categoryId: p.categoryId,
          categoryName: catName(p.categoryId),
          hours: p.hours,
          timestamp: `${dateStr}T00:00:00.000Z`,
          isPlan: true,
        });
      }
    }
  }
  logs.sort((a, b) => (b.dateStr || '').localeCompare(a.dateStr || ''));

  const bsHits = blindspots.filter((b) => {
    const hay = `${b.title} ${b.description || ''} ${b.lessonLearned || ''} ${b.category}`.toLowerCase();
    return hay.includes(q);
  });

  return { logs: logs.slice(0, 60), blindspots: bsHits.slice(0, 40) };
}
