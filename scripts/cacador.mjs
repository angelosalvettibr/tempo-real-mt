// CAÇADOR DE DOCUMENTO
//
// Última chance antes de uma história virar nota "sem confirmação".
//
// A pauta circula na imprensa, o cruzamento normal não achou fonte livre, e o
// destino dela seria o balde do "circulando". Antes disso, o caçador vai bater
// na porta do órgão que TERIA o registro: Polícia Civil para prisão, Defesa
// Civil para temporal, Ministério Público para propina, TCE para obra.
//
// Se acha, a história sai do balde e vira matéria confirmada, escrita a partir
// do documento do órgão — com crédito e link para o original.
// Se não acha, continua sem confirmação, mas agora a página pode dizer com
// honestidade onde foi procurado, nome por nome.
//
// O que este módulo NÃO faz: ler portal de notícia. Nenhuma linha aqui aponta
// para veículo comercial. Só órgão público, que publica release para ser
// publicado.

import { lerListagem, CAMINHOS_SITEMAP, lerSitemap, ehIndice, filtrarNoticias, tituloDaPagina } from './assessorias.mjs';
import { ondeProcurar, temasDoTexto, TEMA_ROTULO } from './oficiais.mjs';

const semAcento = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const dormir = ms => new Promise(r => setTimeout(r, ms));

// Orcamento GLOBAL da rodada. O teto por historia nao bastava: seis historias
// a 60s davam seis minutos so de caca, e o job do Actions morre aos 12.
// Agora a cacada inteira tem um teto proprio, e quando ele acaba as historias
// restantes seguem direto para nota nao confirmada — que e o destino delas de
// qualquer forma quando nao ha documento.
const ORCAMENTO_RODADA = 330000;   // 5min30 para toda a caca da rodada
let gastoNaRodada = 0;
export const sobrouTempoDeCaca = () => gastoNaRodada < ORCAMENTO_RODADA;

// Palavras que não distinguem nada e só geram falso positivo.
const VAZIAS = new Set(['para','pela','pelo','pelos','pelas','como','mais','menos','sobre','entre','apos','depois','antes','contra','durante','este','esta','esse','essa','aquele','aquela','seus','suas','pode','deve','ainda','ja','nao','sim','que','com','sem','por','dos','das','nos','nas','uma','uns','umas','teria','teriam','seria','seriam','estaria','estariam','havia','foi','sao','ter','ser','estar','fazer','dizer','apenas','tambem','muito','pouco','todo','toda','todos','todas','outro','outra','ano','anos','mes','meses','dia','dias','hoje','ontem','amanha','manha','tarde','noite']);

function chaves(texto){
  return [...new Set(
    semAcento(texto).replace(/[^a-z0-9\s]/g,' ').split(/\s+/)
      .filter(p => p.length >= 4 && !VAZIAS.has(p))
      .map(p => p.slice(0,6))
  )];
}

// Quanto dois títulos falam da mesma história. Não é semelhança de texto: é
// quantas palavras que importam eles compartilham.
function parecenca(a, b){
  const A = chaves(a), B = chaves(b);
  if (A.length < 3 || B.length < 3) return 0;
  const comuns = A.filter(p => B.includes(p)).length;
  return comuns / Math.min(A.length, B.length);
}

async function pegar(url, ms = 11000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal:c.signal, redirect:'follow', headers:{
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'Accept':'application/xml;q=0.9, text/html;q=0.8, */*;q=0.7',
      'Accept-Language':'pt-BR,pt;q=0.9',
      'X-Contact':'contato@meridiano.com.br'
    }});
    if (!r.ok) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || '';
    let cs = (ct.match(/charset=([\w-]+)/i) || [])[1];
    if (!cs) {
      const ini = new TextDecoder('latin1').decode(bytes.slice(0,200));
      cs = (ini.match(/encoding=["']([\w-]+)["']/i) || [])[1] || 'utf-8';
    }
    try { return new TextDecoder(cs.toLowerCase()).decode(bytes); }
    catch { return new TextDecoder('utf-8').decode(bytes); }
  } catch { return null; }
  finally { clearTimeout(t); }
}

// Lista de manchetes recentes de um órgão. Tenta sitemap primeiro (é XML, dá
// data limpa e funciona em site feito por JavaScript). Cai para a página de
// notícias se não houver.
async function manchetesDe(orgao, horas){
  let respondeu = false;
  // 1. sitemap
  for (const caminho of CAMINHOS_SITEMAP.slice(0, 3)) {
    const xml = await pegar(orgao.base + caminho, 9000);
    if (xml) respondeu = true;
    if (!xml || !/<(urlset|sitemapindex)/i.test(xml)) continue;

    let entradas = lerSitemap(xml);
    if (ehIndice(xml)) {
      // índice de sitemaps: abrir o que tiver cara de notícia, no máximo dois
      const filhos = entradas
        .filter(e => /(not[íi]cia|news|post|materia)/i.test(e.url))
        .slice(0, 2);
      entradas = [];
      for (const f of filhos) {
        const x = await pegar(f.url, 9000);
        if (x) entradas.push(...lerSitemap(x));
      }
    }
    const recentes = filtrarNoticias(entradas, horas);
    if (recentes.length) {
      return { respondeu:true, via:'sitemap',
        itens: recentes.map(e => ({ titulo: e.titulo, link: e.url, fonte: orgao.nome })) };
    }
  }

  // 2. página de notícias
  const html = await pegar(orgao.url, 11000);
  if (!html) return { respondeu, via:null, itens: [] };
  try {
    return { respondeu:true, via:'listagem',
      itens: (lerListagem(html, orgao.base) || []).slice(0, 25)
        .map(i => ({ titulo: i.titulo, link: i.link, fonte: orgao.nome })) };
  } catch { return { respondeu:true, via:'listagem', itens: [] }; }
}

// Alguns itens de sitemap vêm sem título. Só vale abrir a página quando o
// endereço já sugere que é o nosso caso — abrir tudo estoura o tempo.
async function completarTitulo(item, pistas){
  if (item.titulo && item.titulo.length > 15) return item;
  const alvo = semAcento(item.link);
  const acertos = pistas.filter(p => alvo.includes(p)).length;
  if (acertos < 2) return item;
  const html = await pegar(item.link, 9000);
  if (!html) return item;
  return { ...item, titulo: tituloDaPagina(html) || item.titulo };
}

/**
 * Procura o registro oficial de uma história que só circula na imprensa.
 *
 * @param {string} titulo   manchete que está circulando
 * @param {string} uf       'mt' | 'rs' | 'rj' | null (edição geral)
 * @param {object} opcoes   { orcamentoMs, horas, corte, maxOrgaos }
 * @returns {{achado:boolean, link?:string, titulo?:string, fonte?:string,
 *            nota?:number, procuradoEm:string[]}}
 */
export async function cacarDocumento(titulo, uf, opcoes = {}){
  const {
    orcamentoMs = 75000,   // teto de tempo por história, para não travar a rodada
    horas       = 96,      // o release costuma ser anterior ao burburinho
    corte       = 0.50,    // abaixo disso não é a mesma história
    maxOrgaos   = 6
  } = opcoes;

  const inicio = Date.now();
  if (!sobrouTempoDeCaca()) return { achado:false, procuradoEm:[], relatorio:[], assunto:[], horas, semTempo:true };
  const fila = ondeProcurar(titulo, uf).slice(0, maxOrgaos);
  const pistas = chaves(titulo);
  const procuradoEm = [];
  const relatorio = [];
  const temas = temasDoTexto(titulo);
  const assunto = temas.map(t => TEMA_ROTULO[t]).filter(Boolean);

  if (pistas.length < 3) return { achado:false, procuradoEm:[], relatorio:[], assunto, horas };
  // (o gasto so conta quando houve caca de verdade)

  let melhor = null;

  // de dois em dois: rápido o bastante e educado com o servidor do órgão
  for (let i = 0; i < fila.length; i += 2) {
    if (Date.now() - inicio > orcamentoMs) break;

    const lote = fila.slice(i, i + 2);
    const resultados = await Promise.all(lote.map(async o => {
      try { return { orgao:o, ...(await manchetesDe(o, horas)) }; }
      catch { return { orgao:o, respondeu:false, via:null, itens: [] }; }
    }));

    for (const { orgao, itens, respondeu, via } of resultados) {
      procuradoEm.push(orgao.nome);
      const linha = { nome: orgao.nome, respondeu: Boolean(respondeu), via,
                      lidas: itens.length, melhor: 0,
                      porTema: Boolean(orgao.temas?.some(t => temas.includes(t))) };
      relatorio.push(linha);

      // primeiro os que já têm título; só completamos os promissores
      const candidatos = [];
      for (const it of itens) {
        const pronto = it.titulo && it.titulo.length > 15
          ? it
          : await completarTitulo(it, pistas);
        if (pronto.titulo) candidatos.push(pronto);
        if (Date.now() - inicio > orcamentoMs) break;
      }

      for (const c of candidatos) {
        const nota = parecenca(titulo, c.titulo);
        if (nota > linha.melhor) linha.melhor = Number(nota.toFixed(2));
        if (nota >= corte && (!melhor || nota > melhor.nota)) {
          melhor = { ...c, nota };
        }
      }
    }

    // achou muito bom, não precisa varrer o resto
    if (melhor && melhor.nota >= 0.72) break;
    await dormir(400);
  }

  gastoNaRodada += Date.now() - inicio;
  const lidas = relatorio.reduce((a,r) => a + r.lidas, 0);
  const mudos = relatorio.filter(r => !r.respondeu).map(r => r.nome);

  return melhor
    ? { achado:true, link:melhor.link, titulo:melhor.titulo, fonte:melhor.fonte,
        nota:Number(melhor.nota.toFixed(2)), procuradoEm, relatorio, assunto, horas, lidas, mudos }
    : { achado:false, procuradoEm, relatorio, assunto, horas, lidas, mudos };
}

// exportado para teste
export const _interno = { chaves, parecenca };
