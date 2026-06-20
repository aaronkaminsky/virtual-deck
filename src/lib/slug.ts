const MAX_SLUG_LENGTH = 24;

export function slugify(input: string): string {
  let s = input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')    // spaces & underscores -> dash
    .replace(/[^a-z0-9-]/g, '') // strip everything else
    .replace(/-+/g, '-')        // collapse repeated dashes
    .replace(/^-+|-+$/g, '');   // trim leading/trailing dashes
  if (s.length > MAX_SLUG_LENGTH) {
    s = s.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '');
  }
  return s;
}
