// src/lib/pdf.ts
//
// PDF generation for the Export feature. Uses pdf-lib — a pure-JS,
// no-native-dependencies library that draws text/lines directly onto PDF
// pages, rather than screenshotting rendered HTML (which would need a
// headless browser at request time — too heavy for this MVP, and
// Playwright here is a dev/test-only dependency, not a production one).
//
// PdfWriter is a small internal helper that tracks a "cursor" (current
// page + y position) and adds a new page automatically when content
// would run off the bottom — pdf-lib itself has no concept of flowing
// text across pages, so something like this is necessary for anything
// longer than one page.

import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { formatDate } from "./dates";
import type { BudgetCategorySummary } from "./budget";

// pdf-lib's standard 14 fonts use WinAnsi encoding, which has no glyph for
// the Ghana Cedi sign (₵, U+20B5) that lib/currency.ts's formatGHS() uses
// everywhere in the UI — drawText() throws if asked to render it. PDFs
// need their own formatter that sticks to WinAnsi-safe characters; the
// ISO code reads perfectly clearly on paper.
function formatGHSForPdf(amount: number): string {
  return `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const INK = rgb(0.12, 0.11, 0.09);
const MUTED = rgb(0.45, 0.43, 0.4);
const GOLD = rgb(0.71, 0.55, 0.03);

class PdfWriter {
  private doc!: PDFDocument;
  private page!: PDFPage;
  private font!: PDFFont;
  private boldFont!: PDFFont;
  private y = PAGE_HEIGHT - MARGIN;

  static async create(): Promise<PdfWriter> {
    const writer = new PdfWriter();
    writer.doc = await PDFDocument.create();
    writer.font = await writer.doc.embedFont(StandardFonts.Helvetica);
    writer.boldFont = await writer.doc.embedFont(StandardFonts.HelveticaBold);
    writer.addPage();
    return writer;
  }

  private addPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  private ensureSpace(lineHeight: number) {
    if (this.y - lineHeight < MARGIN) this.addPage();
  }

  text(str: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number } = {}) {
    const size = opts.size ?? 11;
    const font = opts.bold ? this.boldFont : this.font;
    const lineHeight = size + (opts.gap ?? 6);
    this.ensureSpace(lineHeight);
    this.page.drawText(str, { x: MARGIN, y: this.y, size, font, color: opts.color ?? INK });
    this.y -= lineHeight;
  }

  /** Two-column line: label left-aligned, value right-aligned. */
  row(left: string, right: string, opts: { size?: number; bold?: boolean } = {}) {
    const size = opts.size ?? 11;
    const font = opts.bold ? this.boldFont : this.font;
    const lineHeight = size + 6;
    this.ensureSpace(lineHeight);
    this.page.drawText(left, { x: MARGIN, y: this.y, size, font, color: INK });
    const rightWidth = font.widthOfTextAtSize(right, size);
    this.page.drawText(right, { x: PAGE_WIDTH - MARGIN - rightWidth, y: this.y, size, font, color: MUTED });
    this.y -= lineHeight;
  }

  spacer(h = 10) {
    this.y -= h;
  }

  hr() {
    this.ensureSpace(12);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.5,
      color: rgb(0.85, 0.83, 0.8),
    });
    this.y -= 14;
  }

  async save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

interface WeddingHeader {
  coupleNames: string;
  weddingDate: Date;
  city: string;
}

interface ScheduleChecklistItem {
  title: string;
  category: string;
  dueDate: Date | null;
  done: boolean;
}

function writeHeader(w: PdfWriter, wedding: WeddingHeader, subtitle: string) {
  w.text(wedding.coupleNames, { size: 22, bold: true, color: GOLD, gap: 4 });
  w.text(subtitle, { size: 12, color: MUTED });
  w.text(`${formatDate(wedding.weddingDate)} · ${wedding.city.charAt(0) + wedding.city.slice(1).toLowerCase()}`, {
    size: 10,
    color: MUTED,
    gap: 14,
  });
  w.hr();
}

function writeChecklistSection(w: PdfWriter, checklistItems: ScheduleChecklistItem[]) {
  w.text("Checklist & Schedule", { size: 14, bold: true, gap: 10 });
  const byCategory = new Map<string, ScheduleChecklistItem[]>();
  for (const item of checklistItems) {
    if (!byCategory.has(item.category)) byCategory.set(item.category, []);
    byCategory.get(item.category)!.push(item);
  }
  for (const [category, items] of byCategory) {
    w.text(category, { size: 11, bold: true, gap: 4 });
    for (const item of items) {
      const status = item.done ? "[done]" : item.dueDate ? formatDate(item.dueDate) : "[no date]";
      w.row(`  ${item.title}`, status, { size: 10 });
    }
    w.spacer(6);
  }
}

/** Free-tier export: just the checklist, as a printable schedule. */
export async function generateSchedulePdf(
  wedding: WeddingHeader,
  checklistItems: ScheduleChecklistItem[]
): Promise<Uint8Array> {
  const w = await PdfWriter.create();
  writeHeader(w, wedding, "Wedding Schedule");
  writeChecklistSection(w, checklistItems);
  return w.save();
}

interface FullReportBudget {
  totalBudgetGHS: number;
  totalSpentGHS: number;
  categories: BudgetCategorySummary[];
}

interface FullReportGuests {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
}

/** Pro-tier export: checklist + budget breakdown + guest RSVP summary. */
export async function generateFullReportPdf(
  wedding: WeddingHeader,
  checklistItems: ScheduleChecklistItem[],
  budget: FullReportBudget,
  guests: FullReportGuests
): Promise<Uint8Array> {
  const w = await PdfWriter.create();
  writeHeader(w, wedding, "Full Wedding Report — AkomaPlanner Pro");

  w.text("Budget", { size: 14, bold: true, gap: 10 });
  w.row("Total budget", formatGHSForPdf(budget.totalBudgetGHS), { bold: true });
  w.row("Total spent", formatGHSForPdf(budget.totalSpentGHS), { bold: true });
  w.spacer(6);
  for (const c of budget.categories) {
    w.row(`  ${c.name}`, `${formatGHSForPdf(c.spentGHS)} / ${formatGHSForPdf(c.allocatedGHS)}`, { size: 10 });
  }
  w.spacer(10);
  w.hr();

  w.text("Guests", { size: 14, bold: true, gap: 10 });
  w.row("Total invited", String(guests.total));
  w.row("Confirmed", String(guests.confirmed));
  w.row("Pending", String(guests.pending));
  w.row("Declined", String(guests.declined));
  w.spacer(10);
  w.hr();

  writeChecklistSection(w, checklistItems);
  return w.save();
}
