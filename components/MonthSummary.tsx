'use client';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Group, Stack, Table, Text, Title } from '@mantine/core';
import { balances, settle, type Expense, type Member, type Rent, type Settlement, type Transfer } from '@/lib/balance';
import { ils, supabase, type Row } from '@/lib/supabase';

interface MonthData { rents: (Rent & Row)[]; expenses: (Expense & Row)[]; transfers: (Transfer & Row)[] }

// The month's rent + every open expense + open transfers, split by share.
function useMonth(month: string, version: number) {
  const [data, setData] = useState<MonthData | null>(null);
  const load = useCallback(async () => {
    const [r, e, t] = await Promise.all([
      supabase.from('rent_payments').select('*').eq('month', `${month}-01`).eq('settled', false),
      supabase.from('expenses').select('*').eq('settled', false),
      supabase.from('transfers').select('*').eq('settled', false)]);
    setData({ rents: (r.data ?? []) as MonthData['rents'], expenses: (e.data ?? []) as MonthData['expenses'], transfers: (t.data ?? []) as MonthData['transfers'] });
  }, [month]);
  useEffect(() => { load(); }, [load, version]);
  return { data, load };
}

const sum = (rows: { amount: number }[]) => rows.reduce((s, x) => s + Number(x.amount), 0);
const num = { style: { fontVariantNumeric: 'tabular-nums' as const }, ta: 'end' as const };

export function MonthSummary({ month, members, version }: { month: string; members: Row[]; version: number }) {
  const { data, load } = useMonth(month, version);
  if (!data || !members.length) return null;
  if (!data.rents.length && !data.expenses.length) return (
    <Alert color="sea" variant="light">לא נרשם עדיין שכר דירה ל-{month}. לחצו על &quot;רישום החודש לכל הדירות&quot; כדי לחשב מי מעביר למי.</Alert>
  );
  const ms = members as unknown as Member[];
  const bal = balances(ms, data.expenses, data.rents, data.transfers);
  const rent = sum(data.rents), exp = sum(data.expenses);
  return (
    <Card>
      <Stack gap="sm">
        <Group justify="space-between" align="baseline">
          <Title order={4}>חלוקת {month}</Title>
          <Text size="sm" c="dimmed">שכר דירה {ils(rent)}{exp > 0 && ` · פחות הוצאות פתוחות ${ils(exp)}`} = לחלוקה {ils(rent - exp)}</Text>
        </Group>
        <SplitTable members={ms} data={data} bal={bal} net={rent - exp} />
        <Transfers list={settle(bal)} members={ms} data={data} onDone={load} />
      </Stack>
    </Card>
  );
}

function SplitTable({ members, data, bal, net }: { members: Member[]; data: MonthData; bal: Map<number, number>; net: number }) {
  const of = (rows: { amount: number }[], key: 'deposited_to' | 'paid_by', id: number) =>
    sum(rows.filter((r) => (r as unknown as Record<string, number>)[key] === id));
  return (
    <Table miw={560}>
      <Table.Thead><Table.Tr>
        <Table.Th>שותף</Table.Th><Table.Th {...num}>חלק</Table.Th><Table.Th {...num}>מגיע לו/ה</Table.Th>
        <Table.Th {...num}>צ׳קים שהופקדו אצלו/ה</Table.Th><Table.Th {...num}>הוצאות ששילם/ה</Table.Th><Table.Th {...num}>יתרה</Table.Th>
      </Table.Tr></Table.Thead>
      <Table.Tbody>{members.map((m) => {
        const v = bal.get(m.id) ?? 0;
        return (
          <Table.Tr key={m.id}>
            <Table.Td fw={600}>{m.name}</Table.Td>
            <Table.Td {...num}>{Math.round(Number(m.share) * 1000) / 10}%</Table.Td>
            <Table.Td {...num}>{ils(Number(m.share) * net)}</Table.Td>
            <Table.Td {...num}>{ils(of(data.rents, 'deposited_to', m.id))}</Table.Td>
            <Table.Td {...num}>{ils(of(data.expenses, 'paid_by', m.id))}</Table.Td>
            <Table.Td {...num} c={Math.abs(v) < 1 ? 'dimmed' : v > 0 ? 'green.7' : 'red.7'} fw={600}>
              {Math.abs(v) < 1 ? 'מאוזן' : `${v > 0 ? 'מקבל/ת' : 'מעביר/ה'} ${ils(Math.abs(v))}`}
            </Table.Td>
          </Table.Tr>
        );
      })}</Table.Tbody>
    </Table>
  );
}

function Transfers({ list, members, data, onDone }: { list: Settlement[]; members: Member[]; data: MonthData; onDone: () => void }) {
  const [busy, setBusy] = useState('');
  const name = (id: number) => members.find((m) => m.id === id)?.name ?? '';
  const record = async (s: Settlement) => {
    setBusy(`${s.from}-${s.to}`);
    await supabase.from('transfers').insert({ from_member: s.from, to_member: s.to, amount: s.amount, note: 'העברה חודשית' });
    setBusy(''); onDone();
  };
  // Balanced: close the month so next month starts from zero.
  const close = async () => {
    setBusy('close');
    const ids = (rows: Row[]) => rows.map((r) => r.id);
    await Promise.all([
      supabase.from('rent_payments').update({ settled: true }).in('id', ids(data.rents)),
      supabase.from('expenses').update({ settled: true }).in('id', ids(data.expenses)),
      supabase.from('transfers').update({ settled: true }).in('id', ids(data.transfers))]);
    setBusy(''); onDone();
  };
  if (!list.length) return (
    <Group justify="space-between"><Text c="green.7" fw={600}>כל ההעברות של החודש בוצעו.</Text>
      <Button size="xs" color="green" loading={busy === 'close'} onClick={close}>סגירת החודש</Button></Group>
  );
  return (
    <Stack gap={6}>
      <Text fw={600}>מי מעביר למי</Text>
      {list.map((s) => (
        <Group key={`${s.from}-${s.to}`} justify="space-between" wrap="nowrap">
          <Text><b>{name(s.from)}</b> מעביר/ה ל<b>{name(s.to)}</b> <Text span fw={600} {...num}>{ils(s.amount)}</Text></Text>
          <Button size="xs" variant="light" loading={busy === `${s.from}-${s.to}`} onClick={() => record(s)}>סימון כהועבר</Button>
        </Group>
      ))}
    </Stack>
  );
}
