'use client';
import { useEffect } from 'react';
import { Anchor, Center, Loader, Stack, Text } from '@mantine/core';

// GitHub Pages serves this for unknown paths (e.g. an auth redirect that landed on a bad URL).
// Send the visitor home and keep ?code= / #tokens so the Supabase login still completes.
const HOME = '/rentalManagement/';

export default function NotFound() {
  useEffect(() => { location.replace(HOME + location.search + location.hash); }, []);
  return (
    <Center h="60vh"><Stack align="center"><Loader /><Text>מעביר לדף הראשי…</Text><Anchor href={HOME}>לדף הראשי</Anchor></Stack></Center>
  );
}
