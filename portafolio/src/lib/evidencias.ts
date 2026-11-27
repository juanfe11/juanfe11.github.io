import base from '../data/evidencias.json';

// Si existe src/data/evidencias-<slug>.json, sus ejercicios reemplazan a los de evidencias.json.
const archivos = import.meta.glob('../data/evidencias-*.json', { import: 'default', eager: true }) as Record<
  string,
  any[]
>;

export function categorias() {
  return base.categorias.map((c) => ({
    ...c,
    items: (archivos[`../data/evidencias-${c.slug}.json`] ?? c.items) as any[],
  }));
}
