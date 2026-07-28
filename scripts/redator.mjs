// REDATOR — reescreve documento oficial em matéria própria, via Gemini Flash.
//
// Regra de ouro: só entra aqui texto de fonte que autoriza reprodução —
// Agência Brasil, Agência Câmara, Agência Senado e assessorias públicas.
// Nunca texto de veículo privado. O que os portais dão serve para saber o
// que é notícia; o texto vem sempre da fonte oficial.
//
// O modelo REESCREVE, não inventa: recebe o texto oficial e devolve outro
// texto com os mesmos fatos. Toda instrução abaixo existe para impedir que
// ele acrescente número, nome ou contexto que não estava no original.

const CHAVE = process.env.GEMINI_API_KEY || '';
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

// O nome do modelo muda com o tempo. Testamos em ordem e ficamos com o que responde.
const MODELOS = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];
let modeloBom = '';

export const temChave = () => CHAVE.length > 10;

async function chamar(prompt, ms = 45000){
  const erros = [];
  for (const m of (modeloBom ? [modeloBom] : MODELOS)) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), ms);
    try {
      const r = await fetch(`${API}/${m}:generateContent?key=${CHAVE}`, {
        method: 'POST', signal: c.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4000,
            // Flash 2.5 vem com raciocinio ligado e gasta o orcamento pensando,
            // devolvendo resposta cortada. Zerado, sobra tudo para o texto.
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      });
      if (!r.ok) { erros.push(`${m}: HTTP ${r.status}`); continue; }
      const j = await r.json();
      const txt = j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
      if (!txt) { erros.push(`${m}: resposta vazia`); continue; }
      modeloBom = m;
      return txt;
    } catch (e) {
      erros.push(`${m}: ${e.message}`);
    } finally { clearTimeout(t); }
  }
  throw new Error(erros.join(' | '));
}

// Busca o texto completo da matéria oficial. Só chamamos isto para domínios
// que autorizam reprodução — a lista de permitidos fica em varredura.mjs.
export async function textoCompleto(url, ms = 20000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal:c.signal, redirect:'follow',
      headers:{ 'User-Agent':'TempoRealMT/1.0' }});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const html = await r.text();
    const corpo = (html.match(/<article[\s\S]*?<\/article>/i)?.[0])
      || (html.match(/<main[\s\S]*?<\/main>/i)?.[0])
      || html;
    return corpo
      .replace(/<script[\s\S]*?<\/script>/gi,' ')
      .replace(/<style[\s\S]*?<\/style>/gi,' ')
      .replace(/<[^>]+>/g,' ')
      .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
      .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/\s+/g,' ').trim().slice(0, 6000);
  } finally { clearTimeout(t); }
}

const PROMPT = (fonte, titulo, texto) => `Você é redator de um veículo de notícias de Mato Grosso chamado TEMPO REAL MT.

Reescreva a notícia abaixo com suas próprias palavras, para publicação no nosso site.

REGRAS QUE NÃO PODEM SER QUEBRADAS:
1. Use APENAS fatos que estão no texto original. Não acrescente nenhum dado, número, nome, data, cargo ou contexto que não esteja lá.
2. Se o texto original não diz algo, não diga. Nada de "especialistas afirmam", "segundo analistas", "a expectativa é".
3. Nenhum número pode ser alterado, arredondado ou estimado.
4. Não opine, não avalie, não conclua. Só relate.
5. Nomes próprios exatamente como no original.
6. Português do Brasil, tom seco de jornal, sem adjetivo desnecessário.
7. Não escreva frase feita como "vale destacar", "é importante ressaltar", "cabe lembrar".

FORMATO DA RESPOSTA — exatamente isto, sem markdown, sem comentário:
TITULO: (uma linha, no máximo 90 caracteres, direto, sem ponto final)
LINHAFINA: (uma frase de até 200 caracteres, com a informação mais importante que não está no título)
CORPO:
(3 a 5 parágrafos curtos, separados por linha em branco. O primeiro parágrafo responde o que aconteceu.)

FONTE OFICIAL: ${fonte}
TÍTULO ORIGINAL: ${titulo}

TEXTO ORIGINAL:
${texto}`;

export async function reescrever({ fonte, titulo, texto }){
  if (!temChave()) throw new Error('sem GEMINI_API_KEY');
  if (!texto || texto.length < 400) throw new Error('texto original curto demais');

  const bruto = await chamar(PROMPT(fonte, titulo, texto));

  // O modelo as vezes devolve com markdown, com acento no rotulo, ou sem
  // rotulo nenhum. Limpamos e tentamos varios formatos antes de desistir.
  const limpo = String(bruto)
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .trim();

  let t  = limpo.match(/T[IÍ]TULO\s*:\s*(.+)/i)?.[1]?.trim() || '';
  let lf = limpo.match(/LINHA\s*_?\s*FINA\s*:\s*(.+)/i)?.[1]?.trim() || '';
  let corpo = (limpo.split(/CORPO\s*:\s*/i)[1] || '')
    .split(/\n\s*\n/).map(x => x.trim()).filter(x => x.length > 40);

  // Plano B: sem rotulos. Primeira linha vira titulo, segunda a linha fina,
  // o resto vira corpo.
  if (!t || corpo.length < 2) {
    const blocos = limpo.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
    if (blocos.length >= 3) {
      if (!t)  t  = blocos[0].replace(/^["']|["']$/g, '').slice(0, 130);
      if (!lf) lf = blocos[1].slice(0, 240);
      if (corpo.length < 2) corpo = blocos.slice(2).filter(x => x.length > 40);
    }
  }

  if (!t || corpo.length < 2) {
    throw new Error('resposta fora do formato: ' + limpo.slice(0, 90).replace(/\n/g, ' '));
  }

  // Trava de segurança: todo número que aparece no texto novo tem que existir
  // no original. Se o modelo inventou uma cifra, a matéria é descartada.
  const numeros = s => (String(s).match(/\d[\d.,]{2,}/g) || []).map(n => n.replace(/[.,]/g,''));
  const orig = new Set(numeros(texto));
  const novos = numeros(t + ' ' + lf + ' ' + corpo.join(' '));
  const inventados = novos.filter(n => !orig.has(n));
  if (inventados.length) throw new Error('número não confere com o original: ' + inventados.slice(0,3).join(', '));

  return {
    titulo: t.replace(/^["']|["']$/g,''),
    linhaFina: lf,
    corpo,
    modelo: modeloBom
  };
}

export const modeloUsado = () => modeloBom || '(nenhum)';
