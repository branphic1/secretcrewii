import { Check, Circle, AlertTriangle, Trash2, Pencil } from 'lucide-react';
import { diffDays, todayStr } from '@/lib/time-ledger/dates.js';
import Section from '../common/Section.jsx';

const SEVERITY_COLOR = {
  low: '#8A8A8A',
  medium: '#D4883F',
  high: '#C85450',
  critical: '#7A1F1D',
};

const TYPE_LABEL = {
  deadline: '데드라인',
  recurring: '주기',
  incident: '이슈',
};

export default function BlindSpotList({
  title, items, categories, emptyLabel, onEdit, onRemove, onDone, onMissed, hideStatusActions,
}) {
  const today = todayStr();
  const catColor = (name) => categories.find((c) => c.name === name)?.color ?? '#8A8A8A';

  return (
    <Section title={title}>
      {items.length === 0 ? (
        <div
          className="text-center text-sm py-8 rounded-lg"
          style={{ color: '#A8A29E', background: '#FFFDF6', border: '1px dashed #EFE7D4' }}
        >
          {emptyLabel}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const dueIn = item.dueDate ? diffDays(today, item.dueDate) : null;
            const missed = dueIn !== null && dueIn < 0 && item.status !== 'done';
            const urgent = dueIn !== null && dueIn >= 0 && dueIn <= 3;
            return (
              <li
                key={item.id}
                className="row-hover rounded-lg p-3 pl-4 flex items-start gap-3"
                style={{
                  background: '#FFFDF6',
                  border: '1px solid #EFE7D4',
                  borderLeft: `3px solid ${catColor(item.category)}`,
                }}
              >
                <div className="mt-1 shrink-0">
                  <span
                    className="rounded-full inline-block"
                    style={{ width: 8, height: 8, background: SEVERITY_COLOR[item.severity] || '#8A8A8A' }}
                    title={`심각도: ${item.severity}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: missed ? '#C85450' : '#2B2620' }}>
                      {item.title}
                    </span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: '#F3EDE1', color: '#57534E' }}
                    >
                      {TYPE_LABEL[item.type]}
                    </span>
                    <span className="text-xs" style={{ color: '#8A7F73' }}>· {item.category}</span>
                    {item.type === 'recurring' && item.recurrence && (
                      <span className="text-xs" style={{ color: '#8A7F73' }}>
                        · {{ weekly: '주간', monthly: '월간', quarterly: '분기', yearly: '연간' }[item.recurrence.frequency]}
                      </span>
                    )}
                  </div>
                  {(item.dueDate || item.occurredDate) && (
                    <div className="mt-1 text-xs" style={{ color: missed ? '#C85450' : urgent ? '#D4883F' : '#8A7F73' }}>
                      {item.dueDate && (
                        <>
                          <span className="display italic">{item.dueDate}</span>
                          {' '}
                          {missed ? (
                            <span className="inline-flex items-center gap-1">
                              <AlertTriangle size={10} /> {Math.abs(dueIn)}일 경과
                            </span>
                          ) : dueIn === 0 ? '오늘' : `D-${dueIn}`}
                        </>
                      )}
                      {item.occurredDate && (
                        <>
                          <span className="display italic">{item.occurredDate}</span> 발생
                        </>
                      )}
                    </div>
                  )}
                  {item.description && (
                    <div className="mt-1.5 text-xs" style={{ color: '#57534E' }}>{item.description}</div>
                  )}
                  {item.lessonLearned && (
                    <div
                      className="mt-1.5 text-xs rounded p-2"
                      style={{ background: '#FFFBF3', color: '#57534E', border: '1px solid #F3EDE1' }}
                    >
                      💡 {item.lessonLearned}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 on-hover">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-1 rounded hover:bg-stone-100 transition"
                    style={{ color: '#8A7F73' }}
                    aria-label="편집"
                  >
                    <Pencil size={14} />
                  </button>
                  {!hideStatusActions && (
                    <>
                      <button
                        onClick={() => onDone?.(item)}
                        className="p-1 rounded hover:bg-stone-100 transition"
                        style={{ color: '#5C8A6E' }}
                        aria-label="완료"
                      >
                        <Check size={14} />
                      </button>
                      {!missed && (
                        <button
                          onClick={() => onMissed?.(item)}
                          className="p-1 rounded hover:bg-stone-100 transition"
                          style={{ color: '#D4883F' }}
                          aria-label="놓침으로 표시"
                        >
                          <Circle size={14} />
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-1 rounded hover:bg-stone-100 transition"
                    style={{ color: '#C85450' }}
                    aria-label="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
