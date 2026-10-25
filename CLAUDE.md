# Teilchen

Gate: `pnpm verify` (typecheck + lint + tests). CI also checks that `drizzle/` matches the schema.

## Traps

- SvelteKit 3: `$lib` no longer exists. Imports use `#lib/...` **with file extension** (`#lib/money.ts`). TypeScript adds no extension for package `imports`.
- Server code also runs in the worker (tsx, no Vite). So use `process.env` instead of `$env/*`, and no `$app/*` imports in `src/lib/server`.
- Money is always integer cents. Lint blocks `parseFloat`/`toFixed`.
- User-chosen icons (any Tabler name) are served by `/icons/<name>.svg`, built at runtime from `@tabler/icons` in node_modules. Keep it a runtime dependency, or production loses every group/expense icon.
- UI is shadcn-svelte style: Tailwind v4 + bits-ui, components copied by hand into `src/lib/components/ui/` (the shadcn CLI expects `$lib`). Theme tokens live in `src/app.css`; shadcn's `primary` is the brand orange, `accent` is the hover surface. The pre-shadcn design is on the `legacy-ui` branch.
- Code, comments, docs and commits are English. UI text lives only in `src/lib/i18n/{en,de}.ts`. Server code returns message keys (`errors.*`), never prose.

## Decisions + why

- Settling is **per person**. `settleWith` books one settlement line **per context** (group/direct), and their sum is the net payment. Why: every group balance stays correct for its other members. No single net entry.
- No REWE account login: REWE's login (Keycloak, client `reweios`) is behind Cloudflare Turnstile, and the code only shows up in Chrome DevTools. Too complicated for users, so it was removed. Don't re-add it or try to get around the captcha.
- eBon email is the main path. Mail and upload deliver the same PDF and go through `ebon/parse.ts`. A deposit (Pfand) line is merged into the item above it.
- The worker always empties the shared INBOX: non-eBon mails (forwarding rules also catch login codes) are deleted silently and logged without content, handled mails are deleted (outcome in `inbound_mails`), broken mails move to `Failed` at once, transient errors are retried for 3 days first, `Failed` expires after 14 days. Why: a persistent error must not fill the mailbox, and a DB hiccup must not lose eBons. Stalwart delivers `teilchen+<token>@` into the same INBOX and keeps the To header.
- Deploy: push to `main` → GHCR image → Portainer stack webhook (stack `teilchen` on Vienna, see README). Secrets live only in the Portainer stack variables.
