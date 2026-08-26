---
title: "Eu Construí 4 Agentes de IA Que Cuidam da Minha Vida Financeira, Acadêmica e Código — Com Uma VPS de 9 Dólares"
description: "A jornada real de instalar o Hermes Agent, criar 4 perfis, conectar bots no Telegram e orquestrar a comunicação entre eles via Kanban. Não é tutorial — é o raciocínio e o que aprendi."
date: 2026-05-27
category: "Programação"
tags: ["ia", "agentes"]
draft: true
---

Eram 2 da manhã de uma terça-feira. Eu estava com o terminal aberto, um copo de café do lado, finalizando a configuração do quarto bot do Telegram. Quando mandei "oi" e ele respondeu, eu ri sozinho.

Não porque foi difícil — foi o oposto. O mais difícil foi decidir parar.

O que começou como "vou testar esse negócio de agente de IA" virou um ecossistema com 4 agentes autônomos rodando numa VPS de 9 dólares na Alemanha, cada um com seu bot do Telegram, sua personalidade e sua função. Um cuida do meu orçamento. Outro analisa investimentos. Um terceiro gerencia minha vida acadêmica — documentos, atas, checklist do MEC. O quarto programa sozinho.

Nenhum é um chatbot. Eles não ficam esperando eu mandar mensagem. Eles rodam 24 horas por dia, acordam com tarefas agendadas, se comunicam entre si via um quadro Kanban compartilhado, e aprendem coisas novas a cada interação.

Eu não contratei uma equipe. Eu instalei um software open source chamado Hermes Agent.

E esse artigo é sobre como isso funciona de verdade — não o tutorial, mas a lógica por trás.

---

## A Diferença Entre um Chatbot e um Agente

Um chatbot responde. Você pergunta, ele devolve texto.

Um agente **age**. Ele lê arquivos, escreve código, consulta APIs, atualiza bancos de dados, agenda tarefas, envia mensagens quando algo importante acontece.

A diferença não é cosmética. É arquitetural.

| Chatbot | Agente |
|---|---|
| Sessão única, sem memória entre conversas | Memória persistente em 3 camadas (sessão, usuário, skills) |
| Prompt fixo ou system prompt estático | Skills que evoluem — o agente cria e melhora as próprias instruções |
| Não executa código | Executa Python, bash, chama APIs, acessa bancos |
| Responde e esquece | Agenda, monitora, notifica proativamente |
| Um modelo, uma conversa | Orquestra múltiplos modelos e ferramentas simultaneamente |

O Hermes Agent, desenvolvido pela Nous Research, é a segunda categoria. E é open source, licença MIT.

---

## 4 Perfis, 4 Cérebros, 1 Máquina

A sacada arquitetural do Hermes é o conceito de **perfis**. Cada perfil é um agente independente com:

- Seu próprio diretório de configuração (`~/.hermes/profiles/<nome>/`)
- Seu próprio bot do Telegram (token diferente)
- Suas próprias skills (instruções de como agir)
- Sua própria memória (SQLite + FTS5 para busca textual)
- Sua própria escolha de modelo (DeepSeek, Claude, GPT — por perfil)

Na prática, é como ter 4 computadores diferentes dentro da mesma VPS:

```
VPS (Hetzner CX32 — 4 vCPU, 8GB RAM)
├── Perfil Financeiro  → @HermesFinBot    (DeepSeek V4 Pro)
├── Perfil Trader      → @HermesTradeBot  (DeepSeek V4 Pro)
├── Perfil Coordenador → @HermesCoordBot  (DeepSeek V4 Pro)
└── Perfil Dev         → @HermesDevBot    (Claude Sonnet 4)
```

Cada perfil tem um **gateway** — um processo systemd que conecta o bot do Telegram ao modelo de IA. São 4 serviços rodando em paralelo, cada um escutando seu próprio bot:

```bash
systemctl status hermes-gateway-financeiro.service
systemctl status hermes-gateway-trader.service
systemctl status hermes-gateway-coordenador.service
systemctl status hermes-gateway-dev.service
```

---

## Skills: A Peça Que Faltava

A maioria das pessoas para em "configurei o bot, ele responde". Mas a diferença entre um bot que faz conversa fiada e um que resolve problemas reais está nas **skills**.

Skills são arquivos Markdown com frontmatter YAML que ensinam o agente a executar tarefas específicas. Não é prompt engineering — é um sistema de arquivos que o agente consulta em tempo real.

Exemplo real, a skill MEC do perfil coordenador:

```yaml
---
name: mec
description: "Checklist e Simulação MEC/INEP — preparação para visita de avaliação externa"
metadata:
  hermes:
    tags: [academico, mec, avaliacao, inep]
---

# Checklist MEC / INEP

## Comandos Telegram
/mec — Resumo do checklist com semáforo
/mec_urgentes — Itens vermelhos
/mec_simular — Gera pergunta de avaliador
/mec_atualizar <id> <status> — Atualiza item

## Banco de dados
SQLite em ~/.hermes-ecosystem/hermes.db
Tabelas: mec_dimensions (3), mec_items (48)
```

Quando eu digito `/mec` no Telegram, o agente não está "programado" pra isso — ele **lê a skill**, entende o contexto, executa o código Python que consulta o banco, e formata a resposta com os 48 itens do instrumento INEP organizados em semáforo (verde/amarelo/vermelho).

A skill diz **o que** fazer. O código Python diz **como**. O modelo de IA decide **quando** e **por que**.

Isso é fundamentalmente diferente de um chatbot com prompt fixo.

---

## Comunicação Entre Agentes: Kanban, Não Chat

Os perfis não ficam se mandando mensagem no Telegram. Isso seria caótico e frágil.

Em vez disso, eles compartilham um banco SQLite com um quadro Kanban. Quando o perfil financeiro fecha o mês e detecta R$2.000 disponíveis para investir, ele não manda mensagem pro trader. Ele cria uma **tarefa**:

```json
{
  "title": "Capital novo para investimentos",
  "assigned_to": "trader",
  "created_by": "financeiro",
  "data": {
    "amount_brl": 2000.00,
    "source": "fechamento_mensal_maio_2026"
  }
}
```

O trader, na próxima execução do cron, consulta tarefas atribuídas a ele, encontra essa, e age: distribui o capital entre as classes de ativo abaixo da alocação alvo, executa as compras de crypto (automático) e envia os sinais de ações e FIIs (semi-automático).

Isso é um sistema multi-agente real. Sem webhook, sem fila de mensageria, sem Kubernetes. SQLite e um padrão de tarefas bem definido.

---

## O Perfil Dev: Agente Que Programa

O mais ambicioso dos 4 é o perfil dev. Ele não escreve código — ele **orquestra quem escreve**.

O fluxo é um pipeline de 5 fases:

1. **Planning** — lê o CLAUDE.md do projeto, mapeia código existente, define sub-tarefas
2. **Implementation** — cria branch, abre sessão tmux, lança Claude Code, envia instruções
3. **Testing** — roda pytest e ruff, verifica regressões
4. **Review** — compila diff, revisa padrões (type hints, docstrings, secrets), notifica via Telegram
5. **Merge** — cria PR via gh CLI, squash-merge, deleta branch, atualiza a documentação

O coordenador pede "preciso de um script pra extrair dados do Censo INEP". O dev planeja, implementa, testa, revisa e entrega. Tudo que eu faço é aprovar o plano inicial e autorizar o merge.

---

## O Que Eu Aprendi Montando Isso

### 1. VPS é o ambiente natural de agentes de IA

Agente desligado não serve pra nada. Uma VPS de 9 dólares resolve. Hetzner CX32, Ubuntu 24.04, 4 vCPU, 8GB RAM. Suficiente para 4 agentes rodando simultaneamente com folga.

Hardening básico: SSH com chave (nunca senha), porta não-padrão, UFW, fail2ban. Feito em 15 minutos.

### 2. DeepSeek V4 Pro é o melhor custo-benefício atual

Para tarefas que não exigem raciocínio complexo (categorizar gastos, gerar documentos, atualizar checklist), o DeepSeek V4 Pro entrega qualidade equivalente a modelos 5x mais caros. A API é compatível com o formato OpenAI — trocar de provider é uma linha de config.

Para o perfil dev, que precisa de raciocínio de arquitetura profundo, uso Claude Sonnet 4. Cada perfil com o modelo certo para sua função.

### 3. Skills > Prompts

Gastei zero tempo fazendo prompt engineering. As skills são instruções vivas — o agente as consulta, as melhora com feedback, e cria novas quando encontra padrões repetidos.

O perfil coordenador começou com uma skill MEC. Depois de duas semanas de uso, ele mesmo sugeriu e criou skills para gerar atas de reunião e simular perguntas de avaliador.

### 4. Comece pequeno, expanda com uso real

Meu erro inicial foi querer planejar tudo antes de usar. Passei horas desenhando arquitetura no CLAUDE.md. O que realmente funcionou foi: colocar um bot no ar, usar por uma semana, e só então escrever o código de apoio para o que o bot não conseguia fazer sozinho.

O perfil financeiro operou por dias sem uma linha de código Python de backend — só a skill e o modelo. Quando precisei de categorização automática e projeção de fluxo de caixa, aí sim escrevi os módulos.

---

## O Que Vem Por Aí

O ecossistema base está pronto. Os próximos passos:

- **MCP (Model Context Protocol):** Conectar os agentes a Google Drive, GitHub, PostgreSQL. Isso elimina a necessidade de código glue para APIs externas.
- **Cron jobs:** Fechamento mensal automático, análise de portfolio diária, alertas de vencimento
- **Paper trading → produção:** O trader está em sandbox. Precisa de 14 dias de paper trading consistente antes de operar com dinheiro real.
- **Dashboard público:** Hoje o dashboard web é acessível só via túnel SSH. Avaliar expor com autenticação para acesso remoto.

Nada disso é urgente. O sistema já está me atendendo.

---

Se você quer montar algo parecido, o roteiro é: alugue uma VPS, instale o Hermes Agent, crie um perfil, conecte um bot do Telegram. Faça isso funcionar com UMA coisa útil antes de pensar em arquitetura de multi-agente.

O resto vem com o uso.
