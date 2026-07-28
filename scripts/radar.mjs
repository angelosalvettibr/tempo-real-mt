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

  <div class="corpo">${corpoHtml}</div>

  ${m.provenencia ? `<details class="proc">
    <summary><b>O que procuramos antes de publicar</b></summary>
    <p>Esta informação apareceu em ${m.provenencia.circulaEm} ${m.provenencia.circulaEm === 1 ? 'veículo' : 'veículos'} da imprensa. Consultamos as fontes oficiais abaixo em ${esc(m.provenencia.quando)} e não localizamos registro sobre o caso.</p>
    <ul>${m.provenencia.buscadoEm.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="obs">Se você souber de registro oficial que não encontramos, escreva para a redação. Corrigimos e transformamos em matéria confirmada.</p>
  </details>` : ''}

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
    <br><br>Documento: <a href="${esc(c.link)}" target="_blank" rel="noopener">${esc(c.link)}</a>
    ${m.checar?.length ? `<br><br><b>O que ainda precisa ser apurado</b><ul>${m.checar.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  </details>

  <a class="voltar" href="/">← Voltar para a capa</a>
</article>
</body>
</html>`;
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
