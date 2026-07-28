// DIAGNÓSTICO — testa tudo e não escreve nada.
//
// Roda no GitHub Actions, percorre cada fonte, cada caminho de assessoria e a
// chave do Gemini, e imprime um relatório. Nenhum arquivo é gravado, nenhum
// commit é feito, o site no ar não é tocado.
//
// Use este antes de mexer em produção.

import { ORGAOS, ALTERNATIVOS, lerListagem } from './assessorias.mjs';

const CHAVE = process.env.GEMINI_API_KEY || '';
const dormir = ms => new Promise(r => setTimeout(r, ms));

const gnews = q => `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:1d')}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

const PAUTA = [
  ['g1',          'https://g1.globo.com/rss/g1/'],
  ['folha',       'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml'],
  ['folhamundo',  'https://feeds.folha.uol.com.br/mundo/rss091.xml'],
  ['g1mundo',     'https://g1.globo.com/rss/g1/mundo/'],
  ['g1politica',  'https://g1.globo.com/rss/g1/politica/'],
  ['g1economia',  'https://g1.globo.com/rss/g1/economia/'],
  ['cnn',         'https://www.cnnbrasil.com.br/feed/'],
  ['cnn-inter',   'https://www.cnnbrasil.com.br/internacional/feed/'],
  ['uol',         'https://rss.uol.com.br/feed/noticias.xml'],
  ['estadao',     'https://www.estadao.com.br/rss/ultimas.xml'],
  ['poder360',    'https://www.poder360.com.br/feed/'],
  ['bbcbrasil',   'https://feeds.bbci.co.uk/portuguese/rss.xml'],
  ['infomoney',   'https://www.infomoney.com.br/feed/'],
  ['valor',       'https://valor.globo.com/rss/'],
  ['agrolink',    'https://www.agrolink.com.br/rss/noticias.xml'],
  ['canalrural',  'https://www.canalrural.com.br/feed/'],
  // --- regionais de MT ---
  ['g1mt',        'https://g1.globo.com/rss/g1/mt/mato-grosso/'],
  ['primeirapagina','https://www.primeirapagina.com.br/feed/'],
  ['hipernoticias','https://www.hipernoticias.com.br/feed/'],
  ['reportermt',  'https://www.reportermt.com.br/feed/'],
  ['nativanews',  'https://www.nativanews.com.br/feed/'],
  ['agazetamt',   'https://www.agazeta.com.br/feed/'],
  ['agoramt',     'https://www.agoramt.com.br/feed/'],
  ['circuitomt',  'https://www.circuitomt.com.br/feed/'],
  ['jornaloeste', 'https://www.jornaloeste.com.br/feed/'],
  ['noticiamax',  'https://www.noticiamax.com.br/feed/'],
  ['atribunamt',  'https://www.atribunamt.com.br/feed/'],
  // --- agro ---
  ['globorural',  'https://globorural.globo.com/rss/ultimas/feed.xml'],
  ['noticiasagricolas','https://www.noticiasagricolas.com.br/rss/'],
  ['agfeed',      'https://agfeed.com.br/feed/'],
  ['portalagro',  'https://www.portaldoagronegocio.com.br/rss'],
  ['comprerural', 'https://www.comprerural.com/feed/'],
  // --- nacional ---
  ['r7',          'https://noticias.r7.com/feed.xml'],
  ['metropoles',  'https://www.metropoles.com/feed'],
  ['gazetadopovo','https://www.gazetadopovo.com.br/feed/rss2.xml'],
  ['correiobraz', 'https://www.correiobraziliense.com.br/rss/noticia/ultimas/rss.xml'],
  ['cartacapital','https://www.cartacapital.com.br/feed/'],
  ['congressoemfoco','https://www.congressoemfoco.com.br/feed/'],
  ['jota',        'https://www.jota.info/feed'],
  ['migalhas',    'https://www.migalhas.com.br/rss'],
  ['conjur',      'https://www.conjur.com.br/rss.xml'],
  // --- internacional em portugues ---
  ['dw',          'https://rss.dw.com/rdf/rss-br-all'],
  ['rfi',         'https://www.rfi.fr/br/rss'],
  ['euronews',    'https://pt.euronews.com/rss'],
  ['observador',  'https://observador.pt/feed/'],
  ['publico',     'https://feeds.feedburner.com/PublicoRSS'],
  ['gn-brasil',   gnews('Brasil governo OR congresso OR economia')],
  ['gn-mundo',    gnews('mundo internacional guerra OR acordo OR eleição')],
  ['gn-mt',       gnews('"Mato Grosso" governo OR assembleia -"Mato Grosso do Sul"')],
  ['odocumento',  'https://odocumento.com.br/feed'],
  ['estadaomt',   'https://www.estadaomatogrosso.com.br/feed'],
  ['olivre',      'https://www.olivre.com.br/feed'],
  ['issoenoticia','https://issoenoticia.com.br/feed'],
  ['muvuca',      'https://www.muvucapopular.com.br/feed'],
  ['cenariomt',   'https://www.cenariomt.com.br/feed'],
  ['vgnoticias',  'https://www.vgnoticias.com.br/feed'],
  ['sonoticias',  'https://www.sonoticias.com.br/feed']
];

const LIVRE = [
  ['ab-politica',  'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml'],
  ['ab-economia',  'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml'],
  ['ab-justica',   'https://agenciabrasil.ebc.com.br/rss/justica/feed.xml'],
  ['ab-geral',     'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml'],
  ['ab-inter',     'https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml'],
  ['camara',       'https://www.camara.leg.br/noticias/rss'],
  ['camara-alt',   'https://www.camara.leg.br/noticias/rss/ultimas'],
  ['senado',       'https://www12.senado.leg.br/noticias/ultimas/feed'],
  ['senado-alt',   'https://www12.senado.leg.br/noticias/feed'],
  ['onu',          'https://news.un.org/feed/subscribe/pt/news/all/rss.xml'],
  ['onu-alt',      'https://news.un.org/pt/feed/subscribe/pt/news/all/rss.xml'],
  // --- entidades setoriais: release existe para ser reproduzido ---
  ['imea',        'https://www.imea.com.br/imea-site/rss'],
  ['imea-alt',    'https://www.imea.com.br/imea-site/feed'],
  ['aprosoja',    'https://aprosoja.com.br/feed/'],
  ['famato',      'https://sistemafamato.org.br/feed/'],
  ['acrimat',     'https://acrimat.org.br/feed/'],
  ['fiemt',       'https://www.fiemt.com.br/feed/'],
  ['embrapa',     'https://www.embrapa.br/rss/noticias'],
  ['conab',       'https://www.conab.gov.br/rss/noticias'],
  ['sebraemt',    'https://sebraemt.com.br/feed/'],
  ['conversation', 'https://theconversation.com/br/articles.atom'],
  ['vaticano',     'https://www.vaticannews.va/pt.rss.xml']
];

/* ------------------------------------------------------------------ apoio */

async function pegar(url, ms = 15000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { signal:c.signal, redirect:'follow',
      headers:{ 'User-Agent':'IlMeridiano/1.0 (+contato@ilmeridiano.com.br)',
                Accept:'application/rss+xml, application/atom+xml, application/xml, text/html, */*' }});
    const bytes = new Uint8Array(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || '';
    let charset = (ct.match(/charset=([\w-]+)/i) || [])[1];
    if (!charset) {
      const ini = new TextDecoder('latin1').decode(bytes.slice(0,200));
      charset = (ini.match(/encoding=["']([\w-]+)["']/i) || [])[1] || 'utf-8';
    }
    let txt;
    try { txt = new TextDecoder(charset.toLowerCase()).decode(bytes); }
    catch { txt = new TextDecoder('utf-8').decode(bytes); }
    return { ok:r.ok, status:r.status, txt, ms:Date.now()-t0, charset };
  } finally { clearTimeout(t); }
}

const contarItens = xml => (xml.match(/<(item|entry)\b/gi) || []).length;

// pega o primeiro título para conferir acentuação
function primeiroTitulo(xml){
  const m = xml.match(/<title[^>]*>([\s\S]*?)<\/title>/gi) || [];
  const t = (m[1] || m[0] || '').replace(/<[^>]+>/g,'').replace(/<!\[CDATA\[|\]\]>/g,'').trim();
  return t.slice(0, 58);
}

const temQuebrado = s => /[�]/.test(s);

let verdes = 0, vermelhos = 0;
const problemas = [];

async function testarFeeds(lista, rotulo){
  console.log(`\n  ${rotulo}`);
  console.log('  ' + '-'.repeat(74));
  for (const [id, url] of lista) {
    try {
      const r = await pegar(url);
      const n = contarItens(r.txt);
      const tit = primeiroTitulo(r.txt);
      if (r.ok && n > 0) {
        const alerta = temQuebrado(tit) ? '  ACENTO QUEBRADO' : '';
        console.log(`  ok    ${id.padEnd(14)} ${String(n).padStart(3)} itens · ${String(r.ms).padStart(5)}ms · ${r.charset.padEnd(10)}${alerta}`);
        console.log(`        ${tit}`);
        verdes++;
        if (alerta) problemas.push(`${id}: acento quebrado (charset ${r.charset})`);
      } else {
        console.log(`  FALHA ${id.padEnd(14)} HTTP ${r.status} · ${n} itens`);
        vermelhos++; problemas.push(`${id}: HTTP ${r.status}, ${n} itens`);
      }
    } catch (e) {
      console.log(`  FALHA ${id.padEnd(14)} ${String(e.message).slice(0,50)}`);
      vermelhos++; problemas.push(`${id}: ${String(e.message).slice(0,40)}`);
    }
    await dormir(300);
  }
}

/* ------------------------------------------------------------- execução */

console.log('\n  DIAGNÓSTICO IL MERIDIANO · ' + new Date().toISOString());
console.log('  nada será gravado, nenhum commit será feito');
console.log('  ' + '='.repeat(74));

await testarFeeds(PAUTA, '1. PAUTA — veículos monitorados');
await testarFeeds(LIVRE, '2. FONTE LIVRE — agências que autorizam');

console.log('\n  3. ASSESSORIAS DE MT — testando cada caminho possível');
console.log('  ' + '-'.repeat(74));
const receita = [];
for (const o of ORGAOS) {
  let venceu = null;
  for (const caminho of ALTERNATIVOS) {
    try {
      const r = await pegar(o.base + caminho, 12000);
      if (!r.ok) continue;
      const manchetes = lerListagem(r.txt, o.base);
      if (manchetes.length >= 3) { venceu = { caminho, manchetes, ms:r.ms }; break; }
    } catch { /* proximo */ }
    await dormir(200);
  }
  if (venceu) {
    console.log(`  ok    ${o.id.padEnd(12)} ${String(venceu.manchetes.length).padStart(2)} manchetes · caminho ${venceu.caminho}`);
    console.log(`        ${venceu.manchetes[0].titulo.slice(0,66)}`);
    receita.push(`  { id:'${o.id}', caminho:'${venceu.caminho}' }`);
    verdes++;
  } else {
    console.log(`  FALHA ${o.id.padEnd(12)} nenhum caminho funcionou`);
    vermelhos++; problemas.push(`orgao ${o.id}: nenhum caminho`);
  }
  await dormir(400);
}

console.log('\n  4. GEMINI');
console.log('  ' + '-'.repeat(74));
if (!CHAVE) {
  console.log('  FALHA chave nao chegou ao robo (confira o env no workflow)');
  vermelhos++; problemas.push('gemini: sem chave');
} else {
  console.log(`  ok    chave presente (${CHAVE.length} caracteres)`);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${CHAVE}&pageSize=100`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    const nomes = (j.models||[])
      .filter(m => (m.supportedGenerationMethods||[]).includes('generateContent'))
      .map(m => String(m.name).replace(/^models\//,''));
    const flash = nomes.filter(n => /flash/i.test(n) && !/vision|tts|audio|image|live/i.test(n));
    console.log(`  ok    ${nomes.length} modelos disponiveis`);
    console.log(`        flash: ${flash.slice(0,6).join(', ')}`);

    const escolhido = flash.find(n=>/^gemini-flash-latest$/.test(n)) || flash.find(n=>/^gemini-2\.5-flash$/.test(n)) || flash[0];
    console.log(`        escolhido: ${escolhido}`);

    // teste real de reescrita, texto curto e conhecido
    const teste = 'O Tribunal de Contas do Estado aprovou nesta segunda-feira as contas do exercicio de 2025 com ressalvas. A decisao foi tomada por unanimidade pelos sete conselheiros durante sessao do Tribunal Pleno. O relatorio apontou 3 irregularidades formais em prestacoes de contas de municipios, sem indicio de dano ao erario. O prazo para regularizacao e de 60 dias.';
    const rr = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${escolhido}:generateContent?key=${CHAVE}`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        contents:[{parts:[{text:'Reescreva com suas palavras, usando SOMENTE os fatos do texto. Responda no formato:\nTITULO: (uma linha)\nLINHAFINA: (uma frase)\nCORPO:\n(2 paragrafos separados por linha em branco)\n\nTEXTO:\n' + teste}]}],
        generationConfig:{ temperature:0.4, maxOutputTokens:4000, thinkingConfig:{ thinkingBudget:0 } }
      })
    });
    if (!rr.ok) {
      console.log(`  FALHA geracao HTTP ${rr.status}: ${(await rr.text()).slice(0,140)}`);
      vermelhos++; problemas.push(`gemini: geracao HTTP ${rr.status}`);
    } else {
      const jj = await rr.json();
      const txt = jj?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('') || '';
      const limpo = txt.replace(/```[a-z]*\n?/gi,'').replace(/\*\*/g,'').trim();
      const tit = limpo.match(/T[IÍ]TULO\s*:\s*(.+)/i)?.[1]?.trim() || '';
      const corpo = (limpo.split(/CORPO\s*:\s*/i)[1]||'').split(/\n\s*\n/).filter(x=>x.trim().length>40);

      // confere se inventou numero
      const nums = s => (String(s).match(/\d[\d.,]{1,}/g)||[]).map(n=>n.replace(/[.,]/g,''));
      const orig = new Set(nums(teste));
      const inventados = nums(limpo).filter(n=>!orig.has(n));

      console.log(`  ok    resposta recebida (${txt.length} caracteres)`);
      console.log(`        titulo lido: ${tit ? '"'+tit.slice(0,50)+'"' : 'NAO ENCONTRADO'}`);
      console.log(`        paragrafos: ${corpo.length}`);
      console.log(`        numeros inventados: ${inventados.length ? inventados.join(', ') + ' (a trava descartaria)' : 'nenhum'}`);
      if (tit && corpo.length >= 2) verdes++;
      else { vermelhos++; problemas.push('gemini: resposta fora do formato'); console.log('        RESPOSTA CRUA: ' + limpo.slice(0,200).replace(/\n/g,' | ')); }
    }
  } catch (e) {
    console.log(`  FALHA ${e.message}`);
    vermelhos++; problemas.push('gemini: ' + e.message);
  }
}

console.log('\n  ' + '='.repeat(74));
console.log(`  ${verdes} funcionando · ${vermelhos} com problema`);
if (problemas.length) {
  console.log('\n  PARA CONSERTAR:');
  problemas.forEach(p => console.log('    · ' + p));
}
if (receita.length) {
  console.log('\n  CAMINHOS DE ASSESSORIA QUE FUNCIONARAM:');
  receita.forEach(r => console.log(r));
}
console.log('\n  Nenhum arquivo foi gravado.\n');
