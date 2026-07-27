# TEMPO REAL · MT

Site público de notícias de Mato Grosso, Cuiabá e Várzea Grande. Um robô varre as fontes a cada duas horas e nada com mais de 24 horas fica no ar.

Sem banco de dados, sem chave de API, sem servidor. Custo zero nos planos gratuitos.

## Como funciona

```
GitHub Actions (a cada 2h)
        ↓
scripts/varredura.mjs  →  lê os RSS, descarta o que passou de 24h
        ↓
dados/edicao.json      →  commit automático no repositório
        ↓
Vercel detecta o commit e republica
        ↓
index.html lê o JSON e mostra ao público
```

A página também recarrega o JSON sozinha a cada 5 minutos, então quem está com a aba aberta vê a edição nova sem apertar nada.

## Colocar no ar — 15 minutos

### 1. Subir para o GitHub

```bash
cd tempo-real-mt
git init
git add .
git commit -m "primeira versão"
git branch -M main
git remote add origin git@github.com:SEU-USUARIO/tempo-real-mt.git
git push -u origin main
```

### 2. Ligar o robô

No repositório: **Settings → Actions → General → Workflow permissions** → marque **Read and write permissions** → Save.

Sem isso o robô roda mas não consegue publicar o resultado.

Depois vá em **Actions → Varredura → Run workflow** para rodar a primeira vez na mão. Leia o log: ele diz, fonte por fonte, o que respondeu e o que falhou.

### 3. Publicar no Vercel

1. https://vercel.com/new
2. Import Git Repository → selecione o repositório
3. Framework Preset: **Other**
4. Deploy

A partir daí, cada varredura do robô gera um commit, e cada commit republica o site sozinho.

### 4. Domínio próprio

Settings → Domains. No registro.br:

| Tipo | Nome | Valor |
|---|---|---|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

## Ver no seu computador

Abrir o `index.html` com dois cliques **não funciona** — o navegador bloqueia a leitura de arquivo local por segurança. Use um servidor:

```bash
npx serve .
```

E abra o endereço que ele mostrar.

## O que já está verificado

Testei os endereços antes de entregar. Situação em 27/07/2026:

| Fonte | Situação |
|---|---|
| Agência Brasil — política, economia, justiça, geral | **conferido**, responde `application/rss+xml` |
| Google Notícias — 7 buscas (Cuiabá, VG, MT, agro, nacional) | **conferido**, formato e operadores validados |
| Governo de MT, ALMT, prefeituras de Cuiabá e VG | melhor esforço — se falhar, o robô segue |

As quatro primeiras linhas já garantem edição cheia no primeiro dia. As assessorias são bônus: se o RSS do órgão não existir, o Google Notícias já cobre o mesmo assunto e o log avisa com `aviso`, não com `FALHA`.

### O feed que ficou de fora de propósito

A Agência Brasil publica material das agências internacionais parceiras (Xinhua e Lusa) num feed separado, o `/rss/ultimasnoticias/parceiros/feed.xml`. Esse não pode ser republicado — e simplesmente não está na lista de fontes. O risco de licença é eliminado na origem, não no filtro. Ainda assim mantive a lista `BLOQUEIO` como segundo cinto de segurança.

### Sobre o Google Notícias

Duas características que definiram o desenho:

O link de cada item aponta para o `news.google.com`, que redireciona para o veículo — não é a URL direta do publicador. Para um painel de manchete com crédito isso é aceitável, e o nome do veículo vem junto no feed, então o crédito sai correto.

O feed traz material antigo se você deixar. Por isso toda busca leva o operador `when:1d`, que limita às últimas 24 horas. Sem ele, chega notícia de vários dias atrás.

Publicamos manchete, veículo e link. Nunca o texto. Isso é agregação com atribuição, que é diferente de republicar apuração alheia.

## O que esperar da primeira varredura

A edição deve vir cheia: Agência Brasil e Google Notícias são fontes estáveis e já estão conferidas. O que pode falhar são as quatro assessorias de MT, marcadas como opcionais — o log mostra `aviso` no lugar de `FALHA` e a varredura segue.

Se quiser corrigir uma delas: abra o site do órgão, procure o link de RSS no rodapé ou tente `/rss`, `/feed`, `/noticias/rss`, e troque a URL na lista `OFICIAIS` de `scripts/varredura.mjs`.

**Enquanto o robô não roda**, o site mostra a edição inicial que já vem no `dados/edicao.json` — 20 notícias reais, apuradas e escritas à mão, com fonte e link. Na primeira varredura bem-sucedida, ela é substituída.

Existe uma trava: se a varredura voltar vazia, o arquivo antigo é preservado. O site nunca fica em branco.

## Ajustar o ritmo

Em `.github/workflows/varredura.yml`:

```yaml
- cron: '0 */2 * * *'    # a cada 2 horas
- cron: '0 * * * *'      # a cada hora
- cron: '*/30 * * * *'   # a cada 30 minutos
```

Em `scripts/varredura.mjs`:

```js
const JANELA_HORAS = 24;   // quanto tempo a notícia fica no ar
const POR_FONTE = 12;      // quantos itens puxar de cada fonte
```

O cron do GitHub Actions costuma atrasar alguns minutos em horário de pico. Para notícia de duas em duas horas isso não faz diferença.

## Licenças — a parte que não pode errar

O robô só puxa de fontes que autorizam republicação:

- **Assessorias públicas** (Governo de MT, ALMT, TCE, TJ, MP, prefeituras) — release existe para ser publicado, e sai com crédito.
- **Agência Brasil** — republicação livre para uso jornalístico com crédito. **Atenção:** ela também publica material de agências internacionais parceiras, que não pode ser reproduzido. A lista `BLOQUEIO` descarta esses itens automaticamente.
- **Agência Câmara e Agência Senado** — reprodução com crédito.

Não incluí, de propósito, os portais concorrentes de MT. Republicar apuração deles, mesmo resumida, é aproveitamento de trabalho alheio — e em Cuiabá isso queima a marca rápido.

## Estrutura

```
tempo-real-mt/
├── index.html                        página pública
├── dados/edicao.json                 a edição no ar
├── scripts/varredura.mjs             o robô
├── .github/workflows/varredura.yml   o relógio (a cada 2h)
├── vercel.json                       cache e segurança
└── favicon.svg · robots.txt · sitemap.xml
```

## Antes de divulgar

- [ ] Trocar `SEU-DOMINIO.com.br` em `robots.txt` e `sitemap.xml`
- [ ] Trocar o e-mail de contato no User-Agent do robô (`scripts/varredura.mjs`)
- [ ] Conferir domínio no registro.br e marca no INPI (classes 38 e 41)
- [ ] Colocar página de expediente com CNPJ e responsável — exigência básica de veículo sério
