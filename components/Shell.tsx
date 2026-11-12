'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AppShell, Burger, Button, Center, Divider, Group, Loader, NavLink, Paper, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '@/lib/supabase';

// Grouped by what people come to do: money first, then property records.
const sections = [
  { title: 'כסף', links: [['/', 'מי חייב למי'], ['/income/', 'שכר דירה חודשי'], ['/expenses/', 'הוצאות'], ['/transfers/', 'העברות']] },
  { title: 'נכסים', links: [['/apartments/', 'דירות'], ['/tenants/', 'דיירים'], ['/tasks/', 'תזכורות'], ['/files/', 'מסמכים']] },
  { title: 'הגדרות', links: [['/members/', 'שותפים']] },
] as const;

function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [member, setMember] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (session) supabase.rpc('is_member').then(({ data }) => setMember(data === true)); }, [session]);
  return { session, member };
}

export function Shell({ children }: { children: ReactNode }) {
  const { session, member } = useSession();
  if (session === undefined || (session && member === undefined)) return <Center h="100vh"><Loader /></Center>;
  if (!session) return <SignIn />;
  if (!member) return <NoAccess email={session.user.email ?? ''} />;
  return <Frame email={session.user.email ?? ''}>{children}</Frame>;
}

function Frame({ email, children }: { email: string; children: ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure();
  const path = usePathname();
  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="lg">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="תפריט" />
            <Title order={4} c="var(--mantine-color-anchor)">ניהול דירות</Title>
          </Group>
          <Group gap="xs">
            <Text size="sm" c="dimmed" visibleFrom="sm">{email}</Text>
            <Button variant="subtle" color="gray" onClick={() => supabase.auth.signOut()}>יציאה</Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p="sm">
        {sections.map((s, i) => (
          <Stack key={s.title} gap={2}>
            {i > 0 && <Divider my="xs" />}
            <Text size="xs" c="dimmed" fw={600} px="sm" pb={4}>{s.title}</Text>
            {s.links.map(([href, label]) => (
              <NavLink key={href} component={Link} href={href} label={label} active={path === href} onClick={close} style={{ borderRadius: 8 }} />
            ))}
          </Stack>
        ))}
      </AppShell.Navbar>
      <AppShell.Main maw={1200}>{children}</AppShell.Main>
    </AppShell>
  );
}

function SignIn() {
  const signIn = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/rentalManagement/` } });
  return (
    <Center h="100vh" p="md">
      <Paper withBorder p="xl" radius="lg" maw={380} w="100%">
        <Stack>
          <Title order={2} c="var(--mantine-color-anchor)">ניהול דירות</Title>
          <Text c="dimmed">שכר דירה, הוצאות והתחשבנות בין השותפים — יפו ופתח תקווה.</Text>
          <Button size="md" onClick={signIn}>כניסה עם חשבון Google</Button>
        </Stack>
      </Paper>
    </Center>
  );
}

function NoAccess({ email }: { email: string }) {
  return (
    <Center h="100vh" p="md">
      <Paper withBorder p="xl" radius="lg" maw={420}>
        <Stack>
          <Title order={3}>אין גישה עדיין</Title>
          <Text>החשבון {email} לא רשום כשותף. בקשו מאיתי להוסיף אותו בעמוד השותפים, ואז היכנסו שוב.</Text>
          <Button variant="light" onClick={() => supabase.auth.signOut()}>יציאה והחלפת חשבון</Button>
        </Stack>
      </Paper>
    </Center>
  );
}
