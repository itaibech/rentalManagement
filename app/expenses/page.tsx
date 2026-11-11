'use client';
import { EntityPage } from '@/components/EntityPage';

export default function Expenses() {
  return <EntityPage table="expenses" title="הוצאות" order="date" fields={[
    { key: 'date', label: 'תאריך', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
    { key: 'description', label: 'תיאור', required: true },
    { key: 'category', label: 'סוג', type: 'select', options: ['שוטף', 'ביטוח', 'שיפוץ', 'מיסים', 'אחר'], default: 'שוטף' },
    { key: 'apartment_id', label: 'דירה', type: 'apartment' },
    { key: 'amount', label: 'סכום', type: 'money', required: true },
    { key: 'paid_by', label: 'שולם ע״י', type: 'member', required: true },
    { key: 'settled', label: 'סגור (התחשבנות בוצעה)', type: 'bool', default: false },
  ]} />;
}
