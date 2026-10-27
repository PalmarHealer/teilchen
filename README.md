# Teilchen

Swipe groceries, split costs, settle up fairly. Teilchen is a PWA. On desktop the content stays in a portrait column and the navigation sits to its left. The UI speaks English and German and follows the browser language unless you pick one in the profile.

- **Swipe:** assign REWE receipts item by item.
  - ← mine
  - ↑ share with everyone
  - → belongs to the other person or the group
  - The others swipe it too; disagreements are marked on the expense, where anyone in it can set who gets an item.
- **Classic splitting:** expenses directly or in groups, equally or with exact amounts.
- **Smart netting:** settling happens per person. Whatever two people have open directly and across groups is netted and settled with one single payment. The groups stay correct for everyone else.
- **Import:**
  - forward eBon emails (IMAP inbox)
  - upload a PDF

## Setup

```sh
cp .env.example .env              # fill in the values
docker compose up -d --build      # app :3000, worker, postgres
```

Local development:

```sh
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm db:seed    # demo data; prints a session token (cookie `teilchen_session`)
pnpm dev
pnpm worker     # eBon mail import
```

### Authentik

1. Create a provider of type **OAuth2/OpenID**:
   - type: confidential
   - redirect URI: `$ORIGIN/auth/callback`
   - scopes: `openid profile email offline_access`
   - `offline_access` gives a refresh token. With it, a session checks once an hour that the account is still active and allowed in, so disabling someone in Authentik logs them out. Without it, sessions can't be checked and end after 7 days instead of 60.
2. Create an application for it.
3. Set `OIDC_ISSUER`, e.g. `https://auth.example.com/application/o/teilchen/`.
4. Put the client ID and client secret into `.env`.

### eBon inbox

1. Set `INBOX_ADDRESS` (e.g. `teilchen@example.com`) and the IMAP credentials.
2. Everyone gets their own address `teilchen+<token>@example.com` in the profile.
   - This needs a mail server that delivers plus addresses into the same mailbox.
3. Without the plus part, the person is recognised by the sender of the forwarded mail, but only if the mail server confirmed that sender with DMARC (its topmost `Authentication-Results` header, see `MAIL_AUTHSERV_ID`) and only one account has that address. A forged `From` is ignored.
4. Mails that are not REWE eBons (e.g. forwarded login codes) are deleted silently.
5. Processed mails are deleted from the inbox; the outcome is logged in `inbound_mails`. Broken mails move to the `Failed` folder right away; transient errors (DB, network) are retried on later polls for up to 3 days before the mail moves there too. `Failed` is purged after 14 days, so the inbox never fills up.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`:

1. CI: `pnpm verify`, migrations match the schema, `pnpm build`.
2. A release is built on `node:24-alpine` (same as the site's runtime) with a flat production `node_modules`.
3. It is uploaded to the site on `sites.nauren.de` through its deploy API, authenticated with GitHub OIDC, so there is no deploy secret.

On start the site runs the migrations, then the app; the IMAP worker runs as a background process of the site. Environment variables (see `.env.example`) are configured on the site, never in the repo.

For a self-hosted stack, `compose.yaml` builds the `Dockerfile` and runs app, worker and Postgres.
