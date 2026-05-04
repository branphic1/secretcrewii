import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import { Deck, DeckProfile } from "./types";

function H(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel], color: string) {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text, color, bold: true })],
  });
}
function P(text: string, color?: string, italic?: boolean, bold?: boolean) {
  return new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text, color, italics: italic, bold })],
  });
}
function bullet(text: string) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text })],
  });
}
function divider() {
  return new Paragraph({
    border: { bottom: { color: "CCCCCC", style: BorderStyle.SINGLE, size: 6, space: 1 } },
    spacing: { before: 120, after: 120 },
  });
}
function row(cells: string[], header = false, accent = "1F4E79") {
  return new TableRow({
    children: cells.map(
      (c) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: c, bold: header, color: header ? "FFFFFF" : undefined })],
              alignment: header ? AlignmentType.CENTER : AlignmentType.LEFT,
            }),
          ],
          shading: header ? { fill: accent } : undefined,
          width: { size: 100 / cells.length, type: WidthType.PERCENTAGE },
        })
    ),
  });
}

export async function buildDeckDocx(deck: Deck, profile: DeckProfile | null): Promise<Buffer> {
  const ex = deck.extracted;
  if (!ex) throw new Error("추출 결과가 없습니다.");
  const accent1 = profile?.accent1_hex || "D94A35";
  const accent2 = profile?.accent2_hex || "B8893E";
  const navy = "0F1B2D";
  const muted = "595959";

  const dateLabel = new Date(deck.meeting_date).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const children: (Paragraph | Table)[] = [];

  // 표지
  if (profile?.company_name) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: profile.company_name, color: muted, size: 22 })],
      })
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 200 },
      children: [new TextRun({ text: "회의록 가이드", color: navy, bold: true, size: 44 })],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: deck.title, color: muted, size: 28 })],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `📅 ${dateLabel}`, color: muted })],
    })
  );
  children.push(divider());

  // 핵심 명제
  if (ex.coreThesis.text) {
    children.push(H("🎯 핵심 명제", HeadingLevel.HEADING_1, navy));
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: `"${ex.coreThesis.text}"`, italics: true, bold: true, color: navy, size: 26 })],
      })
    );
    children.push(P(`— ${ex.coreThesis.speaker} · ${ex.coreThesis.timestamp}`, accent1, true));
  }

  // 한 줄 요약
  if (ex.executiveSummary) {
    children.push(H("📌 한 줄 요약", HeadingLevel.HEADING_2, navy));
    children.push(P(ex.executiveSummary, accent1, false, true));
  }

  // 참석자
  if (ex.participants.length) {
    children.push(H("👥 참석자", HeadingLevel.HEADING_2, navy));
    const rows: TableRow[] = [
      row(["원본 라벨", "이름", "역할", "발화 수"], true, navy),
      ...ex.participants.map((p) =>
        row([p.rawLabel, p.inferredName || "-", p.inferredRole || "-", String(p.utteranceCount)])
      ),
    ];
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  // 회의 타임라인
  if (ex.timelineMarkers.length) {
    children.push(H("⏱ 회의 타임라인", HeadingLevel.HEADING_2, navy));
    for (const m of ex.timelineMarkers) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({ text: `[${m.timestamp}] `, color: accent1, bold: true }),
            new TextRun({ text: m.title, bold: true }),
          ],
        })
      );
      if (m.summary) children.push(P(m.summary, muted));
    }
  }

  // Phase
  if (ex.phases.length) {
    children.push(H("📊 Phase 분석", HeadingLevel.HEADING_2, navy));
    for (const ph of ex.phases) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({ text: `${ph.title} `, bold: true, color: accent2 }),
            new TextRun({ text: `(${ph.range})`, color: muted, italics: true }),
          ],
        })
      );
      if (ph.summary) children.push(P(ph.summary));
    }
  }

  // BEST 인용
  if (ex.bestQuotes.length) {
    children.push(H("💬 BEST 인용", HeadingLevel.HEADING_2, navy));
    for (const q of ex.bestQuotes) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: `${q.starred ? "★ " : ""}${q.speaker} · ${q.timestamp}`,
              color: q.starred ? accent1 : muted,
              bold: true,
            }),
          ],
        })
      );
      children.push(P(`"${q.text}"`, undefined, true));
    }
  }

  // 데이터 카탈로그
  if (ex.dataPoints.length) {
    children.push(H("📊 데이터 카탈로그", HeadingLevel.HEADING_2, navy));
    const rows: TableRow[] = [
      row(["수치", "단위", "맥락", "시점"], true, navy),
      ...ex.dataPoints.map((d) => row([d.value, d.unit, d.context, d.timestamp || "-"])),
    ];
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  // 액션 아이템
  if (ex.actionItems.length) {
    children.push(H("🎬 액션 아이템", HeadingLevel.HEADING_2, navy));
    for (const a of ex.actionItems) children.push(bullet(a));
  }

  // 다음 안건
  if (ex.nextAgenda.length) {
    children.push(H("📌 다음 안건", HeadingLevel.HEADING_2, navy));
    for (const a of ex.nextAgenda) children.push(bullet(a));
  }

  children.push(divider());
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `생성: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} · Deck Builder (Opus 4.7)`,
          color: muted,
          size: 18,
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: {
      default: { document: { run: { font: "맑은 고딕", size: 22 } } },
    },
  });

  return await Packer.toBuffer(doc);
}
