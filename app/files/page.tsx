'use client';
import { useCallback, useEffect, useState } from 'react';
import { PASTE_HINT, storageKey, usePasteFiles } from '@/components/Attachments';
import { ActionIcon, Alert, Anchor, Badge, FileInput, Group, Select, Stack, Table, Text, Title } from '@mantine/core';
import { shortDate, useLookups } from '@/components/EntityPage';
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

  const upload = useCallback(async (file: File | null) => {
    if (!file) return;
    const path = storageKey(file);
    const up = await supabase.storage.from('rental').upload(path, file);
    const ins = up.error ? up : await supabase.from('attachments').insert({ name: file.name, path, apartment_id: apartment ? Number(apartment) : null });
    setError(ins.error?.message ?? ''); reload();
  }, [apartment, reload]);
  usePasteFiles(upload);
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
      <div><Title order={2}>מסמכים</Title><Text c="dimmed" size="sm">פוליסות ביטוח, חוזי שכירות וקבלות. הקבצים פרטיים ונגישים רק לשותפים.</Text></div>
      <Group align="end">
        <Select label="דירה" clearable data={apartments.map((a) => ({ value: String(a.id), label: String(a.name) }))} value={apartment} onChange={setApartment} />
        <FileInput label="העלאת קובץ" placeholder="בחירת קובץ להעלאה" onChange={upload} value={null} w={280} />
      </Group>
      <Text size="xs" c="dimmed">{PASTE_HINT}</Text>
      {error && <Alert color="red">{error}</Alert>}
      {rows.length === 0 && <Text c="dimmed" ta="center" py="xl">עדיין לא הועלו מסמכים. בחרו דירה (לא חובה) ואז קובץ.</Text>}
      <Table><Table.Tbody>{rows.map((r) => (
        <Table.Tr key={r.id}>
          <Table.Td><Anchor onClick={() => open(String(r.path))}>{String(r.name)}</Anchor></Table.Td>
          <Table.Td>{r.apartment_id ? <Badge variant="light" color="sand" radius="sm">{aptName(r.apartment_id)}</Badge> : null}</Table.Td>
          <Table.Td>{shortDate(r.created_at)}</Table.Td>
          <Table.Td><ActionIcon color="red" variant="subtle" onClick={() => remove(r)} aria-label={`מחיקת ${r.name}`}>✕</ActionIcon></Table.Td>
        </Table.Tr>
      ))}</Table.Tbody></Table>
    </Stack>
  );
}
