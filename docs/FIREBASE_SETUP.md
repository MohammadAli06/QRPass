# Firebase Setup & Credential Storage

This guide walks through creating the Firebase project QR Pass needs, and — more importantly — **where every credential goes**. If you only read one section, read [Where do the credentials go?](#where-do-the-credentials-go).

---

## TL;DR

| Credential | Where it goes | Safe in git? | Safe in the browser? |
| --- | --- | --- | --- |
| Web app config (API key, auth domain, project ID, …) | `.env.local` as `NEXT_PUBLIC_FIREBASE_*` | Yes, but keep per-environment | **Yes** — Firebase web config is public by design |
| Service account JSON | **Never in the project.** Store it outside the repo and copy its three fields into `.env.local` / Vercel env vars | **No** | **No** |
| Admin username/password | Firebase Authentication (created with `create-admin`) | No | Only the admin types it into `/login` |

The application reads the service account **from environment variables**, never from a JSON file at runtime. The JSON file is only the source you copy values from.

---

## 1. What "credentials" means here

QR Pass uses two separate Firebase SDKs:

1. **Firebase Web SDK (client)** — used by the admin UI for login and Firestore reads/writes. It is configured with the public web app config (`NEXT_PUBLIC_*`). Firebase web config is not a secret; it identifies the project, not a user.
2. **Firebase Admin SDK (server)** — used only by the verification page/API and the `create-admin` script. It authenticates with a **service account private key** and bypasses Firestore security rules. This key is a real secret with broad access.

Anonymous visitors never touch Firestore directly, so only the public verifier path uses the Admin SDK at runtime.

---

## 2. Create the Firebase project

1. Open the [Firebase console](https://console.firebase.google.com/).
2. **Add project** → give it a name (for example `qr-pass`) → continue.
3. Google Analytics is optional and not used by this app.
4. Wait for project creation, then open the project.

> Tip: create **two projects** — one for development and one for production. You do not want a test scan touching real event data.

---

## 3. Enable Email/Password authentication

1. Left sidebar → **Build → Authentication**.
2. **Get started**.
3. **Sign-in method** tab → **Email/Password** → enable it → **Save**.
4. Do **not** enable Email link or any social provider.

There is no public sign-up in this app. Admins are created with:

```bash
npm run create-admin -- <username> <password>
```

### How usernames become emails

Firebase Authentication requires an email address, so the app maps:

```
username  →  `${username.toLowerCase()}@${NEXT_PUBLIC_AUTH_EMAIL_DOMAIN}`
```

With the default domain, `admin` becomes `admin@qrpass.local`.

- `qrpass.local` does not need to exist or receive mail.
- Pick a domain once and keep it stable. Changing `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` later changes the email formula, so existing accounts will no longer match new logins.
- You can use a real domain you own (`admin@yourdomain.com`) if you prefer.

---

## 4. Create Firestore

1. Left sidebar → **Build → Firestore Database**.
2. **Create database**.
3. Choose **Production mode** (rules are deployed from this repo).
4. Pick the region closest to your users (this cannot be changed later without recreating).
5. Create.

Do not create collections or documents by hand. The app creates `events` and `qrs` when you use it.

---

## 5. Add a web app and copy the public config

1. Project settings (gear icon) → **General**.
2. Scroll to **Your apps** → **Add app** → **Web** (`</>`).
3. Nickname it (e.g. `qr-pass-web`); Firebase Hosting is not needed.
4. Register the app.
5. Copy the values from `firebaseConfig`:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "qr-pass.firebaseapp.com",
  projectId: "qr-pass",
  storageBucket: "qr-pass.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

6. Put them in `.env.local` (see the template below).

> These values are embedded in the client bundle. That is expected for Firebase. Security is enforced by Firestore rules and Authentication, not by hiding this config.

---

## 6. Create the service account (the secret)

1. Project settings → **Service accounts**.
2. Click **Generate new private key** → **Generate key**.
3. A file like `qr-pass-firebase-adminsdk-xxxxx-abcdef.json` downloads.
4. Open it. It looks like this:

```json
{
  "type": "service_account",
  "project_id": "qr-pass",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@qr-pass.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

You need exactly three fields:

| JSON field | Environment variable |
| --- | --- |
| `project_id` | `FIREBASE_ADMIN_PROJECT_ID` |
| `client_email` | `FIREBASE_ADMIN_CLIENT_EMAIL` |
| `private_key` | `FIREBASE_ADMIN_PRIVATE_KEY` |

### Where to store the JSON file

**Do not keep it inside the project** (and never inside `public/`).

Recommended locations:

| OS | Example path |
| --- | --- |
| Windows | `C:\Users\<you>\secrets\qr-pass-firebase-adminsdk.json` |
| macOS / Linux | `~/secrets/qr-pass-firebase-adminsdk.json` |

Or store it in your password manager / secret vault as an attachment. The app never reads the file, so after copying the three values into `.env.local` you only need the file again when rotating credentials.

### If you insist on keeping it near the repo

The `.gitignore` already excludes common names as a safety net:

```gitignore
.env*
!.env.example
service-account*.json
*service-account*.json
*firebase-adminsdk*.json
```

That is a backstop, not a plan. A file named `key.json` **will not** match those patterns. Verify with:

```bash
git check-ignore -v key.json   # no output = it will be committed
```

If you keep a key anywhere inside the working tree, name it so it matches the ignored patterns and double-check before every commit.

---

## 7. Fill `.env.local`

Copy the template once:

```bash
cp .env.example .env.local      # macOS / Linux
copy .env.example .env.local    # Windows cmd
```

Then fill it in:

```dotenv
# ---------------------------------------------------------------------------
# Firebase Web SDK — public, copied from the console's firebaseConfig
# ---------------------------------------------------------------------------
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=qr-pass.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=qr-pass
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=qr-pass.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Username -> email mapping. Keep this stable once accounts exist.
NEXT_PUBLIC_AUTH_EMAIL_DOMAIN=qrpass.local

# URL embedded in every QR code. Use your production URL when deployed.
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: set to "true" to hide "Powered by QR Pass"
NEXT_PUBLIC_HIDE_BRANDING=false

# ---------------------------------------------------------------------------
# Firebase Admin SDK — SECRET. Server only. Never use a NEXT_PUBLIC_ prefix.
# ---------------------------------------------------------------------------
FIREBASE_ADMIN_PROJECT_ID=qr-pass
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@qr-pass.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

`.env.local` is ignored by git. `.env.example` is committed and contains no secrets.

### Formatting the private key

The JSON value already contains literal `\n` sequences. The easiest approach is to copy the **entire value including the quotes** from the JSON:

```dotenv
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n"
```

The app normalises the value before using it:

- surrounding single or double quotes are stripped;
- literal `\n` sequences become real newlines;
- if the value has no `BEGIN` marker, it is treated as base64 and decoded.

So all of these work:

1. Quoted value with escaped `\n` (copy-paste from JSON) — recommended.
2. Unquoted value with escaped `\n`.
3. Real multi-line value (some dashboards preserve it).
4. Base64 of the PEM string.

#### Base64 alternative

Useful for hosts that mangle newlines. Encode **only the private key string**, not the whole JSON:

```bash
# macOS / Linux, from the service account JSON file
node -e "const k=require('./qr-pass-firebase-adminsdk.json').private_key; console.log(Buffer.from(k).toString('base64'))"
```

```powershell
# Windows PowerShell
$json = Get-Content -Raw C:\Users\<you>\secrets\qr-pass-firebase-adminsdk.json | ConvertFrom-Json
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json.private_key))
```

Then:

```dotenv
FIREBASE_ADMIN_PRIVATE_KEY=LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0t...
```

---

## 8. Verify the configuration locally

Create the first admin (this exercises the Admin SDK, including the private-key parsing):

```bash
npm run create-admin -- admin "a-strong-password"
```

Expected:

```
Created admin admin@qrpass.local (uid ...).
Sign in at /login with the username and password you just set.
```

Then start the app:

```bash
npm run dev
```

- Open <http://localhost:3000/login>.
- Sign in with `admin` and your password.
- Create an event, generate a pass, open the pass link.

If `create-admin` reports "Firebase Admin is not configured", the three `FIREBASE_ADMIN_*` values are missing from `.env.local` or the file is not in the project root.

---

## 9. Deploy Firestore rules and indexes

The app relies on these rules and on a composite index for `qrs` (`eventId` + `createdAt`).

```bash
npm install -g firebase-tools
firebase login
firebase use <your-project-id>
npm run firebase:rules
```

This runs `firebase deploy --only firestore:rules,firestore:indexes` using:

- `firestore.rules`
- `firestore.indexes.json`
- `firebase.json`

If a query fails with "The query requires an index", open the URL in the error — it creates the exact index for you. The deploy above should make that unnecessary.

### If you create the index in the console

The "Create index" wizard defaults new fields to **Ascending**, which is easy to miss:

| Collection ID | Query scope | Field | Order |
| --- | --- | --- | --- |
| `qrs` | `Collection` | `eventId` | Ascending |
| | | `createdAt` | **Descending** |

An index with `createdAt` Ascending is **not** equivalent. The app orders passes newest-first, so the query will keep failing with "The query requires an index" until the descending index exists. To open the correct pre-filled form, click the console link in the error message rather than building it from scratch.

---

## 10. Deploy to Vercel

1. Push the repository to GitHub and import it into Vercel (framework preset: **Next.js**).
2. **Project → Settings → Environment Variables** — add every variable:
   - All `NEXT_PUBLIC_*` values (same as local).
   - The three `FIREBASE_ADMIN_*` values.
3. Set `NEXT_PUBLIC_APP_URL` to your production URL (for example `https://qrpass.example.com`), **with no trailing slash**. This value is baked into QR codes at generation time.
4. For `FIREBASE_ADMIN_PRIVATE_KEY`, paste the value from the service account JSON with its `\n` sequences (or the base64 form). Do not wrap it in extra quotes beyond the ones already in the JSON.
5. Redeploy after changing any environment variable. `NEXT_PUBLIC_*` values are inlined at **build** time, so a restart alone is not enough.

### Creating the production admin

`create-admin` reads whatever credentials are in your environment. To target production from your machine:

```powershell
# Windows PowerShell — temporary environment for this shell only
$env:FIREBASE_ADMIN_PROJECT_ID="qr-pass-prod"
$env:FIREBASE_ADMIN_CLIENT_EMAIL="firebase-adminsdk-xxxxx@qr-pass-prod.iam.gserviceaccount.com"
$env:FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
npm run create-admin -- admin "a-strong-password"
Remove-Item Env:FIREBASE_ADMIN_PROJECT_ID, Env:FIREBASE_ADMIN_CLIENT_EMAIL, Env:FIREBASE_ADMIN_PRIVATE_KEY
```

```bash
# macOS / Linux — inline for one command
FIREBASE_ADMIN_PROJECT_ID=qr-pass-prod \
FIREBASE_ADMIN_CLIENT_EMAIL='firebase-adminsdk-xxxxx@qr-pass-prod.iam.gserviceaccount.com' \
FIREBASE_ADMIN_PRIVATE_KEY="$(cat ~/secrets/prod-private-key.txt)" \
npm run create-admin -- admin "a-strong-password"
```

Alternatively, create the user manually in **Firebase console → Authentication → Users → Add user**, using `username@NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` as the email.

> Be deliberate: running the script with production credentials writes to the production project.

---

## 11. Rotating and revoking keys

If a key leaks (committed, pasted in a chat, included in a screenshot):

1. **Firebase console → Project settings → Service accounts → Manage service account permissions** (or Google Cloud IAM) → open the service account → **Keys**.
2. Delete the compromised key immediately.
3. Generate a new key.
4. Update `FIREBASE_ADMIN_PRIVATE_KEY` (and the other two fields if they changed) in Vercel and in `.env.local`.
5. Redeploy.
6. Review Firebase/Google Cloud billing and audit logs for unexpected activity.
7. If the key was committed, removing it from the latest commit is **not enough** — it remains in git history. Rotate first, then clean history if the repository is public.

Routine rotation: generate a new key, update environments, verify, then delete the old key.

---

## 12. Least privilege (optional but recommended)

The default "Firebase Admin SDK Administrator Service Agent" account can administer much more than this app needs. The runtime requires:

- **Cloud Firestore** read/write (events, passes, scans).
- **Firebase Authentication** user management, but only for the `create-admin` script (the public verifier does not need Auth).

For tighter setups, create a dedicated service account with a custom role limited to Firestore document access, and use a separate account (or the console) for provisioning admins. Keep the key in a secret manager and restrict who can read it.

---

## 13. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Firebase Admin is not configured` | Missing `FIREBASE_ADMIN_*` values | Fill `.env.local`, restart the terminal/dev server |
| `DECODER routines::unsupported` or `PEM routines` errors | Private key newlines were mangled | Re-paste with literal `\n`, or use the base64 form |
| `invalid_grant` / token errors | Clock skew, deleted key, wrong project | Rotate the key, check the system clock, confirm project ID |
| Login says "Invalid username or password" | Account email pattern mismatch | Email must be `username@NEXT_PUBLIC_AUTH_EMAIL_DOMAIN`; reset with `create-admin` |
| `auth/operation-not-allowed` | Email/Password provider disabled | Enable it in Authentication → Sign-in method |
| Public page shows "Unable to verify" | Server can't reach/authenticate with Firestore | Check Vercel function logs and `FIREBASE_ADMIN_*` |
| `Missing or insufficient permissions` in admin UI | Rules not deployed, or signed out | `npm run firebase:rules`; sign in again |
| "The query requires an index" | Composite index missing, or created with `createdAt` Ascending instead of Descending | Deploy `firestore.indexes.json`, or use the link in the error; verify the order is `eventId` ASC + `createdAt` **DESC** |
| Works locally, fails on Vercel | Env vars missing or not redeployed | Add all vars and trigger a new deployment |
| Changed `NEXT_PUBLIC_*` but nothing changed | Values are baked at build time | Redeploy, not just restart |

---

## 14. Security checklist

- [ ] `.env.local` exists and is **not** committed (`git check-ignore .env.local`).
- [ ] The service account JSON is outside the repository, or matches an ignored filename and is verified with `git check-ignore -v`.
- [ ] No admin credential uses a `NEXT_PUBLIC_` prefix.
- [ ] Firestore rules and indexes are deployed to every environment.
- [ ] Development and production use different Firebase projects.
- [ ] `NEXT_PUBLIC_APP_URL` matches the deployed domain, so QR codes point to the right place.
- [ ] The first admin exists and the default password is not shared.
- [ ] Keys are rotated if they were ever exposed.
- [ ] Vercel environment variables are scoped appropriately (production vs preview).

---

## 15. Quick command recap

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local   # then paste the values described above

# 3. Create the first admin
npm run create-admin -- admin "a-strong-password"

# 4. Run
npm run dev

# 5. Deploy rules + indexes (once per Firebase project)
npm run firebase:rules

# 6. Validate before shipping
npm run lint
npm run typecheck
npm run build
```

For the product overview, architecture and database model, see the [README](../README.md).
