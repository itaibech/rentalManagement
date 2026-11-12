'use client';
import { useState } from 'react';
import { Alert, Button, Group, Menu, Text } from '@mantine/core';
import { AttachmentsButton } from '@/components/Attachments';
import { EntityPage, useLookups, type Lookups } from '@/components/EntityPage';
import { Templates } from '@/components/Templates';
import { nextTerm, templateData, templatePath, type ContractData } from '@/lib/contracts';
import { download, fillTemplate, printAsPdf } from '@/lib/docgen';
import { supabase, type Row } from '@/lib/supabase';

const today = () => new Date().toISOString().slice(0, 10);

async function makeDoc(c: Row, l: Lookups) {
  const apt = l.apartments.find((a) => a.id === c.apartment_id);
  const tenant = l.tenants.find((t) => t.id === c.tenant_id);
  const payee = l.members.find((m) => m.id === apt?.deposit_member_id);
  const data = templateData(c as unknown as ContractData, { name: String(tenant?.name ?? ''), id_number: (tenant?.id_number as string) ?? null }, String(payee?.full_name ?? payee?.name ?? ''));
  const blob = await fillTemplate(templatePath(Number(c.apartment_id), String(c.kind)), data);
  return { blob, name: `${c.kind} - ${apt?.name ?? ''} - ${String(c.start_date).slice(0, 4)}` };
}

function Actions({ c, l, reload, onError }: { c: Row; l: Lookups; reload: () => void; onError: (m: string) => void }) {
  const [busy, setBusy] = useState('');
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
  return (
    <Group gap={4} wrap="wrap">
      <Menu>
        <Menu.Target><Button size="compact-sm" variant="light" loading={busy === 'doc'}>הורדה</Button></Menu.Target>
        <Menu.Dropdown>
          <Menu.Item onClick={run('doc', async () => { const d = await makeDoc(c, l); download(d.blob, `${d.name}.docx`); })}>Word (docx)</Menu.Item>
          <Menu.Item onClick={run('doc', async () => { const d = await makeDoc(c, l); await printAsPdf(d.blob, d.name); })}>PDF (הדפסה ושמירה)</Menu.Item>
        </Menu.Dropdown>
      </Menu>
      <Button size="compact-sm" variant="subtle" loading={busy === 'renew'} onClick={renew}>חידוש לשנה הבאה</Button>
      <AttachmentsButton link="contract_id" id={c.id} apartmentId={Number(c.apartment_id)} label="חוזה חתום" />
    </Group>
  );
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
        { key: 'rent', label: 'שכר דירה', type: 'money', required: true },
        { key: 'status', label: 'סטטוס', type: 'select', options: ['טיוטה', 'נחתם'], default: 'טיוטה' },
        { key: 'sign_date', label: 'תאריך חתימה', type: 'date', hideInTable: true, default: today() },
        { key: 'first_start', label: 'תאריך החוזה המקורי', type: 'date', hideInTable: true, hint: 'מופיע בהסכם ההארכה ("וביום ... נכרת בין הצדדים הסכם")' },
        { key: 'notes', label: 'הערות', type: 'textarea', hideInTable: true },
      ]}
      toolbar={() => <Templates apartments={lookups.apartments} />}
      notice={error && <Alert color="red" withCloseButton onClose={() => setError('')}>{error}</Alert>}
      rowActions={(c, reload) => <Actions c={c} l={lookups} reload={reload} onError={setError} />}
      emptyText="עדיין אין חוזים. הוסיפו את החוזה הנוכחי של כל דירה, ואז 'חידוש לשנה הבאה' יכין את ההארכה." />
  );
}
