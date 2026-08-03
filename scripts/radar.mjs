// RADAR — o único conteúdo original do MERIDIANO.
//
// Lê as contratações públicas de Mato Grosso no PNCP, aplica regras de
// interesse jornalístico e escreve a matéria a partir dos campos do documento.
//
// Por que sem IA: aqui o valor está no número estar certo. Modelo de linguagem
// erra número e inventa contexto. Texto montado a partir dos campos não erra:
// cada cifra, cada data e cada nome vêm direto do documento oficial, e o link
// para conferir vai junto. Escrever com regra é mais chato e mais confiável.

const PNCP = 'https://pncp.gov.br/api/consulta/v1';

export const REGRAS = {
  semDisputaAcimaDe: 200_000,     // dispensa ou inexigibilidade relevante
  valorAlto: 1_000_000,
  prazoCurtoDias: 8,              // edital grande com prazo apertado
  repeticaoNoOrgao: 3,            // dispensas seguidas no mesmo órgão
  diasDeJanela: 7
};

const MODALIDADES = {
  1:'leilão eletrônico', 4:'concorrência eletrônica', 6:'pregão eletrônico',
  8:'dispensa de licitação', 9:'inexigibilidade de licitação', 12:'credenciamento'
};

const reais = v => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const dataBR = d => { const t = Date.parse(d); return Number.isNaN(t) ? '' : new Date(t).toLocaleDateString('pt-BR',{timeZone:'America/Cuiaba'}); };
const dias = (a,b) => { const x=Date.parse(a), y=Date.parse(b); return (Number.isNaN(x)||Number.isNaN(y)) ? null : Math.round((y-x)/86400000); };
const aaaammdd = d => d.toISOString().slice(0,10).replace(/-/g,'');
export const slug = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);

// O PNCP e lento e instavel. Espera curta, uma repeticao, e um cronometro
// geral: se a coleta toda passar de ORCAMENTO_MS, desiste e segue. Melhor
// perder o Radar numa rodada do que travar a varredura inteira.
const ORCAMENTO_MS = 90000;
const dormir = ms => new Promise(r => setTimeout(r, ms));

async function buscar(url, ms = 20000, tentativas = 2){
  let ultimo;
  for (let i = 0; i < tentativas; i++) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try {
      const r = await fetch(url, { signal:c.signal, headers:{ 'User-Agent':'Meridiano/1.0', Accept:'application/json' }});
      if (!r.ok) throw new Error('HTTP '+r.status);
      return await r.json();
    } catch(e) {
      ultimo = e;
      if (i < tentativas-1) await dormir(2000);
    } finally { clearTimeout(t); }
  }
  throw ultimo;
}

/* --------------------------------------------------------------- coleta ---- */

export async function coletarPNCP(){
  const fim = new Date();
  const ini = new Date(Date.now() - REGRAS.diasDeJanela*86400000);
  const achados = [], relatorio = [];

  const comecou = Date.now();

  for (const mod of [8, 9, 6, 4]) {          // dispensa e inexigibilidade primeiro: sao as que viram materia
    if (Date.now() - comecou > ORCAMENTO_MS) {
      relatorio.push(`aviso pncp-mod-${mod}  pulado, orcamento de tempo esgotado`);
      continue;
    }
    const url = `${PNCP}/contratacoes/publicacao`
      + `?dataInicial=${aaaammdd(ini)}&dataFinal=${aaaammdd(fim)}`
      + `&codigoModalidadeContratacao=${mod}&uf=MT&pagina=1&tamanhoPagina=50`;
    try {
      const r = await buscar(url);
      const lista = r?.data || r?.items || [];
      for (const c of lista) achados.push({
        modalidade: mod,
        modalidadeNome: MODALIDADES[mod] || 'contratação',
        objeto: (c.objetoCompra || c.objeto || '').replace(/\s+/g,' ').trim(),
        orgao: c.orgaoEntidade?.razaoSocial || c.nomeOrgaoEntidade || '',
        unidade: c.unidadeOrgao?.nomeUnidade || '',
        municipio: c.unidadeOrgao?.municipioNome || '',
        valor: Number(c.valorTotalEstimado || c.valorTotal || 0),
        publicacao: c.dataPublicacaoPncp || c.dataInclusao || '',
        encerramento: c.dataEncerramentoProposta || '',
        numero: c.numeroCompra || '',
        cnpjOrgao: c.orgaoEntidade?.cnpj || '',
        ano: c.anoCompra, seq: c.sequencialCompra,
        link: c.orgaoEntidade?.cnpj && c.anoCompra && c.sequencialCompra
          ? `https://pncp.gov.br/app/editais/${c.orgaoEntidade.cnpj}/${c.anoCompra}/${c.sequencialCompra}`
          : 'https://pncp.gov.br/app/editais'
      });
      relatorio.push(`ok    pncp-mod-${mod}  ${lista.length} contratações`);
    } catch (e) {
      relatorio.push(`aviso pncp-mod-${mod}  ${e.message}`);
    }
  }
  return { contratacoes: achados, relatorio };
}

/* ---------------------------------------------------------------- regras --- */

export function apurar(contratacoes){
  const historias = [];

  // Regra 1 — compra sem disputa acima do limite
  for (const c of contratacoes) {
    if (![8,9].includes(c.modalidade) || c.valor < REGRAS.semDisputaAcimaDe) continue;
    historias.push({ tipo:'sem-disputa', peso: 7 + faixa(c.valor), c });
  }

  // Regra 2 — prazo curto para contrato grande
  for (const c of contratacoes) {
    const d = dias(c.publicacao, c.encerramento);
    if (d === null || d > REGRAS.prazoCurtoDias || c.valor < 500_000) continue;
    historias.push({ tipo:'prazo-curto', peso: 6 + faixa(c.valor), c, extra:{ dias:d } });
  }

  // Regra 3 — mesmo órgão repetindo dispensa
  const porOrgao = new Map();
  for (const c of contratacoes.filter(x => [8,9].includes(x.modalidade))) {
    if (!porOrgao.has(c.orgao)) porOrgao.set(c.orgao, []);
    porOrgao.get(c.orgao).push(c);
  }
  for (const [orgao, lista] of porOrgao) {
    if (!orgao || lista.length < REGRAS.repeticaoNoOrgao) continue;
    const soma = lista.reduce((s,x)=>s+x.valor,0);
    historias.push({ tipo:'repeticao', peso: 9, c: lista[0], extra:{ orgao, quantas:lista.length, soma, lista } });
  }

  // Regra 4 — contrato de valor muito alto, qualquer modalidade
  for (const c of contratacoes) {
    if (c.valor < 10_000_000) continue;
    historias.push({ tipo:'valor-alto', peso: 6 + faixa(c.valor), c });
  }

  const vistas = new Set();
  return historias
    .sort((a,b) => b.peso - a.peso)
    .filter(h => { const k = h.tipo+':'+slug(h.c.objeto).slice(0,40); if (vistas.has(k)) return false; vistas.add(k); return true; });
}

const faixa = v => v >= 10_000_000 ? 3 : v >= 1_000_000 ? 2 : v >= 300_000 ? 1 : 0;

/* ----------------------------------------------------------- redação ------- */
// Cada tipo tem sua estrutura. O texto sai dos campos, nunca de suposição.

export function escrever(h){
  const c = h.c;
  const onde = c.municipio ? ` em ${c.municipio}` : ' em Mato Grosso';
  const objetoCurto = c.objeto.length > 120 ? c.objeto.slice(0,120).trim() + '…' : c.objeto;

  if (h.tipo === 'repeticao') {
    const e = h.extra;
    return {
      chapeu: 'Contas públicas',
      titulo: `${e.orgao} fez ${e.quantas} compras sem licitação em uma semana, somando ${reais(e.soma)}`,
      linhaFina: `Os avisos foram publicados no Portal Nacional de Contratações Públicas na mesma janela de sete dias. Todos usaram dispensa ou inexigibilidade, modalidades que abrem mão da disputa de preço.`,
      corpo: [
        `O ${e.orgao} publicou ${e.quantas} contratações sem licitação nos últimos sete dias, que somadas chegam a ${reais(e.soma)}. Os registros estão no Portal Nacional de Contratações Públicas, o PNCP, onde todo órgão público é obrigado a publicar suas compras.`,
        `Dispensa e inexigibilidade são modalidades previstas em lei e usadas quando não há como abrir disputa — emergência, fornecedor único, valor baixo. A lei também proíbe fracionar uma despesa grande em várias pequenas para escapar da licitação.`,
        `As contratações registradas foram:`,
        ...e.lista.slice(0,6).map(x => `• ${reais(x.valor)} — ${x.objeto.slice(0,150)}${x.objeto.length>150?'…':''} (${x.modalidadeNome}, ${dataBR(x.publicacao)})`),
        `Este texto foi gerado a partir dos dados publicados pelo próprio órgão. Os documentos completos, com justificativa de cada dispensa, estão disponíveis no PNCP.`
      ],
      checar: [
        'Os objetos são parecidos entre si — indício de fracionamento de despesa',
        'A soma ultrapassa o limite legal para dispensa',
        'Quem assinou a autorização de cada uma'
      ]
    };
  }

  if (h.tipo === 'prazo-curto') {
    return {
      chapeu: 'Licitação',
      titulo: `Edital de ${reais(c.valor)}${onde} dá ${h.extra.dias} dias para as empresas se prepararem`,
      linhaFina: `${c.orgao} publicou em ${dataBR(c.publicacao)} e encerra o prazo de propostas em ${dataBR(c.encerramento)}.`,
      corpo: [
        `O ${c.orgao} abriu ${c.modalidadeNome} de ${reais(c.valor)} com prazo de ${h.extra.dias} dias entre a publicação e o encerramento das propostas. O objeto é ${objetoCurto.toLowerCase()}.`,
        `O prazo entre o aviso e a entrega das propostas define quantas empresas conseguem participar. Quanto mais curto, menor o número de concorrentes que reúnem documentação, montam preço e apresentam proposta a tempo — o que tende a reduzir a disputa e elevar o valor final.`,
        `A lei fixa prazos mínimos por modalidade. Cabe ao órgão demonstrar que o prazo adotado respeita o mínimo legal e é compatível com a complexidade do objeto.`,
        `O edital completo, com exigências de habilitação e prazos, está publicado no PNCP.`
      ],
      checar: [
        'O prazo respeita o mínimo legal da modalidade',
        'Quantas empresas efetivamente apresentaram proposta',
        'Se as exigências técnicas restringem o universo de concorrentes'
      ]
    };
  }

  if (h.tipo === 'valor-alto') {
    return {
      chapeu: 'Contas públicas',
      titulo: `${c.orgao} abre contratação de ${reais(c.valor)}${onde}`,
      linhaFina: `A ${c.modalidadeNome} foi publicada em ${dataBR(c.publicacao)} e tem como objeto ${objetoCurto.toLowerCase()}.`,
      corpo: [
        `O ${c.orgao} publicou ${c.modalidadeNome} no valor estimado de ${reais(c.valor)}. O objeto informado é ${objetoCurto.toLowerCase()}.`,
        c.encerramento ? `As propostas podem ser apresentadas até ${dataBR(c.encerramento)}.` : `O aviso não traz data de encerramento de propostas.`,
        `Contratações desse porte concentram parte relevante do orçamento do órgão e costumam envolver poucas empresas com capacidade de execução. O acompanhamento das etapas — habilitação, julgamento e assinatura — é público.`,
        `O documento completo está no PNCP, com o número da contratação e todos os anexos.`
      ],
      checar: [
        'Quantas empresas se habilitaram e qual a diferença entre as propostas',
        'Se houve aditivo em contratos anteriores do mesmo objeto',
        'Há quanto tempo a empresa vencedora existe'
      ]
    };
  }

  // sem-disputa
  return {
    chapeu: 'Contas públicas',
    titulo: `${c.orgao} contratou ${reais(c.valor)} sem licitação${onde}`,
    linhaFina: `A contratação foi feita por ${c.modalidadeNome} e publicada em ${dataBR(c.publicacao)}. O objeto é ${objetoCurto.toLowerCase()}.`,
    corpo: [
      `O ${c.orgao} registrou no Portal Nacional de Contratações Públicas uma ${c.modalidadeNome} de ${reais(c.valor)}. O objeto informado é ${objetoCurto.toLowerCase()}.`,
      `Nessa modalidade não há disputa de preço entre concorrentes: o órgão escolhe o fornecedor e justifica por que a licitação não se aplica. A lei permite em situações específicas, como emergência, fornecedor exclusivo ou valor abaixo do limite legal.`,
      `A justificativa é parte obrigatória do processo e fica disponível junto com o aviso. É nela que o órgão precisa demonstrar por que abriu mão da concorrência.`,
      `Os documentos completos estão publicados no PNCP, com número, data e valor da contratação.`
    ],
    checar: [
      'Qual a justificativa formal apresentada para a dispensa',
      'Se existe outra empresa capaz de prestar o mesmo serviço na região',
      'Se o órgão já contratou a mesma empresa antes'
    ]
  };
}

/* --------------------------------------------------- página da matéria ----- */

export function pagina(m, c, iso){
  const corpo = m.corpo.map(p =>
    p.startsWith('•') ? `<li>${esc(p.slice(1).trim())}</li>` : `<p>${esc(p)}</p>`
  ).join('\n');
  const corpoHtml = corpo.replace(/(<li>[\s\S]*<\/li>)/, '<ul>$1</ul>');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(m.titulo)}">
<meta property="og:description" content="${esc((m.linhaFina || '').slice(0,180))}">
${m.foto ? `<meta property="og:image" content="${esc(m.foto.src)}">` : ''}
<meta name="twitter:card" content="${m.foto ? 'summary_large_image' : 'summary'}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(m.titulo)} — MERIDIANO</title>
<meta name="description" content="${esc(m.linhaFina).slice(0,155)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(m.titulo)}">
<meta property="og:description" content="${esc(m.linhaFina).slice(0,155)}">
<meta property="article:published_time" content="${iso}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"NewsArticle",
"headline":${JSON.stringify(m.titulo)},
"description":${JSON.stringify(m.linhaFina)},
"datePublished":"${iso}","inLanguage":"pt-BR",
"articleSection":${JSON.stringify(m.chapeu)},
"publisher":{"@type":"NewsMediaOrganization","name":"MERIDIANO"},
"isBasedOn":${JSON.stringify(c.link)}}
</script>
<style>
:root{--tinta:#15191F;--papel:#FAF9F5;--linha:#E4E1D8;--fraco:#878C95;--sinal:#B34700;--verde:#1F6B4A;--areia:#F1EFE8}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--papel);color:var(--tinta);font-family:'Playfair Display',Georgia,serif;line-height:1.5}
a{color:inherit}
.wrap{max-width:720px;margin:0 auto;padding:0 20px}
header{border-bottom:2px solid var(--tinta);margin-bottom:30px}
.topo{display:flex;align-items:center;gap:11px;padding:15px 0}
.barra{width:3px;height:34px;background:var(--sinal)}
.nome{font-size:21px;font-weight:900;letter-spacing:-.035em}
.nome span{color:var(--sinal)}
.selo{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#fff;background:var(--verde);padding:5px 9px;display:inline-block;margin-bottom:14px}
.selo.nc{background:#8A8A8A}
.nc-aviso{border:1px solid #E0D6BE;background:#FBF6EA;padding:16px 20px;margin:0 0 26px;font-family:'Source Serif 4',Georgia,serif;font-size:15.5px;line-height:1.6;color:#5C4A1E}
.chapeu{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--sinal);display:block;margin-bottom:9px}
h1{font-size:clamp(27px,4.4vw,40px);font-weight:800;letter-spacing:-.032em;line-height:1.06;margin-bottom:14px}
.linha-fina{font-family:'Source Serif 4',Georgia,serif;font-size:19px;line-height:1.5;color:#414852;margin-bottom:22px}
.assina{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.06em;color:var(--fraco);border-top:1px solid var(--linha);border-bottom:1px solid var(--linha);padding:13px 0;margin-bottom:28px}
.corpo{font-family:'Source Serif 4',Georgia,serif;font-size:18.5px;line-height:1.72;color:#22282F}
.corpo p{margin-bottom:21px}
.corpo ul{margin:0 0 21px 20px}
.corpo li{margin-bottom:11px}
.apura{border:1px solid var(--tinta);margin:30px 0;background:#fff}
.apura>.cab{background:var(--tinta);color:var(--papel);padding:11px 18px;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase}
.apura .miolo{padding:17px 19px}
.apura .raciocinio{font-family:'Source Serif 4',Georgia,serif;font-size:15.5px;line-height:1.62;color:#3C3C3C;margin-bottom:15px}
.apura .num{display:flex;gap:26px;flex-wrap:wrap;padding:12px 0;border-top:1px solid var(--linha);border-bottom:1px solid var(--linha);margin-bottom:14px}
.apura .num div{font-family:'IBM Plex Mono',monospace}
.apura .num b{display:block;font-size:21px;color:var(--tinta);line-height:1}
.apura .num span{font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--fraco);display:block;margin-top:5px}
.apura table{width:100%;border-collapse:collapse;font-family:'IBM Plex Mono',monospace;font-size:11.5px}
.apura td{padding:7px 0;border-bottom:1px solid var(--linha);vertical-align:top;color:#4A4A4A}
.apura td:first-child{color:var(--tinta)}
.apura td:last-child{text-align:right;white-space:nowrap;color:var(--fraco)}
.apura .pt{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--sinal);margin-left:7px}
.apura .mudo{color:#B00}
.apura .fim{font-family:'Source Serif 4',Georgia,serif;font-size:14px;line-height:1.55;color:var(--fraco);margin-top:14px}
.foto{margin:26px 0 8px}
.foto img{width:100%;height:auto;display:block;border:1px solid var(--linha)}
.foto figcaption{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.06em;color:var(--fraco);margin-top:8px;text-transform:uppercase}
.crono{margin:26px 0 8px;border-top:1px solid var(--tinta)}
.crono .lin{display:grid;grid-template-columns:150px 1fr;gap:0 22px;padding:17px 0;border-bottom:1px solid var(--linha)}
.crono .q{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.11em;text-transform:uppercase;color:var(--sinal);padding-top:3px}
.crono .t{font-family:'Source Serif 4',Georgia,serif;font-size:16.5px;line-height:1.6;color:var(--tinta)}
.crono .f{display:block;margin-top:9px;font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.06em}
.crono .f a{color:var(--sinal);text-decoration:none;border-bottom:1px solid var(--linha)}
.crono .f a:hover{border-color:var(--sinal)}
.crono .f .sem{color:var(--fraco)}
@media(max-width:640px){.crono .lin{grid-template-columns:1fr;gap:7px}.crono .q{padding-top:0}}
.relac{border-top:1px solid var(--tinta);padding-top:15px;margin:34px 0 4px}
.relac b{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--tinta);display:block;margin-bottom:12px}
.relac a{display:block;text-decoration:none;color:var(--tinta);padding:9px 0;border-bottom:1px solid var(--linha);font-family:'Source Serif 4',Georgia,serif;font-size:16px;line-height:1.32}
.relac a:hover{color:var(--sinal)}
.relac span{display:block;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.1em;color:var(--fraco);margin-top:4px}
.acoes{display:flex;gap:9px;flex-wrap:wrap;margin:30px 0 6px;padding-top:16px;border-top:1px solid var(--linha)}
.acoes button{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;background:none;border:1.5px solid var(--tinta);color:var(--tinta);padding:10px 15px;cursor:pointer;transition:.14s}
.acoes button:hover{background:var(--tinta);color:var(--papel)}
.acoes button.zap{border-color:var(--verde);color:var(--verde)}
.acoes button.ctx{border-color:#1F4D7A;color:#1F4D7A}
.acoes button.ctx:hover{background:#1F4D7A;color:#fff}
/* O bloco de contexto tem cara propria de proposito: na mesma pagina convivem
   um fato que pode nao estar confirmado e uma explicacao verificavel. Sao
   graus de certeza diferentes, e a tela precisa mostrar isso. */
.ctx-bloco{border:1px solid #1F4D7A;background:#F4F8FC;padding:19px 22px;margin:26px 0}
.ctx-bloco b.tit{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#1F4D7A;display:block;margin-bottom:12px}
.ctx-bloco p{font-family:'Source Serif 4',Georgia,serif;font-size:16px;line-height:1.65;color:#2A3540;margin-bottom:12px}
.ctx-bloco p:last-of-type{margin-bottom:0}
.ctx-bloco .fontes{font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#5A6B7C;margin-top:14px;padding-top:12px;border-top:1px solid #CBD9E6;line-height:1.6}
.ctx-bloco .nada{font-family:'Source Serif 4',Georgia,serif;font-size:15px;color:#5A6B7C}
.acoes button.seg{border-color:var(--sinal);color:var(--sinal)}
.acoes button.seg:hover{background:var(--sinal);color:#fff}
.acoes button.seg.on{background:var(--sinal);color:#fff}
.acoes button.zap:hover{background:var(--verde);color:#fff}
.saber{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--linha);margin:28px 0}
.saber>div{padding:16px 19px}
.saber>div+div{border-left:1px solid var(--linha)}
.saber b{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;display:block;margin-bottom:10px}
.saber .sim b{color:var(--verde)}
.saber .nao b{color:var(--sinal)}
.saber ul{margin:0 0 0 16px;font-family:'Source Serif 4',Georgia,serif;font-size:14.5px;line-height:1.55;color:#3C3C3C}
.saber li{margin-bottom:7px}
@media(max-width:620px){.saber{grid-template-columns:1fr}.saber>div+div{border-left:0;border-top:1px solid var(--linha)}}
.circulou{border:1px solid var(--linha);padding:16px 19px;margin:26px 0;background:#FAFAF8}
.circulou b{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--tinta);display:block;margin-bottom:4px}
.circulou .obs{font-family:'Source Serif 4',Georgia,serif;font-size:13.5px;color:var(--fraco);margin-bottom:12px}
.circulou ol{margin:0 0 0 17px;font-family:'Source Serif 4',Georgia,serif;font-size:14.5px;line-height:1.5}
.circulou li{margin-bottom:9px}
.circulou .vc{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--sinal);display:block}
.circulou a{color:#3C3C3C;text-decoration:none;border-bottom:1px solid var(--linha2,#E4E1D8)}
.circulou a:hover{border-bottom-color:var(--tinta)}
.resgate{border-left:3px solid var(--verde);background:#F4F8F5;padding:15px 19px;margin:26px 0;font-family:'Source Serif 4',Georgia,serif;font-size:15px;line-height:1.62}
.resgate b{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--verde);display:block;margin-bottom:8px}
.resgate p{color:#33403A}
.proc{border:1px solid var(--linha);padding:16px 20px;margin:26px 0;font-family:'Source Serif 4',Georgia,serif;font-size:15px;line-height:1.6;background:#FAFAF8}
.proc summary{cursor:pointer;list-style:none;outline:none}
.proc summary::-webkit-details-marker{display:none}
.proc summary b{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--tinta)}
.proc summary::after{content:" ▸";color:var(--fraco)}
.proc[open] summary::after{content:" ▾"}
.proc p{margin-top:11px;color:#3C3C3C}
.proc ul{margin:10px 0 0 18px;font-family:'IBM Plex Mono',monospace;font-size:12px;color:#5A5A5A}
.proc li{margin-bottom:4px}
.proc .obs{font-size:13.5px;color:var(--fraco);border-top:1px dotted var(--linha);padding-top:10px;margin-top:12px}
.contexto{border-left:3px solid var(--tinta);padding:18px 22px;margin:30px 0;background:#fff}
.contexto b{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--tinta);display:block;margin-bottom:9px}
.contexto p{font-family:'Source Serif 4',Georgia,serif;font-size:16.5px;line-height:1.6;color:#333A42;margin:0}
.fonte-box{background:var(--areia);border-left:3px solid var(--verde);padding:18px 22px;margin:32px 0;font-family:'Source Serif 4',Georgia,serif;font-size:16px;line-height:1.6}
.fonte-box summary{cursor:pointer;list-style:none;outline:none}
.fonte-box summary::-webkit-details-marker{display:none}
.fonte-box summary::after{content:" ▸ mostrar";font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--fraco)}
.fonte-box[open] summary::after{content:" ▾ ocultar"}
.fonte-box summary b{display:inline}
.fonte-box b{font-family:'IBM Plex Mono',monospace;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--verde);display:block;margin-bottom:9px}
.fonte-box a{color:var(--verde);word-break:break-all}
.fonte-box ul{margin:10px 0 0 18px}
.voltar{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;border:1.5px solid var(--tinta);padding:10px 15px;text-decoration:none;margin:10px 0 50px}
.voltar:hover{background:var(--tinta);color:var(--papel)}
</style>
</head>
<body>
<header><div class="wrap topo">
  <span class="barra"></span>
  <a href="/" style="text-decoration:none"><span class="nome">MERI<span>DIANO</span></span></a>
</div></header>

<article class="wrap">
  ${m.naoConfirmada
    ? '<span class="selo nc">Sem confirmação oficial</span>'
    : m.radar
      ? '<span class="selo">Reportagem de dados · exclusivo</span>'
      : `<span class="selo">${esc(m.origemNome ? 'Com informações de ' + m.origemNome : 'Texto da nossa redação')}</span>`}
  <span class="chapeu">${esc(m.chapeu)}</span>
  <h1>${esc(m.titulo)}</h1>
  ${m.naoConfirmada
    ? `<div class="nc-aviso">${esc(m.linhaFina)}</div>`
    : `<p class="linha-fina">${esc(m.linhaFina)}</p>`}
  <div class="assina">Redação Meridiano · ${new Date(iso).toLocaleString('pt-BR',{timeZone:'America/Cuiaba'})}</div>

  ${m.foto ? `<figure class="foto">
    <img src="${esc(m.foto.src)}" alt="${esc(m.foto.alt || m.titulo)}" loading="lazy">
    <figcaption>Foto: ${esc(m.creditoFoto || m.origemNome || 'divulgação')}</figcaption>
  </figure>` : ''}

  <div class="corpo">${corpoHtml}</div>

  ${(m.seSabe?.length || m.falta?.length) ? `<div class="saber">
    <div class="sim"><b>O que se sabe</b><ul>${(m.seSabe||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="nao"><b>O que falta para confirmar</b><ul>${(m.falta||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
  </div>` : ''}

  ${m.ondeCirculou?.length ? `<div class="circulou">
    <b>Onde esta informação circulou</b>
    <p class="obs">Não reproduzimos o texto de ninguém. Listamos quem publicou, com o endereço original, para você conferir na fonte.</p>
    <ol>${m.ondeCirculou.map(v => `<li><span class="vc">${esc(v.veiculo)}</span>${v.link ? `<a href="${esc(v.link)}" target="_blank" rel="noopener nofollow">${esc(v.titulo)}</a>` : esc(v.titulo)}</li>`).join('')}</ol>
  </div>` : ''}

  ${m.resgatada ? `<div class="resgate">
    <b>Como esta matéria chegou aqui</b>
    <p>Esta história começou circulando na imprensa sem registro oficial. Em vez de publicá-la como rumor, procuramos o documento em ${m.resgatada.procuradoEm.length} ${m.resgatada.procuradoEm.length === 1 ? 'órgão público' : 'órgãos públicos'} e encontramos em ${esc(m.resgatada.orgao)}. O texto acima foi escrito a partir desse registro — o endereço do original está no fim da página.</p>
  </div>` : ''}

  ${m.provenencia ? (() => {
    const p = m.provenencia, rel = p.relatorio || [];
    const porTema = rel.filter(r => r.porTema).map(r => r.nome);
    const respondeu = rel.filter(r => r.respondeu).length;
    return `<div class="apura">
    <div class="cab">O que procuramos antes de publicar</div>
    <div class="miolo">
      <p class="raciocinio">Esta informação apareceu em ${p.circulaEm} ${p.circulaEm === 1 ? 'veículo' : 'veículos'} da imprensa e não afirmamos que seja verdadeira.${p.assunto?.length ? ` O teor é de <b>${esc(p.assunto.join(' e '))}</b>, então o registro oficial, se existir, estaria ${porTema.length ? `em ${esc(porTema.slice(0,3).join(', '))}` : 'nos órgãos abaixo'} — foi por aí que começamos.` : ''} Varremos as publicações ${p.horas ? `das últimas ${p.horas} horas ` : ''}de cada órgão e comparamos uma a uma com o teor que circula. Nenhuma bateu.</p>

      ${rel.length ? `<div class="num">
        <div><b>${rel.length}</b><span>órgãos consultados</span></div>
        <div><b>${p.lidas || 0}</b><span>publicações lidas</span></div>
        <div><b>${respondeu}</b><span>responderam</span></div>
      </div>` : ''}

      ${rel.length ? `<table>${rel.map(r => `<tr>
        <td>${esc(r.nome)}${r.porTema ? '<span class="pt">porta certa</span>' : ''}</td>
        <td>${!r.respondeu ? '<span class="mudo">não respondeu</span>'
              : r.lidas ? `${r.lidas} ${r.lidas === 1 ? 'publicação lida' : 'publicações lidas'}${r.melhor ? ` · maior semelhança ${Math.round(r.melhor*100)}%` : ''}`
              : 'nada publicado no período'}</td>
      </tr>`).join('')}</table>`
      : `<ul>${(p.buscadoEm||[]).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`}

      ${p.mudos?.length ? `<p class="fim">Não conseguimos ler ${esc(p.mudos.slice(0,4).join(', '))}${p.mudos.length > 4 ? ' e outros' : ''} nesta checagem. Órgão público que não publica de forma legível é, por si só, um problema — e registramos isso aqui em vez de esconder.</p>` : ''}

      <p class="fim">Checagem feita em ${esc(p.quando)}. Se você souber de registro oficial que não encontramos, escreva para a redação: corrigimos e transformamos em matéria confirmada, com o documento à vista.</p>
    </div>
  </div>`; })() : ''}

  ${m.contexto ? `<div class="contexto">
    <b>O que isso quer dizer</b>
    <p>${esc(m.contexto)}</p>
  </div>` : ''}

  <details class="fonte-box">
    <summary><b>De onde vem esta informação</b></summary>
    ${m.radar
      ? 'Texto produzido a partir dos dados publicados pelo próprio órgão no Portal Nacional de Contratações Públicas (PNCP), sistema oficial onde toda compra pública é registrada. Nenhum número foi estimado: todos constam do documento original.'
      : m.naoConfirmada
        ? 'Esta informação está circulando na imprensa e não localizamos registro em fonte oficial. Não afirmamos o fato: relatamos que ele circula e que a nossa checagem não encontrou o documento.'
        : `Reescrevemos com nossas palavras a partir do material publicado por ${esc(m.origemNome || 'fonte que autoriza reprodução')}. Nenhum número foi alterado: todos constam do original, cujo endereço está abaixo.`}
    ${c.link ? `<br><br>Documento: <a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.link)}</a>` : ''}
    ${m.checar?.length ? `<br><br><b>O que ainda precisa ser apurado</b><ul>${m.checar.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  </details>

  ${m.cronologia?.length ? `<div class="crono">
    ${m.cronologia.map(c => `<div class="lin">
      <div class="q">${esc(c.quando)}</div>
      <div class="t">${esc(c.texto)}
        <span class="f">${c.link
          ? `<a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.fonte)} &nearr;</a>`
          : `<span class="sem">${esc(c.fonte || 'sem registro localizado')}</span>`}</span>
      </div></div>`).join('')}
  </div>` : ''}

  ${m.relacionadas?.length ? `<div class="relac">
    <b>Já publicamos sobre isso</b>
    ${m.relacionadas.map(r => `<a href="${esc(r.link)}">${esc(r.titulo)}${r.dia ? `<span>${esc(r.dia.split('-').reverse().join('/'))}</span>` : ''}</a>`).join('')}
  </div>` : ''}

  <div class="acoes">
    <button class="zap" id="bt-zap">Enviar no WhatsApp</button>
    <button id="bt-link">Copiar link</button>
    <button id="bt-ouvir">Ouvir a matéria</button>
    <button class="seg" id="bt-seguir" data-id="${esc(m.id || '')}" data-nivel="${esc(m.nivel || 'sem-confirmacao')}">Acompanhar este caso</button>
    <button class="ctx" id="bt-ctx">Entender o contexto</button>
  </div>
  <div id="ctx-area"></div>

  <a class="voltar" href="/">← Voltar para a capa</a>
</article>
<script>
(function(){
  var t = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : document.title;
  var u = location.href;

  var zap = document.getElementById('bt-zap');
  if (zap) zap.addEventListener('click', function(){
    window.open('https://wa.me/?text=' + encodeURIComponent(t + '\\n\\n' + u), '_blank', 'noopener');
  });

  var lk = document.getElementById('bt-link');
  if (lk) lk.addEventListener('click', function(){
    var pronto = function(){ var v = lk.textContent; lk.textContent = 'Link copiado'; setTimeout(function(){ lk.textContent = v; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(pronto, pronto);
    else { var c = document.createElement('textarea'); c.value = u; document.body.appendChild(c); c.select();
           try { document.execCommand('copy'); } catch(e){} document.body.removeChild(c); pronto(); }
  });

  var ov = document.getElementById('bt-ouvir');
  if (ov && 'speechSynthesis' in window) {
    var lendo = false;
    ov.addEventListener('click', function(){
      if (lendo) { speechSynthesis.cancel(); lendo = false; ov.textContent = 'Ouvir a matéria'; return; }
      var ps = [].slice.call(document.querySelectorAll('.corpo p')).map(function(p){ return p.textContent; });
      var f = new SpeechSynthesisUtterance(t + '. ' + ps.join(' '));
      f.lang = 'pt-BR'; f.rate = 1;
      f.onend = function(){ lendo = false; ov.textContent = 'Ouvir a matéria'; };
      speechSynthesis.cancel(); speechSynthesis.speak(f);
      lendo = true; ov.textContent = 'Parar';
    });
  } else if (ov) { ov.style.display = 'none'; }

  // Acompanhar o caso. Quando o nivel de evidencia mudar — de "sem
  // confirmacao" para "confirmado oficialmente" — o leitor e avisado ao
  // voltar. E o desfecho: o capitulo que sempre sai pequeno.
  // Entender o contexto: informacao de fundo que a materia nao traz. Quem le
  // "60 mil migrantes em Ceuta" e nao sabe o que e Ceuta nao entende nada — e
  // a materia nao pode explicar, porque nota nao confirmada e registro do que
  // circula, nao reportagem.
  var bc = document.getElementById('bt-ctx');
  var ca = document.getElementById('ctx-area');
  if (bc) bc.addEventListener('click', function(){
    bc.disabled = true; bc.textContent = 'procurando…';
    var res = document.querySelector('.linhafina');
    fetch('/api/contexto', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: location.pathname.split('/').pop().replace(/\.html$/,''),
        titulo: t, resumo: res ? res.textContent : '' }) })
      .then(function(r){ return r.json(); })
      .then(function(j){
        bc.style.display = 'none';
        if (j.ok && j.precisa) {
          ca.innerHTML = '<div class="ctx-bloco"><b class="tit">Para entender</b>'
            + j.paragrafos.map(function(p){ return '<p>' + p.replace(/[<>]/g,'') + '</p>'; }).join('')
            + (j.fontes ? '<div class="fontes">Levantado em: ' + j.fontes.join(' · ').replace(/[<>]/g,'') + '</div>' : '')
            + '</div>';
        } else if (j.ok) {
          ca.innerHTML = '<div class="ctx-bloco"><b class="tit">Para entender</b>'
            + '<p class="nada">Esta notícia não pede contexto adicional — o que ela informa se explica sozinho.</p></div>';
        } else {
          bc.style.display = ''; bc.disabled = false; bc.textContent = 'Entender o contexto';
        }
        ca.scrollIntoView({ behavior:'smooth', block:'nearest' });
      })
      .catch(function(){ bc.disabled = false; bc.textContent = 'Entender o contexto'; });
  });

  var sg = document.getElementById('bt-seguir');
  var ap = null;
  try {
    // A capa guarda o apelido em 'meridiano_apelido', como texto simples.
    // Eu procurava em 'meridiano-leitor' esperando um objeto JSON — chave
    // errada e formato errado, entao nunca achava e o botao dizia para
    // escolher um apelido que ja existia.
    ap = localStorage.getItem('meridiano_apelido') || null;
    if (!ap) ap = (JSON.parse(localStorage.getItem('meridiano-leitor') || '{}').apelido) || null;
  } catch(e){}

  // Quando o id nao vem do robo, o proprio endereco da pagina serve: e unico e
  // estavel. A versao anterior escondia o botao nesse caso — e o id chegava
  // vazio em toda materia, entao o botao sumia sempre.
  if (sg) {
    if (!sg.dataset.id) sg.dataset.id = 'mat:' + location.pathname.split('/').pop().replace(/\.html$/,'');
    sg.addEventListener('click', function(){
      if (!ap) { sg.textContent = 'Escolha um apelido na capa'; return; }
      sg.disabled = true;
      fetch('/api/leitor', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ acao:'acompanhar', apelido: ap, id: sg.dataset.id,
          nivel: sg.dataset.nivel, titulo: t, link: location.pathname }) })
        .then(function(r){ return r.json(); })
        .then(function(j){
          sg.disabled = false;
          if (j && j.seguindo) { sg.classList.add('on'); sg.textContent = 'Acompanhando'; }
          else { sg.classList.remove('on'); sg.textContent = 'Acompanhar este caso'; }
        })
        .catch(function(){ sg.disabled = false; });
    });
  }
})();
</script>
</body>
</html>`;
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
