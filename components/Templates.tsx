'use client';
import { useEffect, useState } from 'react';
import { Alert, Badge, Button, FileButton, Group, Modal, Stack, Table, Text } from '@mantine/core';
import { templatePath } from '@/lib/contracts';
import { download } from '@/lib/docgen';
import { supabase, type Row } from '@/lib/supabase';

const KINDS = ['חוזה חדש', 'הארכה'] as const;

/** Word templates per apartment and contract kind, stored privately at templates/<apartment>/<kind>.docx. */
export function Templates({ apartments }: { apartments: Row[] }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="default" onClick={() => setOpen(true)}>תבניות</Button>
    {open && <Modal opened onClose={() => setOpen(false)} title="תבניות חוזים" size="lg"><TemplateTable apartments={apartments} /></Modal>}
  </>;
}

function TemplateTable({ apartments }: { apartments: Row[] }) {
  const [have, setHave] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState('');
  const refresh = async () => {
    const found = await Promise.all(apartments.map(async (a) => {
      const { data } = await supabase.storage.from('rental').list(`templates/${a.id}`);
      return (data ?? []).map((f) => `templates/${a.id}/${f.name}`);
    }));
    setHave(new Set(found.flat()));
  };
  useEffect(() => { refresh(); }, [apartments]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const upload = async (path: string, file: File | null) => {
    if (!file) return;
    setBusy(path); setMsg(null);
    const { error } = await supabase.storage.from('rental').upload(path, file, { upsert: true, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    setBusy(''); setMsg(error ? { ok: false, text: `ההעלאה נכשלה: ${error.message}` } : { ok: true, text: `התבנית עודכנה (${file.name})` }); refresh();
  };
  const get = async (path: string) => {
    const { data } = await supabase.storage.from('rental').download(path);
    if (data) download(data, path.replaceAll('/', '_'));
  };
  return (
    <Stack>
      {msg && <Alert color={msg.ok ? 'green' : 'red'} withCloseButton onClose={() => setMsg(null)}>{msg.text}</Alert>}
      <Text size="sm" c="dimmed">קובץ Word עם שדות במקום הערכים: {'{start_date}'} {'{end_date}'} {'{rent}'} {'{tenant_name}'} {'{tenant_id}'} {'{sign_date}'} {'{first_start}'} {'{payee}'}. כל השאר נשאר כמו בחוזה.</Text>
      <Table><Table.Tbody>{apartments.flatMap((a) => KINDS.map((k) => {
        const path = templatePath(Number(a.id), k);
        return (
          <Table.Tr key={path}>
            <Table.Td>{String(a.name)}</Table.Td><Table.Td>{k}</Table.Td>
            <Table.Td>{have.has(path) ? <Badge color="green" variant="light">קיימת</Badge> : <Badge color="gray" variant="light">חסרה</Badge>}</Table.Td>
            <Table.Td><Group gap={4} wrap="nowrap">
              {have.has(path) && <Button size="compact-xs" variant="subtle" onClick={() => get(path)}>הורדה</Button>}
              <FileButton accept=".docx" onChange={(f) => upload(path, f)}>{(p) => <Button {...p} size="compact-xs" variant="light" loading={busy === path}>העלאה</Button>}</FileButton>
            </Group></Table.Td>
          </Table.Tr>
        );
      }))}</Table.Tbody></Table>
    </Stack>
  );
}
