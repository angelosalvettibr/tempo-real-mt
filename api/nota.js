// MERIDIANO · /api/nota
//
// Nota escrita pela redacao — voce — para entrar no jornal junto com o que o
// robo produz. Serve para o que o robo nao alcanca: uma historia que voce
// apurou, um assunto que nenhuma fonte livre cobriu, um recado da redacao.
//
// TRES CUIDADOS QUE SUSTENTAM ISSO:
//
// 1. NAO PODE MORAR NO edicao-*.json. O robo reescreve aqueles arquivos a
//    cada rodada; a nota sumiria na seguinte. Ela vive aqui, no Redis, e a
//    capa junta as duas coisas na hora de exibir.
//
// 2. A SENHA E VERIFICADA AQUI, NO SERVIDOR. Senha conferida no navegador nao
//    protege nada: basta abrir o codigo-fonte. A do painel serve so para
//    manter curioso longe da tela; a que vale e esta.
//
// 3. A NOTA DIZ O QUE E. O jornal inteiro se vende por rastreabilidade. Uma
//    nota que nao passou pelo cacador nem pelo cruzamento nao pode se passar
//    por materia confirmada — ela sai com selo proprio e a fonte declarada.
//
// Variaveis necessarias na Vercel:
//   SENHA_REDACAO   a senha de publicacao
//   BLOB_READ_WRITE_TOKEN  para enviar foto (Storage -> Blob, na Vercel)
//   GEMINI_API_KEY  para o botao de reescrever
//   KV_REST_API_URL / KV_REST_API_TOKEN   ja usados pelo /api/leitor

import { timingSafeEqual, createHash } from 'node:crypto';

const URL_KV   = process.env.KV_REST_API_URL   || '';
const TOKEN_KV = process.env.KV_REST_API_TOKEN || '';
const SENHA    = process.env.SENHA_REDACAO     || '';
const CHAVE_IA = process.env.GEMINI_API_KEY    || '';
const BLOB     = process.env.BLOB_READ_WRITE_TOKEN || '';

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

// Comparacao de tempo constante: comparar string com === vaza o tamanho da
// senha pelo tempo de resposta. Exagero? Custa uma linha.
function senhaConfere(dada){
  if (!SENHA) return false;
  const a = createHash('sha256').update(String(dada || '')).digest();
  const b = createHash('sha256').update(SENHA).digest();
  return timingSafeEqual(a, b);
}

const esc = s => String(s || '').replace(/[<>]/g, '');
const slug = t => String(t||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-')
  .replace(/^-+|-+$/g,'').slice(0, 70);

/* ----------------------------------------------------------- GEMINI ----- */
// Mesma disciplina do redator do robo: escreve a partir do que foi dado, nao
// inventa, nao opina, e nao acrescenta numero que nao estava la.
const PROMPT = (titulo, texto, fonte) => `Você escreve para o MERIDIANO, um jornal que só publica o que confere e mostra ao leitor de onde veio cada informação.

Reescreva o material abaixo como notícia, em português do Brasil.

REGRAS:
1. NÃO INVENTE. Não acrescente número, data, nome, local ou causa que não esteja no material. Se falta um dado, a frase fica sem ele.
2. Sem opinião, sem adjetivo de efeito, sem previsão.
3. Frases curtas, tom de agência. O mais importante primeiro.
4. Não escreva o nome de veículos de imprensa no texto. A fonte aparece creditada em campo próprio.
5. Se o material atribui algo a alguém, mantenha a atribuição.

FORMATO — exatamente isto, sem markdown:
TITULO: (uma linha, até 90 caracteres)
LINHA: (uma frase de apoio, até 160 caracteres)
CORPO:
(2 a 4 parágrafos, separados por linha em branco)

FONTE DECLARADA: ${fonte || 'não informada'}
MATERIAL:
${titulo ? 'Título sugerido: ' + titulo + '\n' : ''}${texto}`;

async function reescrever(titulo, texto, fonte){
  if (!CHAVE_IA) throw new Error('sem GEMINI_API_KEY na Vercel');
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + CHAVE_IA;
  const r = await fetch(url, {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
      contents:[{ parts:[{ text: PROMPT(titulo, texto, fonte) }] }],
      generationConfig:{ temperature:0.4, maxOutputTokens:2000 }
    })
  });
  if (!r.ok) throw new Error('IA HTTP ' + r.status);
  const j = await r.json();
  const bruto = j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  const limpo = bruto.replace(/```[a-z]*\n?/gi,'').replace(/\*\*/g,'').trim();

  return {
    titulo: (limpo.match(/T[IÍ]TULO\s*:\s*(.+)/i)?.[1] || '').trim(),
    linha:  (limpo.match(/LINHA\s*:\s*(.+)/i)?.[1] || '').trim(),
    corpo:  (limpo.match(/CORPO\s*:\s*([\s\S]*)$/i)?.[1] || '')
              .split(/\n\s*\n/).map(x => x.trim()).filter(x => x.length > 30)
  };
}

/* ------------------------------------------------------------ FOTO ------ */
// Guardamos no Blob da propria Vercel, pela API HTTP — sem biblioteca, que e
// a regra do projeto. O navegador ja manda a imagem reduzida: foto de celular
// tem 5 MB e o limite de corpo de uma funcao serverless e bem menor.
async function guardarFoto(base64, nome){
  if (!BLOB) throw new Error('BLOB_READ_WRITE_TOKEN não configurado na Vercel');

  const m = String(base64).match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/);
  if (!m) throw new Error('formato de imagem não aceito');

  const bytes = Buffer.from(m[3], 'base64');
  if (bytes.length > 3_500_000) throw new Error('imagem grande demais');

  const ext = m[2] === 'jpeg' ? 'jpg' : m[2];
  const caminho = `redacao/${Date.now().toString(36)}-${slug(nome || 'foto').slice(0,40) || 'foto'}.${ext}`;

  const r = await fetch(`https://blob.vercel-storage.com/${caminho}`, {
    method:'PUT',
    headers:{
      Authorization: `Bearer ${BLOB}`,
      'x-content-type': m[1],
      'x-api-version': '7',
      'x-add-random-suffix': '1'
    },
    body: bytes
  });
  if (!r.ok) throw new Error('falha ao guardar: HTTP ' + r.status);
  const j = await r.json();
  return j.url;
}

/* ------------------------------------------------------------ ROTA ------ */
export default async function handler(req, res){
  // A capa precisa ler as notas sem senha nenhuma — sao publicas.
  if (req.method === 'GET') {
    if (!ligado()) return res.status(200).json({ notas: [] });
    const cru = await redis('GET', 'redacao:notas');
    let notas = [];
    try { notas = JSON.parse(cru || '[]'); } catch {}
    const corte = Date.now() - 7 * 86400000;
    return res.status(200).json({
      notas: notas
        .filter(n => n.publicada !== false)          // rascunho nao vai ao ar
        .filter(n => Date.parse(n.iso) > corte)
        .slice(0, 30)
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok:false });

  const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { acao, senha } = corpo;

  // Daqui pra baixo, tudo exige senha.
  if (!senhaConfere(senha)) {
    return res.status(200).json({ ok:false, msg: SENHA ? 'Senha incorreta.' : 'SENHA_REDACAO não configurada na Vercel.' });
  }

  if (acao === 'entrar') return res.status(200).json({ ok:true });

  /* --- reescrever com IA, sem gravar nada --- */
  if (acao === 'reescrever') {
    try {
      const t = await reescrever(esc(corpo.titulo), String(corpo.texto || '').slice(0, 12000), esc(corpo.fonte));
      if (!t.titulo || !t.corpo.length) return res.status(200).json({ ok:false, msg:'a IA devolveu fora do formato, tente de novo' });
      return res.status(200).json({ ok:true, ...t });
    } catch (e) {
      return res.status(200).json({ ok:false, msg: String(e.message).slice(0, 80) });
    }
  }

  /* --- enviar foto, devolve o endereco --- */
  if (acao === 'imagem') {
    try {
      const url = await guardarFoto(corpo.dados, corpo.nome);
      return res.status(200).json({ ok:true, url });
    } catch (e) {
      return res.status(200).json({ ok:false, msg: String(e.message).slice(0, 80) });
    }
  }

  /* --- publicar --- */
  if (acao === 'publicar') {
    if (!ligado()) return res.status(200).json({ ok:false, msg:'armazenamento não configurado' });

    const titulo = esc(corpo.titulo).trim();
    const linha  = esc(corpo.linha).trim();
    const texto  = Array.isArray(corpo.corpo) ? corpo.corpo : String(corpo.corpo || '').split(/\n\s*\n/);
    const paragrafos = texto.map(x => esc(x).trim()).filter(Boolean);

    if (titulo.length < 12) return res.status(200).json({ ok:false, msg:'título muito curto' });
    if (!paragrafos.length) return res.status(200).json({ ok:false, msg:'texto vazio' });
    if (!corpo.fonte)       return res.status(200).json({ ok:false, msg:'declare a fonte — é o que sustenta o jornal' });

    const nota = {
      id: 'red:' + slug(titulo) + ':' + Date.now().toString(36),
      titulo, resumo: linha || paragrafos[0].slice(0, 160),
      corpo: paragrafos,
      fonte: esc(corpo.fonte),
      fonteLink: /^https?:\/\//.test(corpo.fonteLink || '') ? corpo.fonteLink : null,
      foto: /^https?:\/\//.test(corpo.foto || '') ? corpo.foto : null,
      editoria: ['brasil','internacional','regional'].includes(corpo.editoria) ? corpo.editoria : 'brasil',
      uf: corpo.uf || null,
      publicada: corpo.rascunho !== true,
      nivel: 'redacao',
      selo: 'Edição da redação',
      chapeu: 'Redação',
      iso: new Date().toISOString(),
      hora: new Date().toLocaleTimeString('pt-BR', { timeZone:'America/Cuiaba', hour:'2-digit', minute:'2-digit' }).replace(':','h')
    };

    let notas = [];
    try { notas = JSON.parse(await redis('GET','redacao:notas') || '[]'); } catch {}
    notas.unshift(nota);
    await redis('SET', 'redacao:notas', JSON.stringify(notas.slice(0, 60)));

    return res.status(200).json({ ok:true, nota });
  }

  /* --- listar tudo, inclusive rascunho (so com senha) --- */
  if (acao === 'listar') {
    if (!ligado()) return res.status(200).json({ ok:true, notas: [] });
    let notas = [];
    try { notas = JSON.parse(await redis('GET','redacao:notas') || '[]'); } catch {}
    return res.status(200).json({ ok:true, notas });
  }

  /* --- tirar do ar ou repor, sem apagar --- */
  if (acao === 'alternar') {
    if (!ligado()) return res.status(200).json({ ok:false });
    let notas = [];
    try { notas = JSON.parse(await redis('GET','redacao:notas') || '[]'); } catch {}
    const n = notas.find(x => x.id === corpo.id);
    if (!n) return res.status(200).json({ ok:false, msg:'nota não encontrada' });
    n.publicada = n.publicada === false;
    await redis('SET', 'redacao:notas', JSON.stringify(notas));
    return res.status(200).json({ ok:true, publicada: n.publicada });
  }

  /* --- apagar --- */
  if (acao === 'apagar') {
    if (!ligado()) return res.status(200).json({ ok:false });
    let notas = [];
    try { notas = JSON.parse(await redis('GET','redacao:notas') || '[]'); } catch {}
    const antes = notas.length;
    notas = notas.filter(n => n.id !== corpo.id);
    await redis('SET', 'redacao:notas', JSON.stringify(notas));
    return res.status(200).json({ ok:true, removidas: antes - notas.length });
  }

  return res.status(200).json({ ok:false, msg:'ação desconhecida' });
}
