import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Aponta a coleção pra sua pasta `posts/` que já existe na raiz —
// os .md continuam onde estão, o Astro só lê de lá.
const posts = defineCollection({
  loader: glob({ pattern: '*.md', base: './posts' }),
  // O "schema" valida o cabeçalho (frontmatter) de cada post.
  // Se faltar título ou a data estiver torta, o build avisa na hora.
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
