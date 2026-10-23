// Shared labels and formatting for the organizer payment pages.

export const BANKS = [
  "Хаан банк",
  "Голомт банк",
  "Худалдаа хөгжлийн банк",
  "Төрийн банк",
  "Хас банк",
  "Капитрон банк",
  "Богд банк",
  "М банк",
  "Ариг банк",
  "Тээвэр хөгжлийн банк",
  "Чингис хаан банк",
  "Үндэсний хөрөнгө оруулалтын банк",
];

export const FEE_STATUS = {
  awaiting: { label: "Төлөөгүй", tone: "amber" },
  submitted: { label: "Шалгагдаж буй", tone: "blue" },
  confirmed: { label: "Баталгаажсан", tone: "green" },
  rejected: { label: "Татгалзсан", tone: "red" },
};

export const money = (value) => `₮${Math.round(Number(value || 0)).toLocaleString("en-US")}`;

const pad = (n) => String(n).padStart(2, "0");

export function formatTs(ts, withTime = true) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const d = new Date(n * 1000);
  const date = `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

// "**** 2107" for showing an account number without exposing all of it.
export const maskAccount = (number) => {
  const digits = String(number || "");
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : digits;
};
