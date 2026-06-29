---
title: "Meu Primeiro Post Foi Sobre um WordPress Invadido. O Blog Não Vai Ser Um."
description: "Instalei o WordPress pra começar o blog e fui escolher um tema. Foi quando me toquei da ironia — e por que site estático fazia muito mais sentido pro meu caso do que eu tinha parado pra pensar."
date: 2026-06-27
category: "Programação"
tags: ["meta", "ferramentas"]
draft: true
---

Instalei o WordPress num sábado à tarde. Baixei, criei o banco, configurei o `wp-config.php`, criei o usuário admin. Quinze minutos e estava no ar. Aí fui pra parte que eu achava que ia ser divertida: escolher um tema.

Passei um tempo bom olhando tema. Queria algo direto, denso, focado em texto — o estilo do Akita on Rails, que eu curto, sem virar uma cópia escancarada. E enquanto eu comparava um tema com outro, me toquei do óbvio.

O primeiro post que eu ia publicar nesse blog é sobre um **WordPress invadido**. Uma VPS minha que virou parte de uma botnet porque um plugin desatualizado — o WP File Manager — deixou um atacante subir 57 web shells na pasta de uploads e instalar um backdoor escondido dentro de um arquivo `.png`.

E eu ia publicar essa história… rodando num WordPress.

Não é superstição. Mas me fez parar e perguntar uma coisa que eu tinha pulado na empolgação de colocar algo no ar: **o WordPress é mesmo a ferramenta certa pra esse blog, ou eu instalei ele no automático porque "blog = WordPress"?**

## O que eu realmente preciso de um blog

Quando paro pra listar, é pouca coisa:

- Servir texto e bloco de código, bonito e rápido
- Eu escrever sem atrito
- Não me dar dor de cabeça de manutenção
- Durar anos sem virar um passivo

Repara que "painel de administração", "banco de dados" e "sistema de plugins" não estão nessa lista. Eles são meio que o pacote do WordPress, não algo que eu pedi.

E tem um detalhe do meu fluxo que muda tudo: **meus posts já são arquivos Markdown.** Eu escrevo no editor, no terminal, versionado. O post do servidor comprometido nasceu como `servidor-comprometido-wordpress-webshell.md`. Pra publicar no WordPress, eu teria que colar isso no editor de blocos, ou instalar um plugin de Markdown, e rezar pra formatação do bloco de código não quebrar.

Ou seja: eu ia adicionar uma camada de trabalho pra *converter* o que eu já tenho pronto num formato que o WordPress entende. Isso é o contrário de tirar atrito.

## O elefante: superfície de ataque

Aí tem o assunto do meu próprio primeiro post.

WordPress é PHP + MySQL + um ecossistema de plugins de qualidade variável. É a plataforma mais atacada da web justamente porque é a mais usada — tem bot varrendo a internet inteira atrás de `/wp-login.php` e de plugins com CVE conhecido. Eu sei disso não da teoria: eu limpei web shell na unha às duas da manhã.

Manter um WordPress seguro é trabalho contínuo: update de core, update de plugin, backup, hardening, monitorar log. Trabalho que eu *toparia* fazer por um cliente que paga. Pro meu blog pessoal de texto? É manutenção que eu estaria assinando embaixo à toa.

Um site estático não tem nada disso pra invadir. Não tem banco, não tem PHP rodando, não tem painel de admin exposto. É HTML e CSS servidos de um CDN. A superfície de ataque de um blog que fala sobre servidor invadido cair pra praticamente zero é, no mínimo, coerente.

## WordPress x site estático, pro meu caso

| Critério | WordPress | Site estático |
|---|---|---|
| Meus posts já em `.md` | Preciso converter | É o formato nativo |
| Segurança | Manutenção contínua | Quase nada pra atacar |
| Performance / custo | Precisa cache, hospedagem boa | Rápido e de graça num CDN |
| Publicar sem código | Fácil, pelo painel | `git push` |
| Comentários / newsletter | Já vem junto | Serviço externo plugado |
| Controle do visual | Tema + customização | 100% meu HTML e CSS |

Não existe resposta universal nessa tabela. Se eu fosse alguém que não mexe com terminal e quer clicar pra publicar, o WordPress ganharia fácil. A questão é que esse não é o meu caso — e eu quase fui no fluxo só porque era o caminho que todo mundo assume.

As duas linhas onde o estático "perde" — publicar exige `git push`, e comentários/newsletter são serviço à parte — pra mim não pesam. `git push` é o que eu faço o dia inteiro. E comentário eu resolvo depois com algo como o Giscus, que usa as discussões do próprio GitHub.

## O que eu escolhi

Fui de **Astro**. É um gerador de site estático moderno, me dá controle total do HTML e do CSS — o que mata de vez a preocupação de "ser cópia do tema de alguém", porque o visual é escrito por mim — e tem uma sacada que fechou pra mim: o syntax highlighting dos blocos de código já vem embutido, usando o **Shiki**, que é o mesmo motor de coloração do VS Code. Pra um blog onde metade do conteúdo é comando de terminal e trecho de código, bloco de código bonito não é detalhe, é metade do produto.

A melhor parte: a pasta `posts/` que eu já tinha continua exatamente onde estava. O Astro só passou a ler dela. Os mesmos arquivos `.md` que eu ia ter que converter pro WordPress são, agora, o blog inteiro. Cada post é um arquivo. Cada arquivo no git. Publicar é dar push.

E o `find` que eu usei pra caçar web shell no post anterior?

```bash
find /home -path "*/wp-content/uploads/*.php" 2>/dev/null
```

Nesse blog ele não retorna nada. Não porque eu limpei — porque não existe `wp-content` pra ter.

## O que fica

Nenhuma ferramenta é melhor que a outra no vácuo. WordPress move uma fatia gigante da web e faz isso bem pra quem precisa do que ele oferece. O erro não é escolher WordPress — o erro é escolher qualquer coisa no automático, porque "é assim que se faz", sem checar se bate com como você realmente trabalha e com o que você realmente precisa defender.

Eu quase fiz isso. Me salvou ter um primeiro post que era, literalmente, sobre o custo de rodar um WordPress que você não consegue manter.

Dois princípios que levo daqui:

1. **A ferramenta tem que casar com o seu fluxo, não o contrário.** Se eu já escrevo em Markdown versionado, a plataforma deveria abraçar isso — não me obrigar a converter.
2. **Escolha pensando no que você vai ter que defender.** Todo sistema que você sobe é superfície de ataque e superfície de manutenção. A pergunta não é só "isso resolve?", é "eu quero ser responsável por isso pelos próximos anos?".

O blog que você está lendo agora é a resposta que eu dei. HTML estático, servido de um CDN, escrito em arquivos `.md` que moram num repositório git. Sem painel. Sem banco. Sem `/wp-login.php` pra alguém bater às duas da manhã.
