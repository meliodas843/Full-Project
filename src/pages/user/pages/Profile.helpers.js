// Helpers for Profile.jsx, moved out to keep the page component readable.
import { API_BASE } from "@/lib/config";

export const INTEREST_OPTIONS = [
  { value: "Technology", label: "Технологи" },

  { value: "Design", label: "Дизайн" },

  { value: "Startups", label: "Стартап" },

  { value: "AI & ML", label: "Хиймэл оюун ба машин сургалт" },

  { value: "Finance", label: "Санхүү" },

  { value: "Marketing", label: "Маркетинг" },

  { value: "Leadership", label: "Манлайлал" },

  { value: "Data Science", label: "Өгөгдлийн шинжлэх ухаан" },
];

export function getToken() {
  return localStorage.getItem("token");
}

export function getText(value) {
  return String(value ?? "").trim();
}

export function getPhone(value) {
  return String(value ?? "")
    .replace(/\D/g, "")

    .slice(0, 8);
}

export function getInterests(profile) {
  const value =
    profile?.interests ||
    profile?.professional_interests ||
    profile?.professionalInterests ||
    [];

  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value

        .split(",")

        .map((item) => item.trim())

        .filter(Boolean);
    }
  }

  return [];
}

export function createProfileForm(profile) {
  return {
    firstName: getText(profile?.firstName || profile?.first_name),

    lastName: getText(profile?.lastName || profile?.last_name),

    company_name: getText(
      profile?.company_name || profile?.company || profile?.organization,
    ),

    phone: getPhone(profile?.phone),

    job_title: getText(profile?.job_title || profile?.jobTitle),

    interests: getInterests(profile),
  };
}

export function getCompletion(form) {
  const checks = [
    Boolean(form.firstName.trim() && form.lastName.trim()),

    /^\d{8}$/.test(form.phone),

    Boolean(form.company_name.trim() && form.job_title.trim()),

    form.interests.length > 0,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function initials(user, form) {
  const first = form.firstName || user?.firstName || user?.first_name || "";

  const last = form.lastName || user?.lastName || user?.last_name || "";

  const value = `${first} ${last}`.trim();

  if (!value) return "U";

  return value

    .split(/\s+/)

    .slice(0, 2)

    .map((part) => part[0]?.toUpperCase())

    .join("");
}

export function getAvatarSource(value) {
  const image = getText(value);
  if (!image) return "";
  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  )
    return image;
  if (image.startsWith("/")) return `${API_BASE}${image}`;
  return `${API_BASE}/${image}`;
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}
