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
