/**
 * Create (or reset the password of) an admin account.
 *
 * Usage:
 *   npm run create-admin -- <username> <password>
 *
 * Usernames are mapped to `${username}@${NEXT_PUBLIC_AUTH_EMAIL_DOMAIN}`
 * exactly like the login form, so the account can sign in with the username.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { config } from "dotenv";

const root = process.cwd();
for (const file of [".env.local", ".env"]) {
  const candidate = path.join(root, file);
  if (existsSync(candidate)) {
    config({ path: candidate, override: false });
  }
}

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{2,64}$/;

async function main() {
  const [username, password] = process.argv.slice(2);

  if (!username || !password) {
    console.error("Usage: npm run create-admin -- <username> <password>");
    process.exitCode = 1;
    return;
  }

  if (!USERNAME_PATTERN.test(username)) {
    console.error(
      "Username must be 2-64 characters and use letters, numbers, dots, underscores or dashes.",
    );
    process.exitCode = 1;
    return;
  }

  if (password.length < 6) {
    console.error("Password must be at least 6 characters (Firebase requirement).");
    process.exitCode = 1;
    return;
  }

  const domain = (process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || "qrpass.local")
    .trim()
    .toLowerCase();
  const email = `${username.toLowerCase()}@${domain}`;

  const { getAdminAuth, isAdminConfigured } = await import("../src/lib/firebase/admin");

  if (!isAdminConfigured()) {
    console.error(
      "Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY in .env.local.",
    );
    process.exitCode = 1;
    return;
  }

  const auth = getAdminAuth();

  let existingUid: string | null = null;
  try {
    const existing = await auth.getUserByEmail(email);
    existingUid = existing.uid;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "auth/user-not-found") throw error;
  }

  if (existingUid) {
    await auth.updateUser(existingUid, {
      password,
      displayName: username,
      emailVerified: true,
    });
    console.log(`Updated password for ${email} (uid ${existingUid}).`);
    return;
  }

  const user = await auth.createUser({
    email,
    password,
    displayName: username,
    emailVerified: true,
  });
  console.log(`Created admin ${email} (uid ${user.uid}).`);
  console.log("Sign in at /login with the username and password you just set.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Failed to create admin: ${message}`);
  process.exitCode = 1;
});
