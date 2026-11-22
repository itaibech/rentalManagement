'use client';
import { useState } from 'react';
import { Alert, Badge, Button, Card, Group, Menu, Modal, Stack, Text, UnstyledButton } from '@mantine/core';
import { AttachmentsButton } from '@/components/Attachments';
import { EntityPage, useLookups, type Lookups } from '@/components/EntityPage';
import { Templates } from '@/components/Templates';
import { heDate, nextTerm, templateData, templatePath, type ContractData } from '@/lib/contracts';
import { download, fillTemplate, printAsPdf } from '@/lib/docgen';
import { ils, supabase, type Row } from '@/lib/supabase';

const today = () => new Date().toISOString().slice(0, 10);

async function makeDoc(c: Row, l: Lookups) {
  const apt = l.apartments.find((a) => a.id === c.apartment_id);
  const tenant = l.tenants.find((t) => t.id === c.tenant_id);
  const payee = l.members.find((m) => m.id === apt?.deposit_member_id);
  const data = templateData(c as unknown as ContractData, { name: String(tenant?.name ?? ''), id_number: (tenant?.id_number as string) ?? null }, String(payee?.full_name ?? payee?.name ?? ''));
  const blob = await fillTemplate(templatePath(Number(c.apartment_id), String(c.kind)), data);
  return { blob, name: `${c.kind} - ${apt?.name ?? ''} - ${String(c.start_date).slice(0, 4)}` };
}

function Actions({ c, l, reload, onError, latest }: { c: Row; l: Lookups; reload: () => void; onError: (m: string) => void; latest: boolean }) {
  const [busy, setBusy] = useState('');
  const [ask, setAsk] = useState(false);
  const draft = c.status === 'טיוטה';
  const run = (key: string, fn: () => Promise<void>) => async () => {
    setBusy(key); onError('');
    try { await fn(); } catch (e) { onError(e instanceof Error ? e.message : String(e)); }
    setBusy('');
  };
  const renew = run('renew', async () => {
    const { error } = await supabase.from('contracts').insert({
      apartment_id: c.apartment_id, tenant_id: c.tenant_id, kind: 'הארכה', rent: c.rent, sign_date: today(),
      first_start: c.first_start ?? c.start_date, status: 'טיוטה', ...nextTerm(String(c.end_date)) });
    if (error) throw new Error(error.message);
    reload();
  });
  const remove = run('remove', async () => {
    const { error } = await supabase.from('contracts').delete().eq('id', c.id);
    if (error) throw new Error(error.message);
    setAsk(false); reload();
  });
  return (
    <Group gap={4} wrap="wrap">
      <Menu>
        <Menu.Target><Button size="compact-sm" variant="light" loading={busy === 'doc'}>הורדה</Button></Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={run('doc', async () => { const d = await makeDoc(c, l); download(d.blob, `${d.name}.docx`); })}>Word (docx)</Menu.Item>
          <Menu.Item onClick={run('doc', async () => { const d = await makeDoc(c, l); await printAsPdf(d.blob, d.name); })}>PDF (הדפסה ושמירה)</Menu.Item>
        </Menu.Dropdown>
      </Menu>
      {latest && <Button size="compact-sm" variant="subtle" loading={busy === 'renew'} onClick={renew} disabled={draft}
        title={draft ? 'כבר יש טיוטת הארכה. חתמו עליה או מחקו אותה לפני חידוש נוסף' : undefined}>חידוש לשנה הבאה</Button>}
      {draft && !latest && <Button size="compact-sm" variant="subtle" color="red" onClick={() => setAsk(true)}>מחיקה</Button>}
      <Modal opened={ask} onClose={() => setAsk(false)} title={<Text fw={600}>למחוק את הטיוטה?</Text>} centered>
        <Stack>
          <Text size="sm">{String(c.kind)} {period(c)}, {ils(Number(c.rent))}. המחיקה היא לצמיתות.</Text>
          <Group justify="flex-end"><Button variant="default" onClick={() => setAsk(false)}>ביטול</Button>
            <Button color="red" loading={busy === 'remove'} onClick={remove}>כן, למחוק</Button></Group>
        </Stack>
      </Modal>
      <AttachmentsButton link="contract_id" id={c.id} apartmentId={Number(c.apartment_id)} label="חוזה חתום" />
    </Group>
  );
}

const period = (c: Row) => `${heDate(String(c.start_date))}–${heDate(String(c.end_date))}`;
const soon = (c: Row) => String(c.end_date) <= new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);

// One card per apartment: original contract + current extension on one line, every year below.
function ApartmentCard({ list, l, edit, reload, onError }: { list: Row[]; l: Lookups; edit: (r: Row) => void; reload: () => void; onError: (m: string) => void }) {
  const [latest] = list, original = [...list].reverse().find((c) => c.kind === 'חוזה חדש') ?? list[list.length - 1];
  const apt = l.apartments.find((a) => a.id === latest.apartment_id), tenant = l.tenants.find((t) => t.id === latest.tenant_id);
  return (
    <Card>
      <Group justify="space-between" align="start" gap="xs">
        <Stack gap={2}>
          <Group gap="xs"><Badge variant="light" color="sand" radius="sm">{String(apt?.name ?? '')}</Badge><Text fw={600}>{String(tenant?.name ?? '')}</Text>
            {soon(latest) && <Badge color={String(latest.end_date) < new Date().toISOString().slice(0, 10) ? 'red' : 'orange'} variant="light">מסתיים ב-{heDate(String(latest.end_date))}</Badge>}</Group>
          <Text size="sm">חוזה מקורי {period(original)}{latest.id !== original.id && <> · {String(latest.kind)} נוכחית {period(latest)}</>} · <b>{ils(Number(latest.rent))}</b> · {String(latest.status)}</Text>
        </Stack>
        <Actions c={latest} l={l} reload={reload} onError={onError} latest />
      </Group>
      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer' }}><Text span size="sm" c="dimmed">כל החוזים וההארכות ({list.length})</Text></summary>
        <Stack gap={4} mt="xs">{list.map((c) => (
          <Group key={c.id} justify="space-between" gap="xs" py={4} style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
            <UnstyledButton onClick={() => edit(c)} aria-label={`עריכת ${c.kind} ${period(c)}`}>
              <Text size="sm"><b>{String(c.kind)}</b> {period(c)} · {ils(Number(c.rent))} · {String(c.status)}</Text></UnstyledButton>
            <Actions c={c} l={l} reload={reload} onError={onError} latest={false} />
          </Group>
        ))}</Stack>
      </details>
    </Card>
  );
}

function byApartment(rows: Row[]) {
  const groups = new Map<number, Row[]>();
  for (const r of rows) groups.set(Number(r.apartment_id), [...(groups.get(Number(r.apartment_id)) ?? []), r]);
  for (const g of groups.values()) g.sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
  return [...groups.values()];
}

export default function Contracts() {
  const lookups = useLookups();
  const [error, setError] = useState('');
  return (
    <EntityPage table="contracts" title="חוזים" order="start_date" addLabel="חוזה חדש"
      description="חוזה לכל דירה לכל שנה. 'חידוש לשנה הבאה' יוצר הסכם הארכה לשנה נוספת. מורידים Word או PDF לחתימה, ומעלים את החוזה החתום. חוזה שמסומן 'נחתם' מעדכן את שכר הדירה ותאריך הסיום של הדירה."
      fields={[
        { key: 'apartment_id', label: 'דירה', type: 'apartment', required: true },
        { key: 'tenant_id', label: 'דייר', type: 'tenant', required: true },
        { key: 'kind', label: 'סוג', type: 'select', options: ['חוזה חדש', 'הארכה'], default: 'חוזה חדש', hint: 'חוזה חדש לדייר חדש, הארכה לדייר קיים' },
        { key: 'start_date', label: 'תחילה', type: 'date', required: true },
        { key: 'end_date', label: 'סיום', type: 'date', required: true },
        { key: 'rent', label: 'שכר דירה', type: 'money', required: true, noTotal: true },
        { key: 'status', label: 'סטטוס', type: 'select', options: ['טיוטה', 'נחתם'], default: 'טיוטה' },
        { key: 'sign_date', label: 'תאריך חתימה', type: 'date', hideInTable: true, default: today() },
        { key: 'first_start', label: 'תאריך החוזה המקורי', type: 'date', hideInTable: true, hint: 'מופיע בהסכם ההארכה ("וביום ... נכרת בין הצדדים הסכם")' },
        { key: 'notes', label: 'הערות', type: 'textarea', hideInTable: true },
      ]}
      toolbar={() => <Templates apartments={lookups.apartments} />}
      notice={error && <Alert color="red" withCloseButton onClose={() => setError('')}>{error}</Alert>}
      render={(rows, edit, reload) => <Stack>{byApartment(rows).map((g) => <ApartmentCard key={String(g[0].apartment_id)} list={g} l={lookups} edit={edit} reload={reload} onError={setError} />)}</Stack>}
      emptyText="עדיין אין חוזים. הוסיפו את החוזה הנוכחי של כל דירה, ואז 'חידוש לשנה הבאה' יכין את ההארכה." />
  );
}
