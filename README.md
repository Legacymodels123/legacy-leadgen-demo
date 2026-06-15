# Legacy Leadgen

Lead intelligence platform voor Legacy Scale Models — login, credits, leads, pipeline, batches en integraties.

## Starten

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Demo account

- **E-mail:** levi@legacy.com
- **Wachtwoord:** legacy123

Nieuwe accounts starten met **100 credits**.

## Pagina's

| Route | Beschrijving |
|-------|-------------|
| `/login` | Inloggen of registreren |
| `/leads` | Lead dashboard met filters, detail panel |
| `/pipeline` | Kanban pipeline (drag & drop) |
| `/batches` | Nightly batch geschiedenis & handmatig draaien |
| `/settings` | Profiel, credits kopen, transacties |
| `/integrations` | LinkedIn, CRM, webhooks toggles |

## Credits

| Actie | Kosten |
|-------|--------|
| Lead handmatig toevoegen | 5 credits |
| Nightly batch (3 leads) | 30 credits |

Data wordt opgeslagen in **localStorage** (per browser).

## Originele prototype

Het bestand `index.html` is het oorspronkelijke statische prototype.

## Live zetten (Vercel)

De volledige Next.js app staat op branch **`pr/4-feature-pages`**. Branch **`main`** bevat alleen het oude `index.html`-prototype — als je daar vandaan deployt, zie je niet de app.

1. Ga naar [vercel.com/new](https://vercel.com/new) en log in met GitHub.
2. Importeer **Legacymodels123/legacy-leadgen**.
3. Zet **Production Branch** op `pr/4-feature-pages` (Settings → Git → Production Branch).
4. Laat Framework Preset op **Next.js** staan. Build command: `npm run build`, output: standaard.
5. Klik Deploy.

Na ~1 minuut krijg je een live URL (bijv. `legacy-leadgen.vercel.app`).

### GitHub Pages werkt niet out-of-the-box

GitHub Pages kan alleen statische bestanden serveren. Deze app is een Next.js-serverapp. Gebruik **Vercel** (gratis, bedoeld voor Next.js) in plaats van GitHub Pages.

### Productie op `main` zetten (optioneel)

Als je wilt dat Vercel automatisch `main` gebruikt, merge eerst de app naar main:

```bash
git checkout main
git merge pr/4-feature-pages -m "Merge full Next.js app into main."
git push origin main
```

## Veelvoorkomende problemen

| Probleem | Oorzaak | Oplossing |
|----------|---------|-----------|
| Live site toont alleen het oude HTML-demo | Deploy vanaf `main` | Zet production branch op `pr/4-feature-pages` of merge naar `main` |
| Build faalt met `useAuth must be used within AuthProvider` | `app/(dashboard)/layout.tsx` ontbreekt lokaal | `git checkout HEAD -- "app/(dashboard)/layout.tsx"` |
| Bestanden verdwijnen lokaal | OneDrive sync | Zet de projectmap op **Always keep on this device**, of verplaats buiten OneDrive |
