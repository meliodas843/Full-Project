// Creates a super admin account, or promotes an existing account.
// Run on the server from the backend folder:  node scripts/create-super-admin.js
// It asks for the details; the password is typed hidden and stored hashed.

import "dotenv/config";
import readline from "node:readline";
import bcrypt from "bcryptjs";
import pool from "../db.js";

// One shared reader, so answers piped in (or pasted) are all received.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
let muted = false;
const write = rl._writeToOutput?.bind(rl);
if (write) {
  // While a password is typed, echo nothing.
  rl._writeToOutput = (text) => {
    if (!muted) write(text);
  };
}
const lines = [];
const waiting = [];
rl.on("line", (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));

function ask(question, { hidden = false } = {}) {
  process.stdout.write(question);
  muted = hidden;
  return new Promise((resolve) => {
    const done = (answer) => {
      if (hidden) process.stdout.write("\n");
      muted = false;
      resolve(String(answer).trim());
    };
    if (lines.length) done(lines.shift());
    else waiting.push(done);
  });
}

async function main() {
  const email = (await ask("Email: ")).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("That is not a valid email address.");
  }

  const [[existing]] = await pool.query(
    "SELECT id, role FROM users WHERE LOWER(email) = ? LIMIT 1",
    [email],
  );

  if (existing) {
    const confirm = await ask(
      `An account with this email exists (role: ${existing.role || "user"}). Make it super admin? (y/n): `,
    );
    if (confirm.toLowerCase() !== "y") return console.log("Nothing changed.");

    await pool.query("UPDATE users SET role = 'super_admin' WHERE id = ?", [existing.id]);
    return console.log(`Done: ${email} is now a super admin. Log out and back in to use it.`);
  }

  const firstName = await ask("First name: ");
  const lastName = await ask("Last name: ");
  const password = await ask("Password (min 8 characters): ", { hidden: true });

  if (password.length < 8) throw new Error("The password must be at least 8 characters.");

  const again = await ask("Repeat password: ", { hidden: true });
  if (again !== password) throw new Error("The passwords do not match.");

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (email, password, role, first_name, last_name, account_type)
     VALUES (?, ?, 'super_admin', ?, ?, 'individual')`,
    [email, hash, firstName || "Super", lastName || "Admin"],
  );

  console.log(`Done: super admin ${email} created. Log in at /login.`);
}

main()
  .catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
    pool.end();
  });
