import { AlertTriangle } from 'lucide-react';

// categoryId에 연결된 과거 incident 개수가 있으면 경고 표시
export default function BlindSpotHint({ categoryId, incidentsByCat = {} }) {
  const count = incidentsByCat[categoryId] || 0;
  if (count === 0) return null;
  return (
    <div
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
      style={{ background: '#FFF3EC', color: '#C85450', border: '1px solid #F4CFC2' }}
      title="이 카테고리에서 과거에 놓친 이슈가 있었습니다"
    >
      <AlertTriangle size={10} />
      과거 누락 {count}건
    </div>
  );
}
