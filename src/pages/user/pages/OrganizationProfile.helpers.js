// Helpers for OrganizationProfile.jsx, moved out to keep the page component readable.
import { API_BASE } from "@/lib/config";

export const DEFAULT_LOGOS = [
  "/registra-default-images/logos/logo-color-1-example.svg",

  "/registra-default-images/logos/logo-color-2-example.svg",

  "/registra-default-images/logos/logo-color-3-example.svg",

  "/registra-default-images/logos/logo-color-4-example.svg",

  "/registra-default-images/logos/logo-color-5-example.svg",

  "/registra-default-images/logos/logo-color-6-example.svg",
];

export const DEFAULT_COVERS = [
  "/registra-default-images/org-covers/org-cover-1.svg",

  "/registra-default-images/org-covers/org-cover-2.svg",

  "/registra-default-images/org-covers/org-cover-3.svg",

  "/registra-default-images/org-covers/org-cover-4.svg",

  "/registra-default-images/org-covers/org-cover-5.svg",

  "/registra-default-images/org-covers/org-cover-6.svg",
];

export const INDUSTRIES = [
  "IT / Программ хангамж",

  "Санхүү",

  "Банк",

  "Боловсрол",

  "Маркетинг",

  "Барилга",

  "Худалдаа",

  "Үйлчилгээ",

  "Үйлдвэрлэл",

  "Тээвэр, логистик",

  "Эрүүл мэнд",

  "Бусад",
];

export const EMPLOYEE_COUNTS = [
  "1-10",

  "11-50",

  "51-100",

  "101-250",

  "251-500",

  "501-1000",

  "1000+",
];

export function getToken() {
  return (
    localStorage.getItem("token") || localStorage.getItem("adminToken") || ""
  );
}

export function clean(value) {
  return String(value ?? "").trim();
}

export function hashString(value) {
  const text = clean(value) || "registra";

  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash;
}

export function stableDefault(list, key) {
  if (!Array.isArray(list) || list.length === 0) {
    return "";
  }

  return list[hashString(key) % list.length];
}

export function resolveImage(value) {
  const image = clean(value);

  if (!image) {
    return "";
  }

  if (
    image.startsWith("http\\://") ||
    image.startsWith("https\\://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  if (image.startsWith("/registra-default-images/")) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${API_BASE}${image}`;
  }

  return `${API_BASE}/${image}`;
}

export function normalizeOrganization(data) {
  const source =
    data?.organization || data?.company || data?.data || data || {};

  return {
    id: source.id || source.organization_id || source.company_id || null,

    name: clean(source.name || source.organization_name || source.company_name),

    registration_number: clean(
      source.registration_number ||
        source.registrationNumber ||
        source.register_number ||
        source.registerNumber ||
        source.reg_number,
    ),

    industry: clean(source.industry || source.sector || source.category),

    employee_count: clean(
      source.employee_count ||
        source.employeeCount ||
        source.company_size ||
        source.size,
    ),

    description: clean(source.description || source.about || source.bio),

    website: clean(source.website),

    email: clean(source.email || source.contact_email),

    phone: clean(source.phone || source.contact_phone),

    address: clean(source.address),

    facebook: clean(source.facebook),

    linkedin: clean(source.linkedin),

    contact_person: clean(source.contact_person || source.contactPerson),

    logo_url: clean(source.logo_url || source.logoUrl || source.logo),

    cover_url: clean(source.cover_url || source.coverUrl || source.cover),

    event_count: Number(
      source.event_count ?? source.eventCount ?? source.events_count ?? 0,
    ),

    participant_count: Number(
      source.participant_count ??
        source.participantCount ??
        source.participants_count ??
        0,
    ),

    follower_count: Number(
      source.follower_count ??
        source.followerCount ??
        source.followers_count ??
        0,
    ),

    rating: Number(source.rating ?? source.average_rating ?? 0),

    verified: Boolean(
      source.verified || source.is_verified || source.isVerified,
    ),
  };
}

export function createForm(organization = {}) {
  return {
    name: organization.name || "",

    registration_number: organization.registration_number || "",

    industry: organization.industry || "",

    employee_count: organization.employee_count || "",

    description: organization.description || "",

    website: organization.website || "",

    email: organization.email || "",

    phone: organization.phone || "",

    address: organization.address || "",

    facebook: organization.facebook || "",

    linkedin: organization.linkedin || "",

    contact_person: organization.contact_person || "",
  };
}

export function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return number.toLocaleString();
}
