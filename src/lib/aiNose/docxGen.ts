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
import { MeetingWithRelations } from "./types";

const PRIMARY = "1F4E79";
const ACCENT = "70AD47";
const WARNING = "C00000";
const MUTED = "595959";

const PRIORITY_LABEL: Record<string, string> = { high: "🔴 높음", medium: "🟡 보통", low: "🟢 낮음" };

function H(text: string, level: typeof HeadingLevel[keyof typeof HeadingLevel], color = PRIMARY) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, color, bold: true })],
  });
}

function P(text: string, opts: { color?: string; bold?: boolean; italic?: boolean } = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({
        text,
        color: opts.color,
        bold: opts.bold,
        italics: opts.italic,
      }),
    ],
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
    border: {
      bottom: { color: "CCCCCC", style: BorderStyle.SINGLE, size: 6, space: 1 },
    },
    spacing: { before: 120, after: 120 },
  });
}

function row(cells: string[], header = false) {
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
          shading: header ? { fill: PRIMARY } : undefined,
          width: { size: 100 / cells.length, type: WidthType.PERCENTAGE },
        })
    ),
  });
}

export async function buildMeetingDocx(meeting: MeetingWithRelations): Promise<Buffer> {
  const dateLabel = new Date(meeting.meeting_date).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const children: (Paragraph | Table)[] = [];

  // 표지
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({ text: "아이노즈 ↔ 에프씨넷 회의록", color: PRIMARY, bold: true, size: 40 }),
      ],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: meeting.title, color: MUTED, size: 28 })],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `📅 ${dateLabel}`, color: MUTED })],
    })
  );
  if (meeting.duration_minutes) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: `⏱ ${meeting.duration_minutes}분`, color: MUTED })],
      })
    );
  }
  children.push(divider());

  // 한 줄 결론
  if (meeting.executive_summary) {
    children.push(H("🎯 한 줄 결론", HeadingLevel.HEADING_2));
    children.push(P(meeting.executive_summary, { bold: true, color: ACCENT }));
  }

  // 참석자
  if (meeting.participants.length) {
    children.push(H("👥 참석자", HeadingLevel.HEADING_2));
    const partRows: TableRow[] = [
      row(["원본 라벨", "이름", "직책/소속", "발화 수"], true),
      ...meeting.participants
        .sort((a, b) => a.order_idx - b.order_idx)
        .map((p) =>
          row([
            p.raw_label,
            p.name || "-",
            p.role || "-",
            String(p.utterance_count),
          ])
        ),
    ];
    children.push(
      new Table({
        rows: partRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }

  // 핵심 결정사항
  if (meeting.decisions.length) {
    children.push(H("✅ 핵심 결정사항", HeadingLevel.HEADING_2, ACCENT));
    for (const d of meeting.decisions.sort((a, b) => a.order_idx - b.order_idx)) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({ text: `[결정] `, bold: true, color: ACCENT }),
            new TextRun({ text: d.title, bold: true }),
            d.source_timestamp
              ? new TextRun({ text: `  (${d.source_timestamp})`, color: MUTED, italics: true })
              : new TextRun({ text: "" }),
          ],
        })
      );
      if (d.description) children.push(P(d.description));
    }
  }

  // 본문 섹션
  if (meeting.sections.length) {
    children.push(H("📋 논의 내용", HeadingLevel.HEADING_2));
    for (const s of meeting.sections.sort((a, b) => a.order_idx - b.order_idx)) {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: [new TextRun({ text: s.title, bold: true, color: PRIMARY })],
        })
      );
      for (const b of s.bullets) children.push(bullet(b));
    }
  }

  // 액션 아이템
  if (meeting.action_items.length) {
    children.push(H("🎬 액션 아이템", HeadingLevel.HEADING_2));
    const aiRows: TableRow[] = [
      row(["담당", "기한", "우선도", "내용"], true),
      ...meeting.action_items
        .sort((a, b) => a.order_idx - b.order_idx)
        .map((a) =>
          row([
            a.owner_name || "미정",
            a.due_date || "-",
            PRIORITY_LABEL[a.priority] || a.priority,
            a.title + (a.description ? ` — ${a.description}` : ""),
          ])
        ),
    ];
    children.push(
      new Table({
        rows: aiRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );
  }

  // 리스크
  if (meeting.risks.length) {
    children.push(H("⚠️ 리스크 / 이슈", HeadingLevel.HEADING_2, WARNING));
    for (const r of meeting.risks.sort((a, b) => a.order_idx - b.order_idx)) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({
              text: `[${PRIORITY_LABEL[r.severity] || r.severity}] `,
              bold: true,
              color: WARNING,
            }),
            new TextRun({ text: r.title, bold: true }),
          ],
        })
      );
      if (r.description) children.push(P(r.description));
      if (r.mitigation) children.push(P(`완화 방안: ${r.mitigation}`, { italic: true, color: MUTED }));
    }
  }

  // 다음 안건
  if (meeting.next_agenda.length) {
    children.push(H("📌 다음 안건", HeadingLevel.HEADING_2));
    for (const a of meeting.next_agenda) children.push(bullet(a));
  }

  // Footer
  children.push(divider());
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `생성: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} | 아이노즈 회의록 자동화 (Opus 4.7)`,
          color: MUTED,
          size: 18,
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
    styles: {
      default: {
        document: { run: { font: "맑은 고딕", size: 22 } },
      },
    },
  });

  return await Packer.toBuffer(doc);
}
