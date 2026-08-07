// ASSINANTE — edição própria, produzida para ele
//
// O Meridiano publico decide o que publicar pelo criterio dele: existe
// documento, o assunto interessa a quem le aquela praca. O leitor filtra o
// que ja existe.
//
// Isso nao serve a quem paga. A NORA abriu a conta, escreveu uma descricao
// impecavel sobre concessoes e agencias reguladoras — e a pagina veio quase
// vazia, porque o jornal nao tinha produzido nada daquilo. Filtrar o vazio
// devolve vazio.
//
// Aqui a logica inverte: a DESCRICAO DO ASSINANTE define a pauta. O robo le o
// que ele quer acompanhar, escolhe as fontes que servem aquele perfil, e
// produz materia mesmo que ela nao entre na edicao publica. Decisao da Antaq
// interessa a NORA todo dia; ao leitor de Cuiaba, nunca.
//
// DUAS CONSEQUENCIAS QUE PRECISAM ESTAR CLARAS:
//
//   1. O CUSTO PASSA A SER POR ASSINANTE. Cada um adiciona uma rodada. Isso
//      entra no preco, nao no prejuizo.
//
//   2. SAO DOIS PRODUTOS. A edicao publica tem criterio editorial; a conta
//      privada tem criterio do cliente. Bom para o negocio, desde que
//      ninguem confunda os dois.
//
// O que NAO muda: procedencia. Materia de assinante segue a mesma regra —
// documento oficial, selo de evidencia, licenca respeitada. Quem paga nao
// compra o direito de afrouxar o metodo; compra a atencao dirigida.

import { writeFile, mkdir } from 'node:fs/promises';

/* ---------------------------------------------------------- FONTES ------ */
// Que fontes servem a que perfil. Nao e exaustivo — e um mapa de partida, e o
// agente escolhe dentro dele lendo a descricao do assinante.
export const TRILHAS = {
  infraestrutura: {
    nome: 'Infraestrutura e regulação',
    casa: /(infraestrutura|concess|rodovi|ferrovi|porto|aeroporto|leil[ãa]o|regula|ag[êe]ncia|saneamento|energia|transporte|log[íi]stica|PPP|parceria|edital|contrato)/i,
    fontes: ['antt','antaq','anac','aneel','anatel','ana','anm','anp','dnit','infrasa',
             'ontl','bndes','ppi','portos','minas','epe','pncp','in-dou','cade','ons',
             'ccee','cidades','integra','tcu','camara-inf','senado-inf','ipea-inf']
  },
  justica: {
    nome: 'Justiça e controle',
    casa: /(judici|tribunal|processo|decis[ãa]o|senten|inqu[ée]rito|opera[çc][ãa]o|minist[ée]rio p[úu]blico|controle|fiscaliza)/i,
    fontes: ['stf','stj-inf','tst','tse','cnj','mpf','cnmp','tcu','cgu','pf','agu','dpu']
  },
  economia: {
    nome: 'Economia e mercado',
    casa: /(economia|infla[çc][ãa]o|juros|c[âa]mbio|PIB|mercado|fiscal|or[çc]amento|tribut|imposto|banco central)/i,
    fontes: ['bc','fazenda','ipea-inf','ipeadata','ibge','cvm','mdic','bndes']
  },
  europa: {
    nome: 'Brasil e Europa',
    casa: /(europ|mercosul|uni[ãa]o europeia|acordo|com[ée]rcio exterior|diplomac|embaixad|internacional)/i,
    fontes: ['ec-noticias','eeas-pt','itamaraty','irini-news','mdic']
  }
};

/* Que trilhas servem a esta descricao. Simples de proposito: o corte fino
   quem faz e o agente, na hora de escolher entre as materias. */
export function trilhasDe(perfil){
  const t = String(perfil || '');
  const achadas = Object.entries(TRILHAS).filter(([, v]) => v.casa.test(t));
  return achadas.length ? achadas : [['infraestrutura', TRILHAS.infraestrutura]];
}

/* ------------------------------------------------- EDIÇÃO DO ASSINANTE -- */

/**
 * Monta a edicao de um assinante a partir do que foi colhido na rodada.
 *
 * @param {object} a        { apelido, perfil }
 * @param {array}  colhido  itens de fonte livre desta rodada
 * @param {func}   escrever funcao que transforma um item em materia
 */
export async function edicaoDe(a, colhido, escrever, opcoes = {}){
  const { teto = 12, log = () => {} } = opcoes;
  const perfil = String(a.perfil || '').trim();
  if (perfil.length < 30) return { itens: [], motivo: 'sem descrição' };

  const trilhas = trilhasDe(perfil);
  const idsFonte = new Set(trilhas.flatMap(([, v]) => v.fontes));

  log(`     trilhas: ${trilhas.map(([, v]) => v.nome).join(' · ')}`);

  // Primeiro corte, barato: so o que veio das fontes daquele perfil.
  const daTrilha = colhido.filter(i => idsFonte.has(i.id) || idsFonte.has(i.fonteId));

  // Se as fontes da trilha nao entregaram, vale olhar o resto da rodada — o
  // assunto pode ter aparecido por outro caminho. Melhor que devolver vazio.
  const base = daTrilha.length >= 4 ? daTrilha : colhido;

  log(`     ${daTrilha.length} itens das fontes do perfil, de ${colhido.length} colhidos`);

  const feitas = [];
  for (const i of base.slice(0, teto * 2)) {
    if (feitas.length >= teto) break;
    try {
      const m = await escrever(i);
      if (m) feitas.push(m);
    } catch { }
  }
  return { itens: feitas, trilhas: trilhas.map(([k]) => k) };
}

/** Grava a edicao do assinante onde a pagina dele vai buscar. */
export async function gravar(apelido, dados){
  const limpo = String(apelido).replace(/[^a-z0-9_-]/gi, '').slice(0, 24).toLowerCase();
  if (!limpo) return;
  await mkdir('dados/assinantes', { recursive: true });
  await writeFile(`dados/assinantes/${limpo}.json`, JSON.stringify({
    apelido: limpo,
    gerado: new Date().toISOString(),
    ...dados
  }, null, 1), 'utf8');
}
