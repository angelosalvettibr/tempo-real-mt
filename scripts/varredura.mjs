// Varredura do TEMPO REAL MT.
// Roda a cada 2 horas pelo GitHub Actions, grava dados/edicao.json e sai.
// Node 20+, zero dependência.
//
// Regras:
//   · nada com mais de JANELA_HORAS fica na edição
//   · agência internacional nunca entra (feed separado, nunca assinado)
//   · deduplicação por título normalizado
//   · varredura vazia NÃO apaga a edição anterior

import { writeFile, readFile, mkdir } from 'node:fs/promises';

const JANELA_HORAS = 24;
const POR_FONTE = 15;
const SAIDA = 'dados/edicao.json';

/* ========================================================================= */
/* FONTE 1 — Agência Brasil. URLs conferidas em 27/07/2026 na página oficial */
/* de RSS (agenciabrasil.ebc.com.br/feed). Responderam application/rss+xml.  */
/*                                                                           */
/* IMPORTANTE: existe um feed /rss/ultimasnoticias/parceiros/feed.xml com    */
/* material de Xinhua e Lusa, que NÃO pode ser republicado. Ele simplesmente */
/* não está nesta lista. É assim que o risco de licença some na origem.      */
/* ========================================================================= */

const AGENCIA_BRASIL = [
  { id:'ab-politica', editoria:'nacional', url:'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml' },
  { id:'ab-economia', editoria:'nacional', url:'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml' },
  { id:'ab-justica',  editoria:'nacional', url:'https://agenciabrasil.ebc.com.br/rss/justica/feed.xml'  },
  { id:'ab-geral',    editoria:'nacional', url:'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml'    }
].map(f => ({ ...f, tipo:'agencia', nome:'Agência Brasil' }));

/* ========================================================================= */
/* FONTE 2 — Google News RSS. Sem chave, sem cadastro, nunca sai do ar.      */
/* O operador when:1d força itens das últimas 24h (sem ele o feed traz       */
/* material com dias de idade). Cada item já vem com o nome do veículo,      */
/* que usamos como crédito. Mostramos manchete + veículo + link: agregação   */
/* com atribuição, nunca republicação de texto.                              */
/* ========================================================================= */

const BUSCAS = [
  { id:'gn-cuiaba',  editoria:'cuiaba',   q:'Cuiabá prefeitura OR câmara OR vereadores when:1d' },
  { id:'gn-vg',      editoria:'vg',       q:'"Várzea Grande" "Mato Grosso" -"Mato Grosso do Sul" when:1d' },
  { id:'gn-mt-pol',  editoria:'mt',       q:'"Mato Grosso" governo OR assembleia OR eleições -"Mato Grosso do Sul" -"Campo Grande" when:1d' },
  { id:'gn-mt-just', editoria:'mt',       q:'TJMT OR "TCE-MT" OR "Ministério Público de Mato Grosso" -"Mato Grosso do Sul" when:1d' },
  { id:'gn-agro',    editoria:'agro',     q:'"Mato Grosso" soja OR milho OR algodão OR Imea OR safra -"Mato Grosso do Sul" when:1d' },
  { id:'gn-agro-2',  editoria:'agro',     q:'agronegócio "Mato Grosso" exportação OR cotação -"Mato Grosso do Sul" when:1d' },
  { id:'gn-nacional',editoria:'nacional', q:'eleições 2026 Brasil convenção OR pesquisa when:1d' }
].map(f => ({
  ...f, tipo:'google-news', nome:'Google Notícias',
  url:`https://news.google.com/rss/search?q=${encodeURIComponent(f.q)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
}));

/* ========================================================================= */
/* FONTE 3 — assessorias oficiais de MT. Melhor esforço: se o órgão tiver    */
/* RSS, entra; se não tiver, o Google News acima já cobre o assunto.         */
/* Falha aqui não quebra a varredura.                                        */
/* ========================================================================= */

const OFICIAIS = [
  { id:'gov-mt', editoria:'mt',     nome:'Governo de MT',        url:'https://www.mt.gov.br/rss' },
  { id:'vg-pref',editoria:'vg',     nome:'Prefeitura de VG',     url:'https://www.varzeagrande.mt.gov.br/rss' }
].map(f => ({ ...f, tipo:'oficial', opcional:true }));

// Veículos de MT. Assinar o RSS que o próprio veículo publica é o uso normal
// de RSS: ele oferece manchete, resumo e a foto que escolheu incluir, para
// ser distribuído com crédito e link. Diferente de raspar o texto do site.
// Como cada um usa um caminho, o robô testa os candidatos e fica com o que responder.
const CAMINHOS_RSS = ['/feed', '/rss', '/feed/', '/rss.xml', '/?feed=rss2', '/feed/rss', '/rss/noticias'];

const VEICULOS_MT = [
  // O Documento: confirmado, responde em /rss com foto em todos os itens.
  { id:'odocumento',  nome:'O Documento',        site:'https://odocumento.com.br' },
  // MidiaNews e RDNews rodam no CMS Trinix e NAO publicam RSS. Ficam de fora.
  // Os de baixo em geral rodam WordPress, onde /feed existe e traz a foto.
  { id:'estadaomt',   nome:'Estadão MT',         site:'https://www.estadaomatogrosso.com.br' },
  { id:'olivre',      nome:'O Livre',            site:'https://www.olivre.com.br' },
  { id:'issoenoticia',nome:'Isso É Notícia',     site:'https://issoenoticia.com.br' },
  { id:'muvuca',      nome:'Muvuca Popular',     site:'https://www.muvucapopular.com.br' },
  { id:'minutomt',    nome:'Minuto MT',          site:'https://minutomt.com.br' },
  { id:'cenariomt',   nome:'CenárioMT',          site:'https://www.cenariomt.com.br' },
  { id:'pontocurva',  nome:'Ponto na Curva',     site:'https://www.pontonacurva.com.br' },
  { id:'vgnoticias',  nome:'VG Notícias',        site:'https://www.vgnoticias.com.br' },
  { id:'sonoticias',  nome:'Só Notícias',        site:'https://www.sonoticias.com.br' },
  { id:'vipmt',       nome:'VIP MT',             site:'https://vipmt.com.br' },
  { id:'midiajur',    nome:'Midia Jur',          site:'https://www.midiajur.com.br' },
  { id:'canaldiario', nome:'Canal Diário',       site:'https://canaldiario.com.br' },
  { id:'passandoalimpo', nome:'Passando a Limpo', site:'https://passandoalimpomt.com.br' },
  { id:'olhardireto', nome:'Olhar Direto',       site:'https://www.olhardireto.com.br' },
  { id:'folhamax',    nome:'FolhaMax',           site:'https://www.folhamax.com' },
  { id:'gazeta',      nome:'Gazeta Digital',     site:'https://www.gazetadigital.com.br' }
].map(f => ({ ...f, editoria:'mt', tipo:'veiculo', opcional:true }));

const FONTES = [...AGENCIA_BRASIL, ...BUSCAS, ...OFICIAIS];

// Cinto de segurança: mesmo com o feed de parceiros fora da lista,
// qualquer item que traga marca de agência internacional é descartado.
const BLOQUEIO = ['reuters','afp','associated press','efe','ansa','sputnik',
  'xinhua','lusa','dpa','e proibida a reproducao','proibida a reproducao'];

// Palavra inteira, nunca pedaço. Sem isto, "efe" (a agência espanhola) casa
// dentro de "prefeitura", "prefeito", "prefeita" — e o filtro joga fora
// justamente as notícias de Cuiabá e Várzea Grande.
const RE_BLOQUEIO = new RegExp(
  '\\b(' + BLOQUEIO
    .map(b => b.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ /g,'\\s+'))
    .join('|') + ')\\b'
);

const AGRO = ['soja','milho','algodão','boi','pecuária','safra','agro','grão',
  'fertilizante','colheita','plantio','imea','commodities'];

/* ------------------------------------------------------------------- apoio */

const semAcento = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// Decodifica entidades ANTES de remover tags, duas passadas. O Google Notícias
// manda a descrição com as tags escapadas (&lt;a href...&gt;); na ordem errada,
// o HTML escapado vira texto visível na tela.
const limpar = s => {
  let t = String(s||'').replace(/<!\[CDATA\[|\]\]>/g,'');
  for (let i = 0; i < 2; i++) {
    t = t.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
         .replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ');
    t = t.replace(/<[^>]+>/g,' ');
  }
  return t.replace(/\s+/g,' ').trim();
};

const campo = (b,t) => { const m = b.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`,'i')); return m ? m[1].trim() : ''; };
const attr  = (b,t,a) => { const m = b.match(new RegExp(`<${t}[^>]*${a}="([^"]+)"`,'i')); return m ? m[1] : ''; };

// Imagem só quando a própria fonte manda dentro do RSS — Agência Brasil e
// assessorias públicas fazem isso, e nesse caso a foto vem licenciada junto
// com o texto. Nunca buscamos foto na página de terceiro.
function acharImagem(b){
  const cand = attr(b,'enclosure','url')
    || attr(b,'media:content','url')
    || attr(b,'media:thumbnail','url')
    || (b.match(/<img[^>]+src="([^"]+\.(?:jpe?g|png|webp))"/i)?.[1] ?? '');
  return /^https?:\/\//.test(cand) ? cand : '';
}

function lerRSS(xml){
  return [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(m => m[0]).map(b => ({
    imagem: acharImagem(b),
    titulo: limpar(campo(b,'title')),
    link: campo(b,'link') || attr(b,'link','href') || '',
    resumo: limpar(campo(b,'description') || campo(b,'summary')),
    data: campo(b,'pubDate') || campo(b,'published') || campo(b,'updated') || '',
    veiculo: limpar(campo(b,'source')),   // Google News põe o veículo aqui
    bruto: b
  })).filter(i => i.titulo && i.link);
}

async function buscar(url, ms = 25000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal:c.signal, redirect:'follow',
      headers:{ 'User-Agent':'TempoRealMT/1.0 (+contato@seu-dominio.com.br)', 'Accept':'application/rss+xml, application/xml, text/xml, */*' }});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

const chave = t => semAcento(t).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);

const horaBR = iso => new Date(iso)
  .toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit', timeZone:'America/Cuiaba' })
  .replace(':','h');

// No Google News o título vem como "Manchete - Veículo". Separamos os dois.
function separarVeiculo(titulo, veiculo){
  if (!veiculo) return { titulo, veiculo:'' };
  const sufixo = ' - ' + veiculo;
  return titulo.endsWith(sufixo)
    ? { titulo: titulo.slice(0, -sufixo.length).trim(), veiculo }
    : { titulo, veiculo };
}

const ehAgro = txt => AGRO.some(p => semAcento(txt).includes(semAcento(p)));

/* --------------------------------------------------------------- varredura */

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

      // Rede de segurança: se o Mato Grosso do Sul escapar da busca, morre aqui.
      const MS = /(mato grosso do sul|campo grande|ponta pora|tres lagoas|dourados|corumba|\bms\b)/;
      if (f.editoria !== 'nacional' && MS.test(alvo)) { velhos++; continue; }

      const { titulo, veiculo } = separarVeiculo(b.titulo, b.veiculo);
      const iso = new Date(ts).toISOString();
      const credito = veiculo || f.nome;

      itens.push({
        id: `${f.id}:${chave(titulo)}`,
        editoria: ehAgro(titulo + ' ' + b.resumo) ? 'agro' : f.editoria,
        chapeu: credito,
        titulo,
        resumo: f.tipo === 'google-news' ? '' : b.resumo.slice(0, 300),
        fonte: credito,
        link: b.link,
        imagem: b.imagem || '',
        iso,
        hora: horaBR(iso),
        destaque: false
      });
      ok++;
    }
    relatorio.push(`ok    ${f.id.padEnd(12)} ${String(ok).padStart(3)} novos · ${velhos} fora da janela · ${bloqueados} bloqueados`);
  } catch (e) {
    const marca = f.opcional ? 'aviso' : 'FALHA';
    relatorio.push(`${marca} ${f.id.padEnd(12)} ${e.message}`);
  }
}

// Descoberta de feed dos veículos de MT
for (const v of VEICULOS_MT) {
  let achou = '';
  for (const c of CAMINHOS_RSS) {
    try {
      const xml = await buscar(v.site + c, 12000);
      if (lerRSS(xml).length > 0) { achou = v.site + c; break; }
    } catch { /* tenta o proximo */ }
  }
  if (!achou) { relatorio.push(`aviso ${v.id.padEnd(12)} sem RSS nos caminhos testados`); continue; }

  try {
    const brutos = lerRSS(await buscar(achou)).slice(0, 8);
    let ok = 0, velhos = 0, comFoto = 0;
    for (const b of brutos) {
      const ts = Date.parse(b.data);
      if (Number.isNaN(ts) || ts < corte) { velhos++; continue; }
      const alvo = semAcento(`${b.titulo} ${b.resumo}`);
      if (RE_BLOQUEIO.test(alvo)) continue;
      const iso = new Date(ts).toISOString();
      if (b.imagem) comFoto++;
      itens.push({
        id: `${v.id}:${chave(b.titulo)}`,
        editoria: ehAgro(b.titulo + ' ' + b.resumo) ? 'agro' : v.editoria,
        chapeu: v.nome, titulo: b.titulo, resumo: b.resumo.slice(0,300),
        fonte: v.nome, link: b.link, imagem: b.imagem || '',
        iso, hora: horaBR(iso), destaque:false
      });
      ok++;
    }
    relatorio.push(`ok    ${v.id.padEnd(12)} ${String(ok).padStart(3)} novos · ${comFoto} com foto · ${achou.replace(v.site,'')}`);
  } catch (e) {
    relatorio.push(`aviso ${v.id.padEnd(12)} ${e.message}`);
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

if (finais.length === 0) {
  console.log('\n  Varredura vazia. A edição anterior foi preservada.\n');
  try { await readFile(SAIDA); process.exit(0); } catch { /* sem arquivo anterior, segue */ }
}

await mkdir('dados', { recursive: true });
await writeFile(SAIDA, JSON.stringify({
  gerado: new Date().toISOString(),
  origem: 'varredura-automatica',
  janelaHoras: JANELA_HORAS,
  fontesConsultadas: FONTES.length,
  relatorio,
  itens: finais
}, null, 2), 'utf8');

console.log('  gravado em ' + SAIDA + '\n');
