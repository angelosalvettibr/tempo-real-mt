// MUNICÍPIOS — a edição de bairro
//
// Jornal de praça se ganha na rua, não no país. Quem mora em Várzea Grande
// quer saber do DAE, da Câmara de lá e do Marechal Rondon — não do Congresso.
//
// Este módulo etiqueta cada matéria com o município a que ela pertence, para
// a capa poder abrir uma aba de Cuiabá e outra de Várzea Grande sem precisar
// de um robô separado para cada cidade.
//
// Regra de ouro dos marcadores: só entra termo que NÃO existe em outro lugar
// do Brasil. "Centro" e "Aeroporto" não servem. "Coxipó" e "Cristo Rei" servem.

const semAcento = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export const MUNICIPIOS = {

  mt: [
    { id:'vg', nome:'Várzea Grande', destaque:true,
      // VG vem antes de Cuiabá de propósito: matéria de VG quase sempre cita
      // a capital de passagem ("região metropolitana de Cuiabá"), e o
      // contrário é raro. Quem tem marcador próprio leva.
      marcadores:/(varzea grande|varzeagrande|varzea-grande|marechal rondon|cristo rei|marajoara|dae-vg|dae vg|dom osorio|ponte nova|varzea-grandense|varzeagrandense)/ },

    { id:'cuiaba', nome:'Cuiabá', destaque:true,
      marcadores:/(cuiaba|cuiabano|cuiabana|coxipo|coxipo do ouro|verdao|morada da serra|cpa i|cpa ii|cpa iii|cpa iv|jardim leblon|porto cuiaba|arena pantanal|sanecap|semob|ufmt|centro politico administrativo|tijucal|pedra 90|planalto cuiaba|dom aquino|goiabeiras)/ },

    { id:'rondonopolis',  nome:'Rondonópolis',       marcadores:/(rondonopolis|rondonopolitano)/ },
    { id:'sinop',         nome:'Sinop', destaque:true, marcadores:/(\bsinop\b|sinopense)/ },
    { id:'sorriso',       nome:'Sorriso',            marcadores:/(\bsorriso\b(?!\s*(no rosto|largo)))/ },
    { id:'tangara',       nome:'Tangará da Serra',   marcadores:/(tangara da serra)/ },
    { id:'caceres',       nome:'Cáceres',            marcadores:/(\bcaceres\b)/ },
    { id:'barradogarcas', nome:'Barra do Garças',    marcadores:/(barra do garcas)/ },
    { id:'lucas',         nome:'Lucas do Rio Verde', marcadores:/(lucas do rio verde)/ },
    { id:'primavera',     nome:'Primavera do Leste', marcadores:/(primavera do leste)/ },
    { id:'altafloresta',  nome:'Alta Floresta',      marcadores:/(alta floresta)/ },
    { id:'novamutum',     nome:'Nova Mutum',         marcadores:/(nova mutum)/ }
  ],

  rs: [
    { id:'poa',      nome:'Porto Alegre',   destaque:true, marcadores:/(porto alegre|porto-alegrense|portoalegrense|gasometro|orla do guaiba|guaiba|moinhos de vento|cidade baixa|restinga|partenon)/ },
    { id:'caxias',   nome:'Caxias do Sul',  destaque:true, marcadores:/(caxias do sul|caxiense)/ },
    { id:'santoangelo', nome:'Santo Ângelo',
      // regiao das Missoes; o gentilico e o marcador mais seguro
      marcadores:/(santo angelo|santo-angelo|santoangelo|santo-angelense|santoangelense)/ },
    { id:'canoas',   nome:'Canoas',         marcadores:/(\bcanoas\b)/ },
    { id:'pelotas',  nome:'Pelotas',        marcadores:/(\bpelotas\b|pelotense)/ },
    { id:'santamaria',nome:'Santa Maria',   marcadores:/(santa maria)/ },
    { id:'gramado', nome:'Gramado',         marcadores:/(\bgramado\b(?!\s*(de|do)))/ },
    { id:'novohamburgo',nome:'Novo Hamburgo',marcadores:/(novo hamburgo)/ },
    { id:'passofundo',nome:'Passo Fundo',   marcadores:/(passo fundo)/ }
  ],

  rj: [
    { id:'rio',      nome:'Rio de Janeiro', destaque:true, marcadores:/(cidade do rio de janeiro|capital fluminense|copacabana|ipanema|leblon|barra da tijuca|tijuca|botafogo|flamengo|maracana|jacarepagua|campo grande rj|zona sul carioca|zona norte carioca|carioca|centro do rio|sao conrado|joa|rocinha|complexo do alemao|mare)/ },
    { id:'niteroi',  nome:'Niterói',        destaque:true, marcadores:/(niteroi|niteroiense|icarai|charitas|piratininga)/ },
    { id:'saogoncalo',nome:'São Gonçalo',   marcadores:/(sao goncalo)/ },
    { id:'duquedecaxias',nome:'Duque de Caxias',marcadores:/(duque de caxias)/ },
    { id:'novaiguacu',nome:'Nova Iguaçu',   marcadores:/(nova iguacu)/ },
    { id:'petropolis',nome:'Petrópolis',    marcadores:/(petropolis|petropolitano)/ },
    { id:'buzios',   nome:'Búzios', destaque:true, marcadores:/(\bbuzios\b|armacao dos buzios)/ },
    { id:'cabofrio', nome:'Cabo Frio',      marcadores:/(cabo frio)/ },
    { id:'voltaredonda',nome:'Volta Redonda',marcadores:/(volta redonda)/ }
  ]
};

/**
 * Qual município esta matéria é. Conta quantas vezes cada marcador aparece e
 * fica com o mais citado — matéria de Várzea Grande costuma citar Cuiabá de
 * passagem, e sem a contagem ela acabava etiquetada como da capital.
 *
 * @returns {{id:string, nome:string}|null}
 */
export function detectarMunicipio(texto, uf){
  const lista = MUNICIPIOS[uf];
  if (!lista || !texto) return null;
  const t = semAcento(texto);

  let melhor = null;
  for (const m of lista) {
    const re = new RegExp(m.marcadores.source, 'gi');
    const n = (t.match(re) || []).length;
    if (!n) continue;
    // empate: quem vem primeiro na lista ganha (VG antes de Cuiabá)
    if (!melhor || n > melhor.n) melhor = { id:m.id, nome:m.nome, n };
  }
  return melhor ? { id: melhor.id, nome: melhor.nome } : null;
}

// As que ganham aba própria na capa.
export function destaques(uf){
  return (MUNICIPIOS[uf] || []).filter(m => m.destaque).map(m => ({ id:m.id, nome:m.nome }));
}


/* ==================== FORA DA PRAÇA ======================================
   Toda materia publicada numa edicao estadual herdava a UF da edicao, sem
   olhar o conteudo. Bastava um feed do Rio Grande do Sul republicar noticia
   de Aracaju para o Meridiano etiquetar Sergipe como RS — e "Fachin afirma
   que criticas nao fragilizam o STF" saiu como Mato Grosso.

   Etiqueta errada e grave num jornal que se vende por procedencia: quem le
   de Sergipe ve na hora que a maquina nao sabe do que esta falando.

   A checagem e simples: se o texto cita outro estado ou outra capital, e nao
   cita a praca da edicao, entao nao e materia daquela praca.              */

const OUTRAS_PRACAS = {
  ac:['acre','rio branco'], al:['alagoas','maceió'], am:['amazonas','manaus'],
  ap:['amapá','macapá'], ba:['bahia','salvador'], ce:['ceará','fortaleza'],
  df:['distrito federal','brasília'], es:['espírito santo','vitória'],
  go:['goiás','goiânia'], ma:['maranhão','são luís'], mg:['minas gerais','belo horizonte'],
  ms:['mato grosso do sul','campo grande'], mt:['mato grosso','cuiabá','várzea grande','sinop','rondonópolis'],
  pa:['pará','belém'], pb:['paraíba','joão pessoa'], pe:['pernambuco','recife'],
  pi:['piauí','teresina'], pr:['paraná','curitiba'], rj:['rio de janeiro','niterói','petrópolis','búzios','volta redonda','nova iguaçu'],
  rn:['rio grande do norte','natal'], ro:['rondônia','porto velho'], rr:['roraima','boa vista'],
  rs:['rio grande do sul','porto alegre','caxias do sul','pelotas','santa maria','canoas'],
  sc:['santa catarina','florianópolis'], se:['sergipe','aracaju'],
  sp:['são paulo','campinas','santos'], to:['tocantins','palmas']
};

const sem = t => String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

/**
 * O texto e de outra praca que nao a da edicao?
 * @returns {string|null} sigla da praca citada, ou null
 */
export function foraDaPraca(texto, uf){
  const t = sem(texto);
  const meu = (OUTRAS_PRACAS[uf] || []).map(sem);

  // Cita a propria praca? Entao e daqui, mesmo que cite outras de passagem.
  if (meu.some(x => t.includes(x))) return null;

  for (const [sigla, nomes] of Object.entries(OUTRAS_PRACAS)) {
    if (sigla === uf) continue;
    for (const n of nomes.map(sem)) {
      // "rio de janeiro" dentro de "rio grande do sul" nao vale: exigimos
      // que o nome esteja delimitado.
      const re = new RegExp('(^|[^a-z])' + n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '($|[^a-z])');
      if (re.test(t)) return sigla;
    }
  }
  return null;
}

// Assunto nacional que nao pertence a praca nenhuma: STF, Congresso, governo
// federal. Publicado numa edicao estadual, deveria estar em Brasil.
const NACIONAL = /(\bstf\b|supremo tribunal|\bstj\b|\btse\b|\btst\b|congresso nacional|c[âa]mara dos deputados|senado federal|planalto|minist[ée]rio da|governo federal|banco central|receita federal|\bpec\b|medida provis[óo]ria)/i;

export const ehNacional = texto => NACIONAL.test(String(texto||''));
