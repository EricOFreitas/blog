import { getCollection, type CollectionEntry } from 'astro:content';

// Posts que devem aparecer: rascunhos some no build de produção, mas
// continuam visíveis no localhost (import.meta.env.DEV). Já ordenados
// do mais novo pro mais velho. Use isto em vez de chamar getCollection
// direto, pra a regra de rascunho ficar num lugar só.
export async function getVisiblePosts(): Promise<CollectionEntry<'posts'>[]> {
  const posts = await getCollection('posts');
  return posts
    .filter((post) => import.meta.env.DEV || !post.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export interface MonthGroup {
  key: string; // "2026-06", usado só pra ordenar
  label: string; // "junho de 2026"
  posts: CollectionEntry<'posts'>[];
}

// Agrupa posts por mês/ano, do mais novo pro mais velho. Usa UTC pra o rótulo
// não escorregar de mês por causa do fuso (datas vêm como meia-noite UTC).
export function groupByMonth(posts: CollectionEntry<'posts'>[]): MonthGroup[] {
  const grupos = new Map<string, MonthGroup>();

  for (const post of posts) {
    const d = post.data.date;
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

    if (!grupos.has(key)) {
      const label = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
        .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      grupos.set(key, { key, label, posts: [] });
    }
    grupos.get(key)!.posts.push(post);
  }

  return [...grupos.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}
