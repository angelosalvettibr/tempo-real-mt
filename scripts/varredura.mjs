// Varredura do TEMPO REAL MT.
// Roda a cada 2 horas pelo GitHub Actions, grava dados/edicao.json e sai.
// Node 20+, zero dependência.

import { writeFile, readFile, mkdir } from 'node:fs/promises';

const JANELA_HORAS = 24;
const POR_FONTE = 15;
const SAIDA = 'dados/edicao.json';

// Agência Brasil. O feed /parceiros/ (Xinhua e Lusa) fica FORA de propósito:
// aquele material não pode ser republicado.
const AGENCIA_BRASIL = [
  { id:'ab-politica', editoria:'nacional', url:'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml' },
  { id:'ab-economia', editoria:'nacional', url:'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml' },
  { id:'ab-justica',  editoria:'nacional', url:'https://agenciabrasil.ebc.com.br/rss/justica/feed.xml'  },
  { id:'ab-geral',    editoria:'nacional', url:'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml'    }
].map(f => ({ ...f, tipo:'agencia', nome:'Agência Brasil' }));

// Google Notícias. O operador when:1d limita às últimas 24h.
const BUSCAS = [
  { id:'gn-cuiaba',   editoria:'cuiaba',   q:'Cuiabá prefeitura OR câmara OR vereadores when:1d' },
  { id:'gn-vg',       editoria:'vg',       q:'"Várzea Grande" when:1d' },
  { id:'gn-mt-pol',   editoria:'mt',       q:'"Mato Grosso" governo OR assembleia OR eleições when:1d' },
  { id:'gn-mt-just',  editoria:'mt',       q:'"Mato Grosso" "Tribunal de Contas" OR TJMT OR "Ministério Público" when:1d' },
  { id:'gn-agro',     editoria:'agro',     q:'"Mato Grosso" soja OR milho OR algodão OR Imea OR safra when:1d' },
  { id:'gn-agro-2',   editoria:'agro',     q:'agronegócio Mato Grosso exportação OR cotação when:1d' },
  { id:'gn-nacional', editoria:'nacional', q:'eleições 2026 Brasil convenção OR pesquisa when:1d' }
].map(f => ({
  ...f, tipo:'google-news', nome:'Google Notícias',
  url:`https://news.google.com/rss/search?q=${encodeURIComponent(f.q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
}));

// Assessorias: melhor esforço. Falha aqui não quebra a varredura.
const OFICIAIS = [
  { id:'gov-mt',  editoria:'mt', nome:'Governo de MT',    url:'https://www.mt.gov.br/rss' },
  { id:'vg-pref', editoria:'vg', nome:'Prefeitura de VG', url:'https://www.varzeagrande.mt.gov.br/rss' }
].map(f => ({ ...f, tipo:'oficial', opcional:true }));

const FONTES = [...AGENCIA_BRASIL, ...BUSCAS, ...OFICIAIS];

const BLOQUEIO = ['reuters','afp','associated press','efe','ansa','sputnik',
  'xinhua','lusa','dpa','e proibida a reproducao','proibida a reproducao'];

// Palavra inteira, nunca pedaço. Sem isto, "efe" casa dentro de "prefeitura",
// "prefeito" e "prefeita" — e o filtro joga fora justamente Cuiabá e VG.
const RE_BLOQUEIO = new RegExp(
  '\\b(' + BLOQUEIO
    .map(b => b.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ /g,'\\s+'))
    .join('|') + ')\\b'
);

const AGRO = ['soja','milho','algodão','boi','pecuária','safra','agro','grão',
  'fertilizante','colheita','plantio','imea','commodities'];

const semAcento = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const limpar = s => String(s||'')
  .replace(/<!\[CDATA\[|\]\]>/g,'').replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
  .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/\s+/g,' ').trim();

const campo = (b,t) => { const m = b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`,'i')); return m ? m[1].trim() : ''; };
const attr  = (b,t,a) => { const m = b.match(new RegExp(`<${t}[^>]*${a}="([^"]+)"`,'i')); return m ? m[1] : ''; };

function lerRSS(xml){
  return [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(m => m[0]).map(b => ({
    titulo: limpar(campo(b,'title')),
    link: campo(b,'link') || attr(b,'link','href') || '',
    resumo: limpar(campo(b,'description') || campo(b,'summary')),
    data: campo(b,'pubDate') || campo(b,'published') || campo(b,'updated') || '',
    veiculo: limpar(campo(b,'source')),
    bruto: b
  })).filter(i => i.titulo && i.link);
}

async function buscar(url, ms = 25000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal:c.signal, redirect:'follow',
      headers:{ 'User-Agent':'TempoRealMT/1.0', 'Accept':'application/rss+xml, application/xml, text/xml, */*' }});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

const chave = t => semAcento(t).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);

const horaBR = iso => new Date(iso)
  .toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit', timeZone:'America/Cuiaba' })
  .replace(':','h');

// No Google Notícias o título vem como "Manchete - Veículo".
function separarVeiculo(titulo, veiculo){
  if (!veiculo) return { titulo, veiculo:'' };
  const sufixo = ' - ' + veiculo;
  return titulo.endsWith(sufixo)
    ? { titulo: titulo.slice(0, -sufixo.length).trim(), veiculo }
    : { titulo, veiculo };
}

const ehAgro = txt => AGRO.some(p => semAcento(txt).includes(semAcento(p)));

const corte = Date.now() - JANELA_HORAS * 3600 * 1000;
const itens = [];
const relatorio = [];

for (const f of FONTES) {
  try {
    const brutos = lerRSS(await buscar(f.url)).slice(0, POR_FONTE);
    let ok = 0, velhos = 0, bloqueados = 0;

    for (const b of brutos) {
      const ts = Date.parse(b.data);
      if (Number.isNaN(ts) || ts < corte) { velhos++; continue; }

      const alvo = semAcento(`${b.titulo} ${b.resumo} ${b.veiculo}`);
      if (RE_BLOQUEIO.test(alvo)) { bloqueados++; continue; }

      const { titulo, veiculo } = separarVeiculo(b.titulo, b.veiculo);
      const iso = new Date(ts).toISOString();
      const credito = veiculo || f.nome;

      itens.push({
        id: `${f.id}:${chave(titulo)}`,
        editoria: ehAgro(titulo + ' ' + b.resumo) ? 'agro' : f.editoria,
        chapeu: credito,
        titulo,
        resumo: b.resumo.slice(0, 300),
        fonte: credito,
        link: b.link,
        iso,
        hora: horaBR(iso),
        destaque: false
      });
      ok++;
    }
    relatorio.push(`ok    ${f.id.padEnd(12)} ${String(ok).padStart(3)} novos · ${velhos} fora da janela · ${bloqueados} bloqueados`);
  } catch (e) {
    relatorio.push(`${f.opcional ? 'aviso' : 'FALHA'} ${f.id.padEnd(12)} ${e.message}`);
  }
}

const vistos = new Set();
const finais = itens
  .filter(i => { const k = chave(i.titulo); if (vistos.has(k)) return false; vistos.add(k); return true; })
  .sort((a,b) => Date.parse(b.iso) - Date.parse(a.iso));

if (finais.length) finais[0].destaque = true;

console.log('\n  TEMPO REAL MT · varredura ' + new Date().toISOString());
console.log('  ' + '-'.repeat(64));
relatorio.forEach(l => console.log('  ' + l));
console.log('  ' + '-'.repeat(64));

const porEditoria = finais.reduce((a,i) => (a[i.editoria] = (a[i.editoria]||0)+1, a), {});
console.log(`  ${finais.length} itens na janela de ${JANELA_HORAS}h:`, JSON.stringify(porEditoria));

// Varredura vazia não apaga a edição que está no ar.
if (finais.length === 0) {
  console.log('\n  Varredura vazia. Edição anterior preservada.\n');
  try { await readFile(SAIDA); process.exit(0); } catch {}
}

await mkdir('dados', { recursive: true });
awa
