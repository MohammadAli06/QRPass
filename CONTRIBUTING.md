# Contributing to QR Pass

Thanks for taking the time to contribute.

## Getting started

1. Fork the repository and clone your fork.
2. `npm install`
3. Copy `.env.example` to `.env.local` and add a Firebase project (see the README).
4. `npm run create-admin -- admin "password"` to create a local admin.
5. `npm run dev`

## Before opening a pull request

Run all three and fix any failures:

```bash
npm run lint
npm run typecheck
npm run build
```

## Guidelines

- Keep pull requests focused. One feature or fix per PR.
- Match the existing code style (TypeScript strict, no `any` unless unavoidable).
- Validate external input with zod.
- Never read the Admin SDK (or its credentials) from client components.
- Add or update documentation when behaviour, environment variables or the data model change.
- Destructive operations should stay behind a confirmation dialog.

## Commit messages

Use short, imperative subjects: `Add CSV export for passes`, `Fix single-use scan race`.

## Reporting bugs

Open an issue using the bug report template and include:

- What you expected and what happened
- Reproduction steps
- Browser and OS
- Any relevant console or server logs (never paste credentials or private keys)

## Security

Please do not open public issues for security vulnerabilities. Contact the maintainers privately so a fix can be prepared first.

By contributing you agree that your contributions are licensed under the MIT License.
