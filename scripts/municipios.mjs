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
