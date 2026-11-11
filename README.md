# ניהול דירות (rentalManagement)

Hebrew RTL app for the family's rental apartments: apartments & tenants, monthly rent (who each check was deposited to),
expenses, transfers between partners, recurring tasks (insurance renewals) and document attachments.
Live at https://itaibech.github.io/rentalManagement/

- Next.js (static export, `basePath: /rentalManagement`) + React + Mantine (RTL), deployed to GitHub Pages by `.github/workflows/deploy.yml`.
- Backend: the shared `itaibechor-site` Supabase project (ref `hyeslwlewvvjiyizoduf`), schema `rental`. RLS is the only security boundary.
- Sign-in: Google only. Partners are rows in `rental.members` with their Google email; `itai.bechor@gmail.com` is admin.

## Shares
איתי, עופר, איה: 1/6 each; לינה: 1/2. Each partner is entitled to `share × (rent − expenses)`; the balance is that minus what
they actually hold (rent deposited to them − expenses they paid ± transfers). The dashboard suggests transfers to zero it, and
"סגירת תקופה" marks everything settled. Logic and tests: `lib/balance.ts`.

## Setup (once)
```bash
SUPABASE_ACCESS_TOKEN=sbp_... ../itaibechor/scripts/add-app.sh rental 'https://itaibech.github.io/rentalManagement/**' 'http://localhost:3000/**' -- supabase/schema.sql
python3 -I scripts/import_excel.py "<workbook.xlsx>" > /tmp/rental-import.sql   # contains personal data, never commit
npx supabase db query --remote=hyeslwlewvvjiyizoduf -f /tmp/rental-import.sql
```

## Develop
```bash
npm install && npm run dev   # http://localhost:3000/rentalManagement/
npm test && npm run typecheck
```
