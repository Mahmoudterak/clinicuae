import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";

// ─── Color palette ────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const PRIMARY: RGB = [79, 70, 229];   // indigo-600
const SUCCESS: RGB = [16, 185, 129];  // emerald-500
const WARN:    RGB = [245, 158, 11];  // amber-500
const DANGER:  RGB = [239, 68, 68];   // red-500
const MUTED:   RGB = [100, 116, 139]; // slate-500
const BORDER:  RGB = [226, 232, 240]; // slate-200
const BG:      RGB = [248, 250, 252]; // slate-50

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatAED(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(amount);
}

function safeDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd MMM yyyy");
  } catch {
    return dateStr;
  }
}

function drawHRule(doc: jsPDF, y: number, color = BORDER): void {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.3);
  doc.line(14, y, 196, y);
}

// ─── Invoice PDF ──────────────────────────────────────────────────────────────
export interface InvoicePDFData {
  id: number;
  patientName: string;
  description: string;
  amount: number;
  status: string;
  issuedDate: string;
  dueDate?: string | null;
  paidDate?: string | null;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  logoDataUrl?: string | null;
}

export function generateInvoicePDF(inv: InvoicePDFData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 14;
  const contentW = pageW - margin * 2;

  // ── Header background strip ──
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 42, "F");

  // ── Logo (if provided) ──
  let headerTextX = margin;
  if (inv.logoDataUrl) {
    try {
      doc.addImage(inv.logoDataUrl, "PNG", margin, 8, 24, 24);
      headerTextX = margin + 28;
    } catch {
      // logo failed — fall through
    }
  }

  // ── Clinic name & contact in header ──
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(inv.clinicName, headerTextX, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const contactParts = [inv.clinicAddress, inv.clinicPhone, inv.clinicEmail].filter(Boolean);
  if (contactParts.length) {
    doc.text(contactParts.join("  |  "), headerTextX, 26);
  }

  // ── "INVOICE" badge top-right ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE", pageW - margin, 20, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const invNum = `INV-${inv.id.toString().padStart(5, "0")}`;
  doc.text(invNum, pageW - margin, 28, { align: "right" });

  // ── Invoice metadata block ──
  let y = 54;
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Bill To:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y += 6;
  doc.text(inv.patientName, margin, y);

  // Status badge (right side)
  const statusColor =
    inv.status === "paid" ? SUCCESS : inv.status === "overdue" ? DANGER : WARN;
  const statusLabel = inv.status.toUpperCase();
  doc.setFillColor(...statusColor);
  doc.roundedRect(pageW - margin - 28, 48, 28, 9, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(statusLabel, pageW - margin - 14, 53.5, { align: "center" });

  // Date row
  y += 4;
  drawHRule(doc, y + 2);
  y += 10;

  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Issue Date", margin, y);
  doc.text("Due Date", margin + 50, y);
  if (inv.paidDate) doc.text("Paid Date", margin + 100, y);

  y += 5;
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(safeDate(inv.issuedDate), margin, y);
  doc.text(inv.dueDate ? safeDate(inv.dueDate) : "—", margin + 50, y);
  if (inv.paidDate) doc.text(safeDate(inv.paidDate), margin + 100, y);

  // ── Items table ──
  y += 14;
  // Table header
  doc.setFillColor(...BG);
  doc.rect(margin, y - 5, contentW, 9, "F");
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DESCRIPTION", margin + 2, y);
  doc.text("AMOUNT", pageW - margin - 2, y, { align: "right" });

  y += 5;
  drawHRule(doc, y);

  // Table row
  y += 8;
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Wrap description text
  const descLines = doc.splitTextToSize(inv.description, contentW - 50);
  doc.text(descLines, margin + 2, y);

  // Amount on same baseline as first line
  doc.setFont("helvetica", "bold");
  doc.text(formatAED(inv.amount), pageW - margin - 2, y, { align: "right" });

  y += descLines.length * 6 + 4;
  drawHRule(doc, y);

  // ── Totals ──
  y += 10;
  const totalsX = pageW - margin - 70;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Subtotal", totalsX, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(formatAED(inv.amount), pageW - margin - 2, y, { align: "right" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text("Tax (0%)", totalsX, y);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text(formatAED(0), pageW - margin - 2, y, { align: "right" });

  y += 2;
  drawHRule(doc, y + 3, PRIMARY);
  y += 9;

  doc.setFillColor(...PRIMARY);
  doc.rect(totalsX - 4, y - 5, pageW - margin - totalsX + 6, 11, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TOTAL", totalsX, y + 1);
  doc.text(formatAED(inv.amount), pageW - margin - 2, y + 1, { align: "right" });

  // ── Footer ──
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    "Thank you for choosing " + inv.clinicName + ". Generated on " + format(new Date(), "dd MMM yyyy"),
    pageW / 2,
    285,
    { align: "center" }
  );

  doc.save(`${invNum}_${inv.patientName.replace(/\s+/g, "_")}.pdf`);
}

// ─── Reports PDF ──────────────────────────────────────────────────────────────
export interface ReportPDFData {
  clinicName: string;
  clinicAddress?: string;
  logoDataUrl?: string | null;

  // Financial
  totalRevenue: number;
  avgRevenue: number;
  totalPending: number;
  paidCount: number;
  pendingCount: number;
  revenueByMonth: { name: string; value: number }[];

  // Clinical
  totalAppointments: number;
  statusCounts: Record<string, number>;
  doctorStats: { name: string; count: number }[];
  totalLabs: number;
  totalRads: number;

  // Demographics
  totalPatients: number;
  genderCounts: Record<string, number>;
}

export function generateReportPDF(data: ReportPDFData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 14;
  const contentW = pageW - margin * 2;

  // ── Header ──
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 38, "F");

  let headerTextX = margin;
  if (data.logoDataUrl) {
    try {
      doc.addImage(data.logoDataUrl, "PNG", margin, 7, 22, 22);
      headerTextX = margin + 26;
    } catch { /* skip */ }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.clinicName, headerTextX, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (data.clinicAddress) doc.text(data.clinicAddress, headerTextX, 23);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Financial & Clinical Report", pageW - margin, 16, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Generated: " + format(new Date(), "dd MMM yyyy, HH:mm"), pageW - margin, 23, { align: "right" });

  let y = 50;

  // ────────────────── SECTION: Financial Summary ──────────────────
  const sectionHeader = (title: string) => {
    doc.setFillColor(...BG);
    doc.rect(margin, y - 5, contentW, 9, "F");
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.8);
    doc.line(margin, y - 5, margin, y + 4);
    doc.setLineWidth(0.3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PRIMARY);
    doc.text(title.toUpperCase(), margin + 4, y);
    y += 10;
  };

  sectionHeader("Financial Summary");

  // KPI boxes — 3 columns
  const kpiW = (contentW - 8) / 3;
  const kpiItems = [
    { label: "Total Revenue", value: formatAED(data.totalRevenue), color: SUCCESS },
    { label: "Average Invoice", value: formatAED(data.avgRevenue), color: PRIMARY },
    { label: "Pending Collection", value: formatAED(data.totalPending), color: WARN },
  ];

  kpiItems.forEach((k, i) => {
    const kx = margin + i * (kpiW + 4);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(kx, y, kpiW, 18, "FD");
    doc.setFillColor(...(k.color as [number,number,number]));
    doc.rect(kx, y, 2, 18, "F");
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(k.label, kx + 5, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...(k.color as [number,number,number]));
    doc.text(k.value, kx + 5, y + 14);
  });

  y += 26;

  // Invoice counts
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Paid Invoices: `, margin, y);
  doc.setTextColor(...SUCCESS);
  doc.setFont("helvetica", "bold");
  doc.text(String(data.paidCount), margin + 28, y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text(`  |  Pending Invoices: `, margin + 32, y);
  doc.setTextColor(...WARN);
  doc.setFont("helvetica", "bold");
  doc.text(String(data.pendingCount), margin + 78, y);

  y += 10;

  // Revenue by month table
  if (data.revenueByMonth.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("Revenue by Month", margin, y);
    y += 6;

    // Table header
    doc.setFillColor(...BG);
    doc.rect(margin, y - 4, contentW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Month", margin + 2, y);
    doc.text("Revenue (AED)", pageW - margin - 2, y, { align: "right" });
    y += 4;

    data.revenueByMonth.forEach((row, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, y - 3, contentW, 7, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(row.name, margin + 2, y + 1);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...SUCCESS);
      doc.text(formatAED(row.value as number), pageW - margin - 2, y + 1, { align: "right" });
      y += 7;
    });
    y += 4;
  }

  drawHRule(doc, y);
  y += 10;

  // ────────────────── SECTION: Clinical Activity ──────────────────
  sectionHeader("Clinical Activity");

  const clinKpiW = (contentW - 4) / 3;
  const clinItems = [
    { label: "Total Appointments", value: String(data.totalAppointments) },
    { label: "Lab Requests", value: String(data.totalLabs) },
    { label: "Radiology Requests", value: String(data.totalRads) },
  ];

  clinItems.forEach((k, i) => {
    const kx = margin + i * (clinKpiW + 2);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.rect(kx, y, clinKpiW, 16, "FD");
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(k.label, kx + 3, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...PRIMARY);
    doc.text(k.value, kx + 3, y + 13);
  });

  y += 22;

  // Appointment status breakdown
  if (Object.keys(data.statusCounts).length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("Appointment Status Breakdown", margin, y);
    y += 6;

    doc.setFillColor(...BG);
    doc.rect(margin, y - 4, contentW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Status", margin + 2, y);
    doc.text("Count", pageW - margin - 2, y, { align: "right" });
    y += 4;

    Object.entries(data.statusCounts).forEach(([status, count], idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, y - 3, contentW, 7, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(status.charAt(0).toUpperCase() + status.slice(1), margin + 2, y + 1);
      doc.setFont("helvetica", "bold");
      doc.text(String(count), pageW - margin - 2, y + 1, { align: "right" });
      y += 7;
    });
    y += 4;
  }

  // Top doctors
  if (data.doctorStats.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("Top Doctors by Appointments", margin, y);
    y += 6;

    doc.setFillColor(...BG);
    doc.rect(margin, y - 4, contentW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Doctor", margin + 2, y);
    doc.text("Appointments", pageW - margin - 2, y, { align: "right" });
    y += 4;

    data.doctorStats.slice(0, 5).forEach((d, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, y - 3, contentW, 7, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(d.name, margin + 2, y + 1);
      doc.setFont("helvetica", "bold");
      doc.text(String(d.count), pageW - margin - 2, y + 1, { align: "right" });
      y += 7;
    });
    y += 4;
  }

  drawHRule(doc, y);
  y += 10;

  // ────────────────── SECTION: Demographics ──────────────────
  sectionHeader("Patient Demographics");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Total Patients: ${data.totalPatients}`, margin, y);
  y += 8;

  if (Object.keys(data.genderCounts).length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Gender Distribution", margin, y);
    y += 6;

    Object.entries(data.genderCounts).forEach(([gender, count], idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(250, 251, 252);
        doc.rect(margin, y - 3, contentW, 7, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const pct = data.totalPatients > 0 ? ((count / data.totalPatients) * 100).toFixed(1) : "0";
      doc.text(`${gender.charAt(0).toUpperCase() + gender.slice(1)}`, margin + 2, y + 1);
      doc.setFont("helvetica", "bold");
      doc.text(`${count} (${pct}%)`, pageW - margin - 2, y + 1, { align: "right" });
      y += 7;
    });
  }

  // ── Footer ──
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(
    `${data.clinicName} — Confidential Report — Generated ${format(new Date(), "dd MMM yyyy")}`,
    pageW / 2,
    285,
    { align: "center" }
  );

  doc.save(`clinic-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
