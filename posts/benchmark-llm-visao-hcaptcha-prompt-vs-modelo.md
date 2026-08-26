---
title: "Meu Benchmark de LLM Estava Medindo a Coisa Errada — e um Modelo de 3GB na GPU do Meu Filho Provou Isso"
description: "Fui procurar um LLM de visão mais barato que o Gemini pra resolver hCaptcha e descobri que meu benchmark media o dialeto do Gemini, não a capacidade dos modelos. Não é tutorial — é o raciocínio, os erros que quase publiquei e onde a coisa foi parar."
date: 2026-07-01
category: "Programação"
tags: ["ia", "llm"]
---

Apareceu um projeto na minha frente cujo maior obstáculo técnico era, de todos os problemas possíveis, um hCaptcha. Não vou entrar no que o projeto fazia — o que interessa aqui é o desafio em si, porque ele é bem mais rico do que parece.

hCaptcha é aquele "selecione todas as fotos com um ônibus", num grid 3x3. Parece bobo, mas é feito de propósito pra atrapalhar máquina: a ideia inteira dele é ser fácil pro humano e difícil pro bot. As imagens são geradas e distorcidas de propósito pra derrubar classificador, as categorias e os tipos de desafio ficam girando, e o token que você recebe ao resolver tem prazo curto de validade — você tem segundos, não minutos. É um problema de visão computacional de verdade, com relógio correndo. Resolver bem, hoje, basicamente exige um modelo de visão que *raciocine* sobre a imagem, não que decore.

A abordagem mais direta é jogar um LLM de visão forte no problema — tipo o Gemini 2.5 Flash — pra olhar o grid e devolver as células certas. Funciona. Mas uns dias atrás fiz um teste rápido com um modelo chinês obscuro, o Xiaomi MiMo, só por curiosidade — e ele *identificou* o desafio direitinho. Aquilo plantou uma pergunta chata na cabeça: será que existe um LLM de visão mais barato que o Gemini que resolva isso tão bem e tão rápido? E, quem sabe, um que eu consiga rodar na minha própria máquina, sem depender de nuvem?

Virou um estudo. E a pergunta prática logo deu lugar a outra, bem mais interessante, que é o que este post conta: **quanto do desempenho é o modelo, e quanto é o meu prompt estar calibrado pro Gemini sem eu perceber?**

Adianto o final: era o prompt. E a viagem até essa conclusão passou por dois erros meus que eu quase publiquei como verdade.

## Plugar sem forkar

O desafio de grid do hCaptcha é aquele "selecione todas as fotos com X", 3x3. Do ponto de vista do modelo de visão, a tarefa é: olhar a imagem e devolver quais das 9 células são a resposta. O resto — clicar, mover o mouse em curva bonita pra parecer humano — é orquestração de navegador, e não depende de qual modelo você usa.

Eu já uso uma biblioteca pronta pra essa orquestração toda. Em vez de forkar mil linhas dela pra trocar o modelo, reparei que ela cria o provider de visão num único método. Então eu monkeypatchei só aquele ponto pra rotear pelo prefixo do nome do modelo:

```
"gemini-2.5-flash"                → Gemini (comportamento original)
"openrouter:qwen/qwen3-vl-235b…"  → meu provider do OpenRouter
"local:qwen3-vl:8b"               → mesmo provider apontado pro Ollama local
```

Isso me deu um banco de provas onde eu troco o modelo com uma string, isolando exatamente o passo de visão. A métrica é dura de propósito: o hCaptcha exige o conjunto **exato** de células. Errou uma, o captcha falha. Nada de crédito parcial — ou o conjunto bate, ou não bate.

## A coisa que o benchmark realmente media

Os primeiros números foram um banho de água fria e um enigma ao mesmo tempo. O Qwen instruct, um modelo grande e competente, tirava 8%. Mas o padrão de erro era estranho: ele acertava a *região* e errava por uma célula. Não é assim que um modelo que "não enxerga" erra. É assim que erra quem não sabe a convenção.

Fui olhar o prompt que a biblioteca manda. Ele pede as células num campo chamado `box_2d`, usando índices `[0,0]` a `[2,2]` — e **nunca define** que aquilo é `[linha, coluna]`, nem onde fica a origem. O detalhe que muda tudo: `box_2d` é o campo nativo do Gemini pra caixas delimitadoras. O Gemini foi treinado nessa convenção. Ele "sabe" o que significa sem você explicar. Qualquer outro modelo tem que adivinhar.

Ou seja: eu não estava medindo "quão bem o modelo enxerga o grid". Estava medindo **quão bem ele fala o dialeto do Gemini**. O benchmark vinha viciado a favor da casa desde o começo, e eu não tinha visto.

## Antes de medir de novo, um gabarito de verdade

Tinha um segundo problema. A "resposta certa" de cada caso que eu usava de referência era a resposta que o próprio Gemini tinha dado quando capturei os desafios. Só que o Gemini não é determinístico nesses desafios difíceis — rodando de novo, ele concorda com ele mesmo só umas 75 a 90% das vezes. Eu estava, em parte, medindo "o modelo X concorda com o Gemini", não "o modelo X acertou".

Então sentei e rotulei os casos na mão. E no meio disso achei duas capturas quebradas — uma mostrava o texto de outro tipo de captcha, a outra tinha o enunciado em branco. Eram, não por acaso, exatamente os dois casos que *todo* modelo errava. Não eram difíceis. Eram lixo. Joguei fora e fiquei com dez casos sólidos, medidos contra um gabarito humano.

Também mudei a nota. Benchmark de LLM costuma somar dimensões numa média ponderada. Aqui isso não serve: precisão é pré-requisito (um solver 8% preciso é inútil por mais barato que seja) e latência é um portão físico (o token do hCaptcha tem prazo de validade — passar de um minuto reprova o solver de qualquer jeito). Então a nota virou multiplicativa: a precisão é o teto, velocidade e custo só modulam dentro dele. Um modelo impreciso ou lento não escapa da lanterna.

## O experimento: prompt do Gemini contra prompt neutro

Escrevi um prompt neutro. Ele define a grade na unha — 3 linhas por 3 colunas, `[linha, coluna]`, linha 0 no topo, coluna 0 na esquerda — sem depender do `box_2d` mágico. Mesmo formato de saída, só a explicação diferente. E rodei a matriz: cada modelo com o prompt antigo e com o neutro.

Aqui eu quase escrevi a primeira besteira. Na primeira versão do prompt neutro, os modelos fortes *pioraram*. Fiquei animado — "olha, o prompt neutro atrapalha o Gemini!" — até desconfiar de mim mesmo e olhar as respostas. Eles devolviam lista vazia justamente nos desafios do tipo "selecione a mesma categoria da imagem de referência". Meu prompt mandava "leia a categoria do enunciado", mas nesses casos a categoria está na miniatura de referência, não no texto. O bug era meu. Corrigi pra cobrir os dois tipos de enunciado e rodei de novo.

Com o prompt consertado, o resultado foi limpo e na direção da tese:

| modelo | prompt antigo (box_2d) | prompt neutro |
|---|---|---|
| gemini-2.5-flash | 90% | 100% |
| qwen3-vl-235b-thinking | 70% | 100% |
| glm-4.5v | 30% | 90% |
| xiaomi/mimo-v2.5 | 50% | 60% |
| qwen3-vl-235b-instruct | 0% | 40% |
| gpt-4o-mini | 0% | 10% |
| llama-4-scout | 0% | 0% |

O prompt neutro melhorou todo mundo. O Qwen thinking saltou de 70 pra 100, o GLM de 30 pra 90. Pra esses modelos, o buraco nunca foi capacidade de visão — era eu falando com eles no idioma errado.

## Rodar uma vez é anedota

Só que 100% em dez casos, num único run, com um modelo não-determinístico, pode ser sorte. Antes de acreditar em qualquer número, rodei cada modelo três vezes e olhei a média e o desvio. Foi a melhor decisão do estudo, porque o pódio mudou:

| modelo | acerto (média ± desvio) | latência | onde |
|---|---|---|---|
| gemini-2.5-flash | 100 ± 0 | 7,2s | nuvem |
| glm-4.5v | 100 ± 0 | 12,7s | nuvem |
| qwen3-vl:4b | 100 ± 0 | 25,3s | GPU local |
| qwen3-vl:8b | 100 ± 0 | 35,1s | GPU local |
| qwen3-vl-235b-thinking | 83,3 ± 5,8 | 14,8s | nuvem |

O qwen thinking, o tal que tinha "empatado o Gemini em 100%", na média é 83% e balança seis pontos. Aquele 100% era a ponta de cima da sorte. Se eu tivesse parado no primeiro run, teria publicado que ele empata o Gemini — falso. Ao mesmo tempo, o GLM, que num run deu 90%, nos três deu 100% cravado. Número sem barra de erro é anedota, e a barra de erro reescreveu o ranking.

## O custo que eu quase reportei pela metade

Fui medir o custo do Gemini por token e deu barato demais, uns oito décimos de milésimo de dólar por captcha. Não bateu com a fatura. Fui olhar o que a API devolve de contagem de tokens e achei o furo: o `gemini-2.5-flash` tem modo de raciocínio, e os tokens de pensamento vêm num campo separado, `thoughts_token_count`, que eu não estava somando. Numa chamada típica eram 73 tokens de resposta visível e 472 de pensamento — invisíveis na saída, mas cobrados como saída. Somando certo, o custo real é quase o triplo. A lição fica: em modelo com raciocínio, o que ele pensa não aparece na resposta, mas aparece na conta.

## Por que a família GPT foi tão mal

A surpresa desagradável do teste foram os GPT pequenos, gpt-4o-mini e gpt-4.1-nano, presos entre 0 e 10%. Desconfiei de duas causas e testei as duas.

A primeira: resolução. A OpenAI faz downsample da imagem por padrão, o que borraria um grid 3x3 cheio de detalhe. Forcei `detail: "high"` e rodei de novo. Não mudou nada. Hipótese descartada.

A segunda, que é a real: falta de raciocínio. Eu só tinha testado o andar de baixo da OpenAI, os modelos que não pensam. E a lição do Qwen já gritava a resposta — o mesmo modelo em versão instruct dava 8% e em versão thinking dava quase 100%. Indexar célula de grid é uma tarefa que se resolve raciocinando, e o tier mini não raciocina. Não é a visão que falta, é o pensar. Um GPT da linha de raciocínio provavelmente iria bem; fica pro próximo round.

## O ponto onde isso ficou divertido

Se um modelo aberto pode fazer o trabalho, a pergunta óbvia é: preciso mesmo da nuvem? O Qwen3-VL está no Ollama em versões de 2, 4 e 8 bilhões de parâmetros, e todas vêm com raciocínio. Peguei emprestada a máquina de jogo do meu filho — uma Radeon RX 9060 XT, 16GB, placa nova — instalei o Ollama e baixei o de 8B, uns 6GB.

Eu esperava briga com o suporte de GPU da AMD, que costuma ser dor de cabeça em placa recém-lançada. Mas o `ollama ps` mostrou "100% GPU" de primeira. A primeira chamada demorou 56 segundos e eu quase desanimei — era só o modelo carregando na memória de vídeo. Quente, o de 8B acertou os dez casos. Cem por cento, rodando de graça, na minha máquina, sem a imagem sair pra lugar nenhum.

Aí testei o de 4B, metade do tamanho. Também 100%, e mais rápido. E, rodando três vezes, os dois locais deram 100% cravado, desvio zero — enquanto o gigante de 235 bilhões de parâmetros da nuvem oscilava nos 83%. Um modelo trinta vezes menor, na GPU de um PC de jogo, foi *mais consistente* que o titã da nuvem. Isso há um ano seria piada.

E o de 2B? Aí bateu num paredão interessante. Dava pra ler o raciocínio dele acertando — "a referência é um avião, então a categoria é transporte" — mas ele nunca *terminava*. Raciocinava quinze mil tokens e nunca escrevia a resposta final. Tentei contexto maior, tentei desligar o raciocínio, não teve jeito: ele fala até estourar o limite e morre sem responder. A capacidade que separa o 2B do 4B, nesse caso, não é enxergar. É saber concluir. Um modelo pode ter a percepção certíssima e ser inútil por não conseguir fechar num resultado.

| tamanho | resultado |
|---|---|
| qwen3-vl:2b | não converge — raciocina sem fim e não responde |
| qwen3-vl:4b | 100%, o menor que funciona |
| qwen3-vl:8b | 100%, um pouco mais lento |

## Qual eu usaria

Não tem vencedor único; tem vencedor por eixo.

- Se o que pesa é velocidade, por causa do prazo do token: **Gemini 2.5 Flash**, 100% e o mais rápido.
- Se você quer uma alternativa aberta ao Google na nuvem, com a mesma precisão: **GLM-4.5v**.
- Se o que importa é privacidade, custo zero e não depender de API: **qwen3-vl:4b local**, que paga em latência o que economiza em conta e em mandar imagem pra fora.
- E eu deixaria de fora o qwen thinking (bom, mas balança e é o mais caro) e o tier mini de OpenAI e Llama, que não raciocinam e por isso não indexam grid.

## O que fica

O achado que mais me marcou não é sobre captcha. É que um benchmark pode estar medindo, sem você perceber, a **aderência ao dialeto do seu modelo de referência** — e não a capacidade que você jura estar medindo. Meu `box_2d` estava fazendo o Gemini parecer superior quando parte da vantagem dele era só falar a própria língua. Neutralizei o prompt e metade do gap evaporou.

Três coisas que levo daqui:

1. **Desconfie do resultado que te agrada.** Meu "prompt neutro atrapalha os fortes" era bug meu, e eu quase comemorei antes de checar. O resultado que confirma sua tese merece o mesmo ceticismo que o que a contraria.
2. **Rode mais de uma vez.** Dez casos e um run não são estatística, são sinal de viabilidade. A variância mudou o pódio do meu estudo — o "100%" de um modelo virou 83% na média.
3. **O custo mora onde você não olha.** Os tokens de raciocínio não aparecem na resposta, mas aparecem na fatura. Meça o que é cobrado, não o que é impresso.

Ficou faltando o que eu declaro como limitação honesta: são poucos casos, de um tipo só de desafio, e eu medi o passo de visão isolado — não subi o navegador pra ver o servidor aceitar o token de verdade. Isso é a próxima aventura. Mas a pergunta que abriu tudo já tem resposta: sim, dá pra trocar o Gemini — e, dependendo do que você valoriza, dá até pra tirar a nuvem da jogada e rodar na placa de vídeo que estava ali, jogando, faz cinco minutos.

---

*Se esse artigo te ajudou, compartilha. Se você também anda medindo LLM — principalmente se descobriu que estava medindo a coisa errada — me manda mensagem que eu quero ouvir essa história.*
