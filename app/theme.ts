import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Mediterranean sea blue (primary) and Jaffa sandstone (apartment tags).
const sea: MantineColorsTuple = ['#eaf3fa', '#d3e5f2', '#a6cbe5', '#76afd8', '#4f97cc', '#2f7bb5', '#1e6091', '#174d75', '#113a59', '#0b273d'];
const sand: MantineColorsTuple = ['#faf5ec', '#f1e6d1', '#e3cda4', '#d6b47a', '#c9a66b', '#bb914c', '#a67c3a', '#86632e', '#664b23', '#463317'];

export const theme = createTheme({
  primaryColor: 'sea',
  colors: { sea, sand },
  fontFamily: 'var(--font-plex), system-ui, sans-serif',
  headings: { fontFamily: 'var(--font-plex), system-ui, sans-serif', fontWeight: '600' },
  defaultRadius: 'md',
  // Ledger feel: amounts line up in columns.
  components: {
    Table: { defaultProps: { verticalSpacing: 'sm', style: { fontVariantNumeric: 'tabular-nums' } } },
    Card: { defaultProps: { withBorder: true, radius: 'md', padding: 'lg' } },
  },
});
