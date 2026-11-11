'use client';
import { EntityPage } from '@/components/EntityPage';

export default function Apartments() {
  return <EntityPage table="apartments" title="דירות" order="id" ascending fields={[
    { key: 'name', label: 'שם', required: true },
    { key: 'address', label: 'כתובת' },
    { key: 'area_sqm', label: 'שטח (מ״ר)', type: 'number', hideInTable: true },
    { key: 'rent', label: 'שכר דירה', type: 'money' },
    { key: 'contract_end', label: 'סיום חוזה', type: 'date' },
    { key: 'deposit_member_id', label: 'הצ׳קים מופקדים אצל', type: 'member' },
    { key: 'electricity_contract', label: 'חשמל - חשבון חוזה', hideInTable: true },
    { key: 'electricity_meter', label: 'חשמל - מספר מונה', hideInTable: true },
    { key: 'arnona_account', label: 'ארנונה - חשבון לקוח', hideInTable: true },
    { key: 'arnona_contract', label: 'ארנונה - מספר חוזה', hideInTable: true },
    { key: 'water_company', label: 'מים - חברה', hideInTable: true },
    { key: 'water_account', label: 'מים - חשבון חוזה', hideInTable: true },
    { key: 'property_tax_no', label: 'מספר נכס', hideInTable: true },
    { key: 'notes', label: 'הערות', type: 'textarea', hideInTable: true },
  ]} />;
}
