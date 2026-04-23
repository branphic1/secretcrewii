// 주기형 블라인드 스팟 롤오버 로직 (명세 10.2)
import { fromDateStr, toDateStr, addDays } from './dates.js';

// anchor(= dueDate처럼 사용)를 frequency만큼 전진시킨 다음 dueDate 반환
export function nextDueDate(anchorStr, frequency) {
  const d = fromDateStr(anchorStr);
  switch (frequency) {
    case 'weekly':
      return toDateStr(addDays(d, 7));
    case 'monthly': {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      return toDateStr(next);
    }
    case 'quarterly': {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 3);
      return toDateStr(next);
    }
    case 'yearly': {
      const next = new Date(d);
      next.setFullYear(next.getFullYear() + 1);
      return toDateStr(next);
    }
    default:
      return anchorStr;
  }
}

// 명세 10.2:
// 1) 기존 레코드는 status 유지 + archived 플래그
// 2) 새 레코드 생성 (dueDate = 완료일 + frequency, status=pending)
export function rolloverRecurring(item, completedDateStr) {
  if (item.type !== 'recurring' || !item.recurrence) return [item];
  const archived = { ...item, archived: true, updatedAt: new Date().toISOString() };
  const freshDue = nextDueDate(completedDateStr, item.recurrence.frequency);
  const next = {
    ...item,
    id: `bs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'pending',
    archived: false,
    dueDate: freshDue,
    recurrence: { ...item.recurrence, anchor: freshDue },
    occurredDate: undefined,
    lessonLearned: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return [archived, next];
}
