const MAX_SLUG_LENGTH = 120;

/** lowercase, accents stripped, non alphanumerics to "-", collapsed and trimmed. */
export function slugify(nombre: string): string {
  const slug = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
  return slug === '' ? 'servicio' : slug;
}

/** Returns `base`, or `base-2`, `base-3`... the first one `exists` reports free. */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => boolean | Promise<boolean>,
): Promise<string> {
  if (!(await exists(base))) return base;
  for (let n = 2; ; n++) {
    const suffix = `-${n}`;
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, '')}${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
}
