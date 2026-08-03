// BANCO CENTRAL — o dado direto da fonte
//
// Toda segunda-feira sai o Boletim Focus, e dez veiculos publicam o mesmo
// numero lido do mesmo lugar. Nenhum deles e a fonte: a fonte e a API de
// dados abertos do Banco Central, publica, em JSON, sem chave e sem cadastro.
//
// A diferenca no produto e grande. Em vez de reescrever o que a Veja publicou
// sobre o boletim, o Meridiano le o dado e escreve a partir dele — com a
// mediana, o intervalo entre minimo e maximo, e a variacao em relacao a semana
// anterior. Coisas que a materia refritada nao traz, porque quem refrita nao
// tem a serie.
//
// E dado publico nao tem direito autoral: a Lei 9.610/98, art. 8, poe fora da
// protecao os dados em si. Aqui nao ha nem licenca a respeitar.
//
// A API responde em OData. Um exemplo de chamada:
//   /odata/ExpectativasMercadoAnuais?$filter=Indicador eq 'Selic'
//     and DataReferencia eq '2026'&$orderby=Data desc&$top=10&$format=json

const OLINDA = 'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata';

// Os indicadores que rendem materia toda semana. Cada um com o nome que o
// leitor entende e a unidade, para o texto sair certo sem o modelo adivinhar.
export const INDICADORES = [
  { id:'Selic',       nome:'taxa Selic',            unidade:'%',    editoria:'brasil' },
  { id:'IPCA',        nome:'inflação medida pelo IPCA', unidade:'%', editoria:'brasil' },
  { id:'PIB Total',   nome:'crescimento do PIB',    unidade:'%',    editoria:'brasil' },
  { id:'Câmbio',      nome:'taxa de câmbio',        unidade:'R$',   editoria:'brasil' },
  { id:'IGP-M',       nome:'IGP-M',                 unidade:'%',    editoria:'brasil' }
];

async function pegar(url, ms = 14000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal:c.signal, headers:{
      'Accept':'application/json',
      'User-Agent':'Mozilla/5.0 (compatible; Meridiano/1.0)',
      'X-Contact':'contato@meridiano.press'
    }});
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/**
 * Expectativas anuais para um indicador. Devolve a leitura mais recente e a da
 * semana anterior — e a comparacao entre as duas e que vira a noticia.
 */
export async function expectativa(indicador, ano){
  const filtro = encodeURIComponent(`Indicador eq '${indicador}' and DataReferencia eq '${ano}'`);
  const url = `${OLINDA}/ExpectativasMercadoAnuais?$filter=${filtro}`
            + `&$orderby=${encodeURIComponent('Data desc')}&$top=40&$format=json`;

  const j = await pegar(url);
  const v = (j && j.value) || [];
  if (!v.length) return null;

  const hoje = v[0];
  // A serie tem uma leitura por dia util. Para comparar com "a semana passada",
  // procuramos a primeira leitura com cinco dias ou mais de diferenca.
  const d0 = Date.parse(hoje.Data);
  const antes = v.find(x => (d0 - Date.parse(x.Data)) >= 5 * 86400000) || null;

  const dif = antes ? Number((hoje.Mediana - antes.Mediana).toFixed(4)) : null;

  return {
    indicador, ano,
    data: hoje.Data,
    mediana: hoje.Mediana,
    media: hoje.Media,
    minimo: hoje.Minimo,
    maximo: hoje.Maximo,
    respondentes: hoje.numeroRespondentes,
    anterior: antes ? { data: antes.Data, mediana: antes.Mediana } : null,
    variacao: dif,
    // Semanas seguidas na mesma direcao. E o dado que a materia refritada
    // costuma trazer errado ou nao trazer.
    seguidas: (() => {
      if (dif === null || dif === 0) return 0;
      const sinal = Math.sign(dif);
      let n = 0, ref = hoje.Mediana;
      for (const x of v.slice(1)) {
        const d = Number((ref - x.Mediana).toFixed(4));
        if (d === 0) continue;
        if (Math.sign(d) !== sinal) break;
        n++; ref = x.Mediana;
        if (n > 12) break;
      }
      return n;
    })()
  };
}

/** Retrato do Focus da semana: todos os indicadores, para o ano corrente. */
export async function focus(ano = new Date().getFullYear()){
  const saida = [];
  for (const ind of INDICADORES) {
    try {
      const e = await expectativa(ind.id, ano);
      if (e) saida.push({ ...ind, ...e });
    } catch { /* um indicador que falha nao derruba os outros */ }
    await new Promise(r => setTimeout(r, 350));
  }
  return saida;
}

// O texto que vai para o redator. Nao e a materia: e o material bruto, em
// portugues, para o modelo escrever a partir dele sem inventar numero.
export function comoTexto(e){
  const un = e.unidade === 'R$' ? '' : '%';
  const val = v => e.unidade === 'R$' ? `R$ ${Number(v).toFixed(2)}` : `${Number(v).toFixed(2)}%`;
  const dir = e.variacao === null ? null : e.variacao > 0 ? 'alta' : e.variacao < 0 ? 'queda' : 'estabilidade';

  const linhas = [
    `Indicador: ${e.nome} projetada para ${e.ano}.`,
    `Mediana das projeções: ${val(e.mediana)}.`,
    `Média: ${val(e.media)}. Intervalo entre ${val(e.minimo)} e ${val(e.maximo)}.`,
    `Número de instituições que responderam: ${e.respondentes}.`,
    `Data da apuração: ${String(e.data).split('-').reverse().join('/')}.`
  ];

  if (e.anterior) {
    linhas.push(`Na apuração anterior, de ${String(e.anterior.data).split('-').reverse().join('/')}, a mediana era ${val(e.anterior.mediana)}.`);
    if (dir === 'estabilidade') linhas.push('A projeção não mudou em relação à apuração anterior.');
    else linhas.push(`Houve ${dir} de ${Math.abs(e.variacao).toFixed(2)}${un} em relação à apuração anterior.`);
  }
  if (e.seguidas >= 2) {
    linhas.push(`Esta é a ${e.seguidas + 1}ª apuração consecutiva com movimento na mesma direção.`);
  }

  linhas.push('Fonte: Boletim Focus, pesquisa de expectativas de mercado do Banco Central do Brasil, divulgada no primeiro dia útil de cada semana.');
  return linhas.join(' ');
}

export const _interno = { OLINDA, pegar };
