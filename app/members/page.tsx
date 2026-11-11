'use client';
import { EntityPage } from '@/components/EntityPage';

export default function Members() {
  return <EntityPage table="members" title="שותפים" description="רק המנהל יכול לערוך. שותף עם אימייל Google יכול להיכנס לאפליקציה." addLabel="הוספת שותף" order="id" ascending fields={[
    { key: 'name', label: 'שם', required: true },
    { key: 'share', label: 'חלק ברווחים', type: 'number', required: true, hint: 'שבר עשרוני: 0.5 = חצי, 0.16667 = שישית' },
    { key: 'email', label: 'אימייל Google לכניסה', hint: 'בלי אימייל השותף לא יוכל להיכנס' },
  ]} />;
}
