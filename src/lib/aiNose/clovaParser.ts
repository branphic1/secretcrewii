// 클로바노트 .txt 파서
// 일반 export 포맷:
//   참석자 1   00:01
//   안녕하세요...
//
//   참석자 2   00:05
//   네...
//
// 짧은 추임새/잡담은 후처리에서 LLM이 거름. 여기는 발화 단위로만 분리.

export interface Utterance {
  participant: string;
  timestamp: string | null;
  text: string;
}

const HEADER_RE = /^(참석자\s*\d+|화자\s*\d+|[A-Za-zㄱ-힝][^\n]{0,30})\s+(\d{1,2}:\d{2}(?::\d{2})?)\s*$/;

export function parseClovaText(raw: string): Utterance[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const utterances: Utterance[] = [];
  let current: Utterance | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current && current.text.trim()) {
        utterances.push(current);
        current = null;
      }
      continue;
    }
    const m = HEADER_RE.exec(trimmed);
    if (m) {
      if (current && current.text.trim()) utterances.push(current);
      current = { participant: m[1].trim(), timestamp: m[2], text: "" };
    } else {
      if (!current) {
        // 헤더 없이 시작한 경우 — 통째로 텍스트로
        current = { participant: "참석자 1", timestamp: null, text: "" };
      }
      current.text += (current.text ? "\n" : "") + trimmed;
    }
  }
  if (current && current.text.trim()) utterances.push(current);
  return utterances;
}

export function summarizeParticipants(utts: Utterance[]) {
  const map = new Map<string, number>();
  for (const u of utts) {
    map.set(u.participant, (map.get(u.participant) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([label, count]) => ({ label, count }));
}

export function utterancesToCleanedTranscript(utts: Utterance[]): string {
  return utts
    .map((u) => `[${u.participant}${u.timestamp ? " " + u.timestamp : ""}] ${u.text}`)
    .join("\n\n");
}
