# Teilchen

Einkäufe swipen, Kosten teilen, fair verrechnen. Teilchen ist eine PWA. Auf dem Desktop bleibt der Inhalt im Hochformat, die Navigation sitzt links daneben.

- **Swipen:** REWE-Bons Position für Position zuordnen.
  - ← meins
  - → mit allen teilen
  - ↑ gehört der anderen Person bzw. der Gruppe
- **Klassisches Splitten:** Ausgaben direkt oder in Gruppen, gleich oder mit genauen Beträgen.
- **Smarte Verrechnung:** Abgerechnet wird pro Person. Was zwei Leute direkt und in Gruppen offen haben, wird gegengerechnet und mit einer einzigen Zahlung ausgeglichen. Die Gruppen bleiben dabei für alle anderen korrekt.
- **Import:**
  - eBon-Mail weiterleiten (IMAP-Postfach)
  - PDF hochladen
  - REWE-Konto verbinden (inoffizielle API)

## Setup

```sh
cp .env.example .env              # Werte ausfüllen
docker compose up -d --build      # app :3000, worker, postgres
```

Lokal entwickeln:

```sh
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm db:seed    # Demo-Daten; gibt einen Session-Token aus (Cookie `teilchen_session`)
pnpm dev
pnpm worker     # Mail- & REWE-Import
```

### Authentik

1. Neuen Provider vom Typ **OAuth2/OpenID** anlegen:
   - Typ: confidential
   - Redirect-URI: `$ORIGIN/auth/callback`
   - Scopes: `openid profile email`
2. Daraus eine Application anlegen.
3. `OIDC_ISSUER` setzen, zum Beispiel `https://auth.example.de/application/o/teilchen/`.
4. Client-ID und Client-Secret in `.env` eintragen.

### eBon-Postfach

1. `INBOX_ADDRESS` (zum Beispiel `teilchen@nauren.de`) und die IMAP-Zugangsdaten setzen.
2. Jede Person bekommt unter „Profil“ ihre Adresse `teilchen+<token>@nauren.de`.
   - Dafür muss der Mailserver Plus-Adressen in dasselbe Postfach zustellen.
3. Ohne Plus-Adresse wird die Person über den Absender der Weiterleitung erkannt.

### REWE-Konto (optional, inoffiziell)

Der Worker braucht das mTLS-Client-Zertifikat der REWE-App als `certs/rewe.pem` und `certs/rewe.key`.

So kommst du dran:

1. Aus der Android-APK `res/raw/mtls_prod.pfx` extrahieren (siehe [rewerse-engineering](https://github.com/ByteSizedMarius/rewerse-engineering/blob/main/docs/readme.md)).
2. Mit `openssl pkcs12 -legacy` in PEM und Key umwandeln.

Die Nutzung ist nicht von REWE autorisiert. Die API kann jederzeit brechen oder durch Cloudflare blockiert werden.

## Deployment

Jeder Push auf `main` läuft durch dieselben Schritte:

1. `pnpm verify`
2. Image nach `ghcr.io/palmarhealer/teilchen:latest`
3. Das GitHub-Secret `PORTAINER_STACK_WEBHOOK` stößt den Portainer-Stack `teilchen` auf Vienna an.

Der Stack nutzt `deploy/portainer-compose.yml`. Secrets liegen nur in den Stack-Variablen in Portainer. Nach außen erreichbar ist er über Nginx Proxy Manager: `teilchen.nauren.de` → `teilchen-app:3000`.
