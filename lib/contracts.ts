// Dates are 'YYYY-MM-DD' strings; computed in UTC so time zones never shift a day.
const parse = (d: string) => { const [y, m, day] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, day)); };
const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => { const x = parse(d); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
const addYear = (d: string) => { const x = parse(d); x.setUTCFullYear(x.getUTCFullYear() + 1); return iso(x); };

/** Next year's renewal: starts the day after the current end, ends a year minus a day later. */
export function nextTerm(end: string): { start_date: string; end_date: string } {
  const start = addDays(end, 1);
  return { start_date: start, end_date: addDays(addYear(start), -1) };
}

/** 2026-03-01 -> 01.03.2026, the way the contracts write dates. */
export const heDate = (d: string | null) => (d ? d.split('-').reverse().join('.') : '');

const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export interface ContractData { kind: string; sign_date: string | null; start_date: string; end_date: string; first_start: string | null; rent: number }

/** Values for the {tags} in the Word templates. */
export function templateData(c: ContractData, tenant: { name: string; id_number: string | null }, payee: string) {
  const sign = c.sign_date ?? new Date().toISOString().slice(0, 10);
  const [y, m, d] = sign.split('-');
  return {
    sign_date: heDate(sign), sign_day: String(Number(d)), sign_month: MONTHS[Number(m) - 1], sign_year: y,
    start_date: heDate(c.start_date), end_date: heDate(c.end_date), first_start: heDate(c.first_start ?? c.start_date),
    rent: String(Math.round(Number(c.rent))), tenant_name: tenant.name, tenant_id: tenant.id_number ?? '', payee,
  };
}

export const templatePath = (apartmentId: number, kind: string) => `templates/${apartmentId}/${kind === 'חוזה חדש' ? 'new' : 'renewal'}.docx`;
