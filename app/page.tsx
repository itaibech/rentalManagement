'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Anchor, Badge, Box, Button, Card, Group, SimpleGrid, Skeleton, Stack, Text, TextInput, Title } from '@mantine/core';
import { shortDate, useLookups } from '@/components/EntityPage';
import { balances, settle, transferDue, type Member, type Settlement } from '@/lib/balance';
import { heDate } from '@/lib/contracts';
import { ils, supabase, type Row } from '@/lib/supabase';

const day = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const monthStart = () => new Date().toISOString().slice(0, 7) + '-01';

interface Data { bal: Map<number, number>; tasks: Row[]; rentThisMonth: number; openExpenses: number; due: string; done: Row[] }

function useDashboard(members: Row[]) {
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(async () => {
    const open = (t: string) => supabase.from(t).select('*').eq('settled', false);
    const [e, r, t, k, m] = await Promise.all([open('expenses'), open('rent_payments'), open('transfers'),
      supabase.from('tasks').select('*').eq('done', false).lte('due_date', day(60)).order('due_date'),
      supabase.from('rent_payments').select('amount').eq('month', monthStart())]);
    setData({
      bal: balances(members as unknown as Member[], e.data ?? [], r.data ?? [], t.data ?? []),
      tasks: (k.data ?? []) as Row[],
      rentThisMonth: (m.data ?? []).reduce((s, x) => s + Number(x.amount), 0),
      openExpenses: (e.data ?? []).reduce((s, x) => s + Number(x.amount), 0),
      // Latest open rent month decides the deadline (November rent → 10 December).
      due: transferDue(String((r.data ?? []).map((x) => x.month).sort().pop() ?? monthStart()).slice(0, 7)),
      done: ((t.data ?? []) as Row[]).sort((a, b) => String(b.date).localeCompare(String(a.date))),
    });
  }, [members]);
  useEffect(() => { if (members.length) load(); }, [members, load]);
  return { data, load };
}

export default function Dashboard() {
  const { members, apartments } = useLookups();
  const { data, load } = useDashboard(members);
  const name = (id: number) => String(members.find((m) => m.id === id)?.name ?? '');
  const expected = apartments.reduce((s, a) => s + Number(a.rent ?? 0), 0);
  const ending = apartments.filter((a) => a.contract_end && String(a.contract_end) <= day(90));
  if (!data) return <Stack><Skeleton h={40} w={240} /><Skeleton h={220} /><Skeleton h={120} /></Stack>;
  return (
    <Stack gap="lg">
      <Title order={2}>מי חייב למי</Title>
      <BalanceBoard members={members} bal={data.bal} />
      <Settlements list={settle(data.bal)} due={data.due} name={name} onDone={load} />
      <DoneTransfers rows={data.done} name={name} />
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Card>
          <Text c="dimmed" size="sm">שכר דירה שנרשם החודש</Text>
          <Text size="xl" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>{ils(data.rentThisMonth)} <Text span c="dimmed" size="sm">מתוך {ils(expected)}</Text></Text>
          {data.rentThisMonth < expected && <Anchor component={Link} href="/income/" size="sm">לרישום שכר הדירה של החודש</Anchor>}
        </Card>
        <Card>
          <Text c="dimmed" size="sm">הוצאות פתוחות (לפני התחשבנות)</Text>
          <Text size="xl" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>{ils(data.openExpenses)}</Text>
          <Anchor component={Link} href="/expenses/" size="sm">לכל ההוצאות</Anchor>
        </Card>
      </SimpleGrid>
      <Upcoming tasks={data.tasks} ending={ending} />
    </Stack>
  );
}

// Diverging bar per partner: green grows toward the start (gets money back), red toward the end (owes).
function BalanceBoard({ members, bal }: { members: Row[]; bal: Map<number, number> }) {
  const max = Math.max(1, ...[...bal.values()].map(Math.abs));
  return (
    <Card>
      <Stack gap="md">
        {members.map((m) => {
          const v = bal.get(m.id) ?? 0, pct = (Math.abs(v) / max) * 50, even = Math.abs(v) < 1;
          return (
            <Group key={m.id} wrap="nowrap" gap="md">
              <Box w={{ base: 48, xs: 64 }}><Text fw={600}>{String(m.name)}</Text><Text size="xs" c="dimmed">{Math.round(Number(m.share) * 100)}%</Text></Box>
              <Box pos="relative" h={14} style={{ flex: 1, borderRadius: 7, background: 'var(--mantine-color-default-hover)' }} aria-hidden>
                <Box pos="absolute" top={-3} bottom={-3} left="50%" w={2} bg="var(--mantine-color-default-border)" />
                {!even && <Box pos="absolute" top={0} bottom={0} style={{ borderRadius: 7, width: `${pct}%`,
                  insetInlineStart: v > 0 ? `${50 - pct}%` : '50%', background: `var(--mantine-color-${v > 0 ? 'green' : 'red'}-6)` }} />}
              </Box>
              <Box w={{ base: 96, xs: 130 }} ta="end">
                <Text fw={600} c={even ? 'dimmed' : v > 0 ? 'green.7' : 'red.7'} style={{ fontVariantNumeric: 'tabular-nums' }}>{even ? 'מאוזן' : ils(Math.abs(v))}</Text>
                {!even && <Text size="xs" c="dimmed">{v > 0 ? 'מקבל/ת בחזרה' : 'צריך/ה להעביר'}</Text>}
              </Box>
            </Group>
          );
        })}
      </Stack>
    </Card>
  );
}

function Settlements({ list, due, name, onDone }: { list: Settlement[]; due: string; name: (id: number) => string; onDone: () => void }) {
  const [busy, setBusy] = useState('');
  const [date, setDate] = useState(day(0));
  const [confirmClose, setConfirmClose] = useState(false);
  const record = async (s: Settlement) => {
    setBusy(`${s.from}-${s.to}`);
    await supabase.from('transfers').insert({ from_member: s.from, to_member: s.to, amount: s.amount, date });
    setBusy(''); onDone();
  };
  const close = async () => {
    await Promise.all(['expenses', 'rent_payments', 'transfers'].map((t) => supabase.from(t).update({ settled: true }).eq('settled', false)));
    setConfirmClose(false); onDone();
  };
  if (list.length === 0) return (
    <Alert color="green" title="הכל מאוזן">
      <Group justify="space-between"><Text size="sm">אפשר לסגור את התקופה: כל הרשומות הפתוחות יסומנו כסגורות והיתרות יתחילו מאפס.</Text>
        {confirmClose ? <Button size="xs" color="green" onClick={close}>כן, לסגור תקופה</Button> : <Button size="xs" variant="white" onClick={() => setConfirmClose(true)}>סגירת תקופה</Button>}</Group>
    </Alert>
  );
  return (
    <Card>
      <Group justify="space-between" align="baseline" mb="sm"><Title order={4}>העברות שיאזנו את החשבון</Title>
        <Badge size="lg" variant="light" color={due < day(0) ? 'red' : 'sea'}>להעביר עד {heDate(due)}</Badge></Group>
      <Stack gap="xs">
        {list.map((s) => (
          <Group key={`${s.from}-${s.to}`} justify="space-between" gap="xs">
            <Text><b>{name(s.from)}</b> מעביר/ה ל<b>{name(s.to)}</b> <Text span fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>{ils(s.amount)}</Text></Text>
            <Button size="xs" variant="light" loading={busy === `${s.from}-${s.to}`} onClick={() => record(s)}>סימון כהועבר</Button>
          </Group>
        ))}
        <TextInput type="date" label="תאריך ההעברה בפועל" description="נשמר עם כל העברה שמסמנים" value={date} onChange={(e) => setDate(e.currentTarget.value || day(0))} maw={220} />
      </Stack>
    </Card>
  );
}

// Transfers already made in the open period, with the actual date.
function DoneTransfers({ rows, name }: { rows: Row[]; name: (id: number) => string }) {
  if (!rows.length) return null;
  return (
    <Card>
      <Group justify="space-between" mb="sm"><Title order={4}>העברות שבוצעו</Title><Anchor component={Link} href="/transfers/" size="sm">לכל ההעברות</Anchor></Group>
      <Stack gap="xs">{rows.map((t) => (
        <Group key={t.id} justify="space-between" gap="xs">
          <Text size="sm"><b>{name(Number(t.from_member))}</b> העביר/ה ל<b>{name(Number(t.to_member))}</b> <Text span fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>{ils(Number(t.amount))}</Text></Text>
          <Text size="sm" c="dimmed">הועבר ב-{heDate(String(t.date))}</Text>
        </Group>
      ))}</Stack>
    </Card>
  );
}

function Upcoming({ tasks, ending }: { tasks: Row[]; ending: Row[] }) {
  const today = day(0);
  return (
    <Card>
      <Group justify="space-between" mb="sm"><Title order={4}>בקרוב</Title><Anchor component={Link} href="/tasks/" size="sm">כל התזכורות</Anchor></Group>
      <Stack gap="xs">
        {ending.map((a) => <Group key={`a${a.id}`} gap="xs"><Badge color={String(a.contract_end) < today ? 'red' : 'orange'} variant="light">חוזה</Badge>
          <Text size="sm">{String(a.name)}: החוזה {String(a.contract_end) < today ? 'הסתיים' : 'מסתיים'} ב-{shortDate(a.contract_end)}</Text></Group>)}
        {tasks.map((t) => <Group key={t.id} gap="xs"><Badge color={String(t.due_date) < today ? 'red' : 'sea'} variant="light">{shortDate(t.due_date)}</Badge><Text size="sm">{String(t.title)}</Text></Group>)}
        {tasks.length + ending.length === 0 && <Text c="dimmed" size="sm">אין חוזים או תזכורות ב-60 הימים הקרובים.</Text>}
      </Stack>
    </Card>
  );
}
