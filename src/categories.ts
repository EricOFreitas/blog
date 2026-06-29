// Fonte única de verdade das categorias (seções) do blog.
// Pra adicionar uma nova: inclua o nome aqui e seu slug/tagline abaixo.
export const CATEGORY_NAMES = [
  'Programação',
  'Infra',
  'Investimentos',
  'Educação',
] as const;

export type CategoryName = (typeof CATEGORY_NAMES)[number];

// Nome legível → slug usado na URL (/categoria/<slug>), sem acento.
export const CATEGORY_SLUGS: Record<CategoryName, string> = {
  'Programação': 'programacao',
  'Infra': 'infra',
  'Investimentos': 'investimentos',
  'Educação': 'educacao',
};

// Frase curta que aparece no topo da página de cada categoria.
export const CATEGORY_TAGLINES: Record<CategoryName, string> = {
  'Programação': 'Código, decisões de arquitetura e o que aprendi construindo.',
  'Infra': 'Servidores, deploy, redes e incidentes reais.',
  'Investimentos': 'Finanças e mercado, no mesmo tom de experiência real.',
  'Educação': 'Aprender e ensinar — tecnologia, finanças e o resto.',
};

// slug → nome, pro caminho inverso.
export const slugToCategory: Record<string, CategoryName> = Object.fromEntries(
  (Object.entries(CATEGORY_SLUGS) as [CategoryName, string][]).map(
    ([name, slug]) => [slug, name],
  ),
);
