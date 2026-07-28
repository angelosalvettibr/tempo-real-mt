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

const URL_KV   = process.env.KV_REST_API_URL   || '';
const TOKEN_KV = process.env.KV_REST_API_TOKEN || '';
const ligado = () => URL_KV && TOKEN_KV;

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

  /* ---------------------------------------------- reservar apelido ------- */
  if (acao === 'apelido') {
    const nome = limpar(corpo.apelido);
    if (nome.length < 3) return res.status(200).json({ ok:false, msg:'Use pelo menos 3 caracteres.' });

    if (!ligado()) return res.status(200).json({ ok:true, apelido:nome, local:true });

    // SET com NX: só grava se ainda não existir. É isso que garante que dois
    // leitores não fiquem com o mesmo apelido.
    const gravou = await redis('SET', `apelido:${nome}`, hoje(), 'NX');
    if (gravou === 'OK') return res.status(200).json({ ok:true, apelido:nome });

    // já em uso: procura variações livres
    const sugestoes = [];
    for (let i = 1; i <= 40 && sugestoes.length < 3; i++) {
      const cand = `${nome}${i}`;
      const livre = await redis('SET', `apelido:${cand}`, hoje(), 'NX');
      if (livre === 'OK') {
        await redis('DEL', `apelido:${cand}`);   // só checando, não reserva ainda
        sugestoes.push(cand);
      }
    }
    return res.status(200).json({ ok:false, msg:'Este apelido já está em uso.', sugestoes });
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
  if (acao === 'esquecer') {
    const nome = limpar(corpo.apelido);
    if (nome && ligado()) {
      await redis('DEL', `leitor:${nome}`);
      await redis('DEL', `apelido:${nome}`);
      await redis('DEL', `visto:${nome}`);
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
