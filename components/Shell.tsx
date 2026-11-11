'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppShell, Burger, Button, Center, Group, NavLink, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '@/lib/supabase';

const links = [
  ['/', 'סיכום ויתרות'], ['/income/', 'הכנסות חודשיות'], ['/expenses/', 'הוצאות'], ['/transfers/', 'העברות'],
  ['/apartments/', 'דירות'], ['/tenants/', 'דיירים'], ['/tasks/', 'משימות חוזרות'], ['/files/', 'מסמכים'], ['/members/', 'שותפים'],
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [opened, { toggle, close }] = useDisclosure();
  const path = usePathname();
  const [member, setMember] = useState<boolean | undefined>(undefined);
  useEffect(() => { if (session) supabase.rpc('is_member').then(({ data }) => setMember(data === true)); }, [session]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <SignIn />;
  if (member === false) return <Center h="100vh"><Stack align="center"><Text>{session.user.email} אינו רשום כשותף.</Text><Button onClick={() => supabase.auth.signOut()}>יציאה</Button></Stack></Center>;
  if (member === undefined) return null;
  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group><Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" /><Title order={4}>ניהול דירות</Title></Group>
          <Group><Text size="sm" visibleFrom="sm">{session.user.email}</Text><Button variant="subtle" onClick={() => supabase.auth.signOut()}>יציאה</Button></Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="xs">
        {links.map(([href, label]) => <NavLink key={href} component={Link} href={href} label={label} active={path === href} onClick={close} />)}
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

function SignIn() {
  const signIn = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
  return (
    <Center h="100vh">
      <Stack align="center"><Title>ניהול דירות</Title><Text c="dimmed">כניסה לשותפים בלבד</Text><Button size="lg" onClick={signIn}>כניסה עם Google</Button></Stack>
    </Center>
  );
}
