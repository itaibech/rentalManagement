'use client';
import { EntityPage } from '@/components/EntityPage';

// Marking a recurring task done creates the next one (DB trigger next_task).
export default function Tasks() {
  return <EntityPage table="tasks" title="תזכורות" description="חידוש ביטוח, חידוש חוזה, ביקורות. כשמסמנים תזכורת חוזרת כבוצעה, נוצרת אוטומטית התזכורת הבאה." addLabel="הוספת תזכורת" order="due_date" ascending fields={[
    { key: 'title', label: 'משימה', required: true },
    { key: 'apartment_id', label: 'דירה', type: 'apartment' },
    { key: 'due_date', label: 'תאריך יעד', type: 'date' },
    { key: 'interval_months', label: 'חוזר כל (חודשים)', type: 'number', hint: 'למשל 12 לחידוש שנתי. ריק = חד פעמי' },
    { key: 'done', label: 'בוצע', type: 'bool', default: false },
    { key: 'notes', label: 'הערות', type: 'textarea' },
  ]} />;
}
