'use client';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, Checkbox, Group, Modal, NumberInput, ScrollArea, Select, Stack, Table, Textarea, TextInput, Title } from '@mantine/core';
import { supabase, ils, type Row, type Value } from '@/lib/supabase';

export interface Field {
  key: string; label: string;
  type?: 'text' | 'number' | 'money' | 'date' | 'textarea' | 'bool' | 'member' | 'apartment' | 'select';
  options?: string[]; hideInTable?: boolean; required?: boolean; default?: Value;
}
export interface Lookups { members: Row[]; apartments: Row[] }

export function useLookups(): Lookups {
  const [l, setL] = useState<Lookups>({ members: [], apartments: [] });
  useEffect(() => {
    Promise.all([supabase.from('members').select('*').order('id'), supabase.from('apartments').select('*').order('id')])
      .then(([m, a]) => setL({ members: (m.data ?? []) as Row[], apartments: (a.data ?? []) as Row[] }));
  }, []);
  return l;
}

const nameOf = (rows: Row[], id: Value) => String(rows.find((r) => r.id === id)?.name ?? '');

function display(f: Field, v: Value, l: Lookups): ReactNode {
  if (v === null || v === undefined || v === '') return '';
  if (f.type === 'money') return ils(Number(v));
  if (f.type === 'bool') return v ? '✓' : '';
  if (f.type === 'date') return new Date(String(v)).toLocaleDateString('he-IL');
  if (f.type === 'member') return nameOf(l.members, v);
  if (f.type === 'apartment') return nameOf(l.apartments, v);
  return String(v);
}

interface Props { table: string; title: string; fields: Field[]; order: string; ascending?: boolean; toolbar?: (reload: () => void) => ReactNode }

export function EntityPage({ table, title, fields, order, ascending = false, toolbar }: Props) {
  const lookups = useLookups();
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    supabase.from(table).select('*').order(order, { ascending }).order('id', { ascending: false })
      .then(({ data, error: e }) => { setRows((data ?? []) as Row[]); setError(e?.message ?? ''); });
  }, [table, order, ascending]);
  useEffect(reload, [reload]);
  const blank = () => Object.fromEntries(fields.filter((f) => f.default !== undefined).map((f) => [f.key, f.default!]));
  const shown = fields.filter((f) => !f.hideInTable);

  return (
    <Stack>
      <Group justify="space-between"><Title order={2}>{title}</Title><Group>{toolbar?.(reload)}<Button onClick={() => setEditing(blank())}>הוספה</Button></Group></Group>
      {error && <Alert color="red">{error}</Alert>}
      <ScrollArea>
        <Table striped highlightOnHover miw={600}>
          <Table.Thead><Table.Tr>{shown.map((f) => <Table.Th key={f.key}>{f.label}</Table.Th>)}</Table.Tr></Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.id} onClick={() => setEditing(r)} style={{ cursor: 'pointer' }}>
                {shown.map((f) => <Table.Td key={f.key}>{display(f, r[f.key], lookups)}</Table.Td>)}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      {editing && <EditModal table={table} fields={fields} lookups={lookups} row={editing} onClose={(changed) => { setEditing(null); if (changed) reload(); }} />}
    </Stack>
  );
}

function EditModal({ table, fields, lookups, row, onClose }: { table: string; fields: Field[]; lookups: Lookups; row: Partial<Row>; onClose: (changed: boolean) => void }) {
  const [values, setValues] = useState<Partial<Row>>(row);
  const [error, setError] = useState('');
  const set = (k: string, v: Value) => setValues((s) => ({ ...s, [k]: v }));
  const done = (e: { message: string } | null) => (e ? setError(e.message) : onClose(true));
  const save = async () => {
    const { id, ...rest } = values as Row;
    done((id ? await supabase.from(table).update(rest).eq('id', id) : await supabase.from(table).insert(rest as object)).error);
  };
  const remove = async () => { if (confirm('למחוק?')) done((await supabase.from(table).delete().eq('id', row.id!)).error); };
  return (
    <Modal opened onClose={() => onClose(false)} title={row.id ? 'עריכה' : 'הוספה'}>
      <Stack>
        {fields.map((f) => <FieldInput key={f.key} f={f} value={values[f.key] ?? null} lookups={lookups} onChange={(v) => set(f.key, v)} />)}
        {error && <Alert color="red">{error}</Alert>}
        <Group justify="space-between">
          <Button onClick={save}>שמירה</Button>
          {row.id && <Button color="red" variant="light" onClick={remove}>מחיקה</Button>}
        </Group>
      </Stack>
    </Modal>
  );
}

function FieldInput({ f, value, lookups, onChange }: { f: Field; value: Value; lookups: Lookups; onChange: (v: Value) => void }) {
  const common = { label: f.label, required: f.required };
  const text = (v: string) => onChange(v === '' ? null : v);
  switch (f.type) {
    case 'number': case 'money':
      return <NumberInput {...common} value={value === null ? '' : Number(value)} onChange={(v) => onChange(v === '' ? null : Number(v))} thousandSeparator />;
    case 'date': return <TextInput {...common} type="date" value={String(value ?? '')} onChange={(e) => text(e.currentTarget.value)} />;
    case 'textarea': return <Textarea {...common} autosize value={String(value ?? '')} onChange={(e) => text(e.currentTarget.value)} />;
    case 'bool': return <Checkbox label={f.label} checked={Boolean(value)} onChange={(e) => onChange(e.currentTarget.checked)} />;
    case 'member': case 'apartment': {
      const rows = f.type === 'member' ? lookups.members : lookups.apartments;
      return <Select {...common} clearable data={rows.map((r) => ({ value: String(r.id), label: String(r.name) }))} value={value === null ? null : String(value)} onChange={(v) => onChange(v === null ? null : Number(v))} />;
    }
    case 'select': return <Select {...common} data={f.options ?? []} value={value === null ? null : String(value)} onChange={onChange} />;
    default: return <TextInput {...common} value={String(value ?? '')} onChange={(e) => text(e.currentTarget.value)} />;
  }
}
