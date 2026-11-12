'use client';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Badge, Button, Checkbox, Group, Modal, NumberInput, ScrollArea, Select, Skeleton, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { supabase, ils, type Row, type Value } from '@/lib/supabase';

export interface Field {
  key: string; label: string;
  type?: 'text' | 'number' | 'money' | 'date' | 'textarea' | 'bool' | 'member' | 'apartment' | 'select';
  options?: string[]; hideInTable?: boolean; required?: boolean; default?: Value; hint?: string;
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

export const nameOf = (rows: Row[], id: Value) => String(rows.find((r) => r.id === id)?.name ?? '');
export const shortDate = (v: Value) => new Date(String(v)).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
const dash = <Text c="dimmed" span>—</Text>;

function display(f: Field, v: Value, l: Lookups): ReactNode {
  if (v === null || v === undefined || v === '') return dash;
  if (f.type === 'money') return ils(Number(v));
  if (f.type === 'bool') return v ? <Badge variant="light" color="green">כן</Badge> : dash;
  if (f.type === 'date') return shortDate(v);
  if (f.type === 'member') return nameOf(l.members, v);
  if (f.type === 'apartment') return <Badge variant="light" color="sand" radius="sm">{nameOf(l.apartments, v)}</Badge>;
  return String(v);
}

interface Props {
  table: string; title: string; description?: string; fields: Field[]; order: string; ascending?: boolean; addLabel?: string;
  emptyText?: string; notice?: ReactNode; onChange?: () => void; toolbar?: (reload: () => void) => ReactNode; preview?: (values: Partial<Row>, l: Lookups) => ReactNode;
}

function useRows(table: string, order: string, ascending: boolean) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    supabase.from(table).select('*').order(order, { ascending }).order('id', { ascending: false })
      .then(({ data, error: e }) => { setRows((data ?? []) as Row[]); setError(e ? `הטעינה נכשלה: ${e.message}` : ''); });
  }, [table, order, ascending]);
  useEffect(reload, [reload]);
  return { rows, error, reload };
}

export function EntityPage(p: Props) {
  const lookups = useLookups();
  const { rows, error, reload } = useRows(p.table, p.order, p.ascending ?? false);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [query, setQuery] = useState('');
  const [apt, setApt] = useState<string | null>(null);
  const hasApt = p.fields.some((f) => f.key === 'apartment_id');
  const filtered = useMemo(() => (rows ?? []).filter((r) =>
    (!apt || String(r.apartment_id) === apt) &&
    (!query || p.fields.some((f) => String(f.type === 'member' ? nameOf(lookups.members, r[f.key]) : r[f.key] ?? '').includes(query)))),
  [rows, apt, query, p.fields, lookups]);
  const blank = () => Object.fromEntries(p.fields.filter((f) => f.default !== undefined).map((f) => [f.key, f.default!]));

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <div><Title order={2}>{p.title}</Title>{p.description && <Text c="dimmed" size="sm" maw={640}>{p.description}</Text>}</div>
        <Group>{p.toolbar?.(reload)}<Button onClick={() => setEditing(blank())}>{p.addLabel ?? 'הוספה'}</Button></Group>
      </Group>
      <Group>
        <TextInput placeholder="חיפוש" aria-label="חיפוש" value={query} onChange={(e) => setQuery(e.currentTarget.value)} w={260} />
        {hasApt && <Select placeholder="כל הדירות" aria-label="סינון לפי דירה" clearable w={220}
          data={lookups.apartments.map((a) => ({ value: String(a.id), label: String(a.name) }))} value={apt} onChange={setApt} />}
      </Group>
      {p.notice}
      {error && <Alert color="red">{error}</Alert>}
      <DataTable fields={p.fields} rows={rows === null ? null : filtered} lookups={lookups} onEdit={setEditing}
        empty={rows?.length ? 'אין תוצאות לחיפוש הזה.' : p.emptyText ?? 'עדיין אין כאן כלום. לחצו על הכפתור למעלה כדי להוסיף.'} />
      {editing && <EditModal {...p} lookups={lookups} row={editing} onClose={(changed) => { setEditing(null); if (changed) { reload(); p.onChange?.(); } }} />}
    </Stack>
  );
}

const alignEnd = (f: Field) => (f.type === 'money' || f.type === 'number' ? 'end' : undefined);

function DataTable({ fields, rows, lookups, onEdit, empty }: { fields: Field[]; rows: Row[] | null; lookups: Lookups; onEdit: (r: Row) => void; empty: string }) {
  const shown = fields.filter((f) => !f.hideInTable);
  if (rows === null) return <Stack gap="xs">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={36} />)}</Stack>;
  if (rows.length === 0) return <Text c="dimmed" ta="center" py="xl">{empty}</Text>;
  return (
    <ScrollArea>
      <Table striped highlightOnHover stickyHeader miw={640}>
        <Table.Thead><Table.Tr>{shown.map((f) => <Table.Th key={f.key} ta={alignEnd(f)}>{f.label}</Table.Th>)}</Table.Tr></Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.id} tabIndex={0} onClick={() => onEdit(r)} onKeyDown={(e) => e.key === 'Enter' && onEdit(r)} style={{ cursor: 'pointer' }}>
              {shown.map((f) => <Table.Td key={f.key} ta={alignEnd(f)}>{display(f, r[f.key], lookups)}</Table.Td>)}
            </Table.Tr>
          ))}
        </Table.Tbody>
        {shown.some((f) => f.type === 'money') && (
          <Table.Tfoot><Table.Tr>{shown.map((f, i) => (
            <Table.Th key={f.key} ta={alignEnd(f)}>{f.type === 'money' ? ils(rows.reduce((s, r) => s + Number(r[f.key] ?? 0), 0)) : i === 0 ? `סה״כ (${rows.length})` : ''}</Table.Th>
          ))}</Table.Tr></Table.Tfoot>
        )}
      </Table>
    </ScrollArea>
  );
}

type Op = PromiseLike<{ error: { message: string } | null }>;

function EditModal({ table, fields, lookups, row, preview, onClose }: Props & { lookups: Lookups; row: Partial<Row>; onClose: (changed: boolean) => void }) {
  const [values, setValues] = useState<Partial<Row>>(row);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const missing = fields.some((f) => f.required && (values[f.key] === null || values[f.key] === undefined || values[f.key] === ''));
  const run = async (op: Op, verb: string) => {
    setBusy(true); const { error: e } = await op; setBusy(false);
    if (e) setError(`ה${verb} נכשלה: ${e.message}`); else onClose(true);
  };
  const save = () => {
    const { id, ...rest } = values as Row;
    run(id ? supabase.from(table).update(rest).eq('id', id) : supabase.from(table).insert(rest as object), 'שמירה');
  };
  return (
    <Modal opened onClose={() => onClose(false)} title={<Text fw={600}>{row.id ? 'עריכה' : 'הוספה'}</Text>} size="lg">
      <form onSubmit={(e) => { e.preventDefault(); if (!missing) save(); }}>
        <Stack>
          {fields.map((f) => <FieldInput key={f.key} f={f} value={values[f.key] ?? null} lookups={lookups} onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))} />)}
          {preview?.(values, lookups)}
          {error && <Alert color="red">{error}</Alert>}
          <Group justify="space-between">
            <Button type="submit" loading={busy} disabled={missing}>שמירה</Button>
            {row.id && (confirmDelete
              ? <Button color="red" loading={busy} onClick={() => run(supabase.from(table).delete().eq('id', row.id!), 'מחיקה')}>כן, למחוק לצמיתות</Button>
              : <Button color="red" variant="subtle" onClick={() => setConfirmDelete(true)}>מחיקה</Button>)}
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function FieldInput({ f, value, lookups, onChange }: { f: Field; value: Value; lookups: Lookups; onChange: (v: Value) => void }) {
  const common = { label: f.label, required: f.required, description: f.hint };
  const text = (v: string) => onChange(v === '' ? null : v);
  switch (f.type) {
    case 'number': case 'money':
      return <NumberInput {...common} value={value === null ? '' : Number(value)} onChange={(v) => onChange(v === '' ? null : Number(v))}
        thousandSeparator prefix={f.type === 'money' ? '₪ ' : undefined} decimalScale={f.type === 'money' ? 2 : 5} inputMode="decimal" />;
    case 'date': return <TextInput {...common} type="date" value={String(value ?? '')} onChange={(e) => text(e.currentTarget.value)} />;
    case 'textarea': return <Textarea {...common} autosize minRows={2} value={String(value ?? '')} onChange={(e) => text(e.currentTarget.value)} />;
    case 'bool': return <Checkbox label={f.label} description={f.hint} checked={Boolean(value)} onChange={(e) => onChange(e.currentTarget.checked)} />;
    case 'member': case 'apartment': {
      const rows = f.type === 'member' ? lookups.members : lookups.apartments;
      return <Select {...common} clearable={!f.required} data={rows.map((r) => ({ value: String(r.id), label: String(r.name) }))}
        value={value === null ? null : String(value)} onChange={(v) => onChange(v === null ? null : Number(v))} />;
    }
    case 'select': return <Select {...common} data={f.options ?? []} value={value === null ? null : String(value)} onChange={onChange} allowDeselect={false} />;
    default: return <TextInput {...common} value={String(value ?? '')} onChange={(e) => text(e.currentTarget.value)} />;
  }
}
