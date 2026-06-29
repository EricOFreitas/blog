// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // Domínio final (usado em RSS, sitemap, og:url).
  site: 'https://ericofreitas.eng.br',

  integrations: [sitemap()],

  markdown: {
    // Shiki já vem embutido no Astro — é o mesmo highlighter do VS Code.
    // Dois temas: o CSS escolhe qual usar conforme o tema do site (claro/escuro).
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      // Não fixa um tema "padrão" no HTML — deixa o CSS decidir via variáveis.
      defaultColor: false,
      wrap: false,
    },
  },
});
