// MERIDIANO · /api/contexto
//
// "Entrada de 60 mil migrantes em Ceuta" — quem nao sabe o que e Ceuta nao
// entende nada. E a materia nao pode explicar: nota nao confirmada e registro
// do que circula, nao reportagem.
//
// Este modulo resolve isso com um bloco a parte: o que o leitor precisa saber
// para entender o que esta lendo. Ceuta e um enclave espanhol no norte da
// Africa, uma das duas fronteiras terrestres da UE com o continente. Isso e
// verificavel — diferente do fato noticiado, que pode nao ser.
//
// DUAS COISAS QUE SUSTENTAM ISSO:
//
// 1. SOB DEMANDA, NAO PARA TUDO. Gerar contexto de toda materia custaria caro
//    e quase ninguem leria. O primeiro leitor que pede paga a busca; do
//    segundo em diante vem guardado. E contexto util depende de quem le:
//    quem mora em Cuiaba nao precisa que expliquem o Coxipo.
//
// 2. GRAU DE CERTEZA SEPARADO. Na mesma pagina convivem um fato SEM
//    confirmacao e um contexto verificavel. A tela precisa deixar claro que
//    sao coisas diferentes — e por isso o bloco tem cara propria e lista as
//    fontes de onde saiu.

const URL_KV   = process.env.KV_REST_API_URL   || '';
const TOKEN_KV = process.env.KV_REST_API_TOKEN || '';
const CHAVE_IA = process.env.GEMINI_API_KEY    || '';

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

const esc = s => String(s || '').replace(/[<>]/g, '').trim();

/* ------------------------------------------------------------ PROMPT ----- */
// As mesmas travas do redator do jornal. Contexto e informacao de fundo, nao
// analise: no dia em que virar "especialistas avaliam que isso pode levar a",
// o Meridiano deixa de ser o que e.
const PROMPT = (titulo, resumo) => `Você escreve o bloco PARA ENTENDER do MERIDIANO, um jornal que só afirma o que consegue verificar.

O QUE ESTE BLOCO É — E O QUE NÃO É

Não é um verbete. "Ceuta é uma cidade espanhola de 84 mil habitantes no norte da África" está correto e não serve para nada: o leitor continua sem entender por que 60 mil pessoas cruzaram aquela fronteira.

O que ele precisa saber é que Ceuta é uma das duas únicas fronteiras terrestres da União Europeia com a África, que o controle dessa passagem depende de um acordo com Marrocos, e que em 2021 Marrocos afrouxou a vigilância em meio a uma crise diplomática — e cerca de 8 mil pessoas passaram em dois dias. Aí a notícia faz sentido, e o número ganha escala.

ANTES DE TUDO: ESTA NOTÍCIA PEDE CONTEXTO?

Na maioria das vezes, não. O bloco deve aparecer em cerca de uma notícia a cada cinco. Se você está escrevendo em todas, está errado.

Responda NAO — e pare — quando for:
· declaração de autoridade sobre tema conhecido ("Fachin diz que críticas fortalecem a democracia")
· entrega de obra, inauguração, agenda, aviso de serviço
· resultado de sorteio, boletim de trânsito, previsão do tempo
· nomeação ou exoneração de rotina
· qualquer notícia em que o leitor médio já sabe o que significa cada nome citado

A RÉGUA DO QUE PRECISA SER EXPLICADO não é "é nome próprio". É quantas pessoas saberiam dizer o que aquilo é.

NÃO explique: STF, Lula, Câmara, Senado, Ministério da Saúde, Polícia Federal, Copa do Mundo, União Europeia. Todo brasileiro sabe. Escrever que "o STF é a cúpula do Judiciário, composto por 11 ministros" é encher linguiça — e o leitor percebe.

EXPLIQUE: Ceuta, Eunavfor Med Irini, FICCO, PNCP, Boletim Focus, Súmula Vinculante 14, IGP-M, Coxipó para quem não é de Cuiabá. São nomes que aparecem na notícia e que a maioria não sabe situar.

Se nenhum termo passar nessa régua, a resposta é NAO.

RESPONDA TRÊS PERGUNTAS, NESTA ORDEM

1. O QUE É ISSO — uma frase, o mínimo para o leitor não ficar perdido. Lugar, órgão, operação, acordo, processo. Sem enciclopédia: uma frase.

2. POR QUE ESTÁ ACONTECENDO AGORA — a parte que importa. O que mudou, qual é a disputa, qual acordo regula aquilo, o que aconteceu antes que explique o presente. Se houve episódio anterior parecido, diga quando e qual foi o tamanho.

3. QUAL É A ESCALA — o número da notícia é grande ou pequeno para aquele contexto? Sessenta mil migrantes é muito? Quinze bilhões de reais é muito? Compare com algo verificável: o episódio anterior, a média do período, o total do orçamento. Número sem comparação não informa nada, e é onde quase todo jornal falha. Se a notícia não trouxer número, pule esta parte.

PROCURE ANTES DE ESCREVER. Use a busca para levantar cada uma das três. Não escreva de memória.

REGRAS QUE NÃO PODEM SER QUEBRADAS:
1. NÃO recontar a notícia. Se um parágrafo puder ser resumido como "aconteceu X", apague.
2. NÃO opinar, NÃO prever, NÃO avaliar. Nada de "isso indica", "especialistas avaliam", "deve levar a", "tende a", "é um sinal de".
3. NÃO afirmar como certo o fato noticiado — ele pode não estar confirmado. Você explica o entorno, não o fato.
4. NÃO INVENTE número, data ou nome. Se a busca não trouxer, escreva sem. Comparação inventada é pior que nenhuma.
5. Português correto, com todos os acentos.
6. Na dúvida entre escrever e não escrever, NÃO ESCREVA. Um bloco desnecessário custa mais que um bloco ausente: ensina o leitor a ignorar a seção.
7. Se o seu primeiro parágrafo começar com "X é o órgão responsável por" ou "Y é a instituição que", pare — isso é verbete, não contexto.

FORMATO — exatamente isto, sem markdown:
PRECISA: (SIM ou NAO)
TERMOS: (os termos que você explicou, separados por vírgula — ou vazio se NAO)
TEXTO:
(um parágrafo por pergunta respondida, separados por linha em branco, na ordem acima. Dois ou três parágrafos curtos. Se não houver material para a terceira, escreva duas.)
FONTES:
- (nome da fonte usada. 1 a 4 itens)

NOTÍCIA:
${titulo}
${resumo ? '\n' + resumo : ''}`;

async function gerar(titulo, resumo){
  if (!CHAVE_IA) throw new Error('sem GEMINI_API_KEY');

  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + CHAVE_IA, {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({
      contents:[{ parts:[{ text: PROMPT(titulo, resumo) }] }],
      tools:[{ google_search: {} }],
      generationConfig:{ temperature:0.25, maxOutputTokens:2500 }
    })
  });
  if (!r.ok) throw new Error('IA HTTP ' + r.status);
  const j = await r.json();

  const consultadas = (j?.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
    .map(c => c?.web?.title).filter(Boolean).slice(0, 6);

  const t = (j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '')
    .replace(/```[a-z]*\n?/gi,'').replace(/\*\*/g,'').trim();

  const precisa = /PRECISA\s*:\s*sim/i.test(t);
  if (!precisa) return { precisa:false };

  const bloco = (nome, ate) => {
    const re = new RegExp(nome + '\\s*:\\s*([\\s\\S]*?)(?=' + (ate ? ate + '\\s*:' : '$') + ')', 'i');
    return (t.match(re)?.[1] || '').trim();
  };

  const paragrafos = bloco('TEXTO', 'FONTES')
    .split(/\n\s*\n/).map(x => x.trim()).filter(x => x.length > 40);

  if (!paragrafos.length) return { precisa:false };

  const fontes = bloco('FONTES', null).split(/\n/)
    .map(x => x.replace(/^[-•\s]+/,'').trim())
    .filter(x => x.length > 2 && x.length < 90).slice(0, 4);

  // Trava de saida: opiniao ou previsao invalidam o bloco inteiro. Melhor
  // nao ter contexto que ter analise disfarcada de contexto.
  const proibido = /(indica que|sugere que|especialistas|analistas avaliam|deve levar|tende a|provavelmente|pode significar|[ée] um sinal|aponta para|revela que|demonstra que)/i;
  if (proibido.test(paragrafos.join(' '))) return { precisa:false, recusado:true };

  // Os termos que o agente destrinchou. Mostrar isso ao leitor torna o bloco
  // auditavel: da para ver o que foi explicado e o que ficou de fora.
  const termos = (t.match(/TERMOS\s*:\s*(.+)/i)?.[1] || '')
    .split(',').map(x => x.trim()).filter(x => x.length > 1 && x.length < 60).slice(0, 4);

  return {
    precisa: true,
    termos: termos.length ? termos : null,
    paragrafos,
    fontes: fontes.length ? fontes : (consultadas.length ? consultadas : null)
  };
}

/* ------------------------------------------------ RESUMO DE UM CASO -----
   A pagina do caso mostra a materia original e a fila de desdobramentos em
   ordem. Falta a leitura do conjunto: o que aconteceu, do comeco ate agora.

   E o valor da pagina e justamente o TEMPO. Se a historia comecou como
   acusacao e virou absolvicao, o resumo diz isso em uma frase — e essa e a
   informacao mais importante da tela.                                      */
const PROMPT_CASO = (itens) => `Você escreve o resumo de um caso acompanhado no MERIDIANO.

Abaixo está a sequência de matérias publicadas sobre a mesma história, da mais antiga para a mais recente, cada uma com a data e o grau de evidência.

Escreva UM parágrafo curto dizendo o que aconteceu nesse caso ao longo do tempo. Se o grau de evidência mudou — de "sem confirmação" para "confirmado em documento", por exemplo —, isso é o mais importante e deve aparecer.

REGRAS:
1. Só o que está nas matérias. Nada de fora.
2. Sem opinião, sem previsão, sem adjetivo de efeito.
3. Se ainda não há confirmação, diga que não há.
4. Português correto, com acentos.
5. No máximo cinco frases.

FORMATO — exatamente isto:
RESUMO:
(o parágrafo)

MATÉRIAS, da mais antiga para a mais recente:
${itens.map(i => `[${i.quando}] [${i.nivel}] ${i.titulo}`).join('\n')}`;

async function resumirCaso(itens){
  if (!CHAVE_IA) throw new Error('sem GEMINI_API_KEY');
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + CHAVE_IA, {
    method:'POST', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ contents:[{ parts:[{ text: PROMPT_CASO(itens) }] }],
      generationConfig:{ temperature:0.25, maxOutputTokens:900 } })
  });
  if (!r.ok) throw new Error('IA HTTP ' + r.status);
  const j = await r.json();
  const t = (j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '').replace(/\*\*/g,'').trim();
  const txt = (t.match(/RESUMO\s*:\s*([\s\S]+)/i)?.[1] || '').trim();
  return txt.length > 50 ? txt : null;
}

/* ------------------------------------------------------------- ROTA ----- */
export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ ok:false });

  const corpo = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const id = esc(corpo.id).slice(0, 200);
  const titulo = esc(corpo.titulo).slice(0, 300);
  const resumo = esc(corpo.resumo).slice(0, 600);

  /* ---- resumo de um caso acompanhado ---- */
  if (corpo.acao === 'caso') {
    const itens = (Array.isArray(corpo.itens) ? corpo.itens : []).slice(0, 15)
      .map(i => ({ titulo: esc(i.titulo).slice(0,200), quando: esc(i.quando).slice(0,30), nivel: esc(i.nivel).slice(0,30) }))
      .filter(i => i.titulo);
    if (itens.length < 2) return res.status(200).json({ ok:true, resumo:null });

    const chaveC = 'ctxcaso:' + esc(corpo.id).slice(0,150) + ':' + itens.length;
    if (ligado()) {
      const cru = await redis('GET', chaveC);
      if (cru) return res.status(200).json({ ok:true, resumo: cru, guardado:true });
    }
    try {
      const txt = await resumirCaso(itens);
      if (txt && ligado()) { await redis('SET', chaveC, txt); await redis('EXPIRE', chaveC, 30 * 86400); }
      return res.status(200).json({ ok:true, resumo: txt });
    } catch (e) {
      return res.status(200).json({ ok:false, msg: String(e.message).slice(0,80) });
    }
  }

  if (!id || titulo.length < 12) return res.status(200).json({ ok:false, msg:'matéria não informada' });

  // Guardado por materia: o primeiro leitor paga a busca, os outros nao.
  const chave = 'ctx:' + id;
  if (ligado()) {
    const cru = await redis('GET', chave);
    if (cru) {
      try {
        const j = JSON.parse(cru);
        return res.status(200).json({ ok:true, ...j, guardado:true });
      } catch {}
    }
  }

  try {
    const r = await gerar(titulo, resumo);

    // Guardamos tambem o "nao precisa": evita pagar a busca de novo para
    // descobrir a mesma coisa.
    if (ligado()) {
      await redis('SET', chave, JSON.stringify(r));
      await redis('EXPIRE', chave, 60 * 86400);
    }
    return res.status(200).json({ ok:true, ...r });
  } catch (e) {
    return res.status(200).json({ ok:false, msg: String(e.message).slice(0, 80) });
  }
}
