'use client';
import { Text } from '@mantine/core';
import { EntityPage } from '@/components/EntityPage';

export default function Members() {
  return <>
    <EntityPage table="members" title="שותפים" order="id" ascending fields={[
      { key: 'name', label: 'שם', required: true },
      { key: 'share', label: 'חלק (למשל 0.5)', type: 'number', required: true },
      { key: 'email', label: 'אימייל Google לכניסה' },
    ]} />
    <Text c="dimmed" size="sm" mt="md">רק המנהל יכול לערוך שותפים. שותף עם אימייל Google יכול להיכנס לאפליקציה.</Text>
  </>;
}
