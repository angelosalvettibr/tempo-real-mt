// REDATOR — reescreve documento oficial em matéria própria, via Gemini Flash.
//
// Regra de ouro: só entra aqui texto de fonte que autoriza reprodução —
// Agência Brasil, Agência Câmara, Agência Senado e assessorias públicas.
// Nunca texto de veículo privado. O que os portais dão serve para saber o
// que é notícia; o texto vem sempre da fonte oficial.
//
// O modelo REESCREVE, não inventa: recebe o texto oficial e devolve outro
// texto com os mesmos fatos. Toda instrução abaixo existe para impedir que
// ele acrescente número, nome ou contexto que não estava no original.

const CHAVE = process.env.GEMINI_API_KEY || '';
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

export const temChave = () => CHAVE.length > 10;

// Em vez de adivinhar o nome do modelo, perguntamos ao Google quais existem
// para esta chave e escolhemos o melhor flash disponivel. Nome de modelo muda
// com o tempo; a lista da API nao mente.
let modeloBom = '';
let listaCache = null;

async function listarModelos(){
  if (listaCache) return listaCache;
  const r = await fetch(`${API}?key=${CHAVE}&pageSize=100`);
  if (!r.ok) throw new Error('listagem de modelos falhou: HTTP ' + r.status);
  const j = await r.json();
  listaCache = (j.models || [])
    .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map(m => String(m.name).replace(/^models\//, ''));
  return listaCache;
}

function escolher(nomes){
  const vivo = n => !/vision|embedding|aqa|image|tts|audio|live|thinking-exp/i.test(n);
  const flash = nomes.filter(n => /flash/i.test(n) && vivo(n));
  const ordem = [
    n => /^gemini-flash-latest$/.test(n),
    n => /^gemini-2\.5-flash$/.test(n),
    n => /^gemini-2\.0-flash$/.test(n),
    n => /flash-latest/.test(n),
    n => /flash/.test(n)
  ];
  for (const teste of ordem) { const achou = flash.find(teste); if (achou) return achou; }
  return nomes.find(vivo) || '';
}

export async function preparar(){
  const nomes = await listarModelos();
  modeloBom = escolher(nomes);
  definirReservas(nomes);
  return { escolhido: modeloBom, reservas: reservas.slice(0,3),
           disponiveis: nomes.filter(n=>/flash/i.test(n)).slice(0,8) };
}

async function chamarUmaVez(prompt, ms = 35000){
  if (!modeloBom) await preparar();
  if (!modeloBom) throw new Error('nenhum modelo disponivel para esta chave');

  // Primeira tentativa desliga o raciocinio (economiza token e evita resposta
  // cortada). Se a API reclamar do campo, tenta de novo sem ele.
  for (const comThinking of [true, false]) {
    const cfg = { temperature: 0.4, maxOutputTokens: 4000 };
    if (comThinking) cfg.thinkingConfig = { thinkingBudget: 0 };

    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try {
      const r = await fetch(`${API}/${modeloBom}:generateContent?key=${CHAVE}`, {
        method:'POST', signal:c.signal,
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }], generationConfig: cfg })
      });
      // Modelo que devolve 404 nao existe mais: descarta e passa ao proximo,
      // em vez de insistir com ele o resto da rodada.
      if (r.status === 404 && reservas.length) {
        console.log(`     modelo ${modeloBom} nao existe mais — descartando`);
        reservas = reservas.filter(n => n !== modeloBom);
        const proximo = reservas.shift();
        if (proximo) { modeloBom = proximo; continue; }
      }
      if (r.status === 400 && comThinking) continue;
      if (!r.ok) {
        // A resposta de erro do Google vem em JSON formatado, com quebras de
        // linha. Cortar os primeiros 120 caracteres mostrava so o comeco da
        // chave "error" e escondia justamente o motivo — foi por isso que o
        // log dizia apenas 'HTTP 400 { "error": { "code": 4'.
        const cru = await r.text();
        let motivo = cru.replace(/\s+/g, ' ').slice(0, 200);
        try { motivo = JSON.parse(cru)?.error?.message || motivo; } catch {}
        throw new Error(`${modeloBom}: HTTP ${r.status} — ${String(motivo).slice(0, 220)}`);
      }
      const j = await r.json();
      const txt = j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('') || '';
      if (!txt) throw new Error(`${modeloBom}: resposta vazia`);
      return txt;
    } finally { clearTimeout(t); }
  }
  throw new Error('falhou com e sem thinkingConfig');
}

export async function textoCompleto(url, ms = 12000){
  // "fetch failed" e queda de rede, nao pagina inexistente: uma segunda
  // tentativa resolve na maioria das vezes, e cada falha aqui custa uma
  // materia inteira que ja tinha documento oficial confirmado.
  let ultimo;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try { return await textoCompletoUmaVez(url, ms); }
    catch (e) {
      ultimo = e;
      if (!/fetch failed|network|ECONN|socket|timeout|aborted/i.test(String(e.message))) throw e;
      await new Promise(r => setTimeout(r, 2500));
    }
  }
  throw ultimo;
}

/* ------------------------------------------------------------- FOTO -----
   A foto sai da mesma pagina de onde ja tiramos o texto, entao nao custa
   requisicao nenhuma. Regra de disciplina, igual a do texto: so aproveitamos
   imagem de fonte que autoriza reproducao — release de orgao publico existe
   para ser republicado. De veiculo comercial nao pegamos nada.

   O cuidado que evita capa feia: muito orgao declara o LOGOTIPO do site como
   og:image, e nao a foto da materia. Descartamos o que tem cara de marca.  */

let ultimaFoto = null;
// A foto da ultima pagina lida. Guardada aqui para nao precisar mudar a
// assinatura de textoCompleto, que e chamada em varios lugares.
export const fotoDaUltima = () => ultimaFoto;

const CARA_DE_LOGO = /(logo|logotipo|marca|brasao|brasão|banner|favicon|icone|icon|selo|placeholder|default|padrao|sem-imagem|no-image|share|thumb-padrao)/i;

export function acharFoto(html, urlBase){
  const meta = (prop) =>
    html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + prop + '["\'][^>]+content=["\']([^"\']+)["\']', 'i'))?.[1]
    || html.match(new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\']' + prop + '["\']', 'i'))?.[1]
    || '';

  let src = meta('og:image') || meta('twitter:image') || '';

  // sem og: tenta a maior imagem dentro do corpo da materia
  if (!src) {
    const dentro = (html.match(/<article[\s\S]*?<\/article>/i)?.[0])
                || (html.match(/<main[\s\S]*?<\/main>/i)?.[0]) || '';
    src = [...dentro.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)]
      .map(m => m[1]).find(u => !CARA_DE_LOGO.test(u)) || '';
  }
  if (!src) return null;

  // endereco relativo vira absoluto
  try { src = new URL(src, urlBase).href; } catch { return null; }

  if (CARA_DE_LOGO.test(src)) return null;
  if (/\.svg(\?|$)/i.test(src)) return null;   // svg costuma ser marca

  // Onde a imagem MORA entrega muita coisa: brasao fica na estrutura do site,
  // foto de materia fica na pasta de conteudo enviado.
  const u = (() => { try { return new URL(src); } catch { return null; } })();
  if (!u) return null;
  const caminho = u.pathname.toLowerCase();
  const host = u.hostname.toLowerCase();

  // Pasta de estrutura do site, nao de conteudo enviado.
  if (/\/(tema|temas|assets|asset|layout|template|estatico|static|skin|css|design|institucional|identidade|thumbs|thumbnail|placeholder|padrao|default|generico)\//.test(caminho)) return null;

  // Arte padrao servida por CDN de repositorio de codigo. A Agencia Brasil usa
  // "cdn.jsdelivr.net/gh/.../assets-ebc/public/thumbs/thumb_1200x600_..." — o
  // nome nao tem "logo", a proporcao e larga, e numa rodada aparece uma vez
  // so, entao escapava dos tres filtros anteriores. Foto de materia nao mora
  // em repositorio de assets.
  if (/(jsdelivr\.net|raw\.githubusercontent\.com|githubusercontent|unpkg\.com|cdnjs)/.test(host)) return null;
  if (/thumb[_-]?\d{3,4}x\d{3,4}/.test(caminho)) return null;

  // Proporcao e o criterio mais confiavel: brasao e selo sao quadrados ou
  // verticais; foto de noticia e larga. Quando as dimensoes vem declaradas,
  // exigimos que seja mais larga que alta.
  const larg = Number(meta('og:image:width') || 0);
  const alt  = Number(meta('og:image:height') || 0);
  if (larg && larg < 400) return null;
  if (alt && alt < 220) return null;
  if (larg && alt && larg / alt < 1.15) return null;

  return {
    src,
    alt: (meta('og:image:alt') || '').slice(0, 180) || null,
    largura: larg || null,
    altura: alt || null
  };
}

async function textoCompletoUmaVez(url, ms = 12000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal:c.signal, redirect:'follow',
      headers:{ 'User-Agent':'Meridiano/1.0' }});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const html = await r.text();
    let corpo = (html.match(/<article[\s\S]*?<\/article>/i)?.[0])
      || (html.match(/<main[\s\S]*?<\/main>/i)?.[0]) || '';

    // Muita pagina de orgao publico monta o miolo por JavaScript e vem vazia.
    // Nesse caso juntamos os paragrafos soltos e a descricao do og.
    const soTexto = x => x.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    if (soTexto(corpo).length < 220) {
      const paras = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
        .map(m => soTexto(m[1])).filter(t => t.length > 45);
      const og = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] || '';
      const junto = [og, ...paras].filter(Boolean).join(' ');
      if (junto.length > soTexto(corpo).length) corpo = junto;
    }
    if (!corpo) corpo = html;
    ultimaFoto = acharFoto(html, url);
    return corpo
      .replace(/<script[\s\S]*?<\/script>/gi,' ')
      .replace(/<style[\s\S]*?<\/style>/gi,' ')
      .replace(/<[^>]+>/g,' ')
      .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
      .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/\s+/g,' ').trim().slice(0, 6000);
  } finally { clearTimeout(t); }
}

// Casca com paciencia: espera e tenta de novo no 429, e se insistir troca
// para o modelo de reserva pelo resto da rodada.
// Existem dois 429 muito diferentes, e tratar os dois igual foi meu erro:
//
//   VELOCIDADE  — pedidos demais por minuto. Passa sozinho. Vale esperar.
//   SEM CREDITO — a carteira zerou. NUNCA passa nesta rodada. Esperar aqui e
//                 so queimar o relogio: com paciencia de 37s por materia, o
//                 job do Actions estoura os 12 minutos antes de terminar.
//
// Entao: paciencia para o primeiro, desistencia imediata para o segundo. E um
// disjuntor geral — depois de tres recusas seguidas por falta de credito, nem
// tentamos mais, a rodada termina rapido e o log diz o porque.

const semCredito = m => /prepayment credits|credits are depleted|billing|quota exceeded for quota metric/i.test(String(m));
let carteiraVazia = false;
let seguidas = 0;

export const carteiraAcabou = () => carteiraVazia;

async function chamar(prompt, ms = 35000){
  if (carteiraVazia) throw new Error('sem credito na chave Gemini (rodada interrompida)');

  const espera = t => new Promise(r => setTimeout(r, t));
  let ultimo;

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const r = await chamarUmaVez(prompt, ms);
      seguidas = 0;
      return r;
    } catch (e) {
      ultimo = e;
      const msg = String(e.message);

      // 503 e o Gemini sobrecarregado do lado deles: passa em segundos.
      // 500 idem. Ambos merecem a mesma paciencia do limite de velocidade.
      const passageiro = /HTTP (429|500|503)/.test(msg);
      if (!passageiro) throw e;

      if (/HTTP 429/.test(msg) && semCredito(msg)) {
        if (++seguidas >= 3) {
          carteiraVazia = true;
          console.log('     SEM CREDITO na chave Gemini — interrompendo a rodada');
        }
        throw new Error('sem credito na chave Gemini');
      }

      // daqui pra baixo e sobrecarga ou limite de velocidade: vale esperar
      if (tentativa === 0) { await espera(/503|500/.test(msg) ? 4000 : 8000); continue; }
      const proxima = reservas.shift();
      if (!proxima) { await espera(15000); continue; }
      console.log(`     limite de velocidade, trocando para ${proxima}`);
      modeloBom = proxima;
      await espera(2000);
    }
  }
  throw ultimo;
}

const PROMPT = (fonte, titulo, texto) => `Você é redator de um veículo de notícias de Mato Grosso chamado MERIDIANO.

Reescreva a notícia abaixo com suas próprias palavras, para publicação no nosso site.

REGRAS QUE NÃO PODEM SER QUEBRADAS:
1. Use APENAS fatos que estão no texto original. Não acrescente nenhum dado, número, nome, data, cargo ou contexto que não esteja lá.
2. Se o texto original não diz algo, não diga. Nada de "especialistas afirmam", "segundo analistas", "a expectativa é".
3. Nenhum número pode ser alterado, arredondado ou estimado.
4. Não opine, não avalie, não conclua. Só relate.
5. Nomes próprios exatamente como no original.
6. Português do Brasil, tom seco de jornal, sem adjetivo desnecessário.
7. Não escreva frase feita como "vale destacar", "é importante ressaltar", "cabe lembrar".

FORMATO DA RESPOSTA — exatamente isto, sem markdown, sem comentário:
TITULO: (uma linha, no máximo 90 caracteres, direto, sem ponto final)
LINHAFINA: (uma frase de até 200 caracteres, com a informação mais importante que não está no título)
CORPO:
(3 a 5 parágrafos curtos, separados por linha em branco. O primeiro parágrafo responde o que aconteceu.)

FONTE OFICIAL: ${fonte}
TÍTULO ORIGINAL: ${titulo}

TEXTO ORIGINAL:
${texto}`;

export async function reescrever({ fonte, titulo, texto }){
  if (!temChave()) throw new Error('sem GEMINI_API_KEY');
  if (!texto || texto.length < 220) throw new Error('texto original curto demais');

  // Quando textoCompleto nao reconhece a estrutura da pagina, ele devolve o
  // corpo cru — que pode vir cheio de menu, script residual e lixo. O corte de
  // 6000 ja existe, mas caractere de controle e sequencia invalida atravessam
  // e sao candidatos a recusa da API.
  texto = String(texto)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\uFFFD/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);
  if (texto.length < 220) throw new Error('texto original curto demais');

  const bruto = await chamar(PROMPT(fonte, titulo, texto));

  // O modelo as vezes devolve com markdown, com acento no rotulo, ou sem
  // rotulo nenhum. Limpamos e tentamos varios formatos antes de desistir.
  const limpo = String(bruto)
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .trim();

  let t  = limpo.match(/T[IÍ]TULO\s*:\s*(.+)/i)?.[1]?.trim() || '';
  let lf = limpo.match(/LINHA\s*_?\s*FINA\s*:\s*(.+)/i)?.[1]?.trim() || '';
  let corpo = (limpo.split(/CORPO\s*:\s*/i)[1] || '')
    .split(/\n\s*\n/).map(x => x.trim()).filter(x => x.length > 40);

  // Plano B: sem rotulos. Primeira linha vira titulo, segunda a linha fina,
  // o resto vira corpo.
  if (!t || corpo.length < 2) {
    const blocos = limpo.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
    if (blocos.length >= 3) {
      if (!t)  t  = blocos[0].replace(/^["']|["']$/g, '').slice(0, 130);
      if (!lf) lf = blocos[1].slice(0, 240);
      if (corpo.length < 2) corpo = blocos.slice(2).filter(x => x.length > 40);
    }
  }

  if (!t || corpo.length < 2) {
    throw new Error('resposta fora do formato: ' + limpo.slice(0, 90).replace(/\n/g, ' '));
  }

  // Trava de segurança: todo número que aparece no texto novo tem que existir
  // no original. Se o modelo inventou uma cifra, a matéria é descartada.
  const numeros = s => (String(s).match(/\d[\d.,]{2,}/g) || []).map(n => n.replace(/[.,]/g,''));
  const orig = new Set(numeros(texto));
  const novos = numeros(t + ' ' + lf + ' ' + corpo.join(' '));
  const inventados = novos.filter(n => !orig.has(n));
  if (inventados.length) throw new Error('número não confere com o original: ' + inventados.slice(0,3).join(', '));

  return {
    titulo: t.replace(/^["']|["']$/g,''),
    linhaFina: lf,
    corpo,
    modelo: modeloBom
  };
}

export const modeloUsado = () => modeloBom || '(nenhum)';

// Cota estourada (HTTP 429) e o erro mais comum aqui: cinco edicoes rodam em
// paralelo e cada materia gasta duas chamadas. Em vez de perder a rodada
// inteira, esperamos e caimos para um modelo "lite", que tem cota bem maior.
let reservas = [];
export function definirReservas(nomes){
  /* Pegar qualquer nome com "lite" foi erro: a listagem inclui modelos que
     aparecem no catalogo mas nao aceitam mais geracao de conteudo. Numa
     rodada o robo trocou para gemini-2.0-flash-lite-001 e TODAS as chamadas
     seguintes deram 404 — a edicao publicou 3 materias em vez de vinte.

     Os apelidos terminados em "-latest" apontam sempre para a versao viva,
     entao vem primeiro. Versao fixada com numero vem depois, e so como ultimo
     recurso. */
  const cand = nomes.filter(n => /lite/i.test(n) && n !== modeloBom);
  reservas = [
    ...cand.filter(n => /-latest$/.test(n)),
    ...cand.filter(n => !/-latest$/.test(n) && !/-\d{3}$/.test(n)),
    ...cand.filter(n => /-\d{3}$/.test(n))
  ];
}


/* ================= NOTA DE CIRCULACAO ==================================== */
//
// Para historia que corre na imprensa mas nao tem registro oficial.
//
// O que a nota afirma e VERDADEIRO e e nosso: que a informacao esta
// circulando, e que procuramos documento oficial e nao achamos. Nao afirma o
// fato em si. Nao reproduz apuracao de ninguem — relata a circulacao.
//
// Tres travas dentro do prompt, e elas nao sao decorativas:
//   1. nunca afirmar o fato como certo
//   2. nunca nomear pessoa fisica comum (so cargo ou orgao publico)
//   3. nunca dizer que e falso — nao confirmado e diferente de mentira

const PROMPT_CIRCULA = (titulo, editoria, manchetes) => `Você escreve para o MERIDIANO, um jornal que só publica o que confere.

A informação abaixo está sendo veiculada por ${manchetes.length} ${manchetes.length === 1 ? 'veículo' : 'veículos'} da imprensa, mas NÃO encontramos registro em fonte oficial. Sua tarefa não é contar a história como se fosse verdade: é dizer com precisão o que está sendo alegado, o que já dá para afirmar e o que ainda falta para virar fato.

TOM: seco, de nota de agência. Condicional o tempo todo.

REGRAS QUE NÃO PODEM SER QUEBRADAS:
1. NUNCA afirme como fato consumado. Use "teria", "estaria", "seria".
2. NUNCA cite nome de pessoa física comum. Troque por descrição ("um homem de 40 anos"). Cargo público, nome de político e nome de órgão PODEM aparecer.
3. NUNCA diga que é falso, boato ou fake. Não confirmado é diferente de falso.
4. NUNCA escreva o nome dos veículos no texto. Diga "os veículos que publicaram" ou "as publicações". Os nomes aparecem creditados em bloco próprio, com link.
5. NÃO INVENTE. Só use o que está nas manchetes abaixo. Não acrescente número, data, local, causa ou consequência que não esteja lá. Lacuna vai na lista FALTA — nunca preenchida por suposição.
6. Sem opinião, sem alarme, sem adjetivo de efeito.

FORMATO — exatamente isto, sem markdown:
TITULO: (uma linha até 85 caracteres, no condicional)
CORPO:
(2 a 3 parágrafos, de 2 a 3 frases cada, separados por linha em branco. O primeiro diz o teor da alegação. O segundo reúne o que as manchetes acrescentam entre si — onde, quando, quantos, qual órgão citado. O terceiro, se houver material, situa o que estaria em jogo. Se as manchetes divergem entre si, DIGA que divergem e em quê.)
SESABE:
- (o que é possível afirmar com segurança neste momento, 2 a 4 itens de até 16 palavras. Vale "que o assunto está sendo publicado por N veículos" — isso é fato.)
FALTA:
- (a lacuna concreta que impede confirmar: número do procedimento, data exata, manifestação do órgão, identificação oficial. 2 a 4 itens.)

EDITORIA: ${editoria}
MANCHETES QUE CIRCULAM:
${manchetes.map((m, n) => (n+1) + '. ' + m).join('\n')}`;

export async function escreverCirculacao({ titulo, editoria, manchetes }){
  if (!temChave()) throw new Error('sem GEMINI_API_KEY');

  const lista = (manchetes && manchetes.length ? manchetes : [titulo])
    .map(x => String(x || '').trim()).filter(Boolean).slice(0, 8);

  const bruto = await chamar(PROMPT_CIRCULA(titulo, editoria || 'regional', lista));
  const limpo = String(bruto).replace(/```[a-z]*\n?/gi,'').replace(/\*\*/g,'').trim();

  const limparVazamento = x => String(x)
    .replace(/\b(EDITORIA|MANCHETES?|INFORMA[ÇC][ÃA]O|DETALHE|FORMATO|TOM|REGRAS?|T[IÍ]TULO|CORPO|SESABE|FALTA)\s*:.*$/gim, '')
    .replace(/\b(EDITORIA|DETALHE)\s*:\s*[\w-]+/gi, '')
    .replace(/^[-•\d.\s]+/, '')
    .replace(/\s+/g, ' ').trim();

  const secao = (nome, ate) => {
    const re = new RegExp(nome + '\\s*:\\s*([\\s\\S]*?)(?=' + (ate ? ate + '\\s*:' : '$') + ')', 'i');
    return (limpo.match(re)?.[1] || '');
  };

  let t = limpo.match(/T[IÍ]TULO\s*:\s*(.+)/i)?.[1]?.trim() || '';

  let corpo = secao('CORPO', 'SESABE')
    .split(/\n\s*\n/).map(x => limparVazamento(x)).filter(x => x.length > 40);

  const emLista = txt => txt.split(/\n/).map(x => limparVazamento(x))
    .filter(x => x.length > 8 && x.length < 200).slice(0, 4);

  const seSabe = emLista(secao('SESABE', 'FALTA'));
  const falta  = emLista(secao('FALTA', null));

  t = limparVazamento(t);

  // Antes eu exigia o formato inteiro e recusava a nota se faltasse qualquer
  // parte. Numa rodada real isso derrubou 4 de 6 — o modelo entregava titulo
  // e corpo bons e falhava so nas listas. Agora as listas sao opcionais: a
  // pagina simplesmente nao mostra o quadro quando elas nao vierem.
  if (!t && corpo.length) {
    // titulo perdido mas corpo bom: usa a primeira frase do corpo
    t = corpo[0].split(/(?<=[.!?])\s/)[0].slice(0, 90);
  }
  if (!corpo.length) {
    // corpo perdido: aproveita o que sobrou do texto limpo, se houver
    const solto = limparVazamento(limpo.replace(/T[IÍ]TULO\s*:.*/i,''));
    if (solto.length > 60) corpo = [solto.slice(0, 400)];
  }
  if (!t || !corpo.length) throw new Error('nota fora do formato');

  // se o primeiro paragrafo so repete o titulo, nao serve
  const sa = x => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const pal = x => new Set(sa(x).replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>=4));
  const pt = pal(t), pc = pal(corpo[0]);
  const iguais = [...pt].filter(w => pc.has(w)).length;
  // 0.85 recusava nota legitima: em texto curto e no condicional, titulo e
  // primeira frase compartilham muita palavra por natureza. Se houver um
  // segundo paragrafo com conteudo proprio, basta descartar o primeiro.
  if (pt.size && iguais / pt.size > 0.9) {
    if (corpo.length > 1) corpo = corpo.slice(1);
    else throw new Error('nota repete o titulo');
  }

  t = t.replace(/^circula(-se)?\s+(que\s+)?/i, '').replace(/^informa[çc][ãa]o de que\s+/i, '');
  t = t.charAt(0).toUpperCase() + t.slice(1);

  // Trava de saida: se o modelo afirmou como certo, recusamos.
  const afirmativo = new RegExp([
    'foi (preso|presa|condenad[oa]|indiciad[oa]|demitid[oa])',
    'e (fals[ao]|mentira|verdade|culpad[oa]|inocente)',
    '(confirmou|comprovou|desmentiu|provou) que',
    'nao e verdade', 'trata-se de (fake|mentira|boato)', 'fake news comprovad'
  ].join('|'), 'i');
  const texto = t + ' ' + corpo.join(' ');
  if (afirmativo.test(texto.normalize('NFD').replace(/[\u0300-\u036f]/g,''))) {
    throw new Error('nota afirmativa demais, descartada');
  }

  return {
    titulo: t.replace(/^["\']|["\']$/g,''),
    corpo, seSabe, falta,
    aviso: 'Esta informação está circulando na imprensa. Procuramos registro oficial e não localizamos até o fechamento desta edição. Isso não significa que seja falsa — significa que não está confirmada.'
  };
}


/* ================= O QUE ISSO QUER DIZER ================================= */
//
// Contexto, nao opiniao. So entra o que se deduz de fato verificavel:
// repeticao registrada no nosso arquivo, comparacao com numero que esta no
// proprio texto, e quem o documento diz que e afetado.
//
// Nada de previsao, juizo de valor ou intencao atribuida a alguem. E se nao
// houver material suficiente, o bloco simplesmente NAO aparece — melhor
// ausente do que inventando.

const PROMPT_CONTEXTO = (titulo, corpo, historico) => `Você escreve o bloco "O que isso quer dizer" do MERIDIANO.

É contexto factual, não análise. Duas ou três frases, no máximo.

SÓ PODE DIZER:
1. Repetição: se o histórico abaixo mostra caso parecido, diga quantas vezes e quando.
2. Comparação: se há número anterior no texto ou no histórico, compare.
3. Quem é afetado: se o texto diz quem, repita.
4. Prazo ou próxima etapa: se o texto traz data, informe.

NUNCA PODE:
- Prever o que vai acontecer
- Dizer se é bom ou ruim, certo ou errado
- Atribuir intenção a alguém ("o governo quer", "a estratégia é")
- Usar "indica que", "sugere que", "especialistas", "a tendência", "pode significar"
- Citar número que não esteja no texto nem no histórico

Se não houver nada factual a acrescentar, responda apenas: NADA

FORMATO: só o texto corrido, sem título, sem markdown, 2 ou 3 frases.

MATÉRIA: ${titulo}
${corpo.slice(0, 1200)}

${historico.length ? 'CASOS PARECIDOS NO NOSSO ARQUIVO:\n' + historico.map(h => `- ${h.dia}: ${h.titulo}`).join('\n') : 'ARQUIVO: nenhum caso parecido registrado.'}`;

export async function escreverContexto({ titulo, corpo, historico = [] }){
  if (!temChave()) return null;
  // Sem historico e sem numero no texto, nao ha o que dizer de factual.
  const temNumero = /\d/.test(corpo);
  if (!historico.length && !temNumero) return null;

  try {
    const bruto = await chamar(PROMPT_CONTEXTO(titulo, corpo, historico));
    const t = String(bruto).replace(/```[a-z]*\n?/gi,'').replace(/\*\*/g,'')
      .replace(/^O que isso quer dizer:?/i,'').trim();

    if (!t || /^nada$/i.test(t) || t.length < 40) return null;

    // Trava de saida: opiniao ou previsao disfarçada nao passa.
    const proibido = new RegExp([
      'indica que','sugere que','aponta para','a tendencia','pode significar',
      'especialistas','analistas','a expectativa','deve levar','provavelmente',
      'e um sinal','demonstra que','revela que','estrategia','pretende','quer '
    ].join('|'), 'i');
    if (proibido.test(t.normalize('NFD').replace(/[\u0300-\u036f]/g,''))) return null;

    // Numero inventado tambem nao.
    const nums = x => (String(x).match(/\d[\d.,]{1,}/g)||[]).map(n=>n.replace(/[.,]/g,''));
    const conhecidos = new Set([...nums(corpo), ...nums(historico.map(h=>h.titulo).join(' '))]);
    if (nums(t).some(n => !conhecidos.has(n))) return null;

    return t.length > 420 ? t.slice(0, 420).replace(/\s+\S*$/,'') + '.' : t;
  } catch { return null; }
}

// Procura no arquivo casos parecidos com o que estamos publicando agora.
export function acharParecidos(arquivo, titulo, limite = 4){
  const sa = x => String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const chaves = t => [...new Set(sa(t).replace(/[^a-z0-9\s]/g,' ').split(/\s+/)
    .filter(p => p.length >= 4).map(p => p.slice(0,5)))];
  const A = chaves(titulo);
  if (A.length < 2) return [];

  const pontuadas = (arquivo.itens || [])
    .map(i => {
      const B = chaves(i.titulo);
      const nota = B.length < 2 ? 0 : A.filter(p => B.includes(p)).length / Math.min(A.length, B.length);
      return { ...i, nota };
    })
    // Acima de 0.80 nao e "relacionada": e a MESMA historia com o titulo um
    // pouco diferente. A versao anterior so excluia titulo identico, entao o
    // bloco "ja publicamos sobre isso" virava vitrine da duplicacao — quatro
    // variacoes da mesma materia da Comissao Europeia, todas do mesmo dia.
    .filter(i => i.nota >= 0.35 && i.nota < 0.80 && sa(i.titulo) !== sa(titulo))
    .sort((a,b) => b.nota - a.nota);

  // E as relacionadas nao podem repetir entre si pelo mesmo motivo.
  const fora = [];
  for (const i of pontuadas) {
    const B = chaves(i.titulo);
    const repete = fora.some(j => {
      const C = chaves(j.titulo);
      return C.length >= 2 && B.filter(p => C.includes(p)).length / Math.min(B.length, C.length) >= 0.70;
    });
    if (!repete) fora.push(i);
    if (fora.length >= limite) break;
  }
  return fora;
}


/* ============== DE QUEM E A INFORMACAO ================================== */
// Extrai o orgao a quem a materia atribui o fato. E a atribuicao mais
// verdadeira: a informacao nasceu no orgao, o veiculo so passou adiante.
// Quando nao ha orgao nomeado, devolve null — e ai o selo tem que dizer que
// outros veiculos publicaram, porque omitir os dois seria apuracao alheia
// sem credito nenhum.

const ORGAOS_CONHECIDOS = [
  // siglas primeiro: sao as mais precisas
  'Itamaraty','STF','STJ','TSE','TCU','TRF','TST','TRE','TCE','TCM','MPF','MPT','MPE','AGU','PGR','CGU',
  'INSS','IBGE','Inmet','Anvisa','ANP','Aneel','Anatel','ANTT','ANAC','ANS','Ibama','ICMBio','Incra','Funai',
  'Bacen','Cade','CVM','Caixa Econômica Federal','Caixa','Banco do Brasil','Petrobras','Correios','Sefaz','Sema','Sinfra','Sesp','Detran','Procon','Ipea','Fiocruz','Embrapa','Conab',
  // nomes compostos, do mais especifico para o mais generico
  'Ministério da Fazenda','Ministério da Saúde','Ministério da Agricultura','Ministério da Justiça',
  'Ministério do Trabalho','Ministério da Educação','Ministério das Cidades','Ministério dos Transportes',
  'Ministério do Meio Ambiente','Ministério da Defesa','Ministério das Relações Exteriores',
  'Banco Central','Receita Federal','Polícia Rodoviária Federal','Polícia Federal','Polícia Judiciária Civil',
  'Polícia Civil','Polícia Militar','Corpo de Bombeiros','Defesa Civil','Justiça Eleitoral',
  'Supremo Tribunal Federal','Superior Tribunal de Justiça','Tribunal Superior Eleitoral',
  'Tribunal de Contas da União','Tribunal de Contas do Estado','Tribunal de Contas','Tribunal de Justiça',
  'Ministério Público Federal','Ministério Público do Trabalho','Ministério Público',
  'Defensoria Pública','Procuradoria-Geral','Controladoria-Geral','Assembleia Legislativa',
  'Câmara dos Deputados','Câmara Municipal','Governo do Estado','Governo Federal','Senado'
];

export function acharOrgao(texto){
  const t = String(texto || '');

  // 1. nome composto completo: "Secretaria Municipal de Saude", "Prefeitura de Cuiaba"
  const compostos = [
    /\b(Minist[ée]rio d[aeo]s?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+)?)/,
    /\b(Secretaria(?:\s+(?:Municipal|Estadual|Nacional))?\s+d[aeo]s?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+)?)/,
    /\b(Prefeitura(?:\s+Municipal)?\s+d[eoa]s?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+)?)/,
    /\b(Tribunal\s+d[eoa]s?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+d[eoa]s?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+)?)/,
    /\b(Governo\s+d[eoa]s?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+)?)/,
    /\b(Assembleia\s+Legislativa(?:\s+d[eoa]s?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+)?)/,
    /\b(C[âa]mara(?:\s+Municipal)?\s+d[eoa]s?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+)/
  ];
  for (const re of compostos) {
    const m = t.match(re);
    if (m && m[1]) {
      const n = m[1].replace(/\s+/g,' ').trim().replace(/[,.;:]$/,'');
      if (n.length >= 8 && n.length <= 56) return n;
    }
  }

  // 2. orgao conhecido, do nome mais longo para o mais curto
  for (const o of [...ORGAOS_CONHECIDOS].sort((a,b) => b.length - a.length)) {
    const re = new RegExp('\\b' + o.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b',
                          o === o.toUpperCase() ? '' : 'i');
    if (re.test(t)) return o;
  }
  return null;
}
