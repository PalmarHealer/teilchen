# Teilchen

Gate: `pnpm verify`. CI also checks that `drizzle/` matches the schema.

## Traps

- UI is shadcn-svelte style, but components are copied by hand into `src/lib/components/ui/` (the shadcn CLI expects `$lib`, which SvelteKit 3 dropped). The pre-shadcn design is on the `legacy-ui` branch.
- Code, comments, docs and commits are English. UI text lives only in `src/lib/i18n/{en,de}.ts`; server code returns message keys (`errors.*`), never prose.

## Decisions + why

- Settling is **per person**: `settleWith` books one settlement line per context (group/direct), and their sum is the net payment. Why: every group balance stays correct for its other members.
- Contacts are explicit (`connections`), not implied by sharing a group. Why: the user wants to choose who they share with outside a group.
- No REWE account login: it sits behind Cloudflare Turnstile. Don't re-add it or try to get around the captcha.
- The worker always empties the shared INBOX (non-eBon mails deleted without logging content, broken ones to `Failed`, transient errors retried for 3 days). Why: a persistent error must not fill the mailbox, and a DB hiccup must not lose eBons.
- Deploy: push to `main` → `.github/workflows/deploy.yml` → sites.nauren.de (GitHub OIDC, no deploy secret). App secrets never go into the repo.
