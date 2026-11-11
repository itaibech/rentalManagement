import { expect, test } from 'vitest';
import { balances, settle } from './balance';

const members = [
  { id: 1, name: 'איתי', share: 1 / 6 }, { id: 2, name: 'עופר', share: 1 / 6 },
  { id: 3, name: 'איה', share: 1 / 6 }, { id: 4, name: 'לינה', share: 0.5 },
];

test('rent deposited to one member is split by shares', () => {
  const b = balances(members, [], [{ amount: 4200, deposited_to: 1 }], []);
  expect([...b.values()]).toEqual([700 - 4200, 700, 700, 2100]);
  expect(settle(b)).toEqual([{ from: 1, to: 4, amount: 2100 }, { from: 1, to: 2, amount: 700 }, { from: 1, to: 3, amount: 700 }]);
});

test('expense paid by one member is owed back by the others (matches the Excel)', () => {
  const b = balances(members, [{ amount: 1070, paid_by: 1 }], [], []);
  expect(b.get(2)).toBeCloseTo(-178.33); expect(b.get(4)).toBe(-535); expect(b.get(1)).toBeCloseTo(891.67);
});

test('recorded transfers zero the balance', () => {
  const rents = [{ amount: 4200, deposited_to: 1 }];
  const transfers = settle(balances(members, [], rents, [])).map((s) => ({ from_member: s.from, to_member: s.to, amount: s.amount }));
  expect([...balances(members, [], rents, transfers).values()].every((v) => Math.abs(v) < 0.01)).toBe(true);
});
