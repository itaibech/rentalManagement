export interface Member { id: number; name: string; share: number }
export interface Money { amount: number }
export interface Expense extends Money { paid_by: number }
export interface Rent extends Money { deposited_to: number }
export interface Transfer extends Money { from_member: number; to_member: number }

// Each member is entitled to share × (rent − expenses). What they actually hold is
// rent deposited to them − expenses they paid + transfers in − transfers out.
// Balance = entitled − held: positive means the others owe this member.
export function balances(members: Member[], expenses: Expense[], rents: Rent[], transfers: Transfer[]): Map<number, number> {
  const held = new Map(members.map((m) => [m.id, 0]));
  const add = (id: number, v: number) => held.set(id, (held.get(id) ?? 0) + v);
  for (const r of rents) add(r.deposited_to, Number(r.amount));
  for (const e of expenses) add(e.paid_by, -Number(e.amount));
  for (const t of transfers) { add(t.from_member, -Number(t.amount)); add(t.to_member, Number(t.amount)); }
  const net = [...held.values()].reduce((a, b) => a + b, 0);
  return new Map(members.map((m) => [m.id, round(Number(m.share) * net - (held.get(m.id) ?? 0))]));
}

export interface Settlement { from: number; to: number; amount: number }

// Greedy: biggest debtor pays biggest creditor until everyone is within 1 ₪.
export function settle(bal: Map<number, number>): Settlement[] {
  const debtors = [...bal].filter(([, v]) => v < -0.5).map(([id, v]) => ({ id, v: -v }));
  const creditors = [...bal].filter(([, v]) => v > 0.5).map(([id, v]) => ({ id, v }));
  const out: Settlement[] = [];
  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => b.v - a.v); creditors.sort((a, b) => b.v - a.v);
    const d = debtors[0], c = creditors[0], amount = Math.min(d.v, c.v);
    out.push({ from: d.id, to: c.id, amount: round(amount) });
    d.v -= amount; c.v -= amount;
    if (d.v < 0.5) debtors.shift();
    if (c.v < 0.5) creditors.shift();
  }
  return out;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Rent for month YYYY-MM is passed on by the 10th of the following month. */
export const transferDue = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 10)).toISOString().slice(0, 10);
};
