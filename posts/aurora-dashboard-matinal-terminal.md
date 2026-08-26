---
title: "Cansei de Acordar e Pegar o Celular — Então Botei o Meu Dia Dentro do Terminal"
description: "Vi umas TUIs bonitas de dashboard e quis um ritual matinal diferente: abrir o terminal e já ter o panorama do dia. O post é sobre a única decisão que importava de verdade — qual stack — e por que a resposta óbvia (a mais bonita) não era a certa pra mim."
date: 2026-08-26
category: "Programação"
tags: ["tui", "python"]
---

Meu despertador toca e a primeira coisa que a mão faz, no automático, é procurar o celular. Aí já era: notificação puxa notificação, abro o banco "só pra ver o saldo", caio num grupo, e quando percebo já queimei vinte minutos e comecei o dia no ritmo de outra pessoa. Queria o contrário disso. Queria acordar, sentar, abrir uma coisa só e bater o olho: como está o dia, o que tem na agenda, o que está pendente, como andam as contas e os investimentos. Sem scroll, sem feed, sem alguém decidindo por mim o que eu vejo primeiro.

A faísca veio de umas TUIs — aplicações de terminal — que andei vendo. Uma mostrava carteira de investimentos direto no terminal, com tabelinha e variação do dia; outra era um dashboard inicial com relógio grande, coisas do GitHub, o essencial do dia. Bateu na hora: é *isso* que eu quero como ritual matinal. Não um app no celular, não mais uma aba no navegador. Uma tela no terminal, onde eu já passo o dia todo, que quando eu abro já está tudo ali, sincronizado, esperando.

O "o que eu quero" ficou claro rápido. O que exigia pensar era uma coisa só: **em que stack eu construo isso?**

---

## A pergunta que parecia de gosto e era de estratégia

As TUIs bonitas que me inspiraram são, quase todas, feitas em Rust com Ratatui ou em Go com Bubbletea. Então o instinto foi por aí: "vou aprender uma dessas, o resultado é lindo". E é mesmo. Se o critério fosse só o visual, Ratatui provavelmente ganha — as TUIs mais "premium" que você vê por aí saem dele.

Só que eu não domino Go nem Rust. Mexi de raspão num deles num pull request pra um projeto de terceiro, e só. Aprender do zero pra esse projeto teria um custo — e a pergunta certa não é "qual é a mais bonita", é "qual me leva ao dashboard **com dado real** mais rápido, sem me atrapalhar justo na parte difícil".

Porque tem uma parte difícil, e não é a tela.

---

## A tela é só a vitrine

O que aparece bonito na TUI é uma camada. O trabalho pesado é outro: logar na corretora, baixar extrato, raspar um PDF de fatura, bater numa API de calendário, chamar um LLM pra resumir. Isso é um *backend*, um punhado de robôs que rodam por baixo e alimentam a vitrine. E essas duas camadas nem precisam ser a mesma linguagem.

Aí está o detalhe que virou a decisão. Esse backend de automação — scraping, login em portal, leitura de PDF, orquestração de navegador, chamada de modelo — em quase todo caso se escreve em Python. É o ecossistema mais forte pra isso. E eu já faço exatamente esse tipo de coisa: no meu trabalho com notas fiscais, eu vivo de Playwright logando em portais chatos, de parse de documento, de LLM de visão resolvendo captcha. A parte "difícil" desse dashboard é, literalmente, a minha praia.

Ou seja: mesmo que eu fizesse a tela em Rust ou Go, eu escreveria os robôs em Python do lado de qualquer jeito. A escolha real não era "Python ou Rust". Era "uma linguagem só, ou duas?".

| Critério | Python + Textual | Go + Bubbletea | Rust + Ratatui |
|---|---|---|---|
| Já domino | Sim | Não | Não |
| Robôs / scraping / corretora | Ecossistema mais forte | Dá, mais pobre | Dá, mais trabalhoso |
| Plugar LLM | SDK nativo, já uso | Dá | Dá |
| Beleza da TUI | Muito boa | Muito boa | A mais "premium" |
| Velocidade de iterar | Altíssima | Alta | Compila devagar |
| Uma linguagem pro projeto todo | Sim | Provável Python do lado | Provável Python do lado |

O Textual — o framework de TUI do pessoal do Rich, em Python — mata o único argumento que faltava, o do visual. Ele estiliza com algo muito parecido com CSS (borda, padding, cor em hex), tem tema, e fica bonito de verdade. Não é o Ratatui, mas está longe de ser feio. Pro meu caso, a diferença de acabamento não paga o custo de fazer o projeto inteiro numa linguagem que eu não tenho na ponta dos dedos — e ainda ter que manter o Python do lado mesmo assim.

Fechei em **Python + Textual**. Não é a escolha mais hardcore. É a que me tira do zero e me leva ao dado real mais rápido, reaproveitando tudo que eu já sei fazer.

---

## O primeiro esqueleto

Numa tarde já tinha uma tela de pé: um cabeçalho com saudação por horário e relógio ao vivo, e quatro painéis num grid — agenda, pendências, GitHub e um bloco de investimentos e contas. Tema puxado pro Tokyo Night, que é o que eu já uso no terminal.

O que me importou não foi a tela em si, foi a arquitetura por trás dela. Cada painel não conhece a *fonte* do dado — conhece só um contrato. Existe um `Provider` com métodos como `agenda()`, `tasks()`, `portfolio()`, e cada um devolve uns objetos bem definidos. Hoje quem responde é um provider falso, com dados de exemplo (as pendências já são reais, lidas de um arquivo markdown que eu edito). Amanhã, ligar dado de verdade é escrever um provider novo — `google_calendar.py`, `corretora.py` — que devolve os mesmos objetos. A tela não muda uma linha.

Isso é de propósito. Eu não quero descobrir, lá na frente, que pra plugar a corretora tenho que reescrever o painel. A tela e os robôs ficam separados desde o primeiro commit.

---

## O que ainda é promessa

Sendo honesto: por enquanto é uma tela bonita com dado de mentira. O interessante do projeto ainda vai acontecer, e é o que eu quero contar nos próximos posts.

O primeiro passo é **sincronizar de verdade, sem eu alimentar nada** — um robô que loga na corretora e lê o extrato sozinho, no mesmo espírito do que eu já faço com portais de nota fiscal. É aqui que vai doer, e onde vai render história. Em cima disso entra a **camada de LLM**: não só mostrar o número, mas ter um "como estão meus investimentos?" que o modelo resume olhando a carteira e as contas do mês. Depois, o luxo de **abrir instantâneo** — sincronizar em segundo plano e a TUI só ler de um cache, pra que abrir de manhã seja imediato, não uma espera de rede. E, se sobrar fôlego, **filtrar os e-mails que importam**, o que realmente pede atenção, não a caixa de entrada inteira.

Se algum desses passos der errado de um jeito interessante — e login em corretora tem tudo pra dar —, vira post. É pra isso que eu documento enquanto faço.

Por ora fica a lição chata e útil: a decisão que parecia ser sobre gosto ("qual TUI é mais bonita") era sobre onde estava o trabalho de verdade. No dia em que eu percebi que a tela era a parte fácil, a stack se escolheu sozinha.

---

*Se esse artigo te ajudou, compartilha. Se você também está montando seu ritual matinal no terminal — ou brigou com essa mesma escolha de stack — me manda mensagem que eu quero ver.*
