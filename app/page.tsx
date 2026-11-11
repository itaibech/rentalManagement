'use client';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Group, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { useLookups } from '@/components/EntityPage';
import { balances, settle, type Member, type Settlement } from '@/lib/balance';
import { ils, supabase, type Row } from '@/lib/supabase';

const soon = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);

export default function Dashboard() {
  const { members, apartments } = useLookups();
  const [bal, setBal] = useState<Map<number, number>>(new Map());
  const [tasks, setTasks] = useState<Row[]>([]);
  const load = useCallback(async () => {
    const open = (t: string) => supabase.from(t).select('*').eq('settled', false);
    const [e, r, t, k] = await Promise.all([open('expenses'), open('rent_payments'), open('transfers'),
      supabase.from('tasks').select('*').eq('done', false).lte('due_date', soon(60)).order('due_date')]);
    setBal(balances(members as unknown as Member[], e.data ?? [], r.data ?? [], t.data ?? []));
    setTasks((k.data ?? []) as Row[]);
  }, [members]);
  useEffect(() => { if (members.length) load(); }, [members, load]);

  const name = (id: number) => String(members.find((m) => m.id === id)?.name ?? '');
  const ending = apartments.filter((a) => a.contract_end && String(a.contract_end) <= soon(90));
  return (
    <Stack>
      <Title order={2}>סיכום ויתרות</Title>
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        {members.map((m) => {
          const v = bal.get(m.id) ?? 0;
          return <Card key={m.id} withBorder><Text fw={700}>{String(m.name)}</Text>
            <Text c={v >= 0 ? 'teal' : 'red'} size="xl">{ils(Math.abs(v))}</Text>
            <Text size="xs" c="dimmed">{Math.abs(v) < 1 ? 'מאוזן' : v > 0 ? 'מגיע לו/ה' : 'צריך/ה להעביר'}</Text></Card>;
        })}
      </SimpleGrid>
      <Settlements list={settle(bal)} name={name} onDone={load} />
      {ending.map((a) => <Alert key={a.id} color="orange">חוזה {String(a.name)} מסתיים ב-{new Date(String(a.contract_end)).toLocaleDateString('he-IL')}</Alert>)}
      <Title order={3}>משימות קרובות</Title>
      {tasks.length === 0 ? <Text c="dimmed">אין משימות ב-60 הימים הקרובים</Text> : tasks.map((t) =>
        <Text key={t.id}>{new Date(String(t.due_date)).toLocaleDateString('he-IL')} — {String(t.title)}</Text>)}
    </Stack>
  );
}

function Settlements({ list, name, onDone }: { list: Settlement[]; name: (id: number) => string; onDone: () => void }) {
  const record = async (s: Settlement) => {
    const { error } = await supabase.from('transfers').insert({ from_member: s.from, to_member: s.to, amount: s.amount });
    if (error) alert(error.message); else onDone();
  };
  const close = async () => {
    if (!confirm('לסמן את כל ההוצאות, ההכנסות וההעברות הפתוחות כסגורות?')) return;
    await Promise.all(['expenses', 'rent_payments', 'transfers'].map((t) => supabase.from(t).update({ settled: true }).eq('settled', false)));
    onDone();
  };
  return (
    <Card withBorder>
      <Group justify="space-between"><Title order={3}>העברות מוצעות</Title>
        {list.length === 0 && <Button variant="light" onClick={close}>סגירת תקופה</Button>}</Group>
      {list.length === 0 ? <Text c="dimmed">הכל מאוזן</Text> : (
        <Table><Table.Tbody>{list.map((s) => (
          <Table.Tr key={`${s.from}-${s.to}`}><Table.Td>{name(s.from)} ← {name(s.to)}</Table.Td><Table.Td>{ils(s.amount)}</Table.Td>
            <Table.Td><Button size="xs" variant="light" onClick={() => record(s)}>בוצע</Button></Table.Td></Table.Tr>
        ))}</Table.Tbody></Table>
      )}
    </Card>
  );
}
