// MERIDIANO · /api/leitor
//
// Guarda apelido e leitura sem banco SQL. Usa o armazenamento de chave e valor
// do Vercel (Upstash Redis), que vem pronto e não precisa de tabela.
//
// Por que aqui e não no navegador: a chave de escrita mora no servidor. Se
// ficasse no código da página, qualquer pessoa poderia apagar tudo.
//
// Enquanto o armazenamento não estiver ligado, tudo continua funcionando —
// a função responde ok e o navegador segue guardando localmente.

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const URL_KV   = process.env.KV_REST_API_URL   || '';
const TOKEN_KV = process.env.KV_REST_API_TOKEN || '';
// Booleano de verdade. Antes devolvia o proprio token, que vazava na resposta.
const CHAVE_IA = process.env.GEMINI_API_KEY || '';

// O Gemini devolve 503 quando esta sobrecarregado, e passa em segundos. Sem
// retry o leitor recebe "IA HTTP 503" e tem que tentar de novo na mao — foi o
// que aconteceu na primeira visita da conta que mais importa.
async function chamarIA(corpo, tentativas = 3){
  let erro;
  for (let n = 0; n < tentativas; n++) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + CHAVE_IA, {
        method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(corpo)
      });
      if (r.ok) return await r.json();
      if (r.status !== 503 && r.status !== 429) {
        const cru = await r.text();
        let motivo = cru.replace(/\s+/g,' ').slice(0,140);
        try { motivo = JSON.parse(cru)?.error?.message || motivo; } catch {}
        throw new Error(String(motivo).slice(0, 140));
      }
      erro = new Error('o serviço está sobrecarregado');
    } catch (e) { erro = e; }
    await new Promise(r => setTimeout(r, 1200 * (n + 1)));
  }
  throw erro || new Error('IA indisponível');
}
const ligado = () => Boolean(URL_KV && TOKEN_KV);

// Uma chamada ao Redis pela API REST do Upstash.
async function redis(...comando){
  if (!ligado()) return null;
  const r = await fetch(URL_KV, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_KV}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(comando)
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.result ?? null;
}

const limpar = s => String(s || '').toLowerCase().trim()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9_-]/g,'').slice(0, 24);

const hoje = () => new Date().toISOString().slice(0, 10);

/* ---------------------------------------------------------- PIN ---------
   O apelido sozinho nao prova nada: qualquer pessoa digitaria o seu. O PIN
   de 6 digitos e o segredo que voce carrega, e substitui a senha sem virar
   cadastro — continua sem e-mail, sem nome, sem telefone.

   Nunca guardamos o numero. Guardamos scrypt(pin, sal), que e lento de
   proposito: mesmo se o banco vazar, testar um milhao de PINs custa caro.   */

const pinValido = p => /^[0-9]{6}$/.test(String(p || ''));

// PIN obvio protege tanto quanto porta destrancada.
const PIN_FRACO = new Set(['000000','111111','222222','333333','444444','555555',
  '666666','777777','888888','999999','123456','654321','012345','543210',
  '123123','121212','112233','101010','696969','159753','147258','789456']);

const hashPin = (pin, sal) => scryptSync(String(pin), sal, 32).toString('hex');

function pinConfere(pin, sal, esperado){
  const a = Buffer.from(hashPin(pin, sal), 'hex');
  const b = Buffer.from(String(esperado || ''), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

// Limite de tentativas: 5 a cada 15 minutos, por apelido. Sem isto, um PIN de
// 6 digitos cai em minutos na forca bruta.
const LIMITE = 5, JANELA = 900;
async function tentativas(nome){
  if (!ligado()) return 0;
  const n = Number(await redis('INCR', `tent:${nome}`) || 0);
  if (n === 1) await redis('EXPIRE', `tent:${nome}`, JANELA);
  return n;
}
const zerarTentativas = nome => ligado() ? redis('DEL', `tent:${nome}`) : null;

const lerRegistro = async nome => {
  const cru = await redis('GET', `apelido:${nome}`);
  if (!cru) return null;
  try { const j = JSON.parse(cru); return j && j.h ? j : { legado:true }; }
  catch { return { legado:true }; }   // reserva antiga, gravada antes do PIN
};

export default async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    // contadores das matérias pedidas: /api/leitor?ids=a,b,c
    const ids = String(req.query.ids || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 60);
    if (!ids.length) return res.status(200).json({ ligado: ligado(), cliques: {} });

    const cliques = {};
    if (ligado()) {
      const vals = await redis('MGET', ...ids.map(i => `cliques:${i}`));
      ids.forEach((id, n) => { cliques[id] = Number(vals?.[n] || 0); });
    }
    return res.status(200).json({ ligado: ligado(), cliques });
  }

  if (req.method !== 'POST') return res.status(405).json({ erro: 'método não permitido' });

  let corpo = req.body;
  if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo); } catch { corpo = {}; } }
  const { acao } = corpo || {};

  /* ------------------------------------------- apelido: criar ou entrar --- */
  if (acao === 'apelido') {
    const nome = limpar(corpo.apelido);
    const pin  = String(corpo.pin || '').trim();
    if (nome.length < 3) return res.status(200).json({ ok:false, msg:'Use pelo menos 3 caracteres.' });

    if (!ligado()) return res.status(200).json({ ok:true, apelido:nome, local:true });

    const reg = await lerRegistro(nome);

    // --- apelido livre, ou reserva antiga sem PIN: e uma criacao ---
    if (!reg || reg.legado) {
      if (!pinValido(pin))
        return res.status(200).json({ ok:false, precisaPin:'novo',
          msg:'Escolha um PIN de 6 dígitos. É ele que vai te reconhecer em outro aparelho.' });
      if (PIN_FRACO.has(pin))
        return res.status(200).json({ ok:false, precisaPin:'novo',
          msg:'Esse PIN é fácil demais de adivinhar. Escolha outro.' });

      const sal = randomBytes(16).toString('hex');
      await redis('SET', `apelido:${nome}`,
        JSON.stringify({ s:sal, h:hashPin(pin, sal), d:hoje() }));
      await zerarTentativas(nome);
      return res.status(200).json({ ok:true, apelido:nome, novo:true });
    }

    // --- apelido existe: precisa provar que e seu ---
    if (!pinValido(pin))
      return res.status(200).json({ ok:false, precisaPin:'entrar',
        msg:'Este apelido já tem dono. Se for seu, digite o PIN de 6 dígitos.' });

    const n = await tentativas(nome);
    if (n > LIMITE)
      return res.status(200).json({ ok:false, bloqueado:true,
        msg:'Muitas tentativas. Espere 15 minutos e tente de novo.' });

    if (!pinConfere(pin, reg.s, reg.h)) {
      const restam = Math.max(0, LIMITE - n);
      return res.status(200).json({ ok:false, precisaPin:'entrar',
        msg: restam ? `PIN incorreto. Restam ${restam} ${restam === 1 ? 'tentativa' : 'tentativas'}.`
                    : 'PIN incorreto. Espere 15 minutos.' });
    }

    await zerarTentativas(nome);
    return res.status(200).json({ ok:true, apelido:nome, entrou:true });
  }

  /* ------------------------------------------------ registrar leitura ---- */
  if (acao === 'leitura') {
    const nome = limpar(corpo.apelido);
    const id = String(corpo.id || '').slice(0, 120);
    if (!id) return res.status(200).json({ ok:false });

    if (!ligado()) return res.status(200).json({ ok:true, local:true });

    // contador da matéria
    await redis('INCR', `cliques:${id}`);

    // ranking do dia, para "mais lidas"
    await redis('ZINCRBY', `top:${hoje()}`, 1, id);
    await redis('EXPIRE', `top:${hoje()}`, 60 * 60 * 24 * 8);

    // histórico do leitor: últimas 200 leituras, nada mais
    if (nome) {
      const registro = JSON.stringify({
        id, t: corpo.titulo || '', e: corpo.editoria || '',
        uf: corpo.uf || '', n: corpo.nivel || '', q: Date.now()
      });
      await redis('LPUSH', `leitor:${nome}`, registro);
      await redis('LTRIM', `leitor:${nome}`, 0, 199);
      await redis('SET', `visto:${nome}`, hoje());
    }
    return res.status(200).json({ ok:true });
  }

  /* ------------------------------------------------------- esquecer ------ */
  // A pessoa apaga tudo dela. Sem burocracia, sem e-mail.
  /* -------------------------------------------- acompanhar um caso ------
     O que nenhum feed de rede social faz.

     Para o algoritmo do Instagram, "fulano foi acusado" e "fulano foi
     absolvido" sao dois posts sem relacao — e o segundo rende menos, entao
     some. Aqui os dois sao a MESMA historia em estados diferentes, e o
     jornal sabe disso porque tem selo de evidencia, arquivo e cacador.

     O leitor marca o caso. Quando o nivel mudar — de "sem confirmacao" para
     "confirmado oficialmente" — ele e avisado ao voltar. Nao ha e-mail nem
     push: seria preciso cadastro, e o jornal promete nao pedir.            */
  if (acao === 'acompanhar') {
    const nome = limpar(corpo.apelido);
    if (!nome || !corpo.id) return res.status(200).json({ ok:false });
    if (!ligado()) return res.status(200).json({ ok:true, local:true });

    let segue = [];
    try { segue = JSON.parse(await redis('GET', `segue:${nome}`) || '[]'); } catch {}

    const ja = segue.findIndex(x => x.id === corpo.id);
    if (ja >= 0) {
      segue.splice(ja, 1);                       // clicar de novo deixa de seguir
      await redis('SET', `segue:${nome}`, JSON.stringify(segue));
      return res.status(200).json({ ok:true, seguindo:false });
    }

    segue.unshift({
      id: corpo.id,
      titulo: String(corpo.titulo || '').slice(0, 200),
      link: String(corpo.link || '').slice(0, 300),
      // O nivel do dia em que o leitor marcou. E a comparacao com este valor
      // que revela o desfecho depois.
      nivel: corpo.nivel || 'sem-confirmacao',
      quando: new Date().toISOString()
    });
    await redis('SET', `segue:${nome}`, JSON.stringify(segue.slice(0, 40)));

    // Indice global do que esta sendo acompanhado. E por ele que o robo sabe
    // com o que comparar, sem precisar varrer leitor por leitor.
    let idx = [];
    try { idx = JSON.parse(await redis('GET', 'casos:seguidos') || '[]'); } catch {}
    if (!idx.some(x => x.id === corpo.id)) {
      idx.unshift({ id: corpo.id, titulo: String(corpo.titulo || '').slice(0, 200) });
      await redis('SET', 'casos:seguidos', JSON.stringify(idx.slice(0, 300)));
    }

    return res.status(200).json({ ok:true, seguindo:true });
  }

  /* ---- o que mudou nos casos que este leitor acompanha ---- */
  if (acao === 'novidades') {
    const nome = limpar(corpo.apelido);
    if (!nome || !ligado()) return res.status(200).json({ ok:true, mudou:[], segue:[] });

    let segue = [];
    try { segue = JSON.parse(await redis('GET', `segue:${nome}`) || '[]'); } catch {}
    if (!segue.length) return res.status(200).json({ ok:true, mudou:[], segue:[] });

    // O robo grava aqui o estado atual de cada historia a cada rodada.
    let estados = {};
    try { estados = JSON.parse(await redis('GET', 'casos:estado') || '{}'); } catch {}

    const ordem = { 'sem-confirmacao':0, 'redacao':0, 'atribuido':1, 'confirmado':2 };
    const mudou = segue.map(s => {
      const agora = estados[s.id];
      if (!agora) return null;
      const antes = ordem[s.nivel] ?? 0;
      const depois = ordem[agora.nivel] ?? 0;
      if (depois <= antes) return null;
      return { ...s, virou: agora.nivel, novoLink: agora.link || s.link, novoTitulo: agora.titulo || s.titulo };
    }).filter(Boolean);

    return res.status(200).json({ ok:true, mudou, segue });
  }

  /* ------------------------------------------------- o seu Meridiano ----
     Devolve o retrato do leitor: o que ele acompanha, o que costuma ler, e
     o historico. Tudo isso ja era gravado — faltava um lugar para mostrar.

     A diferenca para um feed de rede social esta no criterio: aqui a
     personalizacao e por ASSUNTO e LUGAR, nao por engajamento. O que prende
     no Instagram e a acusacao; o que falta no jornalismo e o desfecho.     */
  if (acao === 'meu') {
    const nome = limpar(corpo.apelido);
    if (!nome || !ligado()) return res.status(200).json({ ok:true, vazio:true });

    const [historicoCru, segueCru, estadosCru] = await Promise.all([
      redis('LRANGE', `leitor:${nome}`, 0, 199),
      redis('GET', `segue:${nome}`),
      redis('GET', 'casos:estado')
    ]);

    let historico = [];
    for (const x of (historicoCru || [])) { try { historico.push(JSON.parse(x)); } catch {} }

    let segue = [], estados = {};
    try { segue = JSON.parse(segueCru || '[]'); } catch {}
    try { estados = JSON.parse(estadosCru || '{}'); } catch {}

    // O estado atual de cada caso acompanhado, e se mudou desde a marcacao.
    const ordem = { 'sem-confirmacao':0, 'redacao':0, 'atribuido':1, 'confirmado':2 };
    const filas = await Promise.all(segue.map(s => redis('GET', `fila:${s.id}`)));
    const acompanhando = segue.map((s, k) => {
      let fila = [];
      try { fila = JSON.parse(filas[k] || '[]'); } catch {}
      const agora = estados[s.id];
      const subiu = agora && (ordem[agora.nivel] ?? 0) > (ordem[s.nivel] ?? 0);
      return { ...s, atual: agora ? agora.nivel : s.nivel,
               titulo: (agora && agora.titulo) || s.titulo,
               link: (agora && agora.link) || s.link, mudou: Boolean(subiu),
               naFila: fila.length };
    });

    // O que ele le, contado. Serve para a pagina dizer "voce le principalmente
    // Cuiaba e licitacao" — e para mostrar o que saiu hoje nesses assuntos.
    const conta = (campo) => {
      const m = {};
      for (const h of historico) { const v = h[campo]; if (v) m[v] = (m[v] || 0) + 1; }
      return Object.entries(m).sort((a,b) => b[1] - a[1]).slice(0, 6)
        .map(([chave, n]) => ({ chave, n }));
    };

    return res.status(200).json({
      ok: true,
      apelido: nome,
      total: historico.length,
      desde: historico.length ? historico[historico.length - 1].q : null,
      editorias: conta('e'),
      estados: conta('uf'),
      niveis: conta('n'),
      acompanhando,
      historico: historico.slice(0, 40).map(h => ({ id:h.id, titulo:h.t, editoria:h.e, uf:h.uf, nivel:h.n, quando:h.q }))
    });
  }

  /* --------------------------------- manchetes que circulam por assunto ---
     Ha assunto que o Meridiano nao cobre — Fifa, celebridade, futebol — e
     nao adianta fingir: nao existe orgao publico brasileiro que registre
     decisao da Fifa, entao nunca havera documento.

     O honesto e mostrar o que circula, dizendo que nao verificamos, com o
     nome do veiculo e o link para o original. Nenhuma linha de texto alheio
     e reproduzida: e citacao de titulo com credito, que a lei permite — e
     mais limpo que a nota reescrita, porque deixa obvio que so apontamos. */
  if (acao === 'circulando') {
    if (!ligado()) return res.status(200).json({ ok:true, itens: [] });
    const termo = String(corpo.assunto || '');
    if (!termo) return res.status(200).json({ ok:true, itens: [] });

    let guardadas = [];
    try { guardadas = JSON.parse(await redis('GET', `pauta:${termo.toLowerCase()}`) || '[]'); } catch {}
    const corte = Date.now() - 7 * 86400000;
    return res.status(200).json({ ok:true, itens: guardadas.filter(x => Date.parse(x.iso) > corte) });
  }

  /* ---- o robo guarda as manchetes que batem com assunto seguido ---- */
  if (acao === 'guardar-pauta') {
    if (String(corpo.chave || '') !== (process.env.CHAVE_ROBO || '')) return res.status(200).json({ ok:false });
    if (!ligado()) return res.status(200).json({ ok:false });

    let total = 0;
    for (const [termo, itens] of Object.entries(corpo.porAssunto || {})) {
      const k = `pauta:${termo.toLowerCase()}`;
      let atual = [];
      try { atual = JSON.parse(await redis('GET', k) || '[]'); } catch {}
      const tinha = new Set(atual.map(x => x.titulo));
      for (const i of itens) { if (!tinha.has(i.titulo)) { atual.unshift(i); total++; } }
      const corte = Date.now() - 7 * 86400000;
      await redis('SET', k, JSON.stringify(atual.filter(x => Date.parse(x.iso) > corte).slice(0, 40)));
    }
    return res.status(200).json({ ok:true, total });
  }

  /* ---- todos os assuntos seguidos, para o robo saber o que separar ---- */
  if (acao === 'assuntos-todos') {
    if (String(corpo.chave || '') !== (process.env.CHAVE_ROBO || '')) return res.status(200).json({ ok:false });
    if (!ligado()) return res.status(200).json({ ok:true, termos: [] });
    let idx = [];
    try { idx = JSON.parse(await redis('GET', 'assuntos:todos') || '[]'); } catch {}
    return res.status(200).json({ ok:true, termos: idx.slice(0, 200) });
  }

  /* ---- quem sao os assinantes, para o robo produzir para eles ---- */
  if (acao === 'assinantes') {
    if (String(corpo.chave || '') !== (process.env.CHAVE_ROBO || '')) return res.status(200).json({ ok:false });
    if (!ligado()) return res.status(200).json({ ok:true, lista: [] });

    let idx = [];
    try { idx = JSON.parse(await redis('GET', 'assinantes') || '[]'); } catch {}

    // Cada um com a descricao dele: e ela que define a pauta.
    const lista = [];
    for (const nome of idx.slice(0, 30)) {
      const perfil = await redis('GET', `perfil:${nome}`);
      if (perfil && String(perfil).trim().length >= 30) lista.push({ apelido: nome, perfil });
    }
    return res.status(200).json({ ok:true, lista });
  }

  /* ------------------------------------------------ perfil em texto ------
     Etiqueta por palavra e fragil: "concessao rodoviaria" so casa com quem
     escreve exatamente isso, e nao pega "leilao da BR-381" nem "audiencia
     publica sobre pedagio" — que sao a mesma coisa.

     Uma descricao em linguagem natural captura a intencao. E cresce sem virar
     lista: doze etiquetas ja e muito para gerenciar; um paragrafo se lapida.

     As etiquetas continuam existindo — busca por termo e rapida e nao custa
     IA. A descricao entra como segunda camada, para o que escapa delas.    */
  if (acao === 'perfil') {
    const nome = limpar(corpo.apelido);
    if (!nome || !ligado()) return res.status(200).json({ ok:true, perfil:'' });

    if (corpo.por === 'gravar') {
      const txt = String(corpo.perfil || '').replace(/[<>]/g,'').trim().slice(0, 1500);
      await redis('SET', `perfil:${nome}`, txt);

      // Quem escreve uma descricao vira assinante: o robo passa a produzir
      // para ele, em vez de so filtrar o que ja publicou.
      let idx = [];
      try { idx = JSON.parse(await redis('GET','assinantes') || '[]'); } catch {}
      if (txt.length >= 30 && !idx.includes(nome)) {
        idx.unshift(nome);
        await redis('SET', 'assinantes', JSON.stringify(idx.slice(0, 60)));
      }
      if (txt.length < 30) {
        await redis('SET', 'assinantes', JSON.stringify(idx.filter(x => x !== nome)));
      }
      return res.status(200).json({ ok:true, perfil: txt });
    }
    return res.status(200).json({ ok:true, perfil: (await redis('GET', `perfil:${nome}`)) || '' });
  }

  /* ---- o agente decide quais matérias combinam com a descrição ---- */
  if (acao === 'filtrar') {
    if (!CHAVE_IA) return res.status(200).json({ ok:false, msg:'sem GEMINI_API_KEY' });

    const perfil = String(corpo.perfil || '').slice(0, 1500);
    const itens = (Array.isArray(corpo.itens) ? corpo.itens : []).slice(0, 60)
      .map((x, n) => ({ n, titulo: String(x.titulo || '').slice(0, 180), resumo: String(x.resumo || '').slice(0, 200) }))
      .filter(x => x.titulo);

    if (perfil.length < 30 || !itens.length) return res.status(200).json({ ok:true, escolhidas: [] });

    // O que ele ja abriu. Nao substitui a descricao: refina. Descricao e o que
    // a pessoa DIZ que quer; historico e o que ela FAZ. Quando os dois
    // divergem, o segundo costuma estar mais perto da verdade — mas mudar o
    // criterio sozinho seria arrogante, entao ele so desempata.
    const lidos = (Array.isArray(corpo.lidos) ? corpo.lidos : [])
      .slice(0, 25).map(t => String(t).slice(0, 140)).filter(Boolean);

    const prompt = `Você seleciona matérias para um leitor do MERIDIANO, a partir da descrição que ele mesmo escreveu do que quer acompanhar.

DESCRIÇÃO DO LEITOR:
${perfil}
${lidos.length ? `
O QUE ELE JÁ ABRIU (use para desempatar, não para mudar o critério):
${lidos.map(t => '· ' + t).join('\n')}` : ''}

REGRAS:
1. Escolha apenas o que serve a essa descrição. Na dúvida, NÃO escolha — lista cheia de coisa vagamente relacionada faz o leitor parar de olhar.
2. A descrição pode citar órgãos, instrumentos e temas. Uma matéria serve se tratar de qualquer um deles, mesmo que use outras palavras: "leilão da BR-381" serve a quem acompanha concessão rodoviária.
3. Para cada escolhida, escreva em POUCAS PALAVRAS por que ela entrou. O leitor precisa poder discordar.
4. No máximo 20 escolhidas.
5. AGRUPE por setor. Olhe a descrição e identifique os grandes temas dela — por exemplo, num perfil de infraestrutura: rodovias, ferrovias, portos e aeroportos, energia, saneamento, telecomunicações. Cada matéria escolhida recebe um desses. Se não couber em nenhum, use "outros". No máximo seis setores.

MATÉRIAS (número, título, resumo):
${itens.map(i => `[${i.n}] ${i.titulo} — ${i.resumo}`).join('\n')}

FORMATO — exatamente isto, uma por linha, sem markdown:
numero | setor | motivo curto`;

    try {
      const j = await chamarIA({ contents:[{ parts:[{ text: prompt }] }],
        generationConfig:{ temperature:0.2, maxOutputTokens:1500 } });
      const t = (j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '').replace(/\*\*/g,'');

      const escolhidas = t.split(/\n/)
        .map(l => l.split('|').map(x => x.trim()))
        .filter(p => p.length >= 2 && /^\d+$/.test(p[0]))
        .map(p => p.length >= 3
          ? { n: Number(p[0]), setor: p[1].slice(0, 40) || 'outros', motivo: p[2].slice(0, 120) }
          : { n: Number(p[0]), setor: 'outros', motivo: p[1].slice(0, 120) })
        .filter(x => x.n >= 0 && x.n < itens.length)
        .slice(0, 20);

      return res.status(200).json({ ok:true, escolhidas });
    } catch (e) {
      return res.status(200).json({ ok:false, msg: String(e.message).slice(0, 80) });
    }
  }

  /* --------------------------------------------- afinar o assunto --------
     "Fifa e Uefa problemas" nao casa com nada: exige as tres palavras na
     mesma materia, e "problemas" nunca esta num release oficial. O que a
     pessoa queria era o conflito entre as duas — e isso nenhuma caixa de
     texto captura sozinha.

     Aqui o agente le o que ela escreveu, faz UMA pergunta curta quando
     precisa, e devolve um termo que funciona de verdade. Duas perguntas ja
     viram formulario e cansam.                                             */
  if (acao === 'afinar') {
    if (!CHAVE_IA) return res.status(200).json({ ok:true, termo: String(corpo.bruto||'').trim() });

    const bruto = String(corpo.bruto || '').trim().slice(0, 200);
    const resposta = String(corpo.resposta || '').trim().slice(0, 200);
    if (bruto.length < 3) return res.status(200).json({ ok:false, msg:'escreva um pouco mais' });

    const prompt = `Você ajuda o leitor de um jornal a transformar um interesse em um TERMO DE BUSCA que funcione.

Como a busca funciona: o termo é comparado com o título e o resumo de cada matéria. TODAS as palavras do termo precisam aparecer. Palavras genéricas — problemas, notícias, situação, sobre, caso — nunca aparecem em título de matéria e fazem a busca não encontrar nada.

O leitor escreveu: "${bruto}"
${resposta ? `Ele respondeu à sua pergunta anterior: "${resposta}"` : ''}

Sua tarefa:
1. Se o que ele escreveu já funciona como termo, devolva-o limpo — sem palavras genéricas.
2. Se estiver ambíguo e uma pergunta resolveria, faça UMA pergunta curta e objetiva.
3. Nunca faça mais de uma pergunta. Se ele já respondeu uma, decida.

FORMATO — exatamente isto, sem markdown:
PERGUNTA: (uma pergunta curta, ou a palavra NENHUMA)
TERMO: (o termo de busca final, 1 a 4 palavras, sem genéricas)
EXPLICA: (uma frase dizendo o que esse termo vai trazer)`;

    try {
      const j = await chamarIA({ contents:[{ parts:[{ text: prompt }] }],
        generationConfig:{ temperature:0.3, maxOutputTokens:600 } });
      const t = (j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '').replace(/\*\*/g,'').trim();

      const perg = (t.match(/PERGUNTA\s*:\s*(.+)/i)?.[1] || '').trim();
      const termo = (t.match(/TERMO\s*:\s*(.+)/i)?.[1] || '').trim();
      const expl = (t.match(/EXPLICA\s*:\s*(.+)/i)?.[1] || '').trim();

      return res.status(200).json({
        ok: true,
        pergunta: (!perg || /^nenhuma/i.test(perg)) ? null : perg,
        termo: termo || bruto,
        explica: expl || null
      });
    } catch (e) {
      // Falhando a IA, o termo do leitor vale — melhor que travar.
      return res.status(200).json({ ok:true, termo: bruto, pergunta:null });
    }
  }

  /* ------------------------------------------------ assuntos seguidos ----
     Categoria fixa nao funciona: o leitor marca oito caixas no primeiro dia
     e nunca mais volta la, enquanto o que ele le muda toda semana.

     Assunto escrito a mao e outra coisa. "Lula", "projecoes", "licitacao em
     Sinop" — e o que esta ocupando a cabeca dele agora, e ele tira quando
     cansar. Perfil declarado envelhece; assunto vivo, nao.                 */
  if (acao === 'assuntos') {
    const nome = limpar(corpo.apelido);
    if (!nome || !ligado()) return res.status(200).json({ ok:true, assuntos: [] });

    let lista = [];
    try { lista = JSON.parse(await redis('GET', `assunto:${nome}`) || '[]'); } catch {}

    if (corpo.por === 'somar') {
      const novo = String(corpo.assunto || '').trim().slice(0, 60);
      if (novo.length < 3) return res.status(200).json({ ok:false, msg:'escreva pelo menos 3 letras' });
      if (lista.length >= 12) return res.status(200).json({ ok:false, msg:'doze assuntos é o limite — tire um para pôr outro' });
      if (!lista.some(x => x.termo.toLowerCase() === novo.toLowerCase())) {
        lista.unshift({ termo: novo, desde: new Date().toISOString() });
        await redis('SET', `assunto:${nome}`, JSON.stringify(lista));

        // Indice global: uma copia por assunto serve todos os leitores que o
        // seguem, e o robo separa as manchetes sem varrer leitor por leitor.
        let idx = [];
        try { idx = JSON.parse(await redis('GET','assuntos:todos') || '[]'); } catch {}
        if (!idx.some(t => t.toLowerCase() === novo.toLowerCase())) {
          idx.unshift(novo);
          await redis('SET', 'assuntos:todos', JSON.stringify(idx.slice(0, 200)));
        }
      }
    }

    if (corpo.por === 'tirar') {
      lista = lista.filter(x => x.termo !== corpo.assunto);
      await redis('SET', `assunto:${nome}`, JSON.stringify(lista));
    }

    return res.status(200).json({ ok:true, assuntos: lista });
  }

  /* ---------------------------------------------------- a fila do caso ---
     Quem acompanha uma noticia nao quer so saber se ela mudou de estado:
     quer o que veio depois. Entao cada noticia marcada vira uma pasta, e o
     robo empilha ali tudo que publicar de parecido.

     A noticia escolhida e a propria definicao do assunto — ninguem precisa
     inventar palavra-chave.                                                */
  if (acao === 'fila') {
    if (!ligado()) return res.status(200).json({ ok:true, fila: [] });
    const cru = await redis('GET', `fila:${String(corpo.id || '')}`);
    let fila = [];
    try { fila = JSON.parse(cru || '[]'); } catch {}
    return res.status(200).json({ ok:true, fila });
  }

  /* ---- o robo empilha os desdobramentos nas filas abertas ---- */
  if (acao === 'empilhar') {
    if (String(corpo.chave || '') !== (process.env.CHAVE_ROBO || '')) return res.status(200).json({ ok:false });
    if (!ligado()) return res.status(200).json({ ok:false });

    let somadas = 0;
    for (const [id, novas] of Object.entries(corpo.filas || {})) {
      let fila = [];
      try { fila = JSON.parse(await redis('GET', `fila:${id}`) || '[]'); } catch {}
      const tinha = new Set(fila.map(x => x.id));
      for (const n of novas) {
        if (tinha.has(n.id)) continue;
        fila.unshift(n); somadas++;
      }
      // Teto por fila: serie como o Boletim Focus se repete toda semana e
      // acumularia sem fim.
      if (fila.length) await redis('SET', `fila:${id}`, JSON.stringify(fila.slice(0, 15)));
    }
    return res.status(200).json({ ok:true, somadas });
  }

  /* ---- quais casos estao sendo acompanhados, para o robo saber o que comparar ---- */
  if (acao === 'seguidos') {
    if (String(corpo.chave || '') !== (process.env.CHAVE_ROBO || '')) return res.status(200).json({ ok:false });
    if (!ligado()) return res.status(200).json({ ok:true, casos: [] });

    // O indice e mantido no proprio 'acompanhar': assim nao e preciso varrer
    // todos os leitores a cada rodada.
    let idx = [];
    try { idx = JSON.parse(await redis('GET', 'casos:seguidos') || '[]'); } catch {}
    return res.status(200).json({ ok:true, casos: idx.slice(0, 300) });
  }

  /* ---- o robo publica aqui o estado atual das historias ---- */
  if (acao === 'estados') {
    if (String(corpo.chave || '') !== (process.env.CHAVE_ROBO || '')) return res.status(200).json({ ok:false });
    if (!ligado()) return res.status(200).json({ ok:false });
    let estados = {};
    try { estados = JSON.parse(await redis('GET', 'casos:estado') || '{}'); } catch {}
    for (const [id, v] of Object.entries(corpo.estados || {})) estados[id] = v;
    // guarda no maximo 3 mil historias, as mais recentes
    const podado = Object.fromEntries(Object.entries(estados).slice(-3000));
    await redis('SET', 'casos:estado', JSON.stringify(podado));
    return res.status(200).json({ ok:true, total: Object.keys(podado).length });
  }

  if (acao === 'esquecer') {
    const nome = limpar(corpo.apelido);
    if (nome && ligado()) {
      await redis('DEL', `leitor:${nome}`);
      await redis('DEL', `apelido:${nome}`);
      await redis('DEL', `visto:${nome}`);
      await redis('DEL', `tent:${nome}`);
      await redis('DEL', `segue:${nome}`);
      await redis('DEL', `perfil:${nome}`);
      await redis('DEL', `assunto:${nome}`);
    }
    return res.status(200).json({ ok:true });
  }

  /* --------------------------------------------------------- mais lidas -- */
  if (acao === 'mais-lidas') {
    if (!ligado()) return res.status(200).json({ ok:true, lista: [] });
    const r = await redis('ZRANGE', `top:${hoje()}`, 0, 14, 'REV', 'WITHSCORES');
    const lista = [];
    for (let i = 0; i < (r || []).length; i += 2) lista.push({ id: r[i], cliques: Number(r[i+1]) });
    return res.status(200).json({ ok:true, lista });
  }

  return res.status(400).json({ erro: 'ação desconhecida' });
}
