// MERIDIANO · /api/linha
//
// LINHA DO TEMPO — casos que se arrastaram e ficaram presos a um capitulo so.
//
// Cada linha tem marcos em ordem, e cada marco tem data, fato e fonte. O
// jornal nao opina: poe os fatos em ordem e o leitor conclui. E o formato
// nasceu de um caso concreto — uma prisao noticiada em tres paises cujo
// desfecho, oposto, saiu em um jornal so.
//
// TRES ESTADOS, E A DIFERENCA ENTRE ELES E O QUE PROTEGE O JORNAL:
//
//   rascunho  em construcao. Ninguem ve, nem voce fora do painel.
//   privada   pronta, mas fora da edicao. Nao aparece na capa, nao e
//             indexada, so abre com o endereco direto. E o relatorio de
//             apuracao entregue a quem pediu — servico, nao publicacao.
// DOIS PAPEIS, DUAS SENHAS:
//   quem vive o caso  entrega relato e links. Nao ve linha do tempo nenhuma,
//                     nao escolhe titulo, nao aprova. So deposita.
//   a redacao         busca, verifica, monta e decide o destino.
// A separacao e o que faz o produto valer: quem tem interesse na historia
// entrega material; quem apura e outro.
//
//   publica   entra na secao Linha do Tempo do jornal. So a redacao decide
//             o que chega aqui, e isso nunca se vende.
//
// A distincao nao e burocracia. Se um dia existir preco para entrar na
// secao publica, toda materia do Meridiano passa a ficar sob suspeita — e a
// unica coisa que o jornal tem para vender e nao ter interesse por tras.

import { timingSafeEqual, createHash } from 'node:crypto';

const URL_KV   = process.env.KV_REST_API_URL   || '';
const TOKEN_KV = process.env.KV_REST_API_TOKEN || '';
const SENHA    = process.env.SENHA_REDACAO     || '';
const CHAVE_IA = process.env.GEMINI_API_KEY    || '';
// Senha que voce entrega a quem vai contar a historia. E diferente da sua:
// ela so deposita material, nao ve nem aprova nada.
const SENHA_RELATO = process.env.SENHA_RELATO || '';

const ligado = () => Boolean(URL_KV && TOKEN_KV);

async function redis(...comando){
  if (!ligado()) return null;
  const r = await fetch(URL_KV, {
    method:'POST',
    headers:{ Authorization:`Bearer ${TOKEN_KV}`, 'Content-Type':'application/json' },
    body: JSON.stringify(comando)
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.result ?? null;
}

function senhaConfere(dada){
  if (!SENHA) return false;
  const a = createHash('sha256').update(String(dada || '')).digest();
  const b = createHash('sha256').update(SENHA).digest();
  return timingSafeEqual(a, b);
}

const esc  = s => String(s || '').replace(/[<>]/g, '').trim();
const slug = t => String(t||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-')
  .replace(/^-+|-+$/g,'').slice(0, 70);

const ler = async () => {
  try { return JSON.parse(await redis('GET','linhas:tempo') || '[]'); }
  catch { return []; }
};
const gravar = l => redis('SET', 'linhas:tempo', JSON.stringify(l.slice(0, 200)));

// Marco: data, fato e fonte. O link e opcional de proposito — quando nao
// existe, a pagina diz "sem registro localizado", e essa ausencia costuma ser
// a informacao mais eloquente da linha.
const limparMarcos = arr => (Array.isArray(arr) ? arr : [])
  .map(m => ({
    quando: esc(m.quando).slice(0, 60),
    texto:  esc(m.texto).slice(0, 1200),
    fonte:  esc(m.fonte).slice(0, 120) || 'sem registro localizado',
    link:   /^https?:\/\//.test(m.link || '') ? m.link : null
  }))
  .filter(m => m.quando && m.texto.length > 20)
  .slice(0, 40);

/* ================== O AGENTE QUE MONTA A LINHA ==========================
   A pessoa conta a historia dela e cola os links que tiver. O agente ordena,
   separa e devolve a linha do tempo pronta.

   DUAS TRAVAS QUE SUSTENTAM O PRODUTO:

   1. QUEM CONTA E FONTE, NAO REDATOR. O relato entra como versao da pessoa,
      nunca como fato estabelecido. Fato e o que tem publicacao por tras.

   2. CADA MARCO DECLARA A ORIGEM. "verificado em publicacao" e "relatado
      pelo proprio" sao coisas diferentes, e a pagina mostra a diferenca.

   Sem isso o relatorio vira peca de defesa com cara de jornalismo — e nao
   serve nem a quem pediu, porque quem recebe percebe na primeira leitura. */

const PROMPT_LINHA = (relato, links) => `Você monta LINHAS DO TEMPO para o MERIDIANO, um jornal que só afirma o que consegue verificar e mostra ao leitor a origem de cada informação.

Uma pessoa envolvida no caso contou a própria história abaixo, e forneceu os links que tinha (às vezes nenhum). Sua tarefa é transformar isso numa cronologia de fatos — NÃO numa defesa.

ANTES DE ESCREVER, PROCURE. Use a busca para localizar publicações sobre o caso: a acusação, o andamento, o desfecho, decisões judiciais, registros oficiais. Procure em português, e também em outras línguas quando o caso tiver repercussão fora do país. O que você encontrar vira marco verificado, com o nome da publicação e o endereço. O que não encontrar continua sendo relato da pessoa, e o marco deve dizer isso.

Se a busca não devolver nada sobre o caso, DIGA ISSO na lista FALTA. Não preencha a lacuna com o relato travestido de fato.

REGRAS QUE NÃO PODEM SER QUEBRADAS:
1. NÃO INVENTE. Nenhuma data, número, nome de órgão ou desfecho que não esteja no material.
2. SEPARE O QUE É VERIFICÁVEL DO QUE É RELATO. Se o fato aparece num link fornecido, a origem é a publicação. Se só a pessoa conta, a origem é "relatado pelo próprio", e o texto deve dizer no condicional ou atribuir claramente.
3. SEM ADJETIVO E SEM TESE. Não escreva "injustamente", "absurdamente", "finalmente". A cronologia convence sozinha; o comentário estraga.
4. NÃO ACUSE NINGUÉM. Não nomeie jornalista, delegado ou promotor. Órgão pode.
5. ORDEM DO MAIS RECENTE PARA O MAIS ANTIGO.
6. Se o material não permitir montar pelo menos dois marcos com data, diga isso em vez de inventar.
7. ESCREVA EM PORTUGUÊS CORRETO, COM TODOS OS ACENTOS. "investigações", não "investigacoes". "indenizações", não "indenizacoes". Texto sem acento é erro de publicação.

FORMATO — exatamente isto, sem markdown:
TITULO: (uma linha, factual, até 90 caracteres)
LINHA: (uma ou duas frases de apoio. Se o desfecho contradisser a repercussão inicial, CONSTATE isso sem julgar — ex.: "O caso teve desfecho oposto ao que a repercussão inicial indicava.")
INTRO: (um parágrafo explicando que a página reúne os fatos em ordem, sem posição do jornal, e que cada marco traz sua origem)
MARCOS:
(uma linha por marco, do mais recente ao mais antigo, com barras verticais separando os quatro campos e SEM colchetes. Exemplo exato do formato:)
18 de maio de 1988 | Morreu em Milão, aos 59 anos, menos de dois anos após a confirmação da absolvição. | Wikipédia | https://exemplo.com
1987 | A Corte de Cassação confirmou definitivamente a absolvição. | sem registro localizado |
(NÃO quebre um marco em várias linhas. NÃO use colchetes. Cada marco cabe em uma linha.)
FALTA:
- (o que seria preciso para confirmar o que hoje é só relato: número de processo, decisão, manifestação de órgão. 2 a 4 itens)

RELATO DE QUEM VIVEU O CASO:
${relato}

LINKS FORNECIDOS:
${links && links.length ? links.join('\n') : '(nenhum)'}`;

async function montarLinha(relato, links, buscar = true){
  if (!CHAVE_IA) throw new Error('sem GEMINI_API_KEY na Vercel');

  // Com a busca ligada, o agente procura sozinho o que o relato menciona. E o
  // que resolve o caso de quem chega com a historia na cabeca e sem link
  // nenhum — que e a maioria. O que ele achar vira marco verificado; o que
  // nao achar continua sendo relato, e a pagina diz isso.
  const corpo = {
    contents:[{ parts:[{ text: PROMPT_LINHA(relato, links) }] }],
    generationConfig:{ temperature:0.3, maxOutputTokens:4000 }
  };
  if (buscar) corpo.tools = [{ google_search: {} }];

  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + CHAVE_IA, {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(corpo)
  });
  if (!r.ok) throw new Error('IA HTTP ' + r.status);
  const j = await r.json();

  // O que a busca realmente consultou. Serve para dois fins: completar o link
  // de um marco que saiu sem endereco, e mostrar ao leitor onde procuramos.
  const achados = (j?.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
    .map(c => ({ url: c?.web?.uri, titulo: c?.web?.title }))
    .filter(x => x.url);

  const t = (j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '')
    .replace(/\u0060\u0060\u0060[a-z]*\n?/gi,'').replace(/\*\*/g,'').trim();

  const bloco = (nome, ate) => {
    const re = new RegExp(nome + '\\s*:\\s*([\\s\\S]*?)(?=' + (ate ? ate + '\\s*:' : '$') + ')', 'i');
    return (t.match(re)?.[1] || '').trim();
  };

  // Leitura tolerante. A versao anterior exigia exatamente
  // "data | fato | origem | link" numa linha so, e com relato longo o modelo
  // quebrava em paragrafos — o parser entao devolvia zero marcos e a montagem
  // falhava inteira. Agora tentamos tres formatos, do mais ao menos rigido.
  const cru = bloco('MARCOS', 'FALTA');

  const porBarra = cru.split(/\n/)
    .map(l => l.replace(/^[-•*\s]+/, '').split('|').map(x => x.trim()))
    .filter(p => p.length >= 2 && p[0] && p[1] && p[1].length > 20)
    .map(p => ({ quando:p[0].replace(/^\[|\]$/g,''), texto:p[1],
                 fonte:(p[2] || '').replace(/^\[|\]$/g,'') || 'sem registro localizado',
                 link: /^https?:\/\//.test(p[3] || '') ? p[3].trim() : null }));

  // Formato alternativo: "1983 — fato... (fonte)" ou "17/06/1983: fato..."
  const porTraco = cru.split(/\n+/)
    .map(l => l.replace(/^[-•*\s]+/, '').trim())
    .map(l => {
      const m = l.match(/^(.{3,60}?)\s*(?:—|–|-{1,2}|:)\s+(.{25,})$/);
      if (!m) return null;
      const resto = m[2];
      const url = (resto.match(/https?:\/\/\S+/) || [null])[0];
      const fonteM = resto.match(/\(([^)]{3,90})\)\s*$/);
      return {
        quando: m[1].replace(/^\[|\]$/g,'').trim(),
        texto: resto.replace(/https?:\/\/\S+/g,'').replace(/\(([^)]{3,90})\)\s*$/,'').trim(),
        fonte: fonteM ? fonteM[1].trim() : 'sem registro localizado',
        link: url ? url.replace(/[),.]+$/,'') : null
      };
    })
    .filter(x => x && x.texto.length > 25 && /\d/.test(x.quando));

  const marcos = (porBarra.length >= 2 ? porBarra : porTraco).slice(0, 40);

  return {
    titulo: (t.match(/T[IÍ]TULO\s*:\s*(.+)/i)?.[1] || '').trim(),
    linhaFina: (t.match(/LINHA\s*:\s*(.+)/i)?.[1] || '').trim(),
    intro: bloco('INTRO', 'MARCOS'),
    marcos,
    consultadas: achados.slice(0, 20),
    falta: bloco('FALTA', null).split(/\n/).map(x => x.replace(/^[-•\s]+/,'').trim()).filter(x => x.length > 8).slice(0,4)
  };
}

const senhaRelatoConfere = d => {
  if (!SENHA_RELATO) return false;
  const a = createHash('sha256').update(String(d || '')).digest();
  const b = createHash('sha256').update(SENHA_RELATO).digest();
  return timingSafeEqual(a, b);
};

export default async function handler(req, res){
  /* ---- leitura publica: so o que a redacao decidiu publicar ---- */
  if (req.method === 'GET') {
    if (!ligado()) return res.status(200).json({ linhas: [] });
    const todas = await ler();
    const id = new URL(req.url, 'http://x').searchParams.get('id');

    if (id) {
      // Endereco direto abre tambem a privada — e assim que o relatorio
      // chega a quem pediu. O que ela nunca faz e aparecer em lista publica.
      const l = todas.find(x => x.id === id && x.estado !== 'rascunho');
      return res.status(200).json({ linha: l || null });
    }
    return res.status(200).json({
      linhas: todas.filter(l => l.estado === 'publica')
                   .map(({ id, titulo, linhaFina, atualizada, marcos }) =>
                        ({ id, titulo, linhaFina, atualizada, marcos: marcos.length }))
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok:false });

  const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

  /* ---- quem vive o caso deposita o material. Senha propria, e so isso. ---- */
  if (corpo.acao === 'entrar-relato') {
    return res.status(200).json({ ok: senhaRelatoConfere(corpo.senha),
      msg: SENHA_RELATO ? 'Senha incorreta.' : 'SENHA_RELATO não configurada na Vercel.' });
  }

  if (corpo.acao === 'depositar') {
    if (!senhaRelatoConfere(corpo.senha)) return res.status(200).json({ ok:false, msg:'senha incorreta' });
    if (!ligado()) return res.status(200).json({ ok:false, msg:'armazenamento não configurado' });

    const relato = esc(corpo.relato).slice(0, 20000);
    if (relato.length < 200) return res.status(200).json({ ok:false, msg:'conte com mais detalhe — sem material não há o que apurar' });

    let fila = [];
    try { fila = JSON.parse(await redis('GET','linhas:fila') || '[]'); } catch {}

    // Teto simples de abuso: uma senha unica circulando pede um limite.
    if (fila.filter(x => Date.now() - Date.parse(x.iso) < 86400000).length >= 20)
      return res.status(200).json({ ok:false, msg:'limite diário atingido' });

    fila.unshift({
      id: 'rel-' + Date.now().toString(36),
      relato,
      links: String(corpo.links || '').split(/\s+/).filter(x => /^https?:\/\//.test(x)).slice(0, 30),
      contato: esc(corpo.contato).slice(0, 120) || null,
      iso: new Date().toISOString(),
      lido: false
    });
    await redis('SET', 'linhas:fila', JSON.stringify(fila.slice(0, 100)));
    return res.status(200).json({ ok:true });
  }

  if (!senhaConfere(corpo.senha)) {
    return res.status(200).json({ ok:false, msg: SENHA ? 'Senha incorreta.' : 'SENHA_REDACAO não configurada.' });
  }
  if (!ligado()) return res.status(200).json({ ok:false, msg:'armazenamento não configurado' });

  const todas = await ler();

  /* ---- a fila de relatos que chegaram ---- */
  if (corpo.acao === 'fila') {
    let fila = [];
    try { fila = JSON.parse(await redis('GET','linhas:fila') || '[]'); } catch {}
    return res.status(200).json({ ok:true, fila });
  }

  if (corpo.acao === 'fila-apagar') {
    let fila = [];
    try { fila = JSON.parse(await redis('GET','linhas:fila') || '[]'); } catch {}
    await redis('SET', 'linhas:fila', JSON.stringify(fila.filter(x => x.id !== corpo.id)));
    return res.status(200).json({ ok:true });
  }

  /* ---- tudo, inclusive rascunho ---- */
  if (corpo.acao === 'listar') return res.status(200).json({ ok:true, linhas: todas });

  /* ---- o agente monta a linha a partir do relato ---- */
  if (corpo.acao === 'montar') {
    try {
      const relato = String(corpo.relato || '').slice(0, 20000);
      if (relato.length < 120) return res.status(200).json({ ok:false, msg:'conte com um pouco mais de detalhe — nome, datas e o que aconteceu' });
      const links = String(corpo.links || '').split(/\s+/).filter(x => /^https?:\/\//.test(x)).slice(0, 20);
      const r = await montarLinha(relato, links, corpo.buscar !== false);
      if (r.marcos.length < 2) return res.status(200).json({ ok:false, msg:'não foi possível montar dois marcos com data a partir do material' });
      return res.status(200).json({ ok:true, ...r });
    } catch (e) {
      return res.status(200).json({ ok:false, msg: String(e.message).slice(0, 90) });
    }
  }

  /* ---- criar ou alterar ---- */
  if (corpo.acao === 'salvar') {
    const titulo = esc(corpo.titulo);
    const marcos = limparMarcos(corpo.marcos);
    if (titulo.length < 10) return res.status(200).json({ ok:false, msg:'título muito curto' });
    if (marcos.length < 2)  return res.status(200).json({ ok:false, msg:'uma linha do tempo precisa de pelo menos dois marcos' });

    const estado = ['rascunho','privada','publica'].includes(corpo.estado) ? corpo.estado : 'rascunho';
    const agora = new Date().toISOString();

    const existente = corpo.id ? todas.find(x => x.id === corpo.id) : null;
    const linha = {
      id: existente ? existente.id : slug(titulo) + '-' + Date.now().toString(36),
      titulo,
      linhaFina: esc(corpo.linhaFina).slice(0, 400),
      intro: esc(corpo.intro).slice(0, 1200),
      marcos, estado,
      criada: existente ? existente.criada : agora,
      atualizada: agora
    };

    if (existente) Object.assign(existente, linha);
    else todas.unshift(linha);

    await gravar(todas);
    return res.status(200).json({ ok:true, linha });
  }

  /* ---- mudar o estado: e aqui que a redacao aprova ---- */
  if (corpo.acao === 'estado') {
    const l = todas.find(x => x.id === corpo.id);
    if (!l) return res.status(200).json({ ok:false, msg:'não encontrada' });
    if (!['rascunho','privada','publica'].includes(corpo.estado))
      return res.status(200).json({ ok:false, msg:'estado inválido' });
    l.estado = corpo.estado;
    l.atualizada = new Date().toISOString();
    await gravar(todas);
    return res.status(200).json({ ok:true, estado: l.estado });
  }

  if (corpo.acao === 'apagar') {
    const antes = todas.length;
    const restantes = todas.filter(x => x.id !== corpo.id);
    await gravar(restantes);
    return res.status(200).json({ ok:true, removidas: antes - restantes.length });
  }

  return res.status(200).json({ ok:false, msg:'ação desconhecida' });
}
