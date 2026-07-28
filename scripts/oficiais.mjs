// ONDE O DOCUMENTO MORA
//
// A nota "sem confirmação" nasce quando a história corre na imprensa e o robô
// não achou registro oficial. Na maioria das vezes o registro EXISTE — só não
// estava em nenhuma das fontes que a gente lia.
//
// Este módulo é o mapa: para cada assunto, qual órgão guarda o papel.
// Prisão está na Polícia Judiciária Civil. Temporal está na Defesa Civil.
// Propina está no Ministério Público. Obra está no Tribunal de Contas.
//
// Não é lista de veículo. É lista de cartório: quem tem obrigação legal de
// registrar o ato e publicar o release. Reproduzir isso é legítimo — é
// dinheiro público pagando para divulgar — e o crédito vai sempre ao órgão.
//
// ATENÇÃO: endereços novos entram aqui como CANDIDATOS. Rode o Diagnostico
// antes de confiar: Actions → Diagnostico → Run workflow. O que voltar
// vermelho a gente corta ou corrige.

// Assuntos que cada tipo de órgão costuma registrar. Serve para o caçador
// escolher onde procurar primeiro em vez de varrer tudo.
export const TEMAS = {
  policia:   /(pres[oa]|pris[ãa]o|prend|apreens|apreend|roub|furt|homic|assassin|traf|drog|opera[çc][ãa]o policial|foragid|mandado|delegacia|investiga[çc])/i,
  ministerio:/(propina|corrup[çc]|desvi|improbidade|fraude|licita[çc][ãa]o|superfatur|denunci|gaeco|for[çc]a-tarefa|inqu[ée]rito civil|a[çc][ãa]o civil)/i,
  justica:   /(condenad|senten[çc]|liminar|habeas|julgament|recurso|decis[ãa]o judicial|juiz|desembargador|tribunal|proces)/i,
  contas:    /(tribunal de contas|tce|auditoria|presta[çc][ãa]o de contas|irregularidade|obra parad|contrato)/i,
  defesa:    /(chuva|temporal|tempestade|alagament|enchente|inunda[çc]|desliz|vendaval|destelhament|granizo|seca|incendi|queimad|alerta)/i,
  saude:     /(surto|epidemi|dengue|vacina|hospital|upa|leito|sa[úu]de|contamina|caso[s]? de)/i,
  educacao:  /(escola|aluno|professor|matr[íi]cula|enem|universidade|creche|merenda)/i,
  obras:     /(obra|ponte|rodovia|asfalt|pavimenta|viaduto|saneament|licen[çc]a ambiental)/i,
  ambiente:  /(desmatament|queimada|ibama|licenciament|ambiental|pantanal|amaz[ôo]nia|rio |nascente)/i,
  agro:      /(safra|colheita|soja|milho|algod[ãa]o|boi|rebanho|gado|plantio|produtividade)/i
};

// { id, nome, url (página de notícias), base (raiz do site), temas: [] }
export const OFICIAIS = {

  mt: [
    { id:'pjc-mt',    nome:'Polícia Judiciária Civil de MT', url:'https://www.pjc.mt.gov.br/noticias',        base:'https://www.pjc.mt.gov.br',        temas:['policia'] },
    { id:'sesp-mt',   nome:'Sesp-MT',                        url:'https://www.seguranca.mt.gov.br/noticias', base:'https://www.seguranca.mt.gov.br',  temas:['policia'] },
    { id:'pm-mt',     nome:'Polícia Militar de MT',          url:'https://www.pm.mt.gov.br/noticias',        base:'https://www.pm.mt.gov.br',         temas:['policia'] },
    { id:'bombeiros-mt', nome:'Corpo de Bombeiros de MT',    url:'https://www.bombeiros.mt.gov.br/noticias', base:'https://www.bombeiros.mt.gov.br',  temas:['defesa','policia'] },
    { id:'defesacivil-mt', nome:'Defesa Civil de MT',        url:'https://www.defesacivil.mt.gov.br/noticias', base:'https://www.defesacivil.mt.gov.br', temas:['defesa'] },
    { id:'mpmt',      nome:'MPMT',                           url:'https://www.mpmt.mp.br/noticias',          base:'https://www.mpmt.mp.br',           temas:['ministerio','justica'] },
    { id:'tjmt',      nome:'TJMT',                           url:'https://www.tjmt.jus.br/noticias',         base:'https://www.tjmt.jus.br',          temas:['justica'] },
    { id:'tce-mt',    nome:'TCE-MT',                         url:'https://www.tce.mt.gov.br/noticias',       base:'https://www.tce.mt.gov.br',        temas:['contas','obras'] },
    { id:'ses-mt',    nome:'Secretaria de Saúde de MT',      url:'https://www.saude.mt.gov.br/noticias',     base:'https://www.saude.mt.gov.br',      temas:['saude'] },
    { id:'seduc-mt',  nome:'Seduc-MT',                       url:'https://www.seduc.mt.gov.br/noticias',     base:'https://www.seduc.mt.gov.br',      temas:['educacao'] },
    { id:'sinfra-mt', nome:'Sinfra-MT',                      url:'https://www.sinfra.mt.gov.br/noticias',    base:'https://www.sinfra.mt.gov.br',     temas:['obras'] },
    { id:'sema-mt',   nome:'Sema-MT',                        url:'https://www.sema.mt.gov.br/noticias',      base:'https://www.sema.mt.gov.br',       temas:['ambiente'] },
    { id:'indea-mt',  nome:'Indea-MT',                       url:'https://www.indea.mt.gov.br/noticias',     base:'https://www.indea.mt.gov.br',      temas:['agro'] },
    { id:'gov-mt',    nome:'Governo de MT',                  url:'https://www.mt.gov.br/noticias',           base:'https://www.mt.gov.br',            temas:[] },
    { id:'almt',      nome:'Assembleia de MT',               url:'https://www.al.mt.gov.br/noticias',        base:'https://www.al.mt.gov.br',         temas:[] },
    { id:'cuiaba',    nome:'Prefeitura de Cuiabá',           url:'https://www.cuiaba.mt.gov.br/noticias',    base:'https://www.cuiaba.mt.gov.br',     temas:[] },
    { id:'vg',        nome:'Prefeitura de Várzea Grande',    url:'https://www.varzeagrande.mt.gov.br/noticias', base:'https://www.varzeagrande.mt.gov.br', temas:[] },
    { id:'sinop',     nome:'Prefeitura de Sinop',            url:'https://www.sinop.mt.gov.br/noticias',     base:'https://www.sinop.mt.gov.br',      temas:[] },
    { id:'camara-sinop', nome:'Câmara de Sinop',             url:'https://www.camarasinop.mt.gov.br/noticias', base:'https://www.camarasinop.mt.gov.br', temas:[] },
    { id:'rondonopolis', nome:'Prefeitura de Rondonópolis',  url:'https://www.rondonopolis.mt.gov.br/noticias', base:'https://www.rondonopolis.mt.gov.br', temas:[] },
    { id:'sorriso',   nome:'Prefeitura de Sorriso',          url:'https://www.sorriso.mt.gov.br/noticias',   base:'https://www.sorriso.mt.gov.br',    temas:[] },
    // --- hiperlocal: Cuiaba e Varzea Grande ---
    { id:'camara-cba', nome:'Câmara de Cuiabá',              url:'https://www.camaracuiaba.mt.gov.br/noticias', base:'https://www.camaracuiaba.mt.gov.br', temas:[] },
    { id:'camara-vg',  nome:'Câmara de Várzea Grande',       url:'https://www.camaravg.mt.gov.br/noticias',  base:'https://www.camaravg.mt.gov.br',   temas:[] },
    { id:'sanecap',    nome:'Sanecap',                       url:'https://www.sanecap.com.br/noticias',      base:'https://www.sanecap.com.br',       temas:['obras'] },
    { id:'dae-vg',     nome:'DAE Várzea Grande',             url:'https://www.daevg.com.br/noticias',        base:'https://www.daevg.com.br',         temas:['obras'] },
    { id:'defesacivil-cba', nome:'Defesa Civil de Cuiabá',   url:'https://www.cuiaba.mt.gov.br/defesacivil/noticias', base:'https://www.cuiaba.mt.gov.br', temas:['defesa'] }
  ],

  rs: [
    { id:'pc-rs',     nome:'Polícia Civil do RS',            url:'https://www.pc.rs.gov.br/noticias',        base:'https://www.pc.rs.gov.br',         temas:['policia'] },
    { id:'ssp-rs',    nome:'Secretaria de Segurança do RS',  url:'https://www.ssp.rs.gov.br/noticias',       base:'https://www.ssp.rs.gov.br',        temas:['policia'] },
    { id:'bombeiros-rs', nome:'Corpo de Bombeiros do RS',    url:'https://www.cbm.rs.gov.br/noticias',       base:'https://www.cbm.rs.gov.br',        temas:['defesa','policia'] },
    { id:'defesacivil-rs', nome:'Defesa Civil do RS',        url:'https://www.defesacivil.rs.gov.br/noticias', base:'https://www.defesacivil.rs.gov.br', temas:['defesa'] },
    { id:'mprs',      nome:'MPRS',                           url:'https://www.mprs.mp.br/noticias',          base:'https://www.mprs.mp.br',           temas:['ministerio','justica'] },
    { id:'tjrs',      nome:'TJRS',                           url:'https://www.tjrs.jus.br/novo/noticias',    base:'https://www.tjrs.jus.br',          temas:['justica'] },
    { id:'tce-rs',    nome:'TCE-RS',                         url:'https://portal.tce.rs.gov.br/portal/page/portal/tcers/administracao/gerenciador_de_conteudo/noticias', base:'https://portal.tce.rs.gov.br', temas:['contas','obras'] },
    { id:'saude-rs',  nome:'Secretaria de Saúde do RS',      url:'https://saude.rs.gov.br/noticias',         base:'https://saude.rs.gov.br',          temas:['saude'] },
    { id:'educacao-rs', nome:'Secretaria de Educação do RS', url:'https://educacao.rs.gov.br/noticias',      base:'https://educacao.rs.gov.br',       temas:['educacao'] },
    { id:'sema-rs',   nome:'Sema-RS',                        url:'https://sema.rs.gov.br/noticias',          base:'https://sema.rs.gov.br',           temas:['ambiente'] },
    { id:'gov-rs',    nome:'Governo do RS',                  url:'https://estado.rs.gov.br/noticias',        base:'https://estado.rs.gov.br',         temas:[] },
    { id:'al-rs',     nome:'Assembleia do RS',               url:'https://www.al.rs.gov.br/agenciadenoticias', base:'https://www.al.rs.gov.br',       temas:[] },
    { id:'poa',       nome:'Prefeitura de Porto Alegre',     url:'https://prefeitura.poa.br/noticias',       base:'https://prefeitura.poa.br',        temas:[] },
    { id:'caxias',    nome:'Prefeitura de Caxias do Sul',    url:'https://caxias.rs.gov.br/noticias',        base:'https://caxias.rs.gov.br',         temas:[] },
    { id:'camara-caxias', nome:'Câmara de Caxias do Sul', url:'https://www.camaracaxias.rs.gov.br/noticias', base:'https://www.camaracaxias.rs.gov.br', temas:[] },
    { id:'santoangelo', nome:'Prefeitura de Santo Ângelo',   url:'https://www.santoangelo.rs.gov.br/noticias', base:'https://www.santoangelo.rs.gov.br', temas:[] },
    { id:'camara-santoangelo', nome:'Câmara de Santo Ângelo', url:'https://www.camarasantoangelo.rs.gov.br/noticias', base:'https://www.camarasantoangelo.rs.gov.br', temas:[] }
  ],

  rj: [
    { id:'pc-rj',     nome:'Polícia Civil do RJ',            url:'https://www.policiacivilrj.net.br/noticias', base:'https://www.policiacivilrj.net.br', temas:['policia'] },
    { id:'seguranca-rj', nome:'Secretaria de Segurança do RJ', url:'https://www.rj.gov.br/segurança/noticias', base:'https://www.rj.gov.br',           temas:['policia'] },
    { id:'bombeiros-rj', nome:'Corpo de Bombeiros do RJ',    url:'https://www.cbmerj.rj.gov.br/noticias',    base:'https://www.cbmerj.rj.gov.br',     temas:['defesa','policia'] },
    { id:'mprj',      nome:'MPRJ',                           url:'https://www.mprj.mp.br/comunicacao/noticias', base:'https://www.mprj.mp.br',        temas:['ministerio','justica'] },
    { id:'tjrj',      nome:'TJRJ',                           url:'https://www.tjrj.jus.br/noticias',         base:'https://www.tjrj.jus.br',          temas:['justica'] },
    { id:'tce-rj',    nome:'TCE-RJ',                         url:'https://www.tcerj.tc.br/portalnovo/noticias', base:'https://www.tcerj.tc.br',       temas:['contas','obras'] },
    { id:'saude-rj',  nome:'Secretaria de Saúde do RJ',      url:'https://www.saude.rj.gov.br/noticias',     base:'https://www.saude.rj.gov.br',      temas:['saude'] },
    { id:'inea-rj',   nome:'Inea-RJ',                        url:'https://www.inea.rj.gov.br/noticias',      base:'https://www.inea.rj.gov.br',       temas:['ambiente'] },
    { id:'gov-rj',    nome:'Governo do RJ',                  url:'https://www.rj.gov.br/noticias',           base:'https://www.rj.gov.br',            temas:[] },
    { id:'alerj',     nome:'Alerj',                          url:'https://www.alerj.rj.gov.br/Visualizar/Noticias', base:'https://www.alerj.rj.gov.br', temas:[] },
    { id:'rio',       nome:'Prefeitura do Rio',              url:'https://prefeitura.rio/noticias',          base:'https://prefeitura.rio',           temas:[] },
    { id:'defesacivil-rio', nome:'Defesa Civil do Rio',      url:'https://www.rio.rj.gov.br/web/defesacivil/noticias', base:'https://www.rio.rj.gov.br', temas:['defesa'] },
    { id:'niteroi',   nome:'Prefeitura de Niterói',          url:'https://www.niteroi.rj.gov.br/noticias',   base:'https://www.niteroi.rj.gov.br',    temas:[] },
    { id:'buzios',    nome:'Prefeitura de Búzios',           url:'https://www.buzios.rj.gov.br/noticias',    base:'https://www.buzios.rj.gov.br',     temas:[] },
    { id:'camara-buzios', nome:'Câmara de Búzios',           url:'https://www.cmab.rj.gov.br/noticias',      base:'https://www.cmab.rj.gov.br',       temas:[] }
  ],

  // Vale para qualquer edição: o caso pode ser estadual, mas o registro
  // federal existe (PF, MPF, ANS, Anvisa, Ibama...).
  federal: [
    { id:'pf',        nome:'Polícia Federal',                url:'https://www.gov.br/pf/pt-br/assuntos/noticias', base:'https://www.gov.br/pf',        temas:['policia','ministerio'] },
    { id:'prf',       nome:'Polícia Rodoviária Federal',     url:'https://www.gov.br/prf/pt-br/noticias',    base:'https://www.gov.br/prf',           temas:['policia'] },
    { id:'mpf',       nome:'MPF',                            url:'https://www.mpf.mp.br/pgr/noticias-pgr',   base:'https://www.mpf.mp.br',            temas:['ministerio','justica'] },
    { id:'cgu',       nome:'CGU',                            url:'https://www.gov.br/cgu/pt-br/assuntos/noticias', base:'https://www.gov.br/cgu',     temas:['ministerio','contas'] },
    { id:'tcu',       nome:'TCU',                            url:'https://portal.tcu.gov.br/imprensa/noticias', base:'https://portal.tcu.gov.br',     temas:['contas','obras'] },
    { id:'ibama',     nome:'Ibama',                          url:'https://www.gov.br/ibama/pt-br/assuntos/noticias', base:'https://www.gov.br/ibama',  temas:['ambiente'] },
    { id:'icmbio',    nome:'ICMBio',                         url:'https://www.gov.br/icmbio/pt-br/assuntos/noticias', base:'https://www.gov.br/icmbio', temas:['ambiente'] },
    { id:'inpe',      nome:'Inpe',                           url:'https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias', base:'https://www.gov.br/inpe', temas:['ambiente','defesa'] },
    { id:'anvisa',    nome:'Anvisa',                         url:'https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa', base:'https://www.gov.br/anvisa', temas:['saude'] },
    { id:'fiocruz',   nome:'Fiocruz',                        url:'https://portal.fiocruz.br/noticias',       base:'https://portal.fiocruz.br',        temas:['saude'] },
    { id:'ans',       nome:'ANS',                            url:'https://www.gov.br/ans/pt-br/assuntos/noticias', base:'https://www.gov.br/ans',      temas:['saude'] },
    { id:'inss',      nome:'INSS',                           url:'https://www.gov.br/inss/pt-br/noticias',   base:'https://www.gov.br/inss',          temas:[] },
    { id:'mec',       nome:'Ministério da Educação',         url:'https://www.gov.br/mec/pt-br/assuntos/noticias', base:'https://www.gov.br/mec',      temas:['educacao'] },
    { id:'dnit',      nome:'Dnit',                           url:'https://www.gov.br/dnit/pt-br/assuntos/noticias', base:'https://www.gov.br/dnit',     temas:['obras'] },
    { id:'antt',      nome:'ANTT',                           url:'https://www.gov.br/antt/pt-br/assuntos/noticias', base:'https://www.gov.br/antt',     temas:['obras'] },
    { id:'funai',     nome:'Funai',                          url:'https://www.gov.br/funai/pt-br/assuntos/noticias', base:'https://www.gov.br/funai',   temas:['ambiente'] },
    { id:'ipea',      nome:'Ipea',                           url:'https://www.ipea.gov.br/portal/imprensa',  base:'https://www.ipea.gov.br',          temas:[] },
    { id:'mte',       nome:'Ministério do Trabalho',         url:'https://www.gov.br/trabalho-e-emprego/pt-br/noticias-e-conteudo', base:'https://www.gov.br/trabalho-e-emprego', temas:[] }
  ]
};

// Dado um título, quais temas ele toca. Sem tema reconhecido, devolve vazio —
// e aí o caçador varre os órgãos gerais do estado.
export function temasDoTexto(texto){
  const t = String(texto || '');
  return Object.keys(TEMAS).filter(k => TEMAS[k].test(t));
}

// A fila de onde procurar, na ordem certa: primeiro quem tem o tema, depois
// os gerais do estado, depois o federal.
export function ondeProcurar(titulo, uf){
  const temas = temasDoTexto(titulo);
  const doEstado = OFICIAIS[uf] || [];
  const casa = o => o.temas?.some(t => temas.includes(t));

  const fila = [
    ...doEstado.filter(casa),
    ...OFICIAIS.federal.filter(casa),
    ...doEstado.filter(o => !o.temas?.length),
    ...OFICIAIS.federal.filter(o => !o.temas?.length)
  ];

  // sem repetir
  const vistos = new Set();
  return fila.filter(o => !vistos.has(o.id) && vistos.add(o.id));
}
