// MERIDIANO — pipeline completo.
//
//   1. PAUTA      lê os grandes veículos só para saber o que é notícia hoje.
//                 Nada daqui vai ao ar. É termômetro.
//   2. FONTE      lê as agências e órgãos que autorizam reprodução.
//   3. CRUZAMENTO vê quais histórias da pauta existem na fonte livre.
//   4. REESCRITA  o Gemini escreve nosso texto a partir do documento livre.
//   5. SOBRA      pauta sem fonte livre não é publicada. Vira sugestão interna.

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { reescrever, textoCompleto, temChave, modeloUsado, preparar, escreverCirculacao } from './redator.mjs';
import { pagina, slug } from './radar.mjs';
import { lerListagem, CAMINHOS_SITEMAP, lerSitemap, ehIndice, filtrarNoticias, tituloDaPagina } from './assessorias.mjs';
import { ESTADOS, EDICOES_GERAIS, NACIONAL, PAUTA_GERAL, CAMINHOS_ASSESSORIA, BLOQUEADOS } from './estados.mjs';

const JANELA_HORAS = 24;
const QUANTAS_REESCREVER = 8;

/* ===================== 1. PAUTA — termômetro, não publica ================= */

const gnews = q => `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:1d')}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

const PAUTA = [
  // grandes veículos, direto do RSS deles
  { id:'g1',      nome:'g1',     editoria:'brasil', url:'https://g1.globo.com/rss/g1/' },
  { id:'folha',   nome:'Folha',  editoria:'brasil', url:'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml' },
  { id:'folhamundo', nome:'Folha Mundo', editoria:'internacional', url:'https://feeds.folha.uol.com.br/mundo/rss091.xml' },
  { id:'g1mundo', nome:'g1 Mundo', editoria:'internacional', url:'https://g1.globo.com/rss/g1/mundo/' },
  { id:'g1politica', nome:'g1 Política', editoria:'brasil', url:'https://g1.globo.com/rss/g1/politica/' },
  { id:'g1economia', nome:'g1 Economia', editoria:'brasil', url:'https://g1.globo.com/rss/g1/economia/' },

  { id:'cnn',        nome:'CNN Brasil',   editoria:'brasil',        url:'https://www.cnnbrasil.com.br/feed/' },
  { id:'cnn-inter',  nome:'CNN Internacional', editoria:'internacional', url:'https://www.cnnbrasil.com.br/internacional/feed/' },
  { id:'uol',        nome:'UOL',          editoria:'brasil',        url:'https://rss.uol.com.br/feed/noticias.xml' },
  { id:'estadao',    nome:'Estadão',      editoria:'brasil',        url:'https://www.estadao.com.br/rss/ultimas.xml' },
  { id:'poder360',   nome:'Poder360',     editoria:'brasil',        url:'https://www.poder360.com.br/feed/' },
  { id:'bbcbrasil',  nome:'BBC Brasil',   editoria:'internacional', url:'https://feeds.bbci.co.uk/portuguese/rss.xml' },
  { id:'infomoney',  nome:'InfoMoney',    editoria:'brasil',        url:'https://www.infomoney.com.br/feed/' },
  { id:'valor',      nome:'Valor',        editoria:'brasil',        url:'https://valor.globo.com/rss/' },
  { id:'canalrural', nome:'Canal Rural',  editoria:'regional',      url:'https://www.canalrural.com.br/feed/' },

  // buscas para cobrir quem não tem RSS aberto
  { id:'gn-brasil',  nome:'Brasil',        editoria:'brasil',        url:gnews('Brasil governo OR congresso OR economia') },
  { id:'gn-mundo',   nome:'Mundo',         editoria:'internacional', url:gnews('mundo internacional guerra OR acordo OR eleição') },
  { id:'gn-cuiaba',  nome:'Cuiabá',        editoria:'regional',      url:gnews('Cuiabá prefeitura OR câmara OR vereadores') },
  { id:'gn-vg',      nome:'Várzea Grande', editoria:'regional',      url:gnews('"Várzea Grande" "Mato Grosso" -"Mato Grosso do Sul"') },
  { id:'gn-mt',      nome:'Mato Grosso',   editoria:'regional',      url:gnews('"Mato Grosso" governo OR assembleia OR TCE -"Mato Grosso do Sul"') },
  { id:'gn-agro',    nome:'Agro MT',       editoria:'regional',      url:gnews('"Mato Grosso" soja OR milho OR algodão OR Imea -"Mato Grosso do Sul"') },

  // veículos de MT que publicam RSS (confirmados na varredura de 27/07)
  { id:'odocumento', nome:'O Documento',  editoria:'regional', url:'https://odocumento.com.br/feed' },
  { id:'estadaomt',  nome:'Estadão MT',   editoria:'regional', url:'https://www.estadaomatogrosso.com.br/feed' },
  { id:'olivre',     nome:'O Livre',      editoria:'regional', url:'https://www.olivre.com.br/feed' },
  { id:'issoenoticia', nome:'Isso É Notícia', editoria:'regional', url:'https://issoenoticia.com.br/feed' },
  { id:'muvuca',     nome:'Muvuca Popular', editoria:'regional', url:'https://www.muvucapopular.com.br/feed' },
  { id:'cenariomt',  nome:'CenárioMT',    editoria:'regional', url:'https://www.cenariomt.com.br/feed' },
  { id:'vgnoticias', nome:'VG Notícias',  editoria:'regional', url:'https://www.vgnoticias.com.br/feed' },
  { id:'sonoticias', nome:'Só Notícias',  editoria:'regional', url:'https://www.sonoticias.com.br/feed' }
];

/* =============== 2. FONTE LIVRE — daqui sai o texto ======================= */

const FONTE_LIVRE = [
  { id:'ab-politica',  nome:'Agência Brasil',  editoria:'brasil',        url:'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml' },
  { id:'ab-economia',  nome:'Agência Brasil',  editoria:'brasil',        url:'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml' },
  { id:'ab-justica',   nome:'Agência Brasil',  editoria:'brasil',        url:'https://agenciabrasil.ebc.com.br/rss/justica/feed.xml' },
  { id:'ab-geral',     nome:'Agência Brasil',  editoria:'brasil',        url:'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml' },
  { id:'ab-inter',     nome:'Agência Brasil',  editoria:'internacional', url:'https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml' },
  { id:'camara',       nome:'Agência Câmara',  editoria:'brasil',        url:'https://www.camara.leg.br/noticias/rss' },
  { id:'senado',       nome:'Agência Senado',  editoria:'brasil',        url:'https://www12.senado.leg.br/noticias/ultimas/feed' },
  { id:'onu',          nome:'ONU News',        editoria:'internacional', url:'https://news.un.org/feed/subscribe/pt/news/all/rss.xml' },
  { id:'conversation', nome:'The Conversation',editoria:'internacional', url:'https://theconversation.com/br/articles.atom' },
  { id:'vaticano',     nome:'Vatican News',    editoria:'internacional', url:'https://www.vaticannews.va/pt.rss.xml' },
  { id:'gov-mt',       nome:'Governo de MT',   editoria:'regional',      url:'https://www.mt.gov.br/rss' },
  { id:'vg-pref',      nome:'Prefeitura de VG',editoria:'regional',      url:'https://www.varzeagrande.mt.gov.br/rss' }
];

// Só destes domínios o texto pode ser lido e reescrito.
// Dominios de onde o texto pode ser lido e reescrito. Nem todo orgao usa
// .gov.br: a Prefeitura do Rio e prefeitura.rio, e ha muitos com dominio
// proprio. Por isso reconhecemos tambem pelo nome da instituicao.
const PODE_REESCREVER = new RegExp([
  // agencias e organismos que autorizam por escrito
  'agenciabrasil\\.ebc\\.com\\.br', 'news\\.un\\.org', 'theconversation\\.com', 'vaticannews\\.va',
  // sufixos oficiais brasileiros
  '\\.gov\\.br', '\\.jus\\.br', '\\.leg\\.br', '\\.mp\\.br', '\\.tc\\.br', '\\.def\\.br',
  // dominios proprios de instituicao publica
  'prefeitura\\.rio', 'prefeitura\\.[a-z]{2,}\\.', 'camara[a-z]*\\.[a-z.]+\\.br',
  '(alerj|alesp|almg|alba|alrs|almt)\\.', 'tribunal[a-z]*\\.', 'defensoria[a-z]*\\.',
  // nome da instituicao no dominio
  '//(www\\.)?(prefeitura|camaramunicipal|assembleia|tcm|tce|tj[a-z]{2}|mp[a-z]{2}|tre[a-z-]*)\\.'
].join('|'), 'i');

const BLOQUEIO = ['reuters','afp','associated press','efe','ansa','sputnik','xinhua','lusa','dpa'];
const RE_BLOQUEIO = new RegExp('\\b(' + BLOQUEIO.map(b=>b.replace(/ /g,'\\s+')).join('|') + ')\\b','i');

/* ============================== apoio ===================================== */

const dormir = ms => new Promise(r => setTimeout(r, ms));
const semAcento = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

const limpar = s => {
  let t = String(s||'').replace(/<!\[CDATA\[|\]\]>/g,'');
  for (let i=0;i<2;i++){
    t = t.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
         .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ');
    t = t.replace(/<[^>]+>/g,' ');
  }
  return t.replace(/\s+/g,' ').trim();
};
const campo = (b,t) => { const m=b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`,'i')); return m?m[1].trim():''; };
const attr  = (b,t,a) => { const m=b.match(new RegExp(`<${t}[^>]*${a}="([^"]+)"`,'i')); return m?m[1]:''; };

function lerRSS(xml){
  return [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(m=>m[0]).map(b=>({
    titulo: limpar(campo(b,'title')),
    link: campo(b,'link') || attr(b,'link','href') || '',
    resumo: limpar(campo(b,'description') || campo(b,'summary') || campo(b,'content')),
    data: campo(b,'pubDate') || campo(b,'published') || campo(b,'updated') || '',
    veiculo: limpar(campo(b,'source'))
  })).filter(i => i.titulo && i.link);
}

async function buscar(url, ms=20000, tentativas=2){
  let ultimo;
  for (let i=0;i<tentativas;i++){
    const c = new AbortController();
    const t = setTimeout(()=>c.abort(), ms);
    try {
      const r = await fetch(url, { signal:c.signal, redirect:'follow',
        headers:{
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept':'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/html;q=0.8, */*;q=0.7',
        'Accept-Language':'pt-BR,pt;q=0.9,en;q=0.8',
        'X-Contact':'contato@meridiano.com.br'
      }});
      if (!r.ok) throw new Error('HTTP '+r.status);

      // Folha e varios portais publicam RSS em ISO-8859-1. Ler tudo como UTF-8
      // transforma acento em losango preto. Aqui detectamos o charset real.
      const bytes = new Uint8Array(await r.arrayBuffer());
      const cabecalho = r.headers.get('content-type') || '';
      let charset = (cabecalho.match(/charset=([\w-]+)/i) || [])[1];
      if (!charset) {
        const inicio = new TextDecoder('latin1').decode(bytes.slice(0, 200));
        charset = (inicio.match(/encoding=["']([\w-]+)["']/i) || [])[1] || 'utf-8';
      }
      try { return new TextDecoder(charset.toLowerCase()).decode(bytes); }
      catch { return new TextDecoder('utf-8').decode(bytes); }
    } catch(e){ ultimo=e; if (i<tentativas-1) await dormir(2000); }
    finally { clearTimeout(t); }
  }
  throw ultimo;
}

const VAZIAS = new Set(('de da do das dos uma que ao aos apos ate entre pelo pela como mais menos nao seu sua seus suas este esta isso para com sem sobre por nos nas apenas onde quem qual dois duas tres').split(' '));

// Radical de 7 letras: faz "desembargador" casar com "desembargadores",
// "eleicao" com "eleicoes", "contrato" com "contratos".
// Sigla de 3 letras entra (MDB, TSE, STF, PGR, TCE) — sao justamente as que
// identificam a historia.
const chavesDe = t => [...new Set(
  semAcento(t).replace(/[^a-z0-9\s]/g,' ').split(/\s+/)
    .filter(p => p.length >= 3 && !VAZIAS.has(p))
    .map(p => p.slice(0,5))
)];

function parecidas(a,b){
  const A = chavesDe(a), B = chavesDe(b);
  if (A.length < 2 || B.length < 2) return 0;
  const comuns = A.filter(p => B.includes(p)).length;
  return comuns / Math.min(A.length, B.length);
}

const horaBR = iso => new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Cuiaba'}).replace(':','h');
const corte = Date.now() - JANELA_HORAS*3600*1000;

// Antes era um feed por vez: 30 feeds a 2s cada = 1 minuto so de espera.
// Agora vao em lotes de 6 ao mesmo tempo. Mesma cortesia com cada servidor,
// mas o tempo total cai para um quinto.
async function colher(lista, rotulo, tamanhoLote = 6){
  const saida = [], rel = [];

  async function uma(f){
    try {
      const itens = lerRSS(await buscar(f.url)).slice(0, 12);
      let ok = 0;
      for (const b of itens) {
        const ts = Date.parse(b.data);
        if (Number.isNaN(ts) || ts < corte) continue;
        if (RE_BLOQUEIO.test(semAcento(b.titulo+' '+b.resumo+' '+b.veiculo))) continue;
        let titulo = b.titulo;
        if (b.veiculo && titulo.endsWith(' - '+b.veiculo)) titulo = titulo.slice(0, -(b.veiculo.length+3)).trim();
        if (titulo.length < 30 || titulo.split(/\s+/).length < 5) continue;
        saida.push({ titulo, link:b.link, resumo:b.resumo, iso:new Date(ts).toISOString(),
                     veiculo: b.veiculo || f.nome, editoria: f.editoria, fonteId: f.id });
        ok++;
      }
      rel.push(`ok    ${rotulo}:${f.id.padEnd(14)} ${String(ok).padStart(3)}`);
    } catch(e){ rel.push(`aviso ${rotulo}:${f.id.padEnd(14)} ${String(e.message).slice(0,34)}`); }
  }

  for (let i = 0; i < lista.length; i += tamanhoLote) {
    await Promise.all(lista.slice(i, i + tamanhoLote).map(uma));
    if (i + tamanhoLote < lista.length) await dormir(600);
  }
  return { itens: saida, rel };
}

/* ============================== execução ================================== */

console.log('\n  MERIDIANO · ' + new Date().toISOString());
console.log('  ' + '='.repeat(66));

const UF = (process.env.ESTADO || 'mt').trim().toLowerCase();

// Cinco edicoes: br, mundo, mt, rs, rj. As duas primeiras cuidam do que e
// comum a todos; as tres estaduais cuidam so do regional. Assim o nacional
// para de ocupar as vagas de reescrita das estaduais.
const GERAL = EDICOES_GERAIS[UF] || null;
const E = GERAL || ESTADOS[UF] || ESTADOS.mt;
const EDITORIA = UF === 'br' ? 'brasil' : UF === 'mundo' ? 'internacional' : 'regional';

console.log('\n  1. PAUTA — o que os veículos estão dando');
const listaPauta = GERAL
  ? GERAL.pauta.map(f => ({ ...f, editoria: EDITORIA }))
  : [...E.veiculos.map(f => ({ ...f, editoria:'regional' })),
     ...PAUTA_GERAL.filter(f => /^gn-/.test(f.id)).map(f => ({ ...f, editoria:'regional' })),
     { id:`gn-${UF}`, nome:E.nome, editoria:'regional',
       url:gnews(`"${E.nome}" ${E.excluir||''} when:1d`) },
     { id:`gn-${UF}-cap`, nome:E.capital, editoria:'regional',
       url:gnews(`"${E.capital}" prefeitura OR camara OR policia when:1d`) }];

const P = await colher(listaPauta, 'pauta');
P.rel.forEach(l=>console.log('  '+l));
console.log(`     ${P.itens.length} manchetes de pauta`);

// Veiculo que nao responde vira busca no Google pelo dominio dele. Assim
// GZH, Correio do Povo e Matinal continuam pautando mesmo sem RSS — o Google
// indexa todos eles. Uniforme e sem adivinhar endereco de feed.
const caiu = P.rel.filter(l => l.startsWith('aviso'))
  .map(l => l.match(/aviso pauta:(\S+)/)?.[1]).filter(Boolean);

if (caiu.length) {
  const resgate = (GERAL ? GERAL.pauta : [...E.veiculos, ...PAUTA_GERAL])
    .filter(v => caiu.includes(v.id) && v.url)
    .map(v => {
      const dom = (v.url.match(/\/\/([^\/]+)/) || [])[1];
      return dom ? { ...v, url: gnews(`site:${dom.replace(/^www\./,'')} when:1d`) } : null;
    })
    .filter(Boolean);

  if (resgate.length) {
    console.log(`\n  1b. RESGATE — ${resgate.length} veiculos sem RSS, pelo indice do Google`);
    const R = await colher(resgate, 'resgate', 4);
    R.rel.forEach(l => console.log('  ' + l));
    P.itens.push(...R.itens);
    console.log(`     ${P.itens.length} manchetes de pauta no total`);
  }
}

console.log('\n  2. FONTE LIVRE — de onde o texto pode sair');
const listaLivre = GERAL
  ? GERAL.livres.map(f => ({ ...f, editoria: EDITORIA }))
  : [];   // nas estaduais o texto vem das assessorias, no passo 2b

const F = listaLivre.length ? await colher(listaLivre, 'livre') : { itens: [], rel: [] };
F.rel.forEach(l=>console.log('  '+l));
console.log(`     ${F.itens.length} itens de fonte livre`);

if (!GERAL) {
console.log('\n  2b. ASSESSORIAS PUBLICAS — release oficial, tres caminhos');
console.log(`     estado: ${E.nome}`);

async function porSitemap(base){
  // Antes: 6 caminhos em fila, 15s cada = ate 90s por orgao. Agora todos
  // juntos, 8s. O primeiro que responder com noticia vence.
  const tentativas = CAMINHOS_SITEMAP.map(async c => {
    const xml = await buscar(base + c, 8000, 1);
    if (!/<(urlset|sitemapindex)/i.test(xml)) throw new Error('nao e sitemap');
    let entradas = lerSitemap(xml);
    if (ehIndice(xml)) {
      const filho = entradas.find(e => /(noticia|news|post|materia)/i.test(e.url)) || entradas[0];
      if (!filho) throw new Error('indice vazio');
      entradas = lerSitemap(await buscar(filho.url, 8000, 1));
    }
    const noticias = filtrarNoticias(entradas, 48);
    if (noticias.length < 2) throw new Error('sem noticia recente');
    return noticias;
  });
  try { return await Promise.any(tentativas); } catch { return []; }
}

const ORGAOS_DO_ESTADO = [...E.assessorias, ...E.setoriais.filter(x=>x.base)];
async function tratarOrgao(o){
  let entrou = 0;

  // 1. pagina de listagem
  const porPagina = CAMINHOS_ASSESSORIA.map(async caminho => {
    const html = await buscar(o.base + caminho, 8000, 1);
    const m = lerListagem(html, o.base);
    if (m.length < 3) throw new Error('pouca coisa');
    return { m, caminho };
  });
  try {
    { const { m, caminho } = await Promise.any(porPagina);
      for (const x of m) F.itens.push({ titulo:x.titulo, link:x.link, resumo:'',
        iso:new Date().toISOString(), veiculo:o.nome, editoria:'regional', uf:UF, fonteId:o.id });
      console.log(`  ok    ${o.id.padEnd(12)} ${String(m.length).padStart(2)} · pagina ${caminho}`);
      entrou = m.length; }
  } catch {}

  // 2. sitemap.xml — funciona onde a pagina e montada por JavaScript
  if (!entrou) {
    const noticias = await porSitemap(o.base);
    for (const n of noticias.slice(0, 8)) {
      let titulo = n.titulo;
      if (!titulo) {
        try { titulo = tituloDaPagina(await buscar(n.url, 12000, 1)); } catch {}
      }
      if (!titulo || titulo.length < 25) continue;
      F.itens.push({ titulo, link:n.url, resumo:'',
        iso:new Date(Date.parse(n.data) || Date.now()).toISOString(),
        veiculo:o.nome, editoria:'regional', uf:UF, fonteId:o.id });
      entrou++;
      await dormir(300);
    }
    if (entrou) console.log(`  ok    ${o.id.padEnd(12)} ${String(entrou).padStart(2)} · sitemap`);
  }

  if (!entrou) console.log(`  aviso ${o.id.padEnd(12)} sem pagina nem sitemap`);
}

for (let k = 0; k < ORGAOS_DO_ESTADO.length; k += 4) {
  await Promise.all(ORGAOS_DO_ESTADO.slice(k, k+4).map(tratarOrgao));
  if (k + 4 < ORGAOS_DO_ESTADO.length) await dormir(400);
}
console.log(`     ${F.itens.length} itens de fonte livre no total`);
}

// Orgaos que recusam nosso robo mas o Google indexa. Entram como PAUTA
// oficial: se o TCE publicou, a historia existe e e de fonte publica. Nao
// da para pegar o texto deles, mas o sinal vale — e muitas vezes a mesma
// historia aparece na Agencia Brasil ou em orgao que abre.
const bloq = BLOQUEADOS[UF] || [];
if (bloq.length) {
  console.log('\n  2c. ORGAOS BLOQUEADOS — pauta oficial pelo indice do Google');
  const buscas = bloq.map(b => ({ ...b, url: gnews(`site:${b.dominio}`) }));
  for (let k = 0; k < buscas.length; k += 4) {
    await Promise.all(buscas.slice(k, k+4).map(async b => {
      try {
        const itens = lerRSS(await buscar(b.url, 12000, 1)).slice(0, 6);
        let n = 0;
        for (const it of itens) {
          const ts = Date.parse(it.data);
          if (Number.isNaN(ts) || ts < corte) continue;
          let titulo = it.titulo;
          if (it.veiculo && titulo.endsWith(' - '+it.veiculo)) titulo = titulo.slice(0, -(it.veiculo.length+3)).trim();
          if (titulo.length < 30) continue;
          P.itens.push({ titulo, link: it.link, resumo:'', iso:new Date(ts).toISOString(),
                         veiculo: b.nome, editoria:'regional', uf:UF, oficial:true, fonteId:b.id });
          n++;
        }
        console.log(`  ok    ${b.id.padEnd(12)} ${String(n).padStart(2)} · ${b.motivo}`);
      } catch { console.log(`  aviso ${b.id.padEnd(12)} sem retorno`); }
    }));
    if (k + 4 < buscas.length) await dormir(1200);
  }
}

// PROMOCAO: item de pauta que veio de dominio oficial e, na verdade, fonte
// livre. O Google indexa os releases das prefeituras e orgaos, e eles chegam
// pela porta errada. Em vez de consertar raspagem site a site, reconhecemos
// pelo endereco: .gov.br, .jus.br, .leg.br e .mp.br autorizam reproducao.
const promovidos = [];
for (const p of P.itens) {
  if (!p.link || !PODE_REESCREVER.test(p.link)) continue;
  if (F.itens.some(f => f.link === p.link)) continue;
  promovidos.push({ ...p, editoria: EDITORIA, uf: GERAL ? null : UF });
}
if (promovidos.length) {
  F.itens.push(...promovidos);
  console.log(`\n  2d. PROMOVIDOS — ${promovidos.length} releases oficiais que vieram pela pauta`);
  for (const x of promovidos.slice(0, 8)) console.log(`  ok    ${x.veiculo.slice(0,26).padEnd(28)} ${x.titulo.slice(0,44)}`);
  console.log(`     ${F.itens.length} itens de fonte livre no total`);
}

console.log('\n  3. CRUZAMENTO');
const confirmadas = [], soPauta = [];
for (const l of F.itens) {
  const casam = P.itens.filter(p => parecidas(p.titulo, l.titulo) >= 0.30);
  if (casam.length) {
    l.pautadoPor = [...new Set(casam.map(c=>c.veiculo))].slice(0,4);
    l.quentura = casam.length;
    // pautada por orgao publico vale por tres veiculos comuns
    if (casam.some(c => c.oficial)) l.quentura += 3;
    l.temOficial = casam.some(c => c.oficial);
    confirmadas.push(l);
  }
}
for (const p of P.itens) {
  if (confirmadas.some(c => parecidas(c.titulo, p.titulo) >= 0.30)) continue;

  // Quantos veiculos diferentes deram esta mesma historia?
  const eco = P.itens.filter(o => o !== p && o.veiculo !== p.veiculo && parecidas(o.titulo, p.titulo) >= 0.35);
  p.quentura = eco.length;
  p.tambemEm = [...new Set(eco.map(e => e.veiculo))].slice(0, 3);
  soPauta.push(p);
}

// A lista de pauta so vale se for sinal, nao ruido. Fica o que dois ou mais
// veiculos deram, ou o que e de Mato Grosso. Concurso em Taubate e baleia em
// Santa Catarina nao sao pauta para um jornal de Cuiaba.
const EH_DAQUI = /(mato grosso|cuiaba|varzea grande|rondonopolis|sinop|sorriso|primavera do leste|tangara|caceres|barra do garcas|lucas do rio verde|nova mutum|alta floresta|pantanal|mt\b)/;
const relevante = p => p.quentura >= 2 || p.editoria === 'regional' || EH_DAQUI.test(semAcento(p.titulo));

const soPautaFiltrada = soPauta
  .filter(relevante)
  .sort((a,b) => (b.quentura - a.quentura) || (Date.parse(b.iso) - Date.parse(a.iso)));
confirmadas.sort((a,b)=>b.quentura-a.quentura);
console.log(`     ${confirmadas.length} histórias confirmadas em fonte livre`);
console.log(`     ${soPauta.length} sem fonte livre, das quais ${soPautaFiltrada.length} relevantes`);

console.log('\n  4. REESCRITA');
await mkdir('materia',{recursive:true});
await mkdir('dados',{recursive:true});
const publicados = [];
let escritas = 0;

if (temChave()) {
  try {
    const info = await preparar();
    console.log('     modelo escolhido: ' + info.escolhido);
    console.log('     flash disponiveis: ' + info.disponiveis.join(', '));
  } catch (e) {
    console.log('     ATENCAO ' + e.message);
  }

  const fila = [...confirmadas, ...F.itens.filter(i=>!confirmadas.includes(i))]
    .filter(i => PODE_REESCREVER.test(i.link))
    .slice(0, QUANTAS_REESCREVER);

  // As reescritas tambem iam em fila: cada uma esperava a anterior, e uma
  // pagina lenta segurava todas. Agora vao de tres em tres.
  async function escreverUma(i){
    try {
      const texto = await textoCompleto(i.link, 12000);
      const m = await reescrever({ fonte: i.veiculo, titulo: i.titulo, texto });
      const arq = slug(m.titulo)+'.html';
      await writeFile('materia/'+arq, pagina(
        { chapeu: i.editoria==='regional'?E.nome:i.editoria==='internacional'?'Mundo':'Brasil',
          titulo:m.titulo, linhaFina:m.linhaFina, corpo:m.corpo, checar:[] },
        { link:i.link, municipio:'' }, i.iso), 'utf8');
      publicados.push({
        id:'ilm:'+slug(m.titulo), editoria: EDITORIA, chapeu:'Nosso texto',
        titulo:m.titulo, resumo:m.linhaFina,
        fonte:'Meridiano, com informações de '+i.veiculo,
        origemLink:i.link, origemNome:i.veiculo,
        pautadoPor:i.pautadoPor||[], quentura:i.quentura||0,
        uf: GERAL ? null : UF,
        link:'/materia/'+arq, iso:i.iso, hora:horaBR(i.iso), original:true
      });
      escritas++;
      console.log('     ok    '+m.titulo.slice(0,58));
    } catch(e){ console.log('     pulou '+String(e.message).slice(0,58)); }
  }

  // Sem teto, a unica assessoria que abre domina a edicao inteira — e cinco
  // materias da mesma prefeitura, duas sobre o mesmo evento, viram boletim
  // oficial em vez de jornal.
  const TETO_POR_FONTE = 3;

  // Reveza entre as fontes antes de repetir: uma de cada, depois a segunda de
  // cada. Assim uma prefeitura falante nao ocupa a edicao inteira, e as fontes
  // com pouco volume ainda aparecem.
  function revezar(itens){
    const porFonte = new Map();
    for (const i of itens) {
      if (!porFonte.has(i.veiculo)) porFonte.set(i.veiculo, []);
      porFonte.get(i.veiculo).push(i);
    }
    const filas = [...porFonte.values()];
    const saida = [];
    let sobrou = true;
    while (sobrou) {
      sobrou = false;
      for (const f of filas) {
        const x = f.shift();
        if (x) { saida.push(x); sobrou = true; }
      }
    }
    return saida;
  }

  const usos = new Map();
  const titulosJaFeitos = [];

  const filaLimpa = revezar(fila).filter(i => {
    const n = (usos.get(i.veiculo) || 0);
    if (n >= TETO_POR_FONTE) return false;
    // mesma historia com titulo diferente: "MT AgroFestival lanca programacao"
    // e "Prefeitura lanca programacao do AgroFestival" sao a mesma coisa
    if (titulosJaFeitos.some(t => parecidas(t, i.titulo) >= 0.55)) return false;
    usos.set(i.veiculo, n + 1);
    titulosJaFeitos.push(i.titulo);
    return true;
  });

  const cortadas = fila.length - filaLimpa.length;
  if (cortadas) console.log(`     ${cortadas} descartadas por repeticao ou teto de ${TETO_POR_FONTE} por fonte`);

  for (let k = 0; k < filaLimpa.length; k += 3) {
    await Promise.all(filaLimpa.slice(k, k+3).map(escreverUma));
    if (k + 3 < filaLimpa.length) await dormir(800);
  }
} else {
  console.log('     sem GEMINI_API_KEY — reescrita desligada');
}

// ===================== ARQUIVO — a memoria do jornal =======================
// A edicao expira em 24h, mas o que NOS escrevemos fica para sempre. Este
// indice e a base do assistente: ele so podera responder citando materia
// publicada aqui, com link. Sem arquivo, a IA nao tem o que citar e inventa.
try {
  const CAMINHO_ARQ = `dados/arquivo-${UF}.json`;
  let arquivo = { uf: UF, criado: new Date().toISOString(), itens: [] };
  try { arquivo = JSON.parse(await readFile(CAMINHO_ARQ,'utf8')); } catch {}

  const jaTem = new Set((arquivo.itens || []).map(i => i.id));
  let novas = 0;
  for (const p of publicados) {
    if (!p.original || jaTem.has(p.id)) continue;
    arquivo.itens.push({
      id: p.id, titulo: p.titulo, resumo: p.resumo,
      editoria: p.editoria, uf: p.uf || null,
      fonte: p.fonte, origemLink: p.origemLink || '',
      link: p.link, iso: p.iso,
      dia: p.iso.slice(0,10)
    });
    novas++;
  }
  arquivo.itens.sort((a,b) => Date.parse(b.iso) - Date.parse(a.iso));
  arquivo.atualizado = new Date().toISOString();
  arquivo.total = arquivo.itens.length;

  await writeFile(CAMINHO_ARQ, JSON.stringify(arquivo, null, 2), 'utf8');
  console.log(`  arquivo ${UF}: +${novas} novas · ${arquivo.total} materias guardadas`);
} catch (e) {
  console.log('  aviso arquivo: ' + e.message);
}

// ============ CIRCULANDO — o que corre sem registro oficial ==============
// Nota escrita por nos sobre um fato que e nosso: a informacao esta
// circulando e nao achamos documento. Nao reproduz apuracao de ninguem,
// nao nomeia veiculo, nao nomeia pessoa comum, nao diz que e falso.
const circulando = [];
if (temChave() && soPautaFiltrada.length) {
  const candidatas = soPautaFiltrada
    .filter(p => (p.quentura || 0) >= 2)          // so o que ecoa de verdade
    .slice(0, 4);

  for (const c of candidatas) {
    try {
      const n = await escreverCirculacao({ titulo: c.titulo, resumo: '', editoria: EDITORIA });
      circulando.push({
        id: 'circ:' + slug(n.titulo),
        editoria: EDITORIA, uf: GERAL ? null : UF,
        titulo: n.titulo, corpo: n.corpo, aviso: n.aviso,
        iso: new Date().toISOString(),
        hora: horaBR(new Date().toISOString())
      });
      await dormir(900);
    } catch (e) {
      console.log('     circ pulou: ' + String(e.message).slice(0,52));
    }
  }
  if (circulando.length) console.log(`\n  5. CIRCULANDO — ${circulando.length} notas escritas`);
}

await writeFile(`dados/edicao-${UF}.json`, JSON.stringify({
  uf: UF,
  estado: E.nome,
  gerado: new Date().toISOString(),
  modelo: modeloUsado(),
  numeros: { pauta:P.itens.length, fonteLivre:F.itens.length, confirmadas:confirmadas.length, publicadas:escritas, semFonte:soPautaFiltrada.length },
  itens: publicados,
  circulando,
  pautas: soPautaFiltrada.slice(0,18).map(p=>({
    titulo:p.titulo, veiculo:p.veiculo, editoria:p.editoria,
    quentura:p.quentura||0, tambemEm:p.tambemEm||[]
  }))
}, null, 2), 'utf8');

console.log('\n  ' + '='.repeat(66));
console.log(`  ${escritas} matérias próprias publicadas · modelo ${modeloUsado()}`);
console.log(`  ${soPautaFiltrada.length} pautas relevantes sem fonte livre\n`);
