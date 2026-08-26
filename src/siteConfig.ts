// Configuração geral do site.

// Comentários via Giscus (usa as Discussions do repositório no GitHub).
// Pra ativar:
//   1. No GitHub: repositório EricOFreitas/blog → Settings → aba General →
//      marque "Discussions".
//   2. Instale o app do Giscus: https://github.com/apps/giscus (no repo).
//   3. Vá em https://giscus.app, preencha o repositório e a categoria de
//      discussão, e copie os dois IDs que ele gera (repoId e categoryId).
//   4. Cole abaixo e troque enabled para true.
export const giscus = {
  enabled: true,
  repo: 'EricOFreitas/blog' as `${string}/${string}`,
  repoId: 'R_kgDOTIkZeg',
  // "Announcements": só o giscus/mantenedor cria discussion — visitante só comenta.
  category: 'Announcements',
  categoryId: 'DIC_kwDOTIkZes4DENTO',
};
