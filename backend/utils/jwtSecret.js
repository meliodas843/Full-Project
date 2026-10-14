import "dotenv/config";

// Tokens signed with a guessable fallback secret could be forged by anyone,
// so refuse to start instead of silently using one.
const secret = String(process.env.JWT_SECRET || "").trim();

if (!secret || secret === "dev_secret_change_me") {
  throw new Error(
    "JWT_SECRET is not set. Add a long random value to backend/.env.",
  );
}

export const JWT_SECRET = secret;
