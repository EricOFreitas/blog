# Blog do Eric

Aventuras reais em programação e infra — por Eric de Oliveira Freitas.
Site estático em [Astro](https://astro.build), hospedado no Cloudflare Pages.

## Rodar localmente

```bash
npm install
npm run dev      # http://localhost:4321
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor local com hot reload (mostra rascunhos) |
| `npm run build` | gera o site em `dist/` (exclui rascunhos) |
| `npm run preview` | pré-visualiza o build de produção |

## Escrever um post

Crie um `.md` em `posts/` com o cabeçalho:

```markdown
---
title: "Título do post"
description: "Resumo de uma linha."
date: 2026-06-28
tags: ["infra", "linux"]
draft: true   # opcional: enquanto true, não é publicado
---

Texto começa aqui...
```

Publicar = tirar o `draft: true` e dar `git push`. O Cloudflare buila e põe no ar.
