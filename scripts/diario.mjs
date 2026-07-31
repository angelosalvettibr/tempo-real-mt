// DIARIO OFICIAL DOS MUNICIPIOS
//
// A melhor fonte local que existe, e a mais ignorada.
//
// Toda prefeitura e obrigada por lei a publicar seus atos. Em quase todo o
// Brasil isso acontece numa plataforma so — o SIGPub, operado pela associacao
// de municipios de cada estado. Um endereco por estado, 141 prefeituras em
// Mato Grosso, 497 no Rio Grande do Sul, 92 no Rio de Janeiro.
//
// Por que isto muda o jogo:
//
//   1. NAO DEPENDE DE ASSESSORIA. A prefeitura de Varzea Grande pode ter o
//      site quebrado — e tem — mas e obrigada a publicar no diario, e publica.
//      Os 26 orgaos mudos de MT deixam de ser o teto do jornal.
//
//   2. NAO TEM DIREITO AUTORAL. Ato oficial nao e obra protegida: a Lei
//      9.610/98, art. 8, IV, poe leis, decretos, decisoes judiciais e demais
//      atos oficiais FORA da protecao autoral. Pode reproduzir, pode
//      reescrever, pode tudo. E a fonte mais livre do projeto.
//
//   3. E IMUNE AO SILENCIO ELEITORAL. Publicidade institucional esta suspensa
//      ate outubro, e foi isso que emudeceu metade das nossas fontes. Mas
//      publicar ato oficial e obrigacao legal, nao propaganda: o diario sai
//      todo dia util, eleicao ou nao.
//
// O TRABALHO DIFICIL AQUI NAO E LER — E FILTRAR.
// A maior parte de um diario oficial e rotina: portaria de ferias, diaria de
// viagem, designacao de comissao. Publicar isso como noticia seria pior que
// nao publicar. O filtro de relevancia abaixo e o coracao deste modulo.
//
// ATENCAO: os caminhos do SIGPub abaixo entram como CANDIDATOS. Este ambiente
// nao alcanca o dominio para testar. A primeira rodada dira quais funcionam —
// e o log foi feito para mostrar isso com clareza.

const semAcento = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

/* ------------------------------------------------------- ASSOCIACOES ----- */
// Adicionar um estado novo e uma linha: o codigo da associacao no SIGPub.
export const ASSOCIACOES = {
  mt: { id:'amm-mt', nome:'Diário Oficial dos Municípios de MT', entidade:'AMM' },
  rs: { id:'famurs', nome:'Diário Oficial dos Municípios do RS', entidade:'FAMURS' },
  rj: { id:'aemerj', nome:'Diário Oficial dos Municípios do RJ', entidade:'AEMERJ' }
  // pr: { id:'amp',    nome:'...', entidade:'AMP' }
  // sc: { id:'amsc',   nome:'...', entidade:'FECAM' }
};

const BASE = a => `https://www.diariomunicipal.com.br/${a}`;

/* --------------------------------------------------------- RELEVANCIA --- */
// O que E noticia num diario oficial. Ordenado por peso: um decreto de
// calamidade vale mais que um aviso de licitacao, que vale mais que uma
// nomeacao. O peso vira prioridade quando ha mais material que espaco.
const INTERESSE = [
  { peso:10, tema:'emergencia',  re:/(calamidade publica|situacao de emergencia|estado de emergencia|decreto de calamidade)/ },
  { peso:9,  tema:'exoneracao',  re:/(exonera|destitui|dispensa.{0,20}cargo em comissao|afasta.{0,20}servidor)/ },
  { peso:9,  tema:'nomeacao',    re:/(nomei?a|designa.{0,30}secretari|investidura|posse.{0,20}cargo)/ },
  { peso:8,  tema:'licitacao',   re:/(aviso de licitacao|pregao (eletronico|presencial)|concorrencia publica|tomada de precos|edital de licitacao|dispensa de licitacao|inexigibilidade)/ },
  { peso:8,  tema:'contrato',    re:/(extrato de contrato|termo aditivo|contrato n|rescisao contratual|ata de registro de precos)/ },
  { peso:8,  tema:'concurso',    re:/(concurso publico|processo seletivo|edital de convocacao|homologacao.{0,20}resultado|classificacao final)/ },
  { peso:7,  tema:'lei',         re:/(\blei n|lei complementar|lei ordinaria|sancion)/ },
  { peso:6,  tema:'decreto',     re:/(\bdecreto n|decreto municipal)/ },
  { peso:6,  tema:'orcamento',   re:/(credito adicional|suplementar|abertura de credito|lei orcamentaria|ldo\b|ppa\b)/ },
  { peso:5,  tema:'convenio',    re:/(convenio|termo de fomento|termo de colaboracao|repasse)/ },
  { peso:5,  tema:'saude',       re:/(surto|epidemi|vacina|unidade de saude|upa\b|hospital municipal)/ },
  { peso:5,  tema:'obras',       re:/(ordem de servico|obra|pavimenta|drenagem|saneamento|reforma d)/ }
];

// O que NAO e noticia. Rotina administrativa que enche o diario e nao
// interessa a ninguem fora da folha de pagamento.
const ROTINA = /(ferias|licenca premio|licenca para tratamento|diaria|diarias|adicional de insalubridade|progressao funcional|averbacao|gratificacao natalina|abono|designa.{0,30}(comissao|fiscal de contrato|pregoeiro)|apostilamento|errata|retificacao de publicacao|ata de reuniao ordinaria)/;

/**
 * Um ato do diario vale materia?
 * @returns {{vale:boolean, peso:number, tema:string|null}}
 */
export function avaliar(texto){
  const t = semAcento(texto);
  if (!t || t.length < 20) return { vale:false, peso:0, tema:null };
  if (ROTINA.test(t))      return { vale:false, peso:0, tema:'rotina' };

  let melhor = null;
  for (const i of INTERESSE) {
    if (i.re.test(t) && (!melhor || i.peso > melhor.peso)) melhor = i;
  }
  return melhor
    ? { vale:true,  peso:melhor.peso, tema:melhor.tema }
    : { vale:false, peso:0, tema:null };
}

/* ------------------------------------------------------------ REDE ------ */
async function pegar(url, ms = 14000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal:c.signal, redirect:'follow', headers:{
      'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'Accept':'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language':'pt-BR,pt;q=0.9',
      'X-Contact':'contato@meridiano.press'
    }});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const bytes = new Uint8Array(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || '';
    let cs = (ct.match(/charset=([\w-]+)/i) || [])[1];
    if (!cs) {
      const ini = new TextDecoder('latin1').decode(bytes.slice(0, 400));
      cs = (ini.match(/charset=["']?([\w-]+)/i) || [])[1] || 'utf-8';
    }
    try { return new TextDecoder(cs.toLowerCase()).decode(bytes); }
    catch { return new TextDecoder('utf-8').decode(bytes); }
  } finally { clearTimeout(t); }
}

const limpar = h => String(h)
  .replace(/<script[\s\S]*?<\/script>/gi,' ')
  .replace(/<style[\s\S]*?<\/style>/gi,' ')
  .replace(/<[^>]+>/g,' ')
  .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
  .replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
  .replace(/\s+/g,' ').trim();

/* ------------------------------------------------------- LEITURA -------- */
// O SIGPub muda de layout entre instalacoes, entao procuramos as materias por
// varios padroes em vez de depender de um so. O que nao varia e o formato do
// endereco de cada ato: /{associacao}/materia/{id}
function acharMaterias(html, assoc){
  const raiz = BASE(assoc);
  const achados = new Map();

  const re = /<a[^>]+href=["']([^"']*\/materia\/[^"']+)["'][^>]*>([\s\S]{0,400}?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    let href = m[1];
    if (href.startsWith('/')) href = 'https://www.diariomunicipal.com.br' + href;
    else if (!/^https?:/i.test(href)) href = raiz + '/' + href.replace(/^\.?\//,'');
    const txt = limpar(m[2]);
    if (txt.length > 12 && !achados.has(href)) achados.set(href, txt);
  }
  return [...achados].map(([link, titulo]) => ({ link, titulo }));
}

// O nome do municipio costuma vir num cabecalho antes do bloco de materias.
// Quando nao vem, tentamos deduzir do proprio texto do ato.
function acharMunicipio(texto){
  const t = String(texto || '');
  const m = t.match(/(?:PREFEITURA MUNICIPAL DE|MUNICIPIO DE|CAMARA MUNICIPAL DE)\s+([A-ZÀ-Ú][A-ZÀ-Ú\s'’-]{2,40})/i);
  return m ? m[1].replace(/\s+/g,' ').trim().replace(/[,.].*$/,'') : '';
}

/**
 * Le a edicao do dia do diario oficial dos municipios de um estado.
 *
 * @param {string} uf        'mt' | 'rs' | 'rj'
 * @param {object} opcoes    { max, orcamentoMs, pesoMinimo }
 * @returns {{itens:Array, lidas:number, descartadas:number, erro:string|null}}
 */
export async function lerDiario(uf, opcoes = {}){
  const {
    max         = 14,      // quantos atos abrir por rodada
    orcamentoMs = 70000,   // teto de tempo, o job do Actions morre aos 15 min
    pesoMinimo  = 6        // abaixo disto e rotina disfarcada
  } = opcoes;

  const cfg = ASSOCIACOES[uf];
  if (!cfg) return { itens:[], lidas:0, descartadas:0, erro:'estado sem diario cadastrado' };

  const inicio = Date.now();
  const raiz = BASE(cfg.id);

  // 1. achar o indice do dia
  let html = null, erro = null;
  for (const caminho of ['', '/pesquisar', '/materia']) {
    try { html = await pegar(raiz + caminho); if (html && /\/materia\//.test(html)) break; html = null; }
    catch (e) { erro = e.message; }
  }
  if (!html) return { itens:[], lidas:0, descartadas:0, erro: erro || 'indice do dia nao encontrado' };

  // 2. listar os atos publicados
  const brutas = acharMaterias(html, cfg.id);
  if (!brutas.length) return { itens:[], lidas:0, descartadas:0, erro:'nenhuma materia no indice' };

  // 3. filtrar pelo titulo ANTES de abrir. Abrir tudo estouraria o relogio e,
  //    pior, mandaria centenas de portarias de ferias para o Gemini.
  const candidatas = brutas
    .map(b => ({ ...b, ...avaliar(b.titulo) }))
    .filter(b => b.vale && b.peso >= pesoMinimo)
    .sort((a,b) => b.peso - a.peso)
    .slice(0, max);

  const descartadas = brutas.length - candidatas.length;

  // 4. abrir os selecionados e montar o item
  const itens = [];
  for (const c of candidatas) {
    if (Date.now() - inicio > orcamentoMs) break;
    try {
      const pagina = await pegar(c.link, 12000);
      const texto = limpar(pagina).slice(0, 6000);
      const municipio = acharMunicipio(texto) || acharMunicipio(c.titulo);

      // segunda avaliacao, agora com o corpo: titulo curto engana
      const dentro = avaliar(texto.slice(0, 1200));
      if (dentro.tema === 'rotina') continue;

      itens.push({
        titulo: c.titulo.slice(0, 180),
        texto,
        link: c.link,
        veiculo: cfg.nome,
        fonte: cfg.nome,
        orgao: municipio ? `Prefeitura de ${municipio}` : cfg.entidade,
        municipioBruto: municipio,
        tema: c.tema,
        peso: c.peso,
        oficial: true,          // ato oficial: fora da protecao autoral
        iso: new Date().toISOString()
      });
      await new Promise(r => setTimeout(r, 300));
    } catch { /* uma pagina que falha nao derruba a rodada */ }
  }

  return { itens, lidas: brutas.length, descartadas, erro:null };
}

// exportado para teste
export const _interno = { avaliar, acharMunicipio, limpar, acharMaterias };
