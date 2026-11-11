'use client';
import { useState } from 'react';
import { Button, TextInput } from '@mantine/core';
import { EntityPage } from '@/components/EntityPage';
import { supabase } from '@/lib/supabase';

// One row per apartment per month: who the check was deposited to.
export default function Income() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const generate = async (reload: () => void) => {
    const { data } = await supabase.from('apartments').select('id, rent, deposit_member_id').gt('rent', 0).not('deposit_member_id', 'is', null);
    const rows = (data ?? []).map((a) => ({ month: `${month}-01`, apartment_id: a.id, amount: a.rent, deposited_to: a.deposit_member_id }));
    const { error } = await supabase.from('rent_payments').upsert(rows, { onConflict: 'month,apartment_id', ignoreDuplicates: true });
    if (error) alert(error.message); else reload();
  };
  return <EntityPage table="rent_payments" title="הכנסות חודשיות" order="month" fields={[
    { key: 'month', label: 'חודש', type: 'date', required: true },
    { key: 'apartment_id', label: 'דירה', type: 'apartment', required: true },
    { key: 'amount', label: 'סכום', type: 'money', required: true },
    { key: 'deposited_to', label: 'הופקד אצל', type: 'member', required: true },
    { key: 'method', label: 'אמצעי', type: 'select', options: ['צ׳ק', 'העברה בנקאית', 'מזומן'], default: 'צ׳ק' },
    { key: 'settled', label: 'סגור', type: 'bool', default: false },
  ]} toolbar={(reload) => <>
    <TextInput type="month" value={month} onChange={(e) => setMonth(e.currentTarget.value)} aria-label="חודש" />
    <Button variant="light" onClick={() => generate(reload)}>יצירת חודש מכל הדירות</Button>
  </>} />;
}
