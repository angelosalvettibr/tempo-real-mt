// EXPLORADOR — roda todo dia, mantém o catálogo e descobre fontes novas.
//
// Faz três coisas:
//   1. VISITA   cada fonte conhecida e anota se respondeu, como e quanto
//   2. DESCOBRE veículos que aparecem no Google e ainda não estão na lista
//   3. AVISA    só o que mudou desde ontem — silêncio quando nada muda
//
// Uma visita por dia em cada site. É o que serviços de clipping fazem há
// décadas, e é educado.

import { ESTADOS, NACIONAL, PAUTA_GERAL, CAMINHOS_ASSESSORIA, BLOQUEADOS } from './estados.mjs';
import { lerListagem, CAMINHOS_SITEMAP, lerSitemap, ehIndice, filtrarNoticias } from './assessorias.mjs';
import { ler, gravar, anotar, agrupar, METODO, ESTADO_FONTE } from './catalogo.mjs';

const dormir = ms => new Promise(r => setTimeout(r, ms));
const semAcento = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const gnews = q => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

async function pegar(url, ms = 10000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal:c.signal, redirect:'follow',
      headers:{
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept':'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/html;q=0.8, */*;q=0.7',
        'Accept-Language':'pt-BR,pt;q=0.9'
      }});
    const bytes = new Uint8Array(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || '';
    let cs = (ct.match(/charset=([\w-]+)/i) || [])[1];
    if (!cs) {
      const ini = new TextDecoder('latin1').decode(bytes.slice(0,200));
      cs = (ini.match(/encoding=["']([\w-]+)["']/i) || [])[1] || 'utf-8';
    }
    let txt;
    try { txt = new TextDecoder(cs.toLowerCase()).decode(bytes); }
    catch { txt = new TextDecoder('utf-8').decode(bytes); }
    return { ok:r.ok, status:r.status, txt, destino:r.url };
  } finally { clearTimeout(t); }
}

const contarRSS = x => (x.match(/<(item|entry)\b/gi) || []).length;

// Veiculo descoberto numa busca do RS nao e necessariamente gaucho: CNN,
// Estadao e Terra aparecem em qualquer busca. Deduzimos a praça pelo dominio
// e pelo nome; na duvida, marcamos como nacional.
const NACIONAIS = /^(g1|globo|folha|uol|estadao|terra|r7|ig|band|cnnbrasil|record|sbt|metropoles|poder360|infomoney|exame|veja|istoe|carta|jota|migalhas|conjur|gazetadopovo|correiobraziliense|em\.com|otempo|opovo|nexojornal|intercept|brasildefato|pciconcursos|estrategiaconcursos|qconcursos|gran|direcao)/i;

const PISTAS_UF = {
  mt: /(mt|matogrosso|mato-grosso|cuiaba|varzea|sinop|sorriso|rondonopolis|pantanal|cenariomt|olhardireto|midianews)/i,
  rs: /(rs|riograndedosul|gaucha|gaucho|portoalegre|poa|caxias|pelotas|santamaria|camaqua|sepeense|alegrete|uirapuru|leouve|sul21|matinal)/i,
  rj: /(rj|riodejaneiro|carioca|fluminense|niteroi|petropolis|baixada|odia|extra)/i
};

function deduzirPraca(dominio, nome, ufDaRodada){
  const alvo = (dominio + ' ' + nome).toLowerCase().replace(/[^a-z0-9]/g,'');
  if (NACIONAIS.test(alvo)) return 'br';
  for (const [uf, re] of Object.entries(PISTAS_UF)) if (re.test(alvo)) return uf;
  // sem pista: fica como nacional, para nao sujar a praça errada
  return 'br';
}

// Sites que nao sao jornal: concurso, classificado, agregador puro.
const NAO_E_JORNAL = /(concurso|vagas|emprego|classificado|imoveis|autos|loteria|horoscopo|receitas|cupom|desconto)/i;
const sistemaDe = h => {
  if (/wp-content|wp-includes/i.test(h)) return 'WordPress';
  if (/ng-version|angular/i.test(h)) return 'Angular';
  if (/__NEXT_DATA__|_next\/static/i.test(h)) return 'Next.js';
  if (/liferay/i.test(h)) return 'Liferay';
  if (/joomla|com_content/i.test(h)) return 'Joomla';
  if (/drupal/i.test(h)) return 'Drupal';
  return 'outro';
};

/* ------------------------ 1. visitar o que ja conhecemos ----------------- */

async function visitarFeed(f, cat, dados){
  try {
    const r = await pegar(f.url);
    const n = contarRSS(r.txt);
    if (r.ok && n > 0) {
      anotar(cat, dados.chave, { ...dados, ok:true, itens:n, metodo:METODO.RSS, url:f.url });
      return true;
    }
    anotar(cat, dados.chave, { ...dados, ok:false, itens:0, motivo:`HTTP ${r.status}, ${n} itens` });
  } catch (e) {
    const bloqueada = /403|401|rejected/i.test(e.message);
    anotar(cat, dados.chave, { ...dados, ok:false, itens:0, bloqueada, motivo:String(e.message).slice(0,50) });
  }
  return false;
}

async function visitarOrgao(o, cat, dados){
  // pagina de listagem
  const tent = CAMINHOS_ASSESSORIA.map(async c => {
    const r = await pegar(o.base + c, 8000);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const m = lerListagem(r.txt, o.base);
    if (m.length < 3) throw new Error('pouca coisa');
    return { m, c, sistema: sistemaDe(r.txt) };
  });
  try {
    const { m, c, sistema } = await Promise.any(tent);
    anotar(cat, dados.chave, { ...dados, ok:true, itens:m.length, metodo:METODO.PAGINA,
                               caminho:c, sistema, url:o.base + c });
    return true;
  } catch {}

  // sitemap
  const smap = CAMINHOS_SITEMAP.map(async c => {
    const r = await pegar(o.base + c, 8000);
    if (!r.ok || !/<(urlset|sitemapindex)/i.test(r.txt)) throw new Error('sem sitemap');
    let e = lerSitemap(r.txt);
    if (ehIndice(r.txt)) {
      const filho = e.find(x => /(noticia|news|materia)/i.test(x.url)) || e[0];
      if (!filho) throw new Error('indice vazio');
      e = lerSitemap((await pegar(filho.url, 8000)).txt);
    }
    const n = filtrarNoticias(e, 48);
    if (n.length < 2) throw new Error('sem noticia');
    return { n, c };
  });
  try {
    const { n, c } = await Promise.any(smap);
    anotar(cat, dados.chave, { ...dados, ok:true, itens:n.length, metodo:METODO.SITEMAP,
                               caminho:c, url:o.base + c });
    return true;
  } catch {}

  anotar(cat, dados.chave, { ...dados, ok:false, itens:0, motivo:'nem pagina nem sitemap' });
  return false;
}

/* --------------------------- 2. descobrir novas -------------------------- */
// O Google já nos diz quem publica sobre cada assunto. Todo veículo que
// aparece nos resultados e não está no catálogo é candidato.

async function descobrir(uf, E, cat){
  const buscas = [
    `"${E.capital}" prefeitura OR camara when:2d`,
    `"${E.nome}" governo OR assembleia when:2d`,
    `"${E.nome}" policia OR justica when:2d`,
    `"${E.nome}" economia OR agro OR industria when:2d`
  ];
  const encontrados = new Map();

  for (const q of buscas) {
    try {
      const r = await pegar(gnews(q), 12000);
      const blocos = [...r.txt.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(m => m[0]);
      for (const b of blocos) {
        const veiculo = (b.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || '').trim();
        const dominio = (b.match(/<source[^>]+url=["']([^"']+)["']/i)?.[1] || '')
          .replace(/^https?:\/\//,'').replace(/\/.*$/,'').replace(/^www\./,'');
        if (!veiculo || !dominio) continue;
        const e = encontrados.get(dominio) || { veiculo, dominio, vezes:0 };
        e.vezes++;
        encontrados.set(dominio, e);
      }
    } catch {}
    await dormir(1500);
  }

  // ja temos este dominio, mesmo com www ou subdominio diferente?
  const raiz = d => String(d).replace(/^www\./,'').split('.').slice(-3).join('.');
  const achouRepetido = (cat, dom) => Object.values(cat.fontes)
    .some(f => f.dominio && raiz(f.dominio) === raiz(dom));

  const novos = [];
  for (const [dominio, e] of encontrados) {
    const chave = `${uf}:novo:${dominio.replace(/\./g,'-')}`;
    if (cat.fontes[chave] || Object.values(cat.fontes).some(f => f.dominio === dominio)) continue;
    if (e.vezes < 2) continue;   // apareceu uma vez só: pode ser acaso

    // tem RSS? testamos os caminhos mais comuns
    let achou = null;
    for (const c of ['/feed', '/rss', '/feed/', '/rss.xml', '/?feed=rss2']) {
      try {
        const r = await pegar('https://' + dominio + c, 8000);
        const n = contarRSS(r.txt);
        // feed com centenas de itens e agregador: entope a pauta sem acrescentar
        if (r.ok && n >= 3 && n <= 120) { achou = { url:'https://'+dominio+c, itens:n, sistema:sistemaDe(r.txt) }; break; }
      } catch {}
    }

    // filtro de qualidade: nem tudo que aparece no Google e fonte de noticia
    if (NAO_E_JORNAL.test(dominio + ' ' + e.veiculo)) continue;
    if (achouRepetido(cat, dominio)) continue;

    anotar(cat, chave, {
      nome: e.veiculo, dominio, uf: deduzirPraca(dominio, e.veiculo, uf), tipo:'veiculo', licenca:'pauta',
      aprovada: false,
      ok: !!achou,
      itens: achou?.itens || 0,
      metodo: achou ? METODO.RSS : METODO.GOOGLE,
      url: achou?.url || gnews(`site:${dominio}`),
      sistema: achou?.sistema,
      apareceuVezes: e.vezes,
      descobertoEm: new Date().toISOString().slice(0,10)
    });
    novos.push({ ...e, temRSS: !!achou });
    await dormir(300);
  }
  return novos;
}

/* -------------------------------- execução ------------------------------- */

const UF = (process.env.ESTADO || 'mt').trim().toLowerCase();
const E = ESTADOS[UF] || ESTADOS.mt;
const cat = await ler();
const antes = JSON.parse(JSON.stringify(cat.fontes || {}));

console.log(`\n  EXPLORADOR · ${E.nome} · ${new Date().toISOString().slice(0,16)}`);
console.log('  ' + '='.repeat(72));

console.log('\n  visitando fontes conhecidas...');

// nacionais (uma vez só, no estado principal)
if (UF === 'mt') {
  for (const f of [...PAUTA_GERAL, ...NACIONAL]) {
    const livre = NACIONAL.some(x => x.id === f.id);
    await visitarFeed(f, cat, { chave:`br:${f.id}`, nome:f.nome, uf:'br',
      tipo: livre ? 'agencia' : 'veiculo', licenca: livre ? 'livre' : 'pauta', aprovada:true,
      dominio: (f.url.match(/\/\/([^\/]+)/)||[])[1] });
    await dormir(150);
  }
}

// veículos do estado
for (const v of E.veiculos) {
  await visitarFeed(v, cat, { chave:`${UF}:${v.id}`, nome:v.nome, uf:UF, tipo:'veiculo',
    licenca:'pauta', aprovada:true, dominio:(v.url.match(/\/\/([^\/]+)/)||[])[1] });
  await dormir(150);
}

// assessorias e setoriais
for (const o of [...E.assessorias, ...E.setoriais.filter(x=>x.base)]) {
  const tipo = E.assessorias.includes(o) ? 'assessoria' : 'setorial';
  await visitarOrgao(o, cat, { chave:`${UF}:${o.id}`, nome:o.nome, uf:UF, tipo,
    licenca:'livre', aprovada:true, dominio:(o.base.match(/\/\/([^\/]+)/)||[])[1] });
  await dormir(250);
}

// bloqueados: registramos o estado sem bater na porta de novo
for (const b of (BLOQUEADOS[UF] || [])) {
  anotar(cat, `${UF}:${b.id}`, { nome:b.nome, uf:UF, tipo:'assessoria', licenca:'pauta',
    aprovada:true, ok:false, bloqueada:true, itens:0, metodo:METODO.GOOGLE,
    dominio:b.dominio, motivo:b.motivo, url:gnews(`site:${b.dominio}`) });
}

console.log('\n  procurando veiculos novos no indice do Google...');
const novos = await descobrir(UF, E, cat);
if (novos.length) {
  for (const n of novos) {
    console.log(`  NOVO  ${n.veiculo.padEnd(28)} ${n.dominio.padEnd(30)} ${n.temRSS ? 'tem RSS' : 'so pelo Google'} · apareceu ${n.vezes}x`);
  }
} else {
  console.log('  nenhum veiculo novo desta vez');
}

/* ------------------------------ o que mudou ------------------------------ */

const mudou = [];
for (const [k, f] of Object.entries(cat.fontes)) {
  const a = antes[k];
  if (!a) { mudou.push(`ENTROU  ${f.nome} (${k})`); continue; }
  if (a.estado !== f.estado) mudou.push(`${f.estado === ESTADO_FONTE.ATIVA ? 'VOLTOU ' : 'MUDOU  '} ${f.nome}: ${a.estado} -> ${f.estado}`);
}

const g = agrupar(cat);
console.log('\n  ' + '='.repeat(72));
console.log(`  catalogo: ${g.total} fontes`);
console.log('  por estado :', Object.entries(g.porEstado).map(([k,v]) => `${k} ${v.length}`).join(' · '));
console.log('  por metodo :', Object.entries(g.porMetodo).map(([k,v]) => `${k} ${v.length}`).join(' · '));
console.log('  por licenca:', Object.entries(g.porLicenca).map(([k,v]) => `${k} ${v.length}`).join(' · '));

if (mudou.length) {
  console.log('\n  MUDOU DESDE ONTEM:');
  mudou.slice(0, 25).forEach(m => console.log('    ' + m));
} else {
  console.log('\n  nada mudou desde ontem.');
}

if (g.quarentena.length) {
  console.log(`\n  AGUARDANDO SUA APROVACAO (${g.quarentena.length}):`);
  g.quarentena.slice(0, 12).forEach(f =>
    console.log(`    nota ${String(f.nota).padStart(3)} · ${f.nome.padEnd(26)} ${(f.dominio||'').padEnd(28)} ${f.metodo}`));
}

if (g.atencao.length) {
  console.log(`\n  PRECISAM DE ATENCAO (${g.atencao.length}):`);
  g.atencao.slice(0, 12).forEach(f =>
    console.log(`    ${f.nome.padEnd(26)} ${f.estado.padEnd(10)} ${f.diasFora || 0}d fora · ${f.motivo || ''}`));
}

await gravar(cat);
console.log(`\n  catalogo gravado em dados/catalogo.json\n`);
