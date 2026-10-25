# Teilchen

Gate: `pnpm verify` (Typecheck + Lint + Tests). CI prüft zusätzlich, ob `drizzle/` zum Schema passt.

## Fallen

- SvelteKit 3: `$lib` gibt es nicht mehr. Imports laufen über `#lib/...` **mit Dateiendung** (`#lib/money.ts`). TypeScript ergänzt bei package-`imports` keine Endung.
- Server-Code läuft auch im Worker (tsx, ohne Vite). Deshalb `process.env` statt `$env/*` und keine `$app/*`-Imports in `src/lib/server`.
- Geld ist immer Integer-Cent. Lint sperrt `parseFloat`/`toFixed`.

## Entscheidungen + Warum

- Ausgleich ist **personenbezogen**. `settleWith` bucht eine Settlement-Zeile **pro Kontext** (Gruppe/direkt), deren Summe die Netto-Zahlung ergibt. Grund: Jeder Gruppensaldo bleibt für die anderen Mitglieder korrekt. Kein netto-Einzeleintrag.
- REWE: inoffizielle Mobile-API (`mobile-clients-api.rewe.de`, Keycloak `client_id=reweios`, mTLS-Zertifikat aus der APK, nicht im Repo).
  - Login geht nur per manuellem Einfügen der `de.rewe.app://redirect?code=`-URL, danach Refresh-Token.
  - Quellen: github.com/yannick-cw/korb, github.com/ByteSizedMarius/rewerse-engineering.
- eBon-Mail ist der robuste Hauptweg. API, Mail und Upload liefern dasselbe PDF und laufen durch `ebon/parse.ts`. Pfand wird in die vorherige Position gemergt.
