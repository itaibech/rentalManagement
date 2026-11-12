'use client';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Badge, Box, Button, Checkbox, Group, Modal, NumberInput, Paper, ScrollArea, Select, Skeleton, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { supabase, ils, type Row, type Value } from '@/lib/supabase';

export interface Field {
  key: string; label: string;
  type?: 'text' | 'number' | 'percent' | 'money' | 'date' | 'textarea' | 'bool' | 'member' | 'apartment' | 'tenant' | 'select';
  options?: string[]; hideInTable?: boolean; noTotal?: boolean; required?: boolean; default?: Value; hint?: string;
}
export interface Lookups { members: Row[]; apartments: Row[]; tenants: Row[] }

export function useLookups(): Lookups {
  const [l, setL] = useState<Lookups>({ members: [], apartments: [], tenants: [] });
  useEffect(() => {
    const q = (t: string) => supabase.from(t).select('*').order('id');
    Promise.all([q('members'), q('apartments'), q('tenants')])
      .then(([m, a, t]) => setL({ members: (m.data ?? []) as Row[], apartments: (a.data ?? []) as Row[], tenants: (t.data ?? []) as Row[] }));
  }, []);
  return l;
}

export const nameOf = (rows: Row[], id: Value) => String(rows.find((r) => r.id === id)?.name ?? '');
export const shortDate = (v: Value) => new Date(String(v)).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
const dash = <Text c="dimmed" span>—</Text>;

function display(f: Field, v: Value, l: Lookups): ReactNode {
  if (v === null || v === undefined || v === '') return dash;
  if (f.type === 'money') return ils(Number(v));
  if (f.type === 'percent') return `${Math.round(Number(v) * 1000) / 10}%`;
  if (f.type === 'number') return String(Math.round(Number(v) * 10000) / 10000);
  if (f.type === 'bool') return v ? <Badge variant="light" color="green">כן</Badge> : dash;
  if (f.type === 'date') return shortDate(v);
  if (f.type === 'member') return nameOf(l.members, v);
  if (f.type === 'tenant') return nameOf(l.tenants, v);
  if (f.type === 'apartment') return <Badge variant="light" color="sand" radius="sm">{nameOf(l.apartments, v)}</Badge>;
  return String(v);
}

interface Props {
  table: string; title: string; description?: string; fields: Field[]; order: string; ascending?: boolean; addLabel?: string;
  emptyText?: string; notice?: ReactNode; onChange?: () => void; rowActions?: (row: Row, reload: () => void) => ReactNode; toolbar?: (reload: () => void) => ReactNode; preview?: (values: Partial<Row>, l: Lookups) => ReactNode;
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
        <Group wrap="wrap">{p.toolbar?.(reload)}<Button onClick={() => setEditing(blank())}>{p.addLabel ?? 'הוספה'}</Button></Group>
      </Group>
      <Group>
        <TextInput placeholder="חיפוש" aria-label="חיפוש" value={query} onChange={(e) => setQuery(e.currentTarget.value)} w={{ base: '100%', xs: 260 }} />
        {hasApt && <Select placeholder="כל הדירות" aria-label="סינון לפי דירה" clearable w={{ base: '100%', xs: 220 }}
          data={lookups.apartments.map((a) => ({ value: String(a.id), label: String(a.name) }))} value={apt} onChange={setApt} />}
      </Group>
      {p.notice}
      {error && <Alert color="red">{error}</Alert>}
      <DataTable fields={p.fields} rows={rows === null ? null : filtered} lookups={lookups} onEdit={setEditing} actions={p.rowActions && ((r) => p.rowActions!(r, reload))}
        empty={rows?.length ? 'אין תוצאות לחיפוש הזה.' : p.emptyText ?? 'עדיין אין כאן כלום. לחצו על הכפתור למעלה כדי להוסיף.'} />
      {editing && <EditModal {...p} lookups={lookups} row={editing} onClose={(changed) => { setEditing(null); if (changed) { reload(); p.onChange?.(); } }} />}
    </Stack>
  );
}

const alignEnd = (f: Field) => (f.type === 'money' || f.type === 'number' || f.type === 'percent' ? 'end' : undefined);

interface TableProps { fields: Field[]; rows: Row[] | null; lookups: Lookups; onEdit: (r: Row) => void; empty: string; actions?: (r: Row) => ReactNode }

function DataTable(t: TableProps) {
  const mobile = useMediaQuery('(max-width: 48em)');
  if (t.rows === null) return <Stack gap="xs">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={36} />)}</Stack>;
  if (t.rows.length === 0) return <Text c="dimmed" ta="center" py="xl">{t.empty}</Text>;
  return mobile ? <CardList {...t} rows={t.rows} /> : <WideTable {...t} rows={t.rows} />;
}

const hasTotal = (f: Field) => f.type === 'money' && !f.noTotal;
const totalOf = (rows: Row[], f: Field) => ils(rows.reduce((s, r) => s + Number(r[f.key] ?? 0), 0));
// Buttons inside a clickable row must not also open the editor.
const stop = (node: ReactNode) => <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>{node}</div>;

function WideTable({ fields, rows, lookups, onEdit, actions }: TableProps & { rows: Row[] }) {
  const shown = fields.filter((f) => !f.hideInTable);
  return (
    <ScrollArea>
      <Table striped highlightOnHover stickyHeader miw={640}>
        <Table.Thead><Table.Tr>{shown.map((f) => <Table.Th key={f.key} ta={alignEnd(f)}>{f.label}</Table.Th>)}{actions && <Table.Th />}</Table.Tr></Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.id} tabIndex={0} onClick={() => onEdit(r)} onKeyDown={(e) => e.key === 'Enter' && onEdit(r)} style={{ cursor: 'pointer' }}>
              {shown.map((f) => <Table.Td key={f.key} ta={alignEnd(f)}>{display(f, r[f.key], lookups)}</Table.Td>)}
              {actions && <Table.Td>{stop(actions(r))}</Table.Td>}
            </Table.Tr>
          ))}
        </Table.Tbody>
        {shown.some(hasTotal) && (
          <Table.Tfoot><Table.Tr>{shown.map((f, i) => (
            <Table.Th key={f.key} ta={alignEnd(f)}>{hasTotal(f) ? totalOf(rows, f) : i === 0 ? `סה״כ (${rows.length})` : ''}</Table.Th>
          ))}{actions && <Table.Th />}</Table.Tr></Table.Tfoot>
        )}
      </Table>
    </ScrollArea>
  );
}

// Phones: one card per row, label beside value, nothing scrolls sideways.
function CardList({ fields, rows, lookups, onEdit, actions }: TableProps & { rows: Row[] }) {
  const [title, ...rest] = fields.filter((f) => !f.hideInTable);
  const money = fields.filter((f) => hasTotal(f) && !f.hideInTable);
  return (
    <Stack gap="sm">
      {rows.map((r) => (
        <Paper key={r.id} withBorder p="sm" radius="md" tabIndex={0} onClick={() => onEdit(r)} onKeyDown={(e) => e.key === 'Enter' && onEdit(r)} style={{ cursor: 'pointer' }}>
          <Text fw={600} mb={4}>{display(title, r[title.key], lookups)}</Text>
          {rest.map((f) => (
            <Group key={f.key} justify="space-between" gap="xs" wrap="nowrap" py={2}>
              <Text size="sm" c="dimmed">{f.label}</Text>
              <Text size="sm" ta="end" style={{ overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums' }}>{display(f, r[f.key], lookups)}</Text>
            </Group>
          ))}
          {actions && <Box mt="xs">{stop(actions(r))}</Box>}
        </Paper>
      ))}
      {money.map((f) => <Group key={f.key} justify="space-between" px="sm"><Text fw={600}>סה״כ {f.label} ({rows.length})</Text><Text fw={600}>{totalOf(rows, f)}</Text></Group>)}
    </Stack>
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
    case 'number': case 'money': case 'percent':
      return <NumberInput {...common} value={value === null ? '' : Number(value)} onChange={(v) => onChange(v === '' ? null : Number(v))}
        thousandSeparator prefix={f.type === 'money' ? '₪ ' : undefined} decimalScale={f.type === 'money' ? 2 : 5} inputMode="decimal" />;
    case 'date': return <TextInput {...common} type="date" value={String(value ?? '')} onChange={(e) => text(e.currentTarget.value)} />;
    case 'textarea': return <Textarea {...common} autosize minRows={2} value={String(value ?? '')} onChange={(e) => text(e.currentTarget.value)} />;
    case 'bool': return <Checkbox label={f.label} description={f.hint} checked={Boolean(value)} onChange={(e) => onChange(e.currentTarget.checked)} />;
    case 'member': case 'apartment': case 'tenant': {
      const rows = f.type === 'member' ? lookups.members : f.type === 'tenant' ? lookups.tenants : lookups.apartments;
      return <Select {...common} clearable={!f.required} data={rows.map((r) => ({ value: String(r.id), label: String(r.name) }))}
        value={value === null ? null : String(value)} onChange={(v) => onChange(v === null ? null : Number(v))} />;
    }
    case 'select': return <Select {...common} data={f.options ?? []} value={value === null ? null : String(value)} onChange={onChange} allowDeselect={false} />;
    default: return <TextInput {...common} value={String(value ?? '')} onChange={(e) => text(e.currentTarget.value)} />;
  }
}
