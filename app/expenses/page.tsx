'use client';
import { Text } from '@mantine/core';
import { EntityPage, nameOf } from '@/components/EntityPage';
import { ils } from '@/lib/supabase';
import { AttachmentsButton } from '@/components/Attachments';

export default function Expenses() {
  return <EntityPage table="expenses" title="הוצאות" description="כל תשלום על הדירות. מי ששילם מקבל בחזרה מכל שותף את החלק שלו." addLabel="רישום הוצאה" order="date" fields={[
    { key: 'date', label: 'תאריך', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
    { key: 'description', label: 'תיאור', required: true },
    { key: 'category', label: 'סוג', type: 'select', options: ['שוטף', 'ביטוח', 'שיפוץ', 'מיסים', 'אחר'], default: 'שוטף' },
    { key: 'apartment_id', label: 'דירה', type: 'apartment' },
    { key: 'amount', label: 'סכום', type: 'money', required: true },
    { key: 'paid_by', label: 'שולם ע״י', type: 'member', required: true },
    { key: 'settled', label: 'כבר התחשבנו על זה', type: 'bool', default: false, hint: 'הוצאה מסומנת לא נספרת ביתרות', hideInTable: true },
  ]} rowActions={(r) => <AttachmentsButton link="expense_id" id={r.id} apartmentId={r.apartment_id ? Number(r.apartment_id) : null} label="קבלה" />}
  preview={(v, l) => {
    const amount = Number(v.amount ?? 0);
    if (!amount || !v.paid_by) return null;
    const others = l.members.filter((m) => m.id !== v.paid_by).map((m) => `${m.name} ${ils(amount * Number(m.share))}`);
    return <Text size="sm" c="dimmed">{nameOf(l.members, v.paid_by)} יקבל/תקבל בחזרה: {others.join(', ')}</Text>;
  }} />;
}
