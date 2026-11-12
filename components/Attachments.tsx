'use client';
import { useCallback, useEffect, useState } from 'react';
import { ActionIcon, Alert, Anchor, Button, FileButton, Group, Modal, Stack, Text } from '@mantine/core';
import { shortDate } from '@/components/EntityPage';
import { supabase, type Row } from '@/lib/supabase';

type Link = 'contract_id' | 'rent_payment_id' | 'expense_id';

/** Files attached to one row (signed contract, check photo, receipt). Private bucket, short-lived links. */
export function AttachmentsButton({ link, id, apartmentId, label = 'קבצים' }: { link: Link; id: number; apartmentId?: number | null; label?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button size="compact-sm" variant="subtle" onClick={() => setOpen(true)}>{label}</Button>
    {open && <Modal opened onClose={() => setOpen(false)} title={label}><AttachmentList link={link} id={id} apartmentId={apartmentId} /></Modal>}
  </>;
}

function AttachmentList({ link, id, apartmentId }: { link: Link; id: number; apartmentId?: number | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    supabase.from('attachments').select('*').eq(link, id).order('created_at', { ascending: false }).then(({ data }) => setRows((data ?? []) as Row[]));
  }, [link, id]);
  useEffect(reload, [reload]);
  const upload = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    const path = `${crypto.randomUUID()}/${file.name}`;
    const up = await supabase.storage.from('rental').upload(path, file);
    const ins = up.error ? up : await supabase.from('attachments').insert({ name: file.name, path, [link]: id, apartment_id: apartmentId ?? null });
    setBusy(false); setError(ins.error ? `ההעלאה נכשלה: ${ins.error.message}` : ''); reload();
  };
  const open = async (path: string) => {
    const { data } = await supabase.storage.from('rental').createSignedUrl(path, 60);
    if (data) window.open(data.signedUrl, '_blank');
  };
  const remove = async (r: Row) => {
    await supabase.storage.from('rental').remove([String(r.path)]);
    await supabase.from('attachments').delete().eq('id', r.id); reload();
  };
  return (
    <Stack>
      {rows.length === 0 && <Text c="dimmed" size="sm">אין קבצים עדיין. אפשר להעלות צילום או PDF.</Text>}
      {rows.map((r) => (
        <Group key={r.id} justify="space-between" wrap="nowrap">
          <Anchor onClick={() => open(String(r.path))} style={{ overflowWrap: 'anywhere' }}>{String(r.name)}</Anchor>
          <Group gap="xs" wrap="nowrap"><Text size="xs" c="dimmed">{shortDate(r.created_at)}</Text>
            <ActionIcon color="red" variant="subtle" onClick={() => remove(r)} aria-label={`מחיקת ${r.name}`}>✕</ActionIcon></Group>
        </Group>
      ))}
      {error && <Alert color="red">{error}</Alert>}
      <FileButton onChange={upload} accept="image/*,application/pdf,.doc,.docx">
        {(props) => <Button {...props} loading={busy} variant="light">העלאת קובץ</Button>}
      </FileButton>
    </Stack>
  );
}
