// DESCOBRIDOR DE FONTE
//
// O problema que este modulo resolve: 80% dos orgaos publicos nao respondem
// no endereco que eu cadastro. Nao porque nao publiquem — publicam todo dia —
// mas porque cada um guarda as noticias num caminho diferente, e adivinhar
// sufixo nunca funciona.
//
// Ja tentei tres padroes so para o gov.br: /assuntos/noticias, depois
// /ultimas-noticias/RSS, depois /noticias/ultimas-noticias/RSS. Cada tentativa
// custou uma rodada e nenhuma acertou. A pagina que listaria os feeds de
// verdade, gov.br/{orgao}/pt-br/rss, exige autenticacao.
//
// A saida e parar de adivinhar e fazer o que um humano faz: abrir a home do
// orgao, procurar o link que leva as noticias, e seguir.
//
// COMO FUNCIONA, EM TRES CAMADAS:
//
//   1. Tenta os caminhos de feed conhecidos. Feed e sempre melhor: vem
//      estruturado, com data, e nao depende de reconhecer layout.
//   2. Nao achando, le a HOME e procura o link de noticias. E aqui que a
//      adivinhacao acaba: o proprio site diz onde esta.
//   3. Achando a pagina, procura o feed DELA — muitos sistemas expõem o feed
//      da listagem mesmo sem anunciar na home.
//
// O que for descoberto fica guardado em dados/descobertas.json, para a rodada
// seguinte ir direto ao endereco certo. Redescobrir a cada rodada custaria
// tempo que o job nao tem.

import { readFile, writeFile, mkdir } from 'node:fs/promises';

const ARQUIVO = 'dados/descobertas.json';

/* --------------------------------------------------------- CAMINHOS ----- */
// Ordem importa: os primeiros sao os mais comuns e mais baratos de testar.
const FEEDS = [
  '/RSS', '/rss', '/feed', '/feed/', '/rss.xml', '/feed.xml', '/index.xml',
  '/atom.xml', '/@@rss', '/RSS.xml',
  '?format=feed&type=rss', '/rss/noticias', '/noticias/rss'
];

// Onde o link de noticias costuma apontar. Usado para reconhecer o link certo
// na home, nao para adivinhar o endereco.
const CARA_DE_NOTICIA = /(not[íi]cias?|imprensa|sala.de.imprensa|comunica[çc][ãa]o|agencia.de.noticias|ultimas|press|releases?|novidades)/i;

// Link que parece noticia mas nao e a listagem: uma noticia especifica, um
// arquivo, uma pagina de assinatura de RSS.
const NAO_E_LISTAGEM = /(\/20\d{2}\/|\.pdf|\.doc|assinar|como-assinar|manual|cadastr|rss$)/i;

const sem = t => String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

/* ------------------------------------------------------------ REDE ------ */
async function pegar(url, ms = 9000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal:c.signal, redirect:'follow', headers:{
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'Accept':'application/rss+xml, application/xml, text/xml, text/html;q=0.8',
      'Accept-Language':'pt-BR,pt;q=0.9',
      'X-Contact':'contato@meridiano.press'
    }});
    if (!r.ok) return null;
    const txt = await r.text();
    return { txt, tipo: r.headers.get('content-type') || '', url: r.url };
  } catch { return null; }
  finally { clearTimeout(t); }
}

const ehFeed = ({ txt, tipo }) =>
  /(application|text)\/(rss|atom|xml)/i.test(tipo) ||
  (/<rss[\s>]|<feed[\s>]|<rdf:RDF/i.test(txt) && /<(item|entry)[\s>]/i.test(txt));

const contaItens = txt => (txt.match(/<(item|entry)[\s>]/gi) || []).length;

/* ------------------------------------------------------- DESCOBERTA ----- */

/** Procura um feed a partir de uma base. */
async function acharFeed(base){
  for (const c of FEEDS) {
    const url = base.replace(/\/+$/,'') + c;
    const r = await pegar(url, 7000);
    if (r && ehFeed(r) && contaItens(r.txt) >= 3) {
      return { url, itens: contaItens(r.txt), via: 'caminho conhecido' };
    }
  }
  return null;
}

/** O feed declarado no <head> da propria pagina. Melhor que qualquer chute. */
function feedDeclarado(html, base){
  const m = [...String(html).matchAll(
    /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/gi)];
  for (const tag of m) {
    const href = (tag[0].match(/href=["']([^"']+)["']/i) || [])[1];
    if (!href) continue;
    try { return new URL(href, base).href; } catch {}
  }
  return null;
}

/** Le a home e devolve os links que parecem levar a listagem de noticias. */
function linksDeNoticia(html, base){
  const achados = new Map();
  for (const m of String(html).matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{0,120}?)<\/a>/gi)) {
    let href = m[1].trim();
    const texto = m[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    if (!href || href.startsWith('#') || /^(javascript|mailto|tel):/i.test(href)) continue;

    let abs;
    try { abs = new URL(href, base).href; } catch { continue; }

    // so dentro do proprio dominio
    try { if (new URL(abs).hostname !== new URL(base).hostname) continue; } catch { continue; }
    if (NAO_E_LISTAGEM.test(abs)) continue;

    const casa = CARA_DE_NOTICIA.test(sem(texto)) || CARA_DE_NOTICIA.test(sem(abs));
    if (!casa) continue;

    // Pontua: link cujo TEXTO diz "noticias" vale mais que o que so tem a
    // palavra no endereco. E caminho curto vale mais que caminho fundo.
    let nota = 0;
    if (CARA_DE_NOTICIA.test(sem(texto))) nota += 3;
    if (/ultimas|todas/i.test(sem(texto))) nota += 2;
    if (CARA_DE_NOTICIA.test(sem(abs)))    nota += 1;
    try { nota -= Math.max(0, new URL(abs).pathname.split('/').filter(Boolean).length - 3); } catch {}

    if (!achados.has(abs) || achados.get(abs) < nota) achados.set(abs, nota);
  }
  return [...achados].sort((a,b) => b[1] - a[1]).slice(0, 5).map(([u]) => u);
}

/**
 * Descobre onde um orgao publica noticia.
 * @param {string} base  endereco do site, ex.: https://www.gov.br/pf
 * @returns {{url,via,itens}|null}
 */
export async function descobrir(base){
  if (!base) return null;

  // 1. caminhos de feed conhecidos, direto na base
  const direto = await acharFeed(base);
  if (direto) return direto;

  // 2. a home diz onde estao as noticias
  const home = await pegar(base, 10000);
  if (!home) return null;

  // 2a. o proprio <head> pode declarar o feed
  const declarado = feedDeclarado(home.txt, base);
  if (declarado) {
    const r = await pegar(declarado, 7000);
    if (r && ehFeed(r) && contaItens(r.txt) >= 3) {
      return { url: declarado, itens: contaItens(r.txt), via: 'declarado no head' };
    }
  }

  // 2b. seguir os links que parecem levar a noticias
  for (const alvo of linksDeNoticia(home.txt, base)) {
    // 3. a pagina de noticias costuma ter feed proprio
    const dela = await acharFeed(alvo);
    if (dela) return { ...dela, via: 'feed da pagina de noticias' };

    const p = await pegar(alvo, 9000);
    if (!p) continue;

    const doHead = feedDeclarado(p.txt, alvo);
    if (doHead) {
      const r = await pegar(doHead, 7000);
      if (r && ehFeed(r) && contaItens(r.txt) >= 3) {
        return { url: doHead, itens: contaItens(r.txt), via: 'declarado na pagina de noticias' };
      }
    }

    // Sem feed: a propria pagina serve como listagem HTML, que o
    // lerListagem do assessorias.mjs sabe processar.
    const links = (p.txt.match(/<a[^>]+href=/gi) || []).length;
    if (links > 15) return { url: alvo, itens: 0, via: 'listagem html', html: true };
  }

  return null;
}

/* ------------------------------------------------------- MEMORIA -------- */
// Redescobrir a cada rodada custaria tempo que o job nao tem. O que foi
// achado fica guardado; o que falhou tambem, para nao insistir todo dia.

export async function lerDescobertas(){
  try { return JSON.parse(await readFile(ARQUIVO, 'utf8')); }
  catch { return {}; }
}

export async function gravarDescobertas(mapa){
  try {
    await mkdir('dados', { recursive: true });
    await writeFile(ARQUIVO, JSON.stringify(mapa, null, 2), 'utf8');
  } catch {}
}

/**
 * Resolve o endereco de uma fonte, usando a memoria quando houver.
 * Uma descoberta vale 14 dias; uma falha, 3 — orgao pode arrumar o site.
 */
export async function resolver(id, base, mapa){
  const agora = Date.now();
  const guardado = mapa[id];

  if (guardado) {
    const idade = agora - Date.parse(guardado.quando || 0);
    const validade = guardado.url ? 14 * 86400000 : 3 * 86400000;
    if (idade < validade) return guardado.url ? { ...guardado, daMemoria: true } : null;
  }

  const achado = await descobrir(base);
  mapa[id] = achado
    ? { url: achado.url, via: achado.via, html: Boolean(achado.html), quando: new Date().toISOString() }
    : { url: null, quando: new Date().toISOString() };

  return achado;
}

export const _interno = { FEEDS, linksDeNoticia, feedDeclarado, ehFeed };
