import { expect, test } from 'vitest';
import { heDate, nextTerm, templateData } from './contracts';

test('renewal terms match the real contracts', () => {
  expect(nextTerm('2026-09-30')).toEqual({ start_date: '2026-10-01', end_date: '2027-09-30' }); // studio (doc said 31/9)
  expect(nextTerm('2026-02-28')).toEqual({ start_date: '2026-03-01', end_date: '2027-02-28' }); // 3 rooms
  expect(nextTerm('2026-11-29')).toEqual({ start_date: '2026-11-30', end_date: '2027-11-29' }); // 2 rooms
  expect(nextTerm('2027-02-28')).toEqual({ start_date: '2027-03-01', end_date: '2028-02-29' }); // leap year
});

test('template values use the contracts date style', () => {
  expect(heDate('2026-03-01')).toBe('01.03.2026');
  const d = templateData({ kind: 'הארכה', sign_date: '2025-09-15', start_date: '2026-10-01', end_date: '2027-09-30', first_start: '2025-09-15', rent: 3600 },
    { name: 'דייר', id_number: '1' }, 'עופר בכור');
  expect(d).toMatchObject({ sign_day: '15', sign_month: 'ספטמבר', sign_year: '2025', rent: '3600', first_start: '15.09.2025', payee: 'עופר בכור' });
});
