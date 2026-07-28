// IL MERIDIANO — pipeline completo.
//
//   1. PAUTA      lê os grandes veículos só para saber o que é notícia hoje.
//                 Nada daqui vai ao ar. É termômetro.
//   2. FONTE      lê as agências e órgãos que autorizam reprodução.
//   3. CRUZAMENTO vê quais histórias da pauta existem na fonte livre.
//   4. REESCRITA  o Gemini escreve nosso texto a partir do documento livre.
//   5. SOBRA      pauta sem fonte livre não é publicada. Vira sugestão interna.

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { reescrever, textoCompleto, temChave, modeloUsado, preparar } from './redator.mjs';
import { pagina, slug } from './radar.mjs';
import { ORGAOS, ALTERNATIVOS, lerListagem } from './assessorias.mjs';

const JANELA_HORAS = 24;
const QUANTAS_REESCREVER = 10;

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
const PODE_REESCREVER = /(agenciabrasil\.ebc\.com\.br|camara\.leg\.br|senado\.leg\.br|news\.un\.org|theconversation\.com|vaticannews\.va|\.gov\.br|\.jus\.br|\.mp\.br|\.leg\.br)/i;

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
        'X-Contact':'contato@ilmeridiano.com.br'
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

async function colher(lista, rotulo){
  const saida = [], rel = [];
  for (const f of lista) {
    try {
      if (f.url.includes('news.google')) await dormir(1500);
      const itens = lerRSS(await buscar(f.url)).slice(0, 12);
      let ok = 0;
      for (const b of itens) {
        const ts = Date.parse(b.data);
        if (Number.isNaN(ts) || ts < corte) continue;
        if (RE_BLOQUEIO.test(semAcento(b.titulo+' '+b.resumo+' '+b.veiculo))) continue;
        let titulo = b.titulo;
        if (b.veiculo && titulo.endsWith(' - '+b.veiculo)) titulo = titulo.slice(0, -(b.veiculo.length+3)).trim();
        // "Estado do agro" e nome de secao, nao manchete. Manchete e frase.
        if (titulo.length < 30 || titulo.split(/\s+/).length < 5) continue;
        saida.push({ titulo, link:b.link, resumo:b.resumo, iso:new Date(ts).toISOString(),
                     veiculo: b.veiculo || f.nome, editoria: f.editoria, fonteId: f.id });
        ok++;
      }
      rel.push(`ok    ${rotulo}:${f.id.padEnd(14)} ${String(ok).padStart(3)}`);
    } catch(e){ rel.push(`aviso ${rotulo}:${f.id.padEnd(14)} ${String(e.message).slice(0,40)}`); }
  }
  return { itens: saida, rel };
}

/* ============================== execução ================================== */

console.log('\n  IL MERIDIANO · ' + new Date().toISOString());
console.log('  ' + '='.repeat(66));

console.log('\n  1. PAUTA — o que os veículos estão dando');
const P = await colher(PAUTA, 'pauta');
P.rel.forEach(l=>console.log('  '+l));
console.log(`     ${P.itens.length} manchetes de pauta`);

console.log('\n  2. FONTE LIVRE — de onde o texto pode sair');
const F = await colher(FONTE_LIVRE, 'livre');
F.rel.forEach(l=>console.log('  '+l));
console.log(`     ${F.itens.length} itens de fonte livre`);

console.log('\n  2b. ASSESSORIAS DE MT — release publico, sem RSS');
for (const o of ORGAOS) {
  let achou = false;
  for (const caminho of [o.url.replace(o.base,''), ...ALTERNATIVOS]) {
    try {
      const html = await buscar(o.base + caminho, 15000, 1);
      const manchetes = lerListagem(html, o.base);
      if (manchetes.length < 3) continue;
      for (const m of manchetes) {
        F.itens.push({
          titulo: m.titulo, link: m.link, resumo: '',
          iso: new Date().toISOString(),
          veiculo: o.nome, editoria: 'regional', fonteId: o.id
        });
      }
      console.log(`  ok    orgao:${o.id.padEnd(12)} ${String(manchetes.length).padStart(3)} · ${caminho}`);
      achou = true;
      break;
    } catch { /* tenta o proximo caminho */ }
  }
  if (!achou) console.log(`  aviso orgao:${o.id.padEnd(12)} nenhuma pagina de noticias encontrada`);
  await dormir(400);
}
console.log(`     ${F.itens.length} itens de fonte livre no total`);

console.log('\n  3. CRUZAMENTO');
const confirmadas = [], soPauta = [];
for (const l of F.itens) {
  const casam = P.itens.filter(p => parecidas(p.titulo, l.titulo) >= 0.30);
  if (casam.length) {
    l.pautadoPor = [...new Set(casam.map(c=>c.veiculo))].slice(0,4);
    l.quentura = casam.length;
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

  for (const i of fila) {
    try {
      const texto = await textoCompleto(i.link);
      const m = await reescrever({ fonte: i.veiculo, titulo: i.titulo, texto });
      const arq = slug(m.titulo)+'.html';
      await writeFile('materia/'+arq, pagina(
        { chapeu: i.editoria==='regional'?'Mato Grosso':i.editoria==='internacional'?'Mundo':'Brasil',
          titulo:m.titulo, linhaFina:m.linhaFina, corpo:m.corpo, checar:[] },
        { link:i.link, municipio:'' }, i.iso), 'utf8');
      publicados.push({
        id:'ilm:'+slug(m.titulo), editoria:i.editoria, chapeu:'Nosso texto',
        titulo:m.titulo, resumo:m.linhaFina,
        fonte:'Il Meridiano, com informações de '+i.veiculo,
        origemLink:i.link, origemNome:i.veiculo,
        pautadoPor:i.pautadoPor||[], quentura:i.quentura||0,
        link:'/materia/'+arq, iso:i.iso, hora:horaBR(i.iso), original:true
      });
      escritas++;
      console.log('     ok    '+m.titulo.slice(0,60));
      await dormir(1200);
    } catch(e){ console.log('     pulou '+String(e.message).slice(0,60)); }
  }
} else {
  console.log('     sem GEMINI_API_KEY — reescrita desligada');
}

await writeFile('dados/edicao.json', JSON.stringify({
  gerado: new Date().toISOString(),
  modelo: modeloUsado(),
  numeros: { pauta:P.itens.length, fonteLivre:F.itens.length, confirmadas:confirmadas.length, publicadas:escritas, semFonte:soPautaFiltrada.length },
  itens: publicados,
  pautas: soPautaFiltrada.slice(0,18).map(p=>({
    titulo:p.titulo, veiculo:p.veiculo, editoria:p.editoria,
    quentura:p.quentura||0, tambemEm:p.tambemEm||[]
  }))
}, null, 2), 'utf8');

console.log('\n  ' + '='.repeat(66));
console.log(`  ${escritas} matérias próprias publicadas · modelo ${modeloUsado()}`);
console.log(`  ${soPautaFiltrada.length} pautas relevantes sem fonte livre\n`);
