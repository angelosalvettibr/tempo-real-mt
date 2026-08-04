// MERIDIANO — pipeline completo.
//
//   1. PAUTA      lê os grandes veículos só para saber o que é notícia hoje.
//                 Nada daqui vai ao ar. É termômetro.
//   2. FONTE      lê as agências e órgãos que autorizam reprodução.
//   3. CRUZAMENTO vê quais histórias da pauta existem na fonte livre.
//   4. REESCRITA  o Gemini escreve nosso texto a partir do documento livre.
//   5. SOBRA      pauta sem fonte livre não é publicada. Vira sugestão interna.

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { reescrever, textoCompleto, temChave, modeloUsado, preparar, escreverCirculacao, escreverContexto, acharParecidos, acharOrgao, carteiraAcabou, fotoDaUltima } from './redator.mjs';
import { pagina, slug } from './radar.mjs';
import { cacarDocumento } from './cacador.mjs';
import { detectarMunicipio, destaques, foraDaPraca, ehNacional } from './municipios.mjs';
import { lerDiario, ASSOCIACOES } from './diario.mjs';
import { focus, comoTexto } from './bancocentral.mjs';
import { OFICIAIS } from './oficiais.mjs';

// A memoria do arquivo era declarada dentro do bloco da reescrita, entao o
// Circulando e o resgate nao enxergavam nada e publicavam sem relacionadas.
let arquivoMemoria = { itens: [] };

// Saude das fontes desta rodada. O robo ja sabia disso — imprimia no log e
// jogava fora. Agora vai para a edicao, e o painel mostra sem ninguem
// precisar abrir o Actions.
const SAUDE = [];
const anotarFonte = (tipo, id, nome, itens, erro) =>
  SAUDE.push({ tipo, id, nome: nome || id, itens: itens || 0, ok: !erro && itens > 0,
               respondeu: !erro, erro: erro ? String(erro).slice(0, 60) : null });
import { lerListagem, CAMINHOS_SITEMAP, lerSitemap, ehIndice, filtrarNoticias, tituloDaPagina } from './assessorias.mjs';
import { ESTADOS, EDICOES_GERAIS, NACIONAL, PAUTA_GERAL, CAMINHOS_ASSESSORIA, BLOQUEADOS, semDuplicar } from './estados.mjs';

const JANELA_HORAS = 24;
// Teto de seguranca, nao de selecao. Ele existia em 8 e cortava a fila ANTES
// de qualquer analise de merito — por posicao, nao por qualidade. No RS isso
// significou 43 releases oficiais virarem 3 materias: 35 sairam sem nem serem
// olhados, e os limites finos (por fonte, por cidade) derrubaram 5 dos 8 que
// sobraram. Quatro limitadores em serie, e o primeiro era cego.
//
// Agora ele so evita rodada absurda. Quem seleciona sao os tetos por fonte e
// por cidade, que e para isso que existem.
const QUANTAS_REESCREVER = Number(process.env.QUANTAS_REESCREVER || 40);

/* --------------------------- TETOS POR EDIÇÃO ---------------------------
   Os tetos eram iguais para todas as edicoes, e o resultado foi desigual:
   Mundo publicou 20 com 4 documentos, Mato Grosso publicou 1 com 15.

   Edicoes diferentes tem realidades diferentes. Mundo tem poucas fontes que
   entregam muito; MT tem muitas fontes que entregam pouco, e o teto por fonte
   sufoca. Ajustar por edicao e mais honesto que uma regra unica.

   Tudo por variavel de ambiente: TETO_MT, TETO_RS, TETO_RJ, TETO_BR, TETO_MUNDO
   sobrescrevem sem mexer no codigo.                                         */
const TETOS = {
  br:    { fonte: 5, materias: 40 },
  mundo: { fonte: 4, materias: 24 },   // poucas fontes, muito volume: segura
  mt:    { fonte: 8, materias: 40 },   // muitas fontes, pouco volume: solta
  rs:    { fonte: 7, materias: 40 },
  rj:    { fonte: 7, materias: 40 }
};

function tetoDaEdicao(chave){
  const base = TETOS[chave] || { fonte: 5, materias: 40 };
  const env = Number(process.env['TETO_' + String(chave).toUpperCase()] || 0);
  return env ? { ...base, fonte: env } : base;
}

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
/* ---------------------------- ONDE A MATERIA MORA ------------------------
   Toda materia de uma edicao estadual herdava a UF da edicao, sem olhar o
   conteudo. Bastava um feed do RS republicar noticia de Aracaju para o
   Meridiano etiquetar Sergipe como Rio Grande do Sul.

   Agora o conteudo manda: se cita outra praca, ou se e assunto nacional,
   a materia vai para Brasil em vez de ficar com a etiqueta errada.       */
function ondeMora(texto, editoriaPadrao, ufPadrao){
  if (!ufPadrao) return { editoria: editoriaPadrao, uf: null };

  const outra = foraDaPraca(texto, ufPadrao);
  if (outra) return { editoria:'brasil', uf:null, motivo:`cita ${outra.toUpperCase()}` };

  if (ehNacional(texto)) return { editoria:'brasil', uf:null, motivo:'assunto nacional' };

  return { editoria: editoriaPadrao, uf: ufPadrao };
}

const PODE_REESCREVER = new RegExp([
  // agencias e organismos que autorizam por escrito
  'agenciabrasil\\.ebc\\.com\\.br', 'news\\.un\\.org', 'theconversation\\.com', 'vaticannews\\.va',
  // dado publico: nao tem direito autoral, art. 8 da Lei 9.610/98
  'bcb\\.gov\\.br', 'olinda\\.bcb\\.gov\\.br', 'dadosabertos\\.bcb\\.gov\\.br',
  // jornalismo em licenca aberta (esteira 1 — permite adaptar)
  'globalvoices\\.org', 'scidev\\.net', 'agencia\\.fapesp\\.br',
  'jornal\\.usp\\.br', 'unicamp\\.br', 'jornal\\.unesp\\.br', 'wikinews\\.org',
  // instituicoes internacionais que autorizam reuso do proprio material.
  // A UE tem regra expressa: Decisao 2011/833/UE libera reutilizacao com credito.
  'ec\\.europa\\.eu', 'eeas\\.europa\\.eu', 'consilium\\.europa\\.eu',
  'operationirini\\.eu', 'acnur\\.org', 'unicef\\.org', 'who\\.int',
  // governo dos EUA: dominio publico
  'nasa\\.gov', 'usgs\\.gov', 'voaportugues\\.com', 'voanews\\.com',
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
// Fonte livre tem janela maior: orgao publica menos vezes por dia, e um
// release de ontem casa naturalmente com pauta de hoje.
const corteLivre = Date.now() - 48*3600*1000;

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
        if (Number.isNaN(ts) || ts < (rotulo === 'livre' ? corteLivre : corte)) continue;
        if (RE_BLOQUEIO.test(semAcento(b.titulo+' '+b.resumo+' '+b.veiculo))) continue;
        let titulo = b.titulo;
        if (b.veiculo && titulo.endsWith(' - '+b.veiculo)) titulo = titulo.slice(0, -(b.veiculo.length+3)).trim();
        if (titulo.length < 30 || titulo.split(/\s+/).length < 5) continue;
        saida.push({ titulo, link:b.link, resumo:b.resumo, iso:new Date(ts).toISOString(),
                     veiculo: b.veiculo || f.nome, editoria: f.editoria, fonteId: f.id });
        ok++;
      }
      rel.push(`ok    ${rotulo}:${f.id.padEnd(14)} ${String(ok).padStart(3)}`);
      anotarFonte(rotulo, f.id, f.nome, ok, null);
    } catch(e){
      rel.push(`aviso ${rotulo}:${f.id.padEnd(14)} ${String(e.message).slice(0,34)}`);
      anotarFonte(rotulo, f.id, f.nome, 0, e.message);
    }
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
       url:gnews(`"${E.capital}" prefeitura OR camara OR policia when:1d`) },
     // uma busca por cidade: e ali que mora a noticia que ninguem cobre
     ...((E.cidades_busca || E.cidades || []).slice(0, 12).map(c => ({
       id: 'gn-' + UF + '-' + c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z]/g,'').slice(0,10),
       nome: c, editoria: 'regional',
       url: gnews(`"${c}" prefeitura OR camara OR obras OR policia ${E.excluir||''} when:1d`)
     })))];

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
  ? semDuplicar(GERAL.livres).map(f => ({ ...f, editoria: EDITORIA }))
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

// O registro de orgaos do oficiais.mjs existia so para o cacador bater na
// porta quando um rumor precisava de documento. Era desperdicio: Prefeitura de
// Caxias, MPMT, Defesa Civil e Corpo de Bombeiros publicam release todo dia e
// nunca eram lidos na coleta normal. Agora a coleta e a uniao das duas listas,
// sem repetir quem ja estava (a mesma prefeitura aparecia com dois nomes).
const ORGAOS_DO_ESTADO = (() => {
  const todos = [...E.assessorias, ...E.setoriais.filter(x=>x.base), ...(OFICIAIS[UF] || [])];
  const chave = o => String(o.base || '').replace(/^https?:\/\/(www\d?\.)?/,'').replace(/\/+$/,'').toLowerCase();
  const vistos = new Set();
  return todos.filter(o => o.base && !vistos.has(chave(o)) && vistos.add(chave(o)));
})();
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
      anotarFonte('assessoria', o.id, o.nome, m.length, null);
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
    if (entrou) { console.log(`  ok    ${o.id.padEnd(12)} ${String(entrou).padStart(2)} · sitemap`); anotarFonte('assessoria', o.id, o.nome, entrou, null); }
  }

  if (!entrou) { console.log(`  aviso ${o.id.padEnd(12)} sem pagina nem sitemap`); anotarFonte('assessoria', o.id, o.nome, 0, 'sem pagina nem sitemap'); }
}

for (let k = 0; k < ORGAOS_DO_ESTADO.length; k += 4) {
  await Promise.all(ORGAOS_DO_ESTADO.slice(k, k+4).map(tratarOrgao));
  if (k + 4 < ORGAOS_DO_ESTADO.length) await dormir(400);
}
console.log(`     ${F.itens.length} itens de fonte livre, de ${ORGAOS_DO_ESTADO.length} orgaos`);
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
          if (Number.isNaN(ts) || ts < (rotulo === 'livre' ? corteLivre : corte)) continue;
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
// NIVEL DE EVIDENCIA — o que sustenta cada materia, dito na cara do leitor.
//   apurado    lemos o documento oficial
//   atribuido  veiculos independentes atribuem a mesma fonte oficial
//   circulando nem documento, nem convergencia
function nivelDe(item, textoCompleto){
  const oficial = item.link && PODE_REESCREVER.test(item.link);
  if (oficial) return { nivel:'confirmado', selo:'Confirmado oficialmente' };

  // A informacao nasceu no orgao; o veiculo so passou adiante. Atribuir ao
  // orgao e mais verdadeiro, mais util ao leitor, e nao da palco a concorrente.
  const orgao = acharOrgao((item.titulo || '') + ' ' + (textoCompleto || item.resumo || ''));
  if (orgao) return { nivel:'atribuido', selo:'Atribuído a ' + orgao, orgao };

  // Sem orgao nomeado nao ha a quem atribuir. Ai o selo precisa dizer que
  // outros veiculos publicaram — omitir os dois seria apuracao alheia sem
  // credito nenhum, e essa e a linha que nao se cruza.
  const veiculos = [...new Set(item.pautadoPor || [])];
  if (veiculos.length >= 2) {
    return { nivel:'atribuido', selo:'Publicado por ' + veiculos.slice(0,3).join(', '), veiculos };
  }
  return { nivel:'sem-confirmacao', selo:'Sem confirmação' };
}

const promovidos = [];
for (const p of P.itens) {
  if (!p.link || !PODE_REESCREVER.test(p.link)) continue;
  if (F.itens.some(f => f.link === p.link)) continue;
  {
    const w = ondeMora(p.titulo, EDITORIA, GERAL ? null : UF);
    promovidos.push({ ...p, editoria: w.editoria, uf: w.uf });
  }
}
if (promovidos.length) {
  F.itens.push(...promovidos);
  console.log(`\n  2d. PROMOVIDOS — ${promovidos.length} releases oficiais que vieram pela pauta`);
  for (const x of promovidos.slice(0, 8)) console.log(`  ok    ${x.veiculo.slice(0,26).padEnd(28)} ${x.titulo.slice(0,44)}`);
  console.log(`     ${F.itens.length} itens de fonte livre no total`);
}

/* ===================== 2e. DIARIO OFICIAL DOS MUNICIPIOS ==================
   A unica fonte local que nao depende de assessoria funcionar. A prefeitura
   pode ter o site quebrado — e a de Varzea Grande tem — mas e obrigada por lei
   a publicar aqui, e publica todo dia util.

   Ato oficial esta fora da protecao autoral (Lei 9.610/98, art. 8, IV), entao
   entra direto como fonte livre, sem as travas de licenca das outras.        */
if (!GERAL && ASSOCIACOES[UF]) {
  console.log(`\n  2e. DIARIO OFICIAL DOS MUNICIPIOS — ${ASSOCIACOES[UF].entidade}`);
  try {
    const d = await lerDiario(UF, { max: 14, orcamentoMs: 70000 });
    if (d.erro) {
      console.log(`  aviso ${d.erro}`);
    } else {
      console.log(`  ok    ${d.lidas} atos no indice · ${d.descartadas} de rotina descartados · ${d.itens.length} abertos`);
      for (const i of d.itens) {
        F.itens.push({
          ...i,
          editoria: 'regional',
          uf: UF,
          resumo: i.titulo,
          origemLink: i.link,
          origemNome: i.orgao
        });
        console.log(`        ${String(i.peso).padStart(2)} ${i.tema.padEnd(11)} ${(i.municipioBruto||'?').slice(0,16).padEnd(18)} ${i.titulo.slice(0,40)}`);
      }
      if (d.itens.length) console.log(`     ${F.itens.length} itens de fonte livre no total`);
    }
  } catch (e) {
    console.log('  aviso diario: ' + String(e.message).slice(0, 50));
  }
}

/* ===================== 2f. DADO DIRETO DA FONTE ==========================
   Toda segunda sai o Boletim Focus e dez veiculos publicam o mesmo numero
   lido do mesmo lugar. Nenhum e a fonte: a fonte e a API publica do Banco
   Central, em JSON, sem chave e sem cadastro.

   Aqui o dado entra como fonte livre — com a mediana, o intervalo e a
   variacao em relacao a semana anterior, que a materia refritada nao traz.
   Dado publico nao tem direito autoral: a Lei 9.610/98, art. 8, poe os dados
   em si fora da protecao.                                                  */
if (EDITORIA === 'brasil' && !GERAL?.tipo) {
  // Segunda e terca: o boletim sai no primeiro dia util da semana, e no dia
  // seguinte ainda e noticia. Fora disso nao vale a chamada.
  const diaSemana = new Date().getDay();
  if (diaSemana === 1 || diaSemana === 2) {
    console.log('\n  2f. BANCO CENTRAL — Boletim Focus');
    try {
      const ano = new Date().getFullYear();
      const dados = await focus(ano);
      let entraram = 0;
      for (const d of dados) {
        // So vira materia quando ha movimento: projecao parada nao e noticia.
        if (d.variacao === null || d.variacao === 0) continue;
        F.itens.push({
          titulo: `Projeção para ${d.nome} em ${ano} vai a ${d.unidade === 'R$' ? 'R$ ' + d.mediana.toFixed(2) : d.mediana.toFixed(2) + '%'}`,
          texto: comoTexto(d),
          resumo: comoTexto(d).slice(0, 200),
          link: 'https://www.bcb.gov.br/publicacoes/focus',
          origemLink: 'https://www.bcb.gov.br/publicacoes/focus',
          veiculo: 'Banco Central do Brasil',
          fonte: 'Banco Central do Brasil',
          orgao: 'Banco Central do Brasil',
          origemNome: 'Banco Central do Brasil',
          editoria: 'brasil',
          uf: null,
          oficial: true,
          iso: new Date().toISOString()
        });
        entraram++;
      }
      console.log(`  ok    ${dados.length} indicadores lidos · ${entraram} com movimento na semana`);
      for (const d of dados) {
        const sinal = d.variacao === null ? '—' : d.variacao > 0 ? '+' : '';
        console.log(`        ${d.nome.padEnd(28)} ${String(d.mediana).padStart(7)} ${d.variacao === null ? '' : `(${sinal}${d.variacao})`}`);
      }
    } catch (e) {
      console.log('  aviso Focus: ' + String(e.message).slice(0, 50));
    }
  }
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
  // Quem publicou, com a manchete e o endereco. E o que permite creditar a
  // fonte com nome e link, em vez de reescrever no escuro.
  p.ondeCirculou = [{ veiculo:p.veiculo, titulo:p.titulo, link:p.link },
                    ...eco.map(e => ({ veiculo:e.veiculo, titulo:e.titulo, link:e.link }))]
    .filter(x => x.veiculo && x.titulo)
    .filter((x,i,a) => a.findIndex(y => y.veiculo === x.veiculo) === i)
    .slice(0, 6);
  soPauta.push(p);
}

// A lista de pauta so vale se for sinal, nao ruido. Fica o que dois ou mais
// veiculos deram, ou o que e de Mato Grosso. Concurso em Taubate e baleia em
// Santa Catarina nao sao pauta para um jornal de Cuiaba.
const EH_DAQUI = /(mato grosso|cuiaba|varzea grande|rondonopolis|sinop|sorriso|primavera do leste|tangara|caceres|barra do garcas|lucas do rio verde|nova mutum|alta floresta|pantanal|mt\b)/;
// Nas edicoes br e mundo nao existe "e daqui": o criterio e o eco entre
// veiculos. Antes, quase tudo era descartado e o Circulando ficava vazio.
const relevante = GERAL
  ? p => (p.quentura || 0) >= 1
  : p => p.quentura >= 2 || p.editoria === 'regional' || EH_DAQUI.test(semAcento(p.titulo));

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
  // A memoria do jornal, para o bloco de contexto saber se ja houve caso igual
  // memoria: mes corrente e o anterior, que cobre a maioria dos casos ligados
  arquivoMemoria = { itens: [] };
  const mesAtual = new Date().toISOString().slice(0,7);
  const mesAnterior = new Date(Date.now() - 31*86400000).toISOString().slice(0,7);
  for (const m of [mesAtual, mesAnterior]) {
    for (const caminho of [`dados/arquivo/${UF}-${m}.json`, `dados/arquivo-${UF}.json`]) {
      try {
        const a = JSON.parse(await readFile(caminho,'utf8'));
        arquivoMemoria.itens.push(...(a.itens || []));
      } catch {}
    }
  }

  async function escreverUma(i){
    if (carteiraAcabou()) return;
    try {
      const texto = await textoCompleto(i.link, 12000);
      // Foto so de fonte que autoriza reproducao. E a mesma regra do texto:
      // release oficial existe para ser republicado, veiculo comercial nao.
      const foto = PODE_REESCREVER.test(i.link) ? fotoDaUltima() : null;
      const m = await reescrever({ fonte: i.veiculo, titulo: i.titulo, texto });
      const arq = slug(m.titulo)+'.html';

      // contexto: so entra se houver caso parecido no arquivo ou numero no texto
      const parecidos = acharParecidos(arquivoMemoria, m.titulo);
      // O contexto so tem o que dizer quando ha historico ou numero no texto.
      // Pedir sempre dobrava o consumo do Gemini para receber "nada" na metade
      // dos casos — e foi isso que ajudou a estourar a cota.
      const valeContexto = parecidos.length > 0 || /\d/.test(m.corpo.join(' '));
      const contexto = valeContexto ? await escreverContexto({
        titulo: m.titulo,
        corpo: m.corpo.join('\n\n'),
        historico: parecidos.map(x => ({ dia: (x.iso||'').slice(0,10), titulo: x.titulo }))
      }) : null;

      const mun = GERAL ? null : detectarMunicipio(m.titulo + ' ' + m.corpo.join(' '), UF);
      await writeFile('materia/'+arq, pagina(
        { id:'ilm:'+slug(m.titulo), nivel:'confirmado',
          chapeu: i.editoria==='regional'?(mun?mun.nome:E.nome):i.editoria==='internacional'?'Mundo':'Brasil',
          titulo:m.titulo, linhaFina:m.linhaFina, corpo:m.corpo, contexto,
          origemNome: i.veiculo, radar: false, checar:[],
          foto, creditoFoto: i.veiculo,
          relacionadas: parecidos.slice(0,3).map(x => ({ titulo:x.titulo, link:x.link, dia:(x.iso||'').slice(0,10) })) },
        { link:i.link, municipio: mun ? mun.nome : '' }, i.iso), 'utf8');
      publicados.push({
        foto: foto ? foto.src : null, fotoAlt: foto ? foto.alt : null,
        fotoLarg: foto ? (foto.largura || 0) : 0,
        municipio: mun ? mun.id : null, municipioNome: mun ? mun.nome : null,
        id:'ilm:'+slug(m.titulo), chapeu:'Nosso texto',
        ...(() => { const w = ondeMora(m.titulo + ' ' + (m.linhaFina||''), EDITORIA, GERAL ? null : UF);
                    if (w.motivo) console.log(`     realocada para Brasil (${w.motivo}): ${m.titulo.slice(0,52)}`);
                    return { editoria: w.editoria }; })(),
        titulo:m.titulo, resumo:m.linhaFina,
        fonte:'Meridiano, com informações de '+i.veiculo,
        origemLink:i.link, origemNome:i.veiculo,
        pautadoPor:i.pautadoPor||[], quentura:i.quentura||0,
        uf: ondeMora(m.titulo + ' ' + (m.linhaFina||''), EDITORIA, GERAL ? null : UF).uf,
        corpo: m.corpo,
        link:'/materia/'+arq, iso:i.iso, hora:horaBR(i.iso), original:true, contexto,
        ...nivelDe(i, texto)
      });
      escritas++;
      console.log('     ok    '+m.titulo.slice(0,58));
    } catch(e){ console.log('     pulou '+String(e.message).slice(0,58)); }
  }

  // Sem teto, a unica assessoria que abre domina a edicao inteira — e cinco
  // materias da mesma prefeitura, duas sobre o mesmo evento, viram boletim
  // oficial em vez de jornal.
  // Com poucas fontes distintas, teto baixo mata a edicao. Com muitas, teto
  // alto deixa uma so dominar. Entao o teto acompanha a diversidade.
  const fontesDistintas = new Set(fila.map(i => i.veiculo)).size;
  // Com poucas fontes vivas, apertar aqui e apertar duas vezes: o estado ja
  // sofre por so ter 4 ou 7 orgaos respondendo. O teto protege contra a edicao
  // virar boletim de um orgao so, mas nao pode ser o motivo de a edicao ficar
  // vazia.
  // O teto da edicao manda; a contagem de fontes vivas so afrouxa quando ha
  // pouquissima fonte, para a edicao nao ficar vazia.
  const doTeto = tetoDaEdicao(GERAL ? (GERAL.chave || 'br') : UF);
  const TETO_POR_FONTE = fontesDistintas <= 3
    ? Math.max(doTeto.fonte, 7)
    : doTeto.fonte;

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

  // Teto por CIDADE, alem do teto por fonte. Sem ele, a edicao do Rio virou
  // boletim de Volta Redonda: quatro materias da mesma prefeitura, porque
  // vieram de veiculos de pauta diferentes e o teto por fonte nao viu. Nenhum
  // municipio pode ocupar mais que a metade de uma edicao pequena.
  // Um terco da edicao, nunca menos de 3. Antes era um quarto com piso 2, e
  // numa fila curta isso derrubava materia boa so por ser da mesma cidade.
  const TETO_POR_CIDADE = Math.max(3, Math.ceil(fila.length / 3));

  const usos = new Map();
  const usosCidade = new Map();
  const titulosJaFeitos = [];

  // Titulos das ultimas 72 horas, do arquivo. E a memoria entre rodadas.
  const jaSaiuAntes = (() => {
    // 36h em vez de 72h: acima disso o assunto ja pode ter voltado com fato
    // novo, e barrar seria esconder desdobramento.
    const corteMem = Date.now() - 36 * 3600 * 1000;
    return (arquivoMemoria.itens || [])
      .filter(x => x.iso && Date.parse(x.iso) > corteMem)
      .map(x => x.titulo)
      .filter(Boolean);
  })();

  const filaLimpa = revezar(fila).filter(i => {
    const n = (usos.get(i.veiculo) || 0);
    if (n >= TETO_POR_FONTE) return false;

    if (!GERAL) {
      const mn = detectarMunicipio((i.titulo || '') + ' ' + (i.resumo || ''), UF);
      if (mn) {
        const c = usosCidade.get(mn.id) || 0;
        if (c >= TETO_POR_CIDADE) return false;
        usosCidade.set(mn.id, c + 1);
      }
    }
    // mesma historia com titulo diferente: "MT AgroFestival lanca programacao"
    // e "Prefeitura lanca programacao do AgroFestival" sao a mesma coisa
    // Repetida DENTRO da rodada: 0.55 e o certo aqui, porque sao variacoes
    // escritas no mesmo momento a partir do mesmo release.
    if (titulosJaFeitos.some(t => parecidas(t, i.titulo) >= 0.55)) return false;
    // ...e repetida em rodadas ANTERIORES. Sem isto o robo nao sabia o que
    // publicou ha tres horas, e a mesma historia saia tres vezes com o titulo
    // ligeiramente diferente — "NASA apresenta", "NASA exibe na", "NASA exibe
    // no". Dentro da rodada o filtro pegava; entre rodadas, nao existia.
    // Contra o ARQUIVO o limiar tem que ser bem mais alto. Usar 0.55 aqui foi
    // erro meu: MT tem 280 materias arquivadas em 72h, todas das mesmas
    // fontes — Prefeitura de Cuiaba, Defesa Civil, Sema —, e nesse corte 43%
    // das noticias novas eram barradas por "parecer" com alguma antiga. Foi
    // por isso que MT publicou 1 materia com 15 historias confirmadas.
    //
    // A 0.85 o filtro barra 8%: pega republicacao de verdade e deixa passar
    // noticia legitima da mesma fonte sobre assunto diferente.
    if (jaSaiuAntes.some(t => parecidas(t, i.titulo) >= 0.85)) return false;
    usos.set(i.veiculo, n + 1);
    titulosJaFeitos.push(i.titulo);
    return true;
  });

  const cortadas = fila.length - filaLimpa.length;
  if (cortadas) console.log(`     ${cortadas} descartadas por repeticao, teto de ${TETO_POR_FONTE} por fonte ou ${TETO_POR_CIDADE} por cidade`);

  for (let k = 0; k < filaLimpa.length; k += 3) {
    await Promise.all(filaLimpa.slice(k, k+3).map(escreverUma));
    if (k + 3 < filaLimpa.length) await dormir(800);
  }
} else {
  console.log('     sem GEMINI_API_KEY — reescrita desligada');
}


// ============ CIRCULANDO — o que corre sem registro oficial ==============
// Nota escrita por nos sobre um fato que e nosso: a informacao esta
// circulando e nao achamos documento. Nao reproduz apuracao de ninguem,
// nao nomeia veiculo, nao nomeia pessoa comum, nao diz que e falso.
const circulando = [];
let resgatadas = 0;
if (temChave() && soPautaFiltrada.length) {
  // Antes o terremoto do Japao saiu cinco vezes: uma confirmada e quatro como
  // rumor. Tres travas resolvem — nao repetir o que ja foi publicado, nao
  // repetir entre as proprias notas, e nao transformar explicacao em noticia.
  const jaPublicado = publicados.map(p => p.titulo);
  const NAO_E_NOTICIA = new RegExp([
    // explicacao, contexto, servico: nao e fato a confirmar
    'por que','porque','entenda','saiba','como funciona','o que e','quantos',
    'registraria','costuma','historicamente','veja como','confira',
    // construcao existencial vaga: "haveria uma corrida contra o tempo" nao e
    // fato verificavel, e figura de linguagem
    '^(haveria|existiria|estaria havendo|seria possivel|poderia haver)',
    // opiniao e analise
    'opiniao','analise','editorial','artigo','coluna'
  ].join('|'), 'i');

  // A INVERSAO
  //
  // Ate aqui, so as 6 historias mais quentes tinham chance: as outras eram
  // descartadas em silencio, sem que ninguem procurasse o documento delas.
  // Numa rodada de MT isso significou 166 pautas relevantes mortas sem uma
  // unica busca. Era o oposto do que o jornal promete na capa.
  //
  // Agora a cacada vem primeiro e alcanca muito mais: TETO_CACA historias
  // passam pelo cacador de documento, das mais quentes para as mais frias.
  //   achou documento  -> vira materia confirmada, com o registro a vista
  //   nao achou        -> vira nota nao confirmada, ate TETO_NOTAS
  //   sobrou           -> so entao e descartada
  //
  // Os dois tetos existem por motivos diferentes: TETO_CACA e limite de
  // RELOGIO (o job do Actions morre aos 15 min), TETO_NOTAS e limite de
  // DINHEIRO (cada nota custa uma chamada de Gemini).
  const TETO_CACA  = Number(process.env.TETO_CACA  || 18);
  const TETO_NOTAS = Number(process.env.TETO_NOTAS || 6);

  const escolhidas = [];
  for (const p of [...soPautaFiltrada].sort((a,b) => (b.quentura||0) - (a.quentura||0))) {
    if (escolhidas.length >= TETO_CACA) break;
    // Mesmo assunto: alem da semelhanca geral, comparamos os nomes proprios e
    // termos fortes. "Terremoto no Japao teria provocado desabamento" e a
    // mesma historia de "Terremoto atinge o sul do Japao" — o limiar geral
    // sozinho nao pegava, porque as frases sao diferentes.
    const nucleo = x => new Set(semAcento(x).replace(/[^a-z0-9\s]/g,' ').split(/\s+/)
      .filter(w => w.length >= 5).map(w => w.slice(0,6)));
    const mesmoAssunto = (a2, b2) => {
      if (parecidas(a2, b2) >= 0.35) return true;
      const A = nucleo(a2), B = nucleo(b2);
      if (A.size < 2 || B.size < 2) return false;
      const comuns = [...A].filter(w => B.has(w)).length;
      return comuns >= 2;
    };

    if (jaPublicado.some(t => mesmoAssunto(t, p.titulo))) continue;
    if (escolhidas.some(x => mesmoAssunto(x.titulo, p.titulo))) continue;
    // explicacao ou contexto nao e noticia nao confirmada
    if (NAO_E_NOTICIA.test(semAcento(p.titulo))) continue;
    escolhidas.push(p);
  }
  const candidatas = escolhidas;
  const cortadasCirc = soPautaFiltrada.length - candidatas.length;
  let notasEscritas = 0;
  if (cortadasCirc > 0) console.log(`     ${cortadasCirc} descartadas: ja publicadas, repetidas ou nao noticiosas`);

  for (const c of candidatas) {
    if (carteiraAcabou()) break;
    try {
      // Terremoto no Japao caindo em BRASIL era efeito de herdar a editoria da
      // edicao. Agora o assunto decide.
      const FORA = /(japao|eua|estados unidos|china|russia|ucrania|israel|gaza|argentina|peru|papa|vaticano|onu|europa|franca|italia|alemanha|coreia|india|mexico|chile|venezuela|colombia|apple|google|microsoft)/;
      const edNota = FORA.test(semAcento(c.titulo)) ? 'internacional' : EDITORIA;

      // ULTIMA CHANCE ANTES DO BALDE
      // Antes de tratar como rumor, batemos na porta do orgao que teria o
      // registro. Se o documento existe, isto nao e boato: e materia, escrita
      // a partir da fonte oficial e com link para o original.
      // Sem credito nao ha como escrever a materia mesmo que o documento
      // apareca — cacar aqui seria queimar o relogio do Actions a toa.
      const caca = carteiraAcabou()
        ? { achado:false, procuradoEm:[], relatorio:[], assunto:[], horas:96 }
        : await cacarDocumento(c.titulo, GERAL ? null : UF, { orcamentoMs: 24000 });
      if (caca.achado) {
        try {
          const texto = await textoCompleto(caca.link, 12000);
          const fotoR = fotoDaUltima();
          const m = await reescrever({ fonte: caca.fonte, titulo: caca.titulo, texto });
          const arq = slug(m.titulo) + '.html';
          const agora = new Date().toISOString();
          const pareR = acharParecidos(arquivoMemoria, m.titulo);
          const ctxR = (pareR.length || /\d/.test(m.corpo.join(' '))) ? await escreverContexto({
            titulo: m.titulo, corpo: m.corpo.join('\n\n'),
            historico: pareR.map(x => ({ dia:(x.iso||'').slice(0,10), titulo:x.titulo }))
          }) : null;
              await writeFile('materia/' + arq, pagina(
            { id:'ilm:'+slug(m.titulo), nivel:'confirmado',
              chapeu: GERAL ? GERAL.nome : E.nome,
              titulo: m.titulo, linhaFina: m.linhaFina, corpo: m.corpo,
              origemNome: caca.fonte, radar: false, checar: [], contexto: ctxR,
              foto: fotoR, creditoFoto: caca.fonte,
              relacionadas: pareR.slice(0,3).map(x => ({ titulo:x.titulo, link:x.link, dia:(x.iso||'').slice(0,10) })),
              resgatada: { procuradoEm: caca.procuradoEm, orgao: caca.fonte } },
            { link: caca.link, municipio: '' }, agora), 'utf8');
          const munR = GERAL ? null : detectarMunicipio(m.titulo + ' ' + m.corpo.join(' '), UF);
          publicados.push({
            foto: fotoR ? fotoR.src : null, fotoAlt: fotoR ? fotoR.alt : null,
            fotoLarg: fotoR ? (fotoR.largura || 0) : 0,
            municipio: munR ? munR.id : null, municipioNome: munR ? munR.nome : null,
            id: 'ilm:' + slug(m.titulo), editoria: edNota, chapeu: 'Nosso texto',
            titulo: m.titulo, resumo: m.linhaFina,
            fonte: 'Meridiano, com informacoes de ' + caca.fonte,
            origemLink: caca.link, origemNome: caca.fonte,
            pautadoPor: c.tambemEm || [], quentura: c.quentura || 0,
            uf: ondeMora(m.titulo, EDITORIA, GERAL ? null : UF).uf, corpo: m.corpo,
            link: '/materia/' + arq, iso: agora, hora: horaBR(agora),
            original: true, resgatada: true,
            nivel: 'confirmado', selo: 'Confirmado oficialmente'
          });
          resgatadas++;
          console.log(`     RESGATADA ${String(caca.nota).padEnd(5)} ${caca.fonte} - ${m.titulo.slice(0,42)}`);
          await dormir(700);
          continue;
        } catch (e) {
          console.log('     resgate falhou: ' + String(e.message).slice(0,44));
        }
      }

      // Nao achou documento. Vira nota so enquanto houver cota — o resto
      // sai da rodada sem custo, e volta a ser candidato na proxima.
      if (notasEscritas >= TETO_NOTAS) continue;
      notasEscritas++;

      const ondeCirculou = c.ondeCirculou || [{ veiculo:c.veiculo, titulo:c.titulo, link:c.link }];
      const n = await escreverCirculacao({
        titulo: c.titulo, editoria: edNota,
        manchetes: ondeCirculou.map(x => x.titulo)
      });
      // pagina propria: quando a confirmacao chegar, esta mesma pagina e
      // atualizada — e o leitor ve o caminho da historia
      const arqC = 'nc-' + slug(n.titulo) + '.html';

      // Provenencia: o leitor tem direito de saber o que foi procurado e onde.
      // Nao nomeamos veiculo — dizemos que circula e onde fomos checar.
      // A lista agora e a verdade do que o cacador bateu, nome por nome.
      const ondeBuscamos = (caca.procuradoEm && caca.procuradoEm.length)
        ? caca.procuradoEm
        : (GERAL
            ? semDuplicar(GERAL.livres || []).map(f => f.nome)
            : [...(E.assessorias || []).map(o => o.nome), ...(E.setoriais || []).map(o => o.nome)]);
      const provenencia = {
        circulaEm: (c.quentura || 0) + 1,
        buscadoEm: [...new Set(ondeBuscamos)].slice(0, 8),
        // o extrato do que o cacador fez, orgao por orgao
        relatorio: caca.relatorio || [],
        assunto: caca.assunto || [],
        horas: caca.horas || 96,
        lidas: caca.lidas || 0,
        mudos: caca.mudos || [],
        quando: new Date().toLocaleString('pt-BR', { timeZone:'America/Cuiaba' })
      };
      await writeFile('materia/' + arqC, pagina({
        chapeu: GERAL ? GERAL.nome : E.nome,
        titulo: n.titulo,
        linhaFina: n.aviso,
        corpo: n.corpo,
        naoConfirmada: true,
        seSabe: n.seSabe, falta: n.falta,
        relacionadas: acharParecidos(arquivoMemoria, n.titulo).slice(0,3)
          .map(x => ({ titulo:x.titulo, link:x.link, dia:(x.iso||'').slice(0,10) })),
        ondeCirculou,
        provenencia,
        checar: ['Procurar o registro no órgão competente',
                 'Confirmar data, local e envolvidos',
                 'Ouvir o outro lado antes de publicar como confirmada']
      }, { link: '', municipio: '' }, new Date().toISOString()), 'utf8');

      const munC = GERAL ? null : detectarMunicipio(n.titulo + ' ' + n.corpo.join(' '), UF);
      circulando.push({
        municipio: munC ? munC.id : null, municipioNome: munC ? munC.nome : null,
        seSabe: n.seSabe, falta: n.falta, ondeCirculou,
        link: '/materia/' + arqC,
        corpo: n.corpo,
        id: 'circ:' + slug(n.titulo),
        editoria: edNota, uf: edNota === 'regional' ? UF : null,
        titulo: n.titulo, corpo: n.corpo, aviso: n.aviso,
        iso: new Date().toISOString(),
        hora: horaBR(new Date().toISOString())
      });
      await dormir(900);
    } catch (e) {
      console.log('     circ pulou: ' + String(e.message).slice(0,52));
    }
  }
  /* ------------------------------- FOTO REPETIDA ---------------------------
   O filtro mais forte contra brasao so pode rodar AGORA, com todas as
   materias na mao: se a mesma imagem aparece em varias, ela nao e foto de
   noticia — e a arte padrao do orgao, declarada igual no site inteiro.
   Por isso a foto e escolhida durante a escrita mas so CONFIRMADA aqui.     */
try {
  const conta = new Map();
  for (const p of publicados) if (p.foto) conta.set(p.foto, (conta.get(p.foto) || 0) + 1);

  // Duas ocorrencias ja bastam: foto de materia nunca se repete.
  const repetidas = new Set([...conta].filter(([, n]) => n >= 2).map(([src]) => src));

  if (repetidas.size) {
    let tiradas = 0;
    for (const p of publicados) {
      if (!p.foto || !repetidas.has(p.foto)) continue;
      p.foto = null; p.fotoAlt = null; tiradas++;

      // tirar tambem da pagina ja gravada, que e markup nosso e conhecido
      const arq = 'materia/' + String(p.link).split('/').pop();
      try {
        let h = await readFile(arq, 'utf8');
        h = h.replace(/<figure class="foto">[\s\S]*?<\/figure>/, '')
             .replace(/<meta property="og:image"[^>]*>\s*/, '')
             .replace('content="summary_large_image"', 'content="summary"');
        await writeFile(arq, h, 'utf8');
      } catch {}
    }
    console.log(`     ${tiradas} fotos removidas: mesma imagem repetida em varias materias (arte do orgao)`);
  }
} catch (e) { console.log('     aviso foto repetida: ' + String(e.message).slice(0,40)); }

/* ------------------ MANCHETES DOS ASSUNTOS SEGUIDOS ----------------------
   Ha assunto que o jornal nao cobre: Fifa, celebridade, futebol. Nao existe
   orgao publico brasileiro que registre decisao da Fifa, entao nunca havera
   documento — e fingir que ha seria pior que nao ter.

   O que da para fazer com honestidade e guardar as manchetes que circulam,
   com nome do veiculo e link. O leitor recebe o que pediu, ninguem tem texto
   copiado, e a tela deixa claro que so estamos apontando.

   Guardamos por ASSUNTO, nao por leitor: uma copia serve todos que seguem o
   mesmo termo.                                                             */
if (process.env.CHAVE_ROBO && process.env.URL_SITE) {
  try {
    const base = process.env.URL_SITE.replace(/\/+$/,'') + '/api/leitor';
    const r = await fetch(base, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ acao:'assuntos-todos', chave: process.env.CHAVE_ROBO }) });
    const termos = ((await r.json().catch(() => ({}))).termos) || [];

    if (termos.length) {
      const sa = x => String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const bate = (texto, termo) => {
        const t = sa(texto);
        const ps = sa(termo).split(/\s+/).filter(p => p.length >= 3);
        return ps.length ? ps.every(p => t.includes(p.slice(0, Math.max(4, p.length - 2)))) : false;
      };

      // A pauta bruta da rodada: tudo que os veiculos deram, inclusive o que
      // foi descartado por nao ter fonte livre. E justamente o descartado que
      // interessa aqui.
      const pauta = [...(P.itens || [])];
      const porAssunto = {};
      for (const termo of termos) {
        const achadas = pauta
          .filter(i => bate(i.titulo, termo))
          .slice(0, 10)
          .map(i => ({ titulo: i.titulo, veiculo: i.veiculo, link: i.link, iso: i.iso || new Date().toISOString() }));
        if (achadas.length) porAssunto[termo] = achadas;
      }

      if (Object.keys(porAssunto).length) {
        const r2 = await fetch(base, { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ acao:'guardar-pauta', chave: process.env.CHAVE_ROBO, porAssunto }) });
        const j2 = await r2.json().catch(() => ({}));
        console.log(`     ${j2.total || 0} manchetes guardadas em ${Object.keys(porAssunto).length} assunto(s) seguido(s)`);
      } else {
        console.log(`     ${termos.length} assunto(s) seguido(s), nenhuma manchete correspondente nesta rodada`);
      }
    }
  } catch (e) {
    console.log('     aviso assuntos: ' + String(e.message).slice(0, 50));
  }
}

/* --------------------------- FILA DOS CASOS ------------------------------
   Quem acompanha uma noticia quer o que veio depois dela. Cada noticia
   marcada vira uma pasta, e aqui o robo empilha o que publicou de parecido.

   O corte de semelhanca e alto de proposito: frouxo, a fila enche de coisa
   vagamente relacionada e deixa de valer.                                  */
if (process.env.CHAVE_ROBO && process.env.URL_SITE) {
  try {
    const base = process.env.URL_SITE.replace(/\/+$/,'') + '/api/leitor';
    const r = await fetch(base, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ acao:'seguidos', chave: process.env.CHAVE_ROBO }) });
    const casos = ((await r.json().catch(() => ({}))).casos) || [];

    if (casos.length) {
      const sa = x => String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const chaves = x => [...new Set(sa(x).replace(/[^a-z0-9\s]/g,' ').split(/\s+/)
        .filter(p => p.length >= 5).map(p => p.slice(0,6)))];
      const parece = (a,b) => {
        const A = chaves(a), B = chaves(b);
        if (A.length < 3 || B.length < 3) return 0;
        return A.filter(p => B.includes(p)).length / Math.min(A.length, B.length);
      };

      const saiu = [...publicados, ...circulando];
      const filas = {};
      for (const c of casos) {
        const achadas = saiu
          .filter(p => p.id !== c.id && parece(c.titulo, p.titulo) >= 0.62)
          .slice(0, 5)
          .map(p => ({ id:p.id, titulo:p.titulo, link:p.link, iso:p.iso,
                       nivel:p.nivel || 'confirmado', hora:p.hora }));
        if (achadas.length) filas[c.id] = achadas;
      }

      if (Object.keys(filas).length) {
        const r2 = await fetch(base, { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ acao:'empilhar', chave: process.env.CHAVE_ROBO, filas }) });
        const j2 = await r2.json().catch(() => ({}));
        console.log(`     ${j2.somadas || 0} desdobramentos empilhados em ${Object.keys(filas).length} caso(s) acompanhado(s)`);
      } else if (casos.length) {
        console.log(`     ${casos.length} caso(s) acompanhado(s), nenhum desdobramento nesta rodada`);
      }
    }
  } catch (e) {
    console.log('     aviso fila: ' + String(e.message).slice(0, 50));
  }
}

/* ------------------------- ESTADO DAS HISTORIAS -------------------------
   O jornal sabe uma coisa que nenhum feed sabe: quando uma historia muda de
   estado. Uma nota que era "sem confirmacao" e virou "confirmado
   oficialmente" e o desfecho — justamente o capitulo que a imprensa publica
   pequeno e o algoritmo de rede social nao mostra, porque desfecho nao
   engaja.

   Aqui o robo publica o estado atual de tudo que saiu nesta rodada. Quem
   marcou "acompanhar este caso" e avisado ao voltar ao site.              */
if (process.env.CHAVE_ROBO && process.env.URL_SITE) {
  try {
    const estados = {};
    for (const p of publicados) estados[p.id] = { nivel: p.nivel || 'confirmado', titulo: p.titulo, link: p.link };
    for (const c of circulando) estados[c.id] = { nivel: c.nivel || 'sem-confirmacao', titulo: c.titulo, link: c.link };

    if (Object.keys(estados).length) {
      const r = await fetch(process.env.URL_SITE.replace(/\/+$/,'') + '/api/leitor', {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ acao:'estados', chave: process.env.CHAVE_ROBO, estados })
      });
      const j = await r.json().catch(() => ({}));
      console.log(`     estado de ${Object.keys(estados).length} historias publicado${j.total ? ` (${j.total} no total)` : ''}`);
    }
  } catch (e) {
    console.log('     aviso estados: ' + String(e.message).slice(0, 50));
  }
}

console.log(`\n  5. CIRCULANDO — ${candidatas.length} cacadas de ${soPautaFiltrada.length} pautas · ${circulando.length} notas escritas`);

// O arquivo ficava AQUI EM CIMA, antes das notas de circulacao existirem.
// Resultado: o laco lia `circulando` antes da declaracao e estourava com
// "Cannot access before initialization" — o arquivo inteiro deixava de ser
// gravado, toda rodada. Agora ele roda depois que os dois lados existem.
// ===================== ARQUIVO — a memoria do jornal =======================
// A edicao expira em 24h, mas o que NOS escrevemos fica para sempre. Este
// indice e a base do assistente: ele so podera responder citando materia
// publicada aqui, com link. Sem arquivo, a IA nao tem o que citar e inventa.
try {
  // Um arquivo por mes: assim nenhum cresce sem limite e cada rodada
  // reescreve so o mes corrente. Em um ano sao 12 arquivos leves em vez de
  // um enorme que precisa ser lido e regravado inteiro toda vez.
  const mes = new Date().toISOString().slice(0, 7);
  const CAMINHO_ARQ = `dados/arquivo/${UF}-${mes}.json`;
  await mkdir('dados/arquivo', { recursive: true });

  let arquivo = { uf: UF, mes, criado: new Date().toISOString(), itens: [] };
  try { arquivo = JSON.parse(await readFile(CAMINHO_ARQ,'utf8')); } catch {}

  const jaTem = new Set((arquivo.itens || []).map(i => i.id));
  let novas = 0;
  for (const p of publicados) {
    if (!p.original || jaTem.has(p.id)) continue;
    arquivo.itens.push({
      id: p.id, titulo: p.titulo, resumo: p.resumo,
      // o texto inteiro fica guardado: sem ele o fio das historias e o
      // assistente so teriam manchete para trabalhar
      corpo: p.corpo || [],
      contexto: p.contexto || null,
      editoria: p.editoria, uf: p.uf || null,
      fonte: p.fonte, origemLink: p.origemLink || '',
      origemNome: p.origemNome || null,
      nivel: p.nivel || null, orgao: p.orgao || null,
      municipio: p.municipio || null, municipioNome: p.municipioNome || null,
      pautadoPor: p.pautadoPor || [],
      link: p.link, iso: p.iso, dia: p.iso.slice(0,10),
      palavras: (p.corpo || []).join(' ').split(/\s+/).length
    });
    novas++;
  }
  arquivo.itens.sort((a,b) => Date.parse(b.iso) - Date.parse(a.iso));
  arquivo.atualizado = new Date().toISOString();
  arquivo.total = arquivo.itens.length;

  // as nao confirmadas tambem ficam guardadas: e delas que nasce o fio da
  // historia quando a confirmacao chegar depois
  for (const c of circulando) {
    if (jaTem.has(c.id)) continue;
    arquivo.itens.push({
      id: c.id, titulo: c.titulo, resumo: (c.corpo||[])[0] || '',
      corpo: c.corpo || [], contexto: null,
      editoria: c.editoria, uf: c.uf || null,
      fonte: 'Meridiano', origemLink: '', origemNome: null,
      nivel: 'sem-confirmacao', orgao: null, pautadoPor: [],
      link: c.link || '', iso: c.iso, dia: c.iso.slice(0,10),
      palavras: (c.corpo || []).join(' ').split(/\s+/).length
    });
    novas++;
  }
  arquivo.itens.sort((a,b) => Date.parse(b.iso) - Date.parse(a.iso));
  arquivo.total = arquivo.itens.length;

  await writeFile(CAMINHO_ARQ, JSON.stringify(arquivo, null, 2), 'utf8');

  // indice: aponta quais meses existem, para quem for ler o historico
  // Um indice POR EDICAO. O indice unico era escrito pelos cinco jobs em
  // paralelo e o ultimo apagava os outros — por isso ele listava so um estado.
  const IDX = `dados/arquivo/indice-${UF}.json`;
  let idx = { uf: UF, meses: [] };
  try { idx = JSON.parse(await readFile(IDX,'utf8')); } catch {}
  if (!Array.isArray(idx.meses)) idx.meses = [];
  const chaveMes = `${UF}-${mes}`;
  if (!idx.meses.includes(chaveMes)) idx.meses.push(chaveMes);
  idx.meses.sort().reverse();
  idx.total = arquivo.total;
  idx.atualizado = new Date().toISOString();
  await writeFile(IDX, JSON.stringify(idx, null, 2), 'utf8');

  console.log(`  arquivo ${UF}/${mes}: +${novas} novas · ${arquivo.total} no mes`);
} catch (e) {
  console.log('  aviso arquivo: ' + e.message);
}
  if (!candidatas.length) console.log('     nenhuma historia com eco suficiente nesta rodada');
}

await writeFile(`dados/edicao-${UF}.json`, JSON.stringify({
  uf: UF,
  estado: E.nome,
  gerado: new Date().toISOString(),
  modelo: modeloUsado(),
  numeros: { pauta:P.itens.length, fonteLivre:F.itens.length, confirmadas:confirmadas.length, publicadas:escritas, resgatadas, semFonte:soPautaFiltrada.length },
  // a capa le esta lista para montar as abas de cidade: quem manda e o
  // municipios.mjs, e mais nada precisa ser editado a mao
  // Extrato de saude das fontes, para o painel
  fontes: {
    checadas:   SAUDE.length,
    responderam: SAUDE.filter(f => f.respondeu).length,
    entregando: SAUDE.filter(f => f.ok).length,
    itens:      SAUDE.reduce((a, f) => a + f.itens, 0),
    lista: SAUDE.sort((a,b) => b.itens - a.itens)
  },
  cidades: destaques(UF),
  itens: publicados,
  circulando,
  pautas: soPautaFiltrada.slice(0,18).map(p=>({
    titulo:p.titulo, veiculo:p.veiculo, editoria:p.editoria,
    quentura:p.quentura||0, tambemEm:p.tambemEm||[]
  }))
}, null, 2), 'utf8');

console.log('\n  ' + '='.repeat(66));
console.log(`  ${escritas} matérias próprias publicadas · modelo ${modeloUsado()}`);
console.log(`  ${resgatadas} resgatadas do balde pelo cacador de documento`);
console.log(`  ${soPautaFiltrada.length} pautas relevantes sem fonte livre\n`);
