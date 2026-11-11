'use client';
import { EntityPage } from '@/components/EntityPage';

export default function Transfers() {
  return <EntityPage table="transfers" title="העברות בין השותפים" order="date" fields={[
    { key: 'date', label: 'תאריך', type: 'date', required: true, default: new Date().toISOString().slice(0, 10) },
    { key: 'from_member', label: 'מעביר', type: 'member', required: true },
    { key: 'to_member', label: 'מקבל', type: 'member', required: true },
    { key: 'amount', label: 'סכום', type: 'money', required: true },
    { key: 'method', label: 'אמצעי', type: 'select', options: ['העברה בנקאית', 'ביט', 'פייבוקס', 'מזומן', 'קיזוז'], default: 'העברה בנקאית' },
    { key: 'note', label: 'הערה' },
    { key: 'settled', label: 'סגור', type: 'bool', default: false },
  ]} />;
}
