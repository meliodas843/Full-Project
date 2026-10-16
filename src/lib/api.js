import { API_BASE } from "./config";

const AUTH_KEYS = [
  "user",
  "token",
  "role",
  "profileComplete",
  "organizationProfileComplete",
  "accountType",
  "account_type",
];

const PRIVATE_AREAS = ["/user", "/super-admin", "/profile"];

export function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

export function clearAuth() {
  AUTH_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // storage unavailable: nothing to clear
    }
  });
}

function hasBearer(headers) {
  if (!headers) return false;

  const value =
    headers instanceof Headers
      ? headers.get("Authorization")
      : headers.Authorization || headers.authorization;

  return /^Bearer\s+\S/.test(String(value || ""));
}

let handlingExpiry = false;

// A 401 on a request that carried our token means the login expired or was
// revoked. Clear it and, inside the logged-in area, send the user to login
// instead of leaving every page half-broken.
function onAuthExpired() {
  if (handlingExpiry) return;

  handlingExpiry = true;
  clearAuth();

  const path = window.location.pathname;

  if (PRIVATE_AREAS.some((area) => path === area || path.startsWith(`${area}/`))) {
    const next = encodeURIComponent(path + window.location.search);
    window.location.assign(`/login?expired=1&next=${next}`);
  } else {
    handlingExpiry = false;
  }
}

// Wraps window.fetch once so every existing API call gets the same
// expired-login handling without each page re-implementing it.
export function installAuthExpiryHandler() {
  if (window.__registraFetchWrapped) return;

  window.__registraFetchWrapped = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);

    if (response.status === 401) {
      const headers = init?.headers || (input instanceof Request ? input.headers : null);

      if (hasBearer(headers)) onAuthExpired();
    }

    return response;
  };
}

// Preferred way to call the API from new code: adds the base URL, the auth
// header and JSON handling. Throws an Error with .status on failure.
export async function apiFetch(path, { body, headers, ...options } = {}) {
  const token = getToken();
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body === undefined || isForm ? body : JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
