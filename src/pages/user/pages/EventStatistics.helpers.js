// Helpers for EventStatistics.jsx, moved out to keep the page component readable.
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("mn-MN", {
    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  });
}

export function formatTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("mn-MN", {
    hour: "2-digit",

    minute: "2-digit",

    hour12: false,
  });
}

export function getName(person) {
  const fullName = [person?.first_name, person?.last_name]

    .filter(Boolean)

    .join(" ")

    .trim();

  return fullName || person?.name || person?.email || "-";
}

export function getInitials(person) {
  const name = getName(person);

  return name

    .split(/\s+/)

    .filter(Boolean)

    .slice(0, 2)

    .map((part) => part[0]?.toUpperCase())

    .join("");
}

export function downloadCsv(event, participants) {
  const rows = [
    ["Нэр", "И-мэйл", "Байгууллага"],

    ...participants.map((person) => [
      getName(person),

      person.email || "",

      person.company_name || "",
    ]),
  ];

  const csv = rows

    .map((row) =>
      row

        .map((value) => `"${String(value).replace(/"/g, '""')}"`)

        .join(","),
    )

    .join("\n");

  const blob = new Blob(["\ufeff", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = `${event?.title || "event"}-participants.csv`;

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}

export function safeFileName(value) {
  return (
    String(value || "event")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .slice(0, 100) || "event"
  );
}

export function downloadExcel(event, participants) {
  const eventRows = [
    ["Үзүүлэлт", "Мэдээлэл"],
    ["Эвэнт", event?.title || ""],
    ["Эхлэх огноо", formatDate(event?.start_time)],
    ["Эхлэх цаг", formatTime(event?.start_time)],
    ["Дуусах цаг", formatTime(event?.end_time)],
    ["Нийт оролцогч", participants.length],
    ["Дээд оролцогч", Number(event?.max_participants) || 0],
  ];

  const participantRows = participants.map((person, index) => ({
    "№": index + 1,
    Нэр: getName(person),
    "И-мэйл": person?.email || "",
    Байгууллага: person?.company_name || "",
    Төлөв: "Бүртгүүлсэн",
  }));

  const workbook = XLSX.utils.book_new();
  const eventSheet = XLSX.utils.aoa_to_sheet(eventRows);
  const participantsSheet = XLSX.utils.json_to_sheet(participantRows, {
    header: ["№", "Нэр", "И-мэйл", "Байгууллага", "Төлөв"],
  });

  eventSheet["!cols"] = [{ wch: 22 }, { wch: 40 }];
  participantsSheet["!cols"] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 32 },
    { wch: 30 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(workbook, eventSheet, "Эвэнт");
  XLSX.utils.book_append_sheet(workbook, participantsSheet, "Оролцогчид");
  XLSX.writeFile(workbook, `${safeFileName(event?.title)}-report.xlsx`);
}

export async function downloadPdf(event, reportElement) {
  if (!reportElement) return;

  const canvas = await html2canvas(reportElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: Math.max(
      reportElement.scrollWidth,
      document.documentElement.clientWidth,
    ),
  });

  const imageData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const imageHeight = (canvas.height * printableWidth) / canvas.width;

  let heightLeft = imageHeight;
  let position = margin;

  pdf.addImage(
    imageData,
    "JPEG",
    margin,
    position,
    printableWidth,
    imageHeight,
  );
  heightLeft -= printableHeight;

  while (heightLeft > 0) {
    position = margin - (imageHeight - heightLeft);
    pdf.addPage();
    pdf.addImage(
      imageData,
      "JPEG",
      margin,
      position,
      printableWidth,
      imageHeight,
    );
    heightLeft -= printableHeight;
  }

  pdf.save(`${safeFileName(event?.title)}-report.pdf`);
}
