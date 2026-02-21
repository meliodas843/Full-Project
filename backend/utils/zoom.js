// utils/zoom.js
import axios from "axios";

const ZOOM_OAUTH_URL = "https://zoom.us/oauth/token";
const ZOOM_API_BASE = "https://api.zoom.us/v2";

function env(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function getZoomAccessToken() {
  const clientId = env("ZOOM_CLIENT_ID");
  const clientSecret = env("ZOOM_CLIENT_SECRET");
  const accountId = env("ZOOM_ACCOUNT_ID");

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  // Zoom expects application/x-www-form-urlencoded
  const body = new URLSearchParams();
  body.set("grant_type", "account_credentials");
  body.set("account_id", accountId);

  try {
    const res = await axios.post(ZOOM_OAUTH_URL, body.toString(), {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 20000,
    });

    const token = res.data?.access_token;
    if (!token) throw new Error("No access_token returned from Zoom");

    return token;
  } catch (err) {
    const data = err?.response?.data;
    console.error("ZOOM OAUTH ERROR:", data || err.message);
    throw new Error(JSON.stringify(data || { error: err.message }));
  }
}

export async function zoomGetMe() {
  const token = await getZoomAccessToken();
  try {
    const res = await axios.get(`${ZOOM_API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20000,
    });
    return res.data;
  } catch (err) {
    const data = err?.response?.data;
    console.error("ZOOM /users/me ERROR:", data || err.message);
    throw new Error(JSON.stringify(data || { error: err.message }));
  }
}

export async function createZoomMeeting({ topic, start_time, duration_min }) {
  const token = await getZoomAccessToken();

  // Zoom accepts ISO strings. Keep them valid and in the future.
  if (!start_time || Number.isNaN(new Date(start_time).getTime())) {
    throw new Error(`Invalid start_time passed to Zoom: ${start_time}`);
  }

  const payload = {
    topic: topic || "Meeting",
    type: 2, // scheduled meeting
    start_time, // ISO string
    duration: Number(duration_min) || 30,
    timezone: "Asia/Ulaanbaatar",
    settings: {
      join_before_host: false,
      waiting_room: true,
      meeting_authentication: false,
    },
  };

  try {
    const res = await axios.post(
      `${ZOOM_API_BASE}/users/${process.env.ZOOM_USER_ID || "me"}/meetings`,
      payload,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 }
    );

    return res.data; // { id, join_url, start_url, ... }
  } catch (err) {
    const data = err?.response?.data;
    console.error("ZOOM CREATE ERROR:", data || err.message);
    throw new Error(JSON.stringify(data || { error: err.message }));
  }
}
