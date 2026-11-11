'use client';
import { EntityPage } from '@/components/EntityPage';

export default function Tenants() {
  return <EntityPage table="tenants" title="דיירים" order="active" fields={[
    { key: 'apartment_id', label: 'דירה', type: 'apartment', required: true },
    { key: 'name', label: 'שם', required: true },
    { key: 'phone', label: 'טלפון' },
    { key: 'id_number', label: 'ת.ז', hideInTable: true },
    { key: 'email', label: 'אימייל' },
    { key: 'active', label: 'דייר נוכחי', type: 'bool', default: true },
  ]} />;
}
