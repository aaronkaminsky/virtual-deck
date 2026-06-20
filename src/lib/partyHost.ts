export const PARTYKIT_HOST: string =
  import.meta.env.VITE_PARTYKIT_HOST ??
  (import.meta.env.DEV ? 'localhost:1999' : 'virtual-deck.aaronkaminsky.partykit.dev');
