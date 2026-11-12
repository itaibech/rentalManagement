'use client';
import { useState } from 'react';
import { Button, Text, TextInput } from '@mantine/core';
import { EntityPage, useLookups } from '@/components/EntityPage';
import { MonthSummary } from '@/components/MonthSummary';
import { supabase } from '@/lib/supabase';

// One row per apartment per month: who the check was deposited to.
export default function Income() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const { members } = useLookups();
  const bump = () => setVersion((v) => v + 1);
  const generate = async (reload: () => void) => {
    setBusy(true);
    const { data } = await supabase.from('apartments').select('id, rent, deposit_member_id').gt('rent', 0).not('deposit_member_id', 'is', null);
    const rows = (data ?? []).map((a) => ({ month: `${month}-01`, apartment_id: a.id, amount: a.rent, deposited_to: a.deposit_member_id }));
    const { error } = await supabase.from('rent_payments').upsert(rows, { onConflict: 'month,apartment_id', ignoreDuplicates: true });
    setBusy(false);
    setMsg(error ? `הרישום נכשל: ${error.message}` : `נרשם שכר דירה ל-${month} לכל הדירות (דירות שכבר נרשמו לא שונו).`);
    reload(); bump();
  };
  return (
    <EntityPage table="rent_payments" title="שכר דירה חודשי" addLabel="רישום תשלום בודד" order="month"
      description="כל צ׳ק מופקד אצל שותף אחר. רשמו כל חודש אצל מי הופקד כל צ׳ק, והמערכת תחשב מי צריך להעביר למי."
      fields={[
        { key: 'month', label: 'חודש', type: 'date', required: true, hint: 'היום הראשון בחודש' },
        { key: 'apartment_id', label: 'דירה', type: 'apartment', required: true },
        { key: 'amount', label: 'סכום', type: 'money', required: true },
        { key: 'deposited_to', label: 'הופקד אצל', type: 'member', required: true },
        { key: 'method', label: 'אמצעי', type: 'select', options: ['צ׳ק', 'העברה בנקאית', 'מזומן'], default: 'צ׳ק' },
        { key: 'settled', label: 'כבר התחשבנו על זה', type: 'bool', default: false, hideInTable: true },
      ]}
      toolbar={(reload) => <>
        <TextInput type="month" value={month} onChange={(e) => setMonth(e.currentTarget.value)} aria-label="חודש לרישום" />
        <Button variant="light" loading={busy} onClick={() => generate(reload)}>רישום החודש לכל הדירות</Button>
      </>}
      onChange={bump}
      notice={<>
        {msg && <Text size="sm" c={msg.startsWith('הרישום נכשל') ? 'red' : 'green.7'} role="status">{msg}</Text>}
        <MonthSummary month={month} members={members} version={version} />
      </>} />
  );
}
