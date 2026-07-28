// CATÁLOGO DE FONTES — a memória que faltava.
//
// Até agora o conhecimento sobre cada fonte vivia em três lugares soltos: a
// lista que escrevi à mão, os logs do diagnóstico e o relatório do espião.
// Nada disso o robô consultava. Resultado: toda rodada ele redescobria as
// mesmas coisas e batia em porta que já sabíamos estar fechada.
//
// Este arquivo é o registro. Para cada fonte guarda o que funciona, como
// funciona, desde quando, e há quanto tempo está fora.

import { writeFile, readFile, mkdir } from 'node:fs/promises';

export const CAMINHO = 'dados/catalogo.json';

export const ESTADO_FONTE = {
  ATIVA:      'ativa',       // respondeu na última visita
  INSTAVEL:   'instavel',    // falha às vezes
  FORA:       'fora',        // não responde há dias
  BLOQUEADA:  'bloqueada',   // recusa robô de propósito
  QUARENTENA: 'quarentena'   // descoberta nova, aguardando aprovação
};

export const METODO = {
  RSS:     'rss',        // feed pronto, o melhor caso
  PAGINA:  'pagina',     // lista de notícias em HTML
  SITEMAP: 'sitemap',    // mapa do site em XML
  GOOGLE:  'google'      // só pelo índice do Google (site bloqueia robô)
};

export async function ler(){
  try {
    return JSON.parse(await readFile(CAMINHO, 'utf8'));
  } catch {
    return { criado: new Date().toISOString(), atualizado: null, fontes: {} };
  }
}

export async function gravar(cat){
  cat.atualizado = new Date().toISOString();
  cat.total = Object.keys(cat.fontes).length;
  await mkdir('dados', { recursive: true });
  await writeFile(CAMINHO, JSON.stringify(cat, null, 2), 'utf8');
}

const hoje = () => new Date().toISOString().slice(0, 10);
const diasEntre = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// Registra o resultado de uma visita. É aqui que a memória se forma.
export function anotar(cat, chave, visita){
  const antes = cat.fontes[chave] || {
    primeiroVisto: hoje(),
    historico: [],
    estado: ESTADO_FONTE.QUARENTENA,
    aprovada: false
  };

  const f = { ...antes, ...visita, chave };

  // histórico curto: 30 dias bastam para ver tendência
  f.historico = [...(antes.historico || []), { dia: hoje(), ok: !!visita.ok, itens: visita.itens || 0 }]
    .filter((h, i, arr) => arr.findIndex(x => x.dia === h.dia) === i)
    .slice(-30);

  if (visita.ok) {
    f.ultimoVivo = hoje();
    f.diasFora = 0;
  } else {
    f.diasFora = f.ultimoVivo ? diasEntre(f.ultimoVivo, hoje()) : (antes.diasFora || 0) + 1;
  }

  // média de itens nos dias em que respondeu
  const bons = f.historico.filter(h => h.ok);
  f.mediaItens = bons.length ? Math.round(bons.reduce((s, h) => s + h.itens, 0) / bons.length) : 0;
  f.confiabilidade = f.historico.length
    ? Math.round(100 * bons.length / f.historico.length) : (visita.ok ? 100 : 0);

  // estado: bloqueada é decisão declarada; o resto sai do comportamento
  if (visita.bloqueada) f.estado = ESTADO_FONTE.BLOQUEADA;
  else if (!f.aprovada)  f.estado = ESTADO_FONTE.QUARENTENA;
  else if (f.diasFora >= 3) f.estado = ESTADO_FONTE.FORA;
  else if (f.confiabilidade < 70) f.estado = ESTADO_FONTE.INSTAVEL;
  else f.estado = ESTADO_FONTE.ATIVA;

  f.nota = calcularNota(f);
  cat.fontes[chave] = f;
  return f;
}

// Nota de 0 a 100. Serve para ordenar o painel e decidir o que vale manter.
export function calcularNota(f){
  let n = 0;
  n += Math.min(40, (f.confiabilidade || 0) * 0.4);          // responde sempre?
  n += Math.min(25, (f.mediaItens || 0) * 2);                // traz volume?
  if (f.licenca === 'livre') n += 20;                        // dá para publicar o texto?
  if (f.metodo === METODO.RSS) n += 10;                      // fácil de ler?
  else if (f.metodo === METODO.SITEMAP) n += 6;
  else if (f.metodo === METODO.PAGINA) n += 4;
  if ((f.diasFora || 0) > 0) n -= Math.min(20, f.diasFora * 4);
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Agrupa para o painel: por estado, por tipo, por método, por licença.
export function agrupar(cat){
  const fontes = Object.values(cat.fontes || {});
  const por = campo => fontes.reduce((a, f) => {
    const k = f[campo] || 'indefinido';
    (a[k] = a[k] || []).push(f);
    return a;
  }, {});

  return {
    total: fontes.length,
    porEstado:  por('estado'),
    porTipo:    por('tipo'),
    porMetodo:  por('metodo'),
    porLicenca: por('licenca'),
    porUf:      por('uf'),
    // as que precisam de atenção, em ordem de urgência
    atencao: fontes
      .filter(f => f.estado === ESTADO_FONTE.FORA || f.estado === ESTADO_FONTE.INSTAVEL)
      .sort((a,b) => (b.nota||0) - (a.nota||0)),
    // descobertas aguardando aprovação, melhores primeiro
    quarentena: fontes
      .filter(f => f.estado === ESTADO_FONTE.QUARENTENA)
      .sort((a,b) => (b.nota||0) - (a.nota||0)),
    // o que mudou desde ontem
    mudancas: fontes.filter(f => {
      const h = f.historico || [];
      if (h.length < 2) return false;
      return h[h.length-1].ok !== h[h.length-2].ok;
    })
  };
}
