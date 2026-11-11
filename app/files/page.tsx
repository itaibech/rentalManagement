'use client';
import { useCallback, useEffect, useState } from 'react';
import { ActionIcon, Alert, Anchor, FileInput, Group, Select, Stack, Table, Title } from '@mantine/core';
import { useLookups } from '@/components/EntityPage';
import { supabase, type Row } from '@/lib/supabase';

// Insurance policies, contracts, receipts. Private bucket "rental"; links are short-lived signed URLs.
export default function Files() {
  const { apartments } = useLookups();
  const [rows, setRows] = useState<Row[]>([]);
  const [apartment, setApartment] = useState<string | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    supabase.from('attachments').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows((data ?? []) as Row[]));
  }, []);
  useEffect(reload, [reload]);

  const upload = async (file: File | null) => {
    if (!file) return;
    const path = `${crypto.randomUUID()}/${file.name}`;
    const up = await supabase.storage.from('rental').upload(path, file);
    const ins = up.error ? up : await supabase.from('attachments').insert({ name: file.name, path, apartment_id: apartment ? Number(apartment) : null });
    setError(ins.error?.message ?? ''); reload();
  };
  const open = async (path: string) => {
    const { data } = await supabase.storage.from('rental').createSignedUrl(path, 60);
    if (data) window.open(data.signedUrl, '_blank');
  };
  const remove = async (r: Row) => {
    if (!confirm(`למחוק את ${r.name}?`)) return;
    await supabase.storage.from('rental').remove([String(r.path)]);
    await supabase.from('attachments').delete().eq('id', r.id); reload();
  };
  const aptName = (id: unknown) => String(apartments.find((a) => a.id === id)?.name ?? '');
  return (
    <Stack>
      <Title order={2}>מסמכים</Title>
      <Group align="end">
        <Select label="דירה" clearable data={apartments.map((a) => ({ value: String(a.id), label: String(a.name) }))} value={apartment} onChange={setApartment} />
        <FileInput label="העלאת קובץ (פוליסה, חוזה, קבלה)" placeholder="בחירת קובץ" onChange={upload} value={null} w={280} />
      </Group>
      {error && <Alert color="red">{error}</Alert>}
      <Table><Table.Tbody>{rows.map((r) => (
        <Table.Tr key={r.id}>
          <Table.Td><Anchor onClick={() => open(String(r.path))}>{String(r.name)}</Anchor></Table.Td>
          <Table.Td>{aptName(r.apartment_id)}</Table.Td>
          <Table.Td>{new Date(String(r.created_at)).toLocaleDateString('he-IL')}</Table.Td>
          <Table.Td><ActionIcon color="red" variant="subtle" onClick={() => remove(r)} aria-label="מחיקה">✕</ActionIcon></Table.Td>
        </Table.Tr>
      ))}</Table.Tbody></Table>
    </Stack>
  );
}
