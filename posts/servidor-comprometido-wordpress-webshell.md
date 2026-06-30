---
title: "Meu Servidor Foi Comprometido: Como Descobri, Limpei e o Que Aprendi"
description: "Um email da Hetzner às 2 da manhã, 57 web shells na pasta de uploads e um backdoor escondido dentro de um .png. O passo a passo real de como achei e limpei um WordPress invadido."
date: 2026-06-26
category: "Infra"
tags: ["infra", "segurança"]
---

O email chegou quase 2 da manhã — mas eu só fui ver quando acordei. Remetente: `abuse@hetzner.com`. Assunto: relatório de abuso sobre meu IP.

Primeira reação? Aquela sensação no estômago de quem sabe que alguma coisa está muito errada.

O email dizia que meu servidor VPS na Alemanha estava sendo usado para atacar sites WordPress de terceiros via força bruta em `/wp-login.php`. Não um ataque. Quatro relatórios em menos de 12 horas, todos automatizados, todos com o mesmo padrão:

```
POST /wp-login.php HTTP/1.0 200 16509
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

A Hetzner bloqueou o IP. Meu servidor estava fora do ar.

---

## O Que Estava Rodando Nessa Máquina

Antes de entrar em pânico, é importante entender o contexto. Essa VPS não era só o meu projeto pessoal — era um servidor de hospedagem compartilhada com CyberPanel + OpenLiteSpeed, onde eu hospedava sites de clientes e amigos. Entre eles, vários WordPress.

Stack do servidor:
- CyberPanel (painel de hospedagem)
- OpenLiteSpeed (web server)
- MariaDB + PHP
- Redis
- Node.js / PM2 (para meus projetos)
- n8n (automação)

Doze instalações de WordPress ativas. Variando de sites bem mantidos a outros que não viam uma atualização desde 2023.

---

## Passo 1: Contenção Imediata

Antes de investigar qualquer coisa, a prioridade é parar o dano. Enquanto meu servidor continua atacando outros, a situação só piora.

```bash
# Derruba toda conexão de saída em HTTP (80) e HTTPS (443) — corta o ataque na
# hora sem desligar a máquina; serviços internos continuam de pé.
iptables -I OUTPUT -p tcp --dport 80 -j DROP
iptables -I OUTPUT -p tcp --dport 443 -j DROP
```

Isso bloqueou toda saída HTTP/HTTPS. O servidor continuou funcionando internamente, mas os ataques pararam imediatamente.

**Importante:** isso é um curativo, não uma solução. Se você tirar essas regras sem encontrar e remover o malware, os ataques voltam em segundos.

---

## Passo 2: Identificar o Processo Malicioso

O instinto natural é rodar `ps aux` e procurar algum processo estranho consumindo CPU. No meu caso:

```bash
# Top 20 processos por uso de CPU — minerador escondido costuma se entregar aqui.
ps aux --sort=-%cpu | head -20
# Conexões de rede ativas e o processo dono de cada uma (-p).
ss -tupn
```

O que encontrei foram apenas processos legítimos: LiteSpeed, MariaDB, Redis, PHP, Node, netdata, PM2. Nenhum processo `bot`, `scanner` ou minerador rodando na raiz.

Isso descartou a hipótese de comprometimento do sistema operacional. O atacante não tinha acesso root — ele estava operando dentro do PHP.

**A conclusão:** o ataque não vinha de um binário malicioso no sistema. Vinha de um **web shell PHP** dentro de um site WordPress comprometido.

---

## Passo 3: Encontrar o WordPress Comprometido

Com 12 instalações de WordPress no servidor, precisava encontrar qual foi comprometida.

```bash
# Acha cada instalação de WordPress pelo wp-config.php, que fica na raiz de cada uma.
find /home -name "wp-config.php" 2>/dev/null
```

Retornou 11 instalações ativas. Agora, a busca por web shells clássicos:

```bash
# Varre os .php atrás de assinaturas clássicas de web shell.
# -r recursivo, -l mostra só o arquivo que casa; o \| separa as alternativas.
grep -rl "eval(base64_decode\|system(\$_REQUEST\|exec(\$_POST\|passthru(\$_" \
  /home/ --include="*.php" 2>/dev/null
```

Resultado: vazio. O atacante era mais sofisticado do que isso.

A próxima pista veio dos arquivos PHP modificados recentemente — comparando com a data do `wp-config.php` como referência:

```bash
# Lista .php alterados nas últimas 48h (-mtime -2) — pega o que o atacante mexeu há pouco.
find /home -name "*.php" -mtime -2 -ls 2>/dev/null | head -30
```

E o grande achado — PHP files dentro da pasta `uploads`:

```bash
# Procura .php dentro de uploads — pasta de mídia que JAMAIS deveria executar código.
find /home -path "*/wp-content/uploads/*.php" 2>/dev/null
```

Resultado: **57 arquivos PHP** dentro da pasta `wp-content/uploads/mailpoet/cache/` de um dos sites hospedados.

Todos com nomes de hash aleatório como `a605f3c8765785c6f4f100bba.php`.

Encontrei o culpado.

---

## Por Que a Pasta `uploads`?

A pasta `wp-content/uploads` do WordPress deve conter apenas mídia: imagens, PDFs, vídeos. Nunca arquivos PHP executáveis.

O problema é que muitos servidores mal configurados permitem execução de PHP em qualquer diretório. O atacante sabe disso e usa a pasta de uploads como alvo preferencial porque:

1. É sempre gravável pelo processo PHP
2. Frequentemente não tem proteção contra execução de scripts
3. Backups automáticos às vezes ignoram ou não escaneiam essa pasta
4. Antivírus e scanners de segurança raramente chegam lá

---

## A Porta de Entrada: WP File Manager

Verificando os logs de acesso do site comprometido no horário do ataque (02h da madrugada):

```
[ATACANTE] - [08/May/2026:02:01:07] "GET /abcd.php HTTP/2" 404
[ATACANTE] - [08/May/2026:02:01:08] "GET /admin.php HTTP/2" 404
[ATACANTE] - [08/May/2026:02:01:09] "GET /akc.php HTTP/2" 404
...
[MEU-SERVIDOR] - [08/May/2026:02:01:18] "POST /wp-cron.php?doing_wp_cron=... HTTP/2" 200
```

O IP externo estava varrendo o site procurando shells por nome — padrão clássico de um atacante verificando os arquivos que ele próprio acabou de fazer upload.

Analisando os plugins instalados, encontrei o culpado imediato: **WP File Manager**.

Esse plugin teve a CVE-2020-25213 — uma vulnerabilidade crítica (CVSS 10.0) que permite upload de arquivos arbitrários **sem autenticação**. Qualquer pessoa na internet pode fazer upload de um arquivo PHP para dentro do seu WordPress sem precisar de login.

O site estava rodando WordPress 6.7.5 com dezenas de plugins desatualizados. O WP File Manager estava lá, vulnerável, esperando.

---

## O Backdoor: Três Camadas de Camuflagem

Depois de remover os 57 shells da pasta uploads, pensei que havia terminado. Mas ao buscar por arquivos PHP modificados recentemente fora da pasta de uploads:

```bash
# Caça o backdoor FORA de uploads: .php mais novos que o wp-config (-newer),
# pulando a pasta uploads que já tínhamos limpado (-path ... -prune -o).
find /home/site-comprometido/public_html/wp-content/ \
  -path "*/uploads/*" -prune -o \
  -name "*.php" -newer /home/site-comprometido/public_html/wp-config.php \
  -print 2>/dev/null
```

Apareceu um plugin que não estava na lista antes: `/wp-content/plugins/achuchytha/achuchytha.php`.

O header do plugin tentava parecer legítimo:

```php
/**
 * Plugin Name: Achuchytha
 * Plugin URI: https://numult.biz/achuchytha
 * Description: Predictions before therapists, speech therapists...
 * Version: 2.12.7
 * Author: Lon Kelley
 */
```

Mas o código logo abaixo revelava o que realmente era:

```php
$uworoba = __DIR__ . '/wudydof.txt';
if (file_exists($uworoba)) {
    include_once __DIR__ . "/wud" . "ydof." . "txt";
}
```

**Camada 1:** Um plugin falso com nome e descrição aleatórios para passar despercebido na listagem de plugins.

**Camada 2:** O código real estava num arquivo `.txt` — não `.php` — para escapar de scans que procuram PHP malicioso apenas em arquivos `.php`.

O conteúdo do `wudydof.txt` era código PHP pesadamente ofuscado com nomes de função em nonsense gerado aleatoriamente, usando `strtr` + `base64_decode` para descriptografar strings em tempo de execução.

**Camada 3:** No final do arquivo ofuscado:

```php
$asisosi = jucuby_chekhecy(
    __DIR__ . "/ass" . "ets/im" . "ages" . "/keh" . "ejy.pn" . "g"
);
if ($asisosi) {
    @eval($asisosi);
}
```

O payload final estava escondido dentro de um arquivo **`.png`** (`kehejy.png`). O arquivo parecia uma imagem corrompida para qualquer inspeção visual, mas na verdade continha PHP puro que era lido, decodificado e executado via `eval()`.

Três camadas: **plugin falso → arquivo .txt → payload em .png**. Sofisticado o suficiente para passar por scanners automáticos.

---

## A Limpeza

Com o diagnóstico completo, a limpeza foi direta:

```bash
# 1. Remover todos os shells da pasta uploads
find /home/site-comprometido/public_html/wp-content/uploads/ \
  -name "*.php" -delete

# 2. Bloquear execução de PHP em uploads permanentemente
cat > /home/site-comprometido/public_html/wp-content/uploads/.htaccess << 'EOF'
<Files *.php>
  deny from all
</Files>
<Files *.phtml>
  deny from all
</Files>
EOF

# 3. Remover o plugin malicioso
rm -rf /home/site-comprometido/public_html/wp-content/plugins/achuchytha/

# 4. Remover a porta de entrada
rm -rf /home/site-comprometido/public_html/wp-content/plugins/wp-file-manager/

# 5. Verificar usuários admin suspeitos no banco
mysql -u DB_USER -p'DB_PASS' DB_NAME -e "
  SELECT u.user_login, u.user_email, m.meta_value
  FROM wp_users u
  JOIN wp_usermeta m ON u.ID = m.user_id
  WHERE m.meta_key = 'wp_capabilities'
  AND m.meta_value LIKE '%administrator%';
"

# 6. Revogar admins desnecessários (manter apenas o admin principal)
mysql -u DB_USER -p'DB_PASS' DB_NAME << 'SQL'
UPDATE wp_usermeta
SET meta_value = 'a:1:{s:10:"subscriber";b:1;}'
WHERE meta_key = 'wp_capabilities'
AND user_id IN (
  SELECT ID FROM wp_users WHERE user_login != 'administrador'
);
SQL
```

---

## Como Reportar para a Hetzner (ou qualquer provedor)

A Hetzner não quer resposta por email — quer um formulário preenchido pelo portal:

1. Acesse `robot.hetzner.com`
2. Ícone de usuário → **Support**
3. Em **Unlock**, selecione o ID do bloqueio (está no assunto do email de abuso)
4. Descreva o que aconteceu e o que foi feito para resolver

O texto que funcionou no meu caso (em inglês, como a Hetzner prefere):

> *The abuse reports were caused by a compromised WordPress installation hosted on this server. Root cause: WP File Manager plugin (CVE-2020-25213) allowed unauthenticated arbitrary file uploads. The attacker uploaded 57 PHP web shells to the wp-content/uploads directory and installed a malicious plugin as persistent backdoor. Actions taken: removed all web shells, removed the vulnerable plugin, added .htaccess blocking PHP execution in uploads, removed the backdoor plugin, revoked unauthorized admin accounts.*

---

## O Que Aprender com Isso

### Para quem hospeda WordPress de terceiros

**Você é responsável pelo que roda no seu servidor.** Se um site de cliente for comprometido, é seu IP que vai na lista negra, é você que recebe o email da Hetzner às 2 da manhã.

Antes de aceitar hospedar qualquer site:

- Defina um SLA mínimo de atualizações — plugins desatualizados são a causa número 1 de comprometimentos
- Bloqueie PHP em `wp-content/uploads` por padrão em todos os sites
- Monitore logs de acesso com alertas para padrões suspeitos

### Os plugins mais perigosos

Nunca instale esses plugins em produção sem entender o risco:

| Plugin | Risco |
|---|---|
| WP File Manager | CVE-2020-25213 — upload sem autenticação |
| Duplicator (versões antigas) | path traversal, LFI |
| Revolution Slider (versões antigas) | file upload arbitrário |
| TimThumb | execução remota de código |

### Bloqueio preventivo de PHP em uploads

Adicione isso a **todos** os seus sites WordPress hoje, mesmo que estejam saudáveis:

**Apache / LiteSpeed:**
```apache
# /wp-content/uploads/.htaccess
<Files *.php>
  deny from all
</Files>
<Files *.phtml>
  deny from all
</Files>
```

**Nginx:**
```nginx
location ~* /wp-content/uploads/.*\.php$ {
    deny all;
    return 403;
}
```

### Detectar web shells antecipadamente

Rode periodicamente em todos os sites que você hospeda:

```bash
# PHP em pastas que não deveriam ter PHP
find /var/www -path "*/uploads/*.php" 2>/dev/null
find /var/www -path "*/uploads/*.phtml" 2>/dev/null

# PHP escondido em outros formatos
grep -rl "<?php" /var/www/ --include="*.txt" 2>/dev/null
grep -rl "<?php" /var/www/ --include="*.png" 2>/dev/null
grep -rl "<?php" /var/www/ --include="*.jpg" 2>/dev/null

# eval com variáveis de request (web shell clássico)
grep -rl "eval(\$_\|eval(base64\|system(\$_REQUEST" \
  /var/www/ --include="*.php" 2>/dev/null
```

### Monitorar tráfego de saída

Se o seu servidor não deveria fazer requisições HTTP para IPs externos, comece registrando o que sai — assim você conhece o tráfego normal antes de cortar nada:

```bash
# Registra (não bloqueia) cada conexão de saída em HTTP/HTTPS no log do kernel.
# É o alarme que denuncia um servidor sequestrado mandando POST pra fora.
iptables -I OUTPUT -p tcp --dport 80 -j LOG --log-prefix "OUTBOUND-HTTP: "
iptables -I OUTPUT -p tcp --dport 443 -j LOG --log-prefix "OUTBOUND-HTTPS: "
```

Depois de confirmar o que é tráfego legítimo, troque `-j LOG` por `-j DROP` nessas mesmas regras para bloquear a saída de fato.

---

## Linha do Tempo do Incidente

| Horário | Evento |
|---|---|
| ~02:00 de 08/05 | Atacante explora o WP File Manager e faz upload dos 57 shells |
| 02:01 de 08/05 | Atacante varre o site confirmando os shells instalados |
| 02:01 de 08/05 | Servidor começa os ataques de força bruta contra WordPress de terceiros |
| 14:42 de 08/05 | Primeira notificação de abuso da Hetzner |
| 18:33 de 08/05 | Segunda notificação — ataques continuam |
| 22:34 de 08/05 | Terceira notificação |
| ~01:50 de 09/05 | Quarta notificação e email de bloqueio; IP suspenso, servidor fora do ar (eu dormindo) |
| ~08:00 de 09/05 | Acordo e vejo o email da Hetzner |
| 08:15 de 09/05 | Contenção: bloqueio de toda a saída HTTP/HTTPS |
| 08:30 de 09/05 | Início da investigação |
| 09:05 de 09/05 | Shells identificados em `wp-content/uploads/` |
| 09:11 de 09/05 | Plugin `achuchytha` identificado e analisado |
| ~14:00 de 09/05 | Limpeza completa — unlock request enviado à Hetzner |

---

## Conclusão

O mais assustador nesse incidente não foi a invasão em si — foi a sofisticação do malware. Três camadas de camuflagem (plugin falso → arquivo .txt → payload em .png), nomes de função gerados aleatoriamente, tudo para escapar de scans automáticos.

Esses ataques são automatizados e em escala. Alguém varre a internet inteira procurando por WP File Manager vulnerável, explora em segundos, instala o backdoor e segue para o próximo alvo. Seu servidor é só um nó na botnet deles.

A defesa é simples, mas exige disciplina:

1. **Atualize plugins.** Sempre. Sem exceção.
2. **Bloqueie PHP em uploads.** Não existe motivo legítimo para PHP executável nessa pasta.
3. **Monitore logs de saída.** Seu servidor não deveria estar fazendo POST em sites que você não conhece.
4. **Não hospede sites que você não consegue manter.** O problema foi um site que eu estava hospedando há meses sem manutenção. O custo foi meu.

---

*Se esse artigo te ajudou, compartilha. Se você passou por algo parecido e quer trocar ideia, me manda mensagem.*
