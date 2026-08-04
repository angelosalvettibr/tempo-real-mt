
/* ================= ÓRGÃOS FEDERAIS COMO FONTE DE TEXTO ===================
   Vinte e oito orgaos federais ja estavam cadastrados — mas so no cacador,
   onde servem para CONFIRMAR uma historia que a imprensa deu. Nenhum podia
   gerar materia propria.

   Na pratica isso significava que a Policia Federal, que publica comunicado
   de operacao todo dia, nao rendia uma linha no Meridiano. E operacao da PF e
   metade da capa dos jornais.

   O motivo era historico: quando as fontes livres foram montadas, o foco era
   regional, e os federais entraram so no cacador. Aqui eles viram fonte de
   texto tambem — sao todos gov.br e jus.br, ja autorizados pelo filtro de
   licenca, e publicam diariamente.                                         */
// Fonte repetida na lista faz o robo ler o mesmo site duas vezes e contar
// errado no painel. A limpeza e feita uma vez, na saida.
export const semDuplicar = lista => {
  const vistos = new Set();
  return (lista || []).filter(f => {
    const k = String(f.id || f.url || '').toLowerCase();
    if (!k || vistos.has(k)) return false;
    vistos.add(k); return true;
  });
};

/* LICENÇA DO GOV.BR: CC BY-ND — NÃO PODE REESCREVER
   O rodape de todo portal gov.br diz: "Todo o conteudo deste site esta
   publicado sob a licenca Creative Commons Atribuicao-SemDerivacoes 3.0".

   SemDerivacoes significa que a republicacao e livre, com credito, mas
   ALTERAR o texto nao e permitido — e reescrever e exatamente o que o
   Meridiano faz. Entao estes orgaos nao podem alimentar a reescrita.

   Continuam valendo no cacador, onde servem para CONFIRMAR uma historia sem
   que nenhuma palavra deles seja usada. E entrarao como esteira 2 —
   republicacao integral com credito — quando esse caminho existir.

   Isto e coerencia, nao juridiquice: um jornal que registra qual orgao nao
   responde nao pode ignorar a licenca da propria fonte.                    */
export const FEDERAIS_ESTEIRA2 = [
  { id:'pf',        nome:'Polícia Federal',         url:'https://www.gov.br/pf/pt-br/assuntos/noticias', base:'https://www.gov.br/pf' },
  { id:'prf',       nome:'Polícia Rodoviária Federal', url:'https://www.gov.br/prf/pt-br/noticias', base:'https://www.gov.br/prf' },
  { id:'mpf',       nome:'MPF',                     url:'https://www.mpf.mp.br/pgr/noticias-pgr', base:'https://www.mpf.mp.br' },
  { id:'cgu',       nome:'CGU',                     url:'https://www.gov.br/cgu/pt-br/assuntos/noticias', base:'https://www.gov.br/cgu' },
  { id:'tcu',       nome:'TCU',                     url:'https://portal.tcu.gov.br/imprensa/noticias', base:'https://portal.tcu.gov.br' },
  { id:'inss',      nome:'INSS',                    url:'https://www.gov.br/inss/pt-br/noticias', base:'https://www.gov.br/inss' },
  { id:'anvisa',    nome:'Anvisa',                  url:'https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa', base:'https://www.gov.br/anvisa' },
  { id:'ans',       nome:'ANS',                     url:'https://www.gov.br/ans/pt-br/assuntos/noticias', base:'https://www.gov.br/ans' },
  { id:'fiocruz',   nome:'Fiocruz',                 url:'https://portal.fiocruz.br/noticias', base:'https://portal.fiocruz.br' },
  { id:'ibama',     nome:'Ibama',                   url:'https://www.gov.br/ibama/pt-br/assuntos/noticias', base:'https://www.gov.br/ibama' },
  { id:'icmbio',    nome:'ICMBio',                  url:'https://www.gov.br/icmbio/pt-br/assuntos/noticias', base:'https://www.gov.br/icmbio' },
  { id:'inpe',      nome:'Inpe',                    url:'https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias', base:'https://www.gov.br/inpe' },
  { id:'mec',       nome:'Ministério da Educação',  url:'https://www.gov.br/mec/pt-br/assuntos/noticias', base:'https://www.gov.br/mec' },
  { id:'trabalho',  nome:'Ministério do Trabalho',  url:'https://www.gov.br/trabalho-e-emprego/pt-br/noticias-e-conteudos', base:'https://www.gov.br/trabalho-e-emprego' },
  { id:'dnit',      nome:'Dnit',                    url:'https://www.gov.br/dnit/pt-br/assuntos/noticias', base:'https://www.gov.br/dnit' },
  { id:'antt',      nome:'ANTT',                    url:'https://www.gov.br/antt/pt-br/assuntos/noticias', base:'https://www.gov.br/antt' },
  { id:'funai',     nome:'Funai',                   url:'https://www.gov.br/funai/pt-br/assuntos/noticias', base:'https://www.gov.br/funai' },
  { id:'ipea',      nome:'Ipea',                    url:'https://www.ipea.gov.br/portal/imprensa', base:'https://www.ipea.gov.br' },
  { id:'ibge',      nome:'IBGE',                    url:'https://agenciadenoticias.ibge.gov.br', base:'https://agenciadenoticias.ibge.gov.br' },
  { id:'itamaraty', nome:'Itamaraty',               url:'https://www.gov.br/mre/pt-br/canais_atendimento/imprensa/notas-a-imprensa', base:'https://www.gov.br/mre' },
  { id:'bc',        nome:'Banco Central',           url:'https://www.bcb.gov.br/detalhenoticia', base:'https://www.bcb.gov.br' },
  { id:'govbr',     nome:'gov.br',                  url:'https://www.gov.br/pt-br/noticias', base:'https://www.gov.br' },

  // Onde mora a pauta nacional do dia. Na rodada em que o jornal registrou
  // "CNJ teria aprovado", "STF teria autorizado buscas" e "Lula teria
  // indicado para a CVM" como NAO confirmadas, o documento de cada uma
  // existia — so nao havia fonte cadastrada para busca-lo.
  { id:'cnj',       nome:'CNJ',                     url:'https://www.cnj.jus.br/noticias/', base:'https://www.cnj.jus.br' },
  { id:'planalto',  nome:'Planalto',                url:'https://www.gov.br/planalto/pt-br/acompanhe-o-planalto/noticias', base:'https://www.gov.br/planalto' },
  { id:'agu',       nome:'AGU',                     url:'https://www.gov.br/agu/pt-br/comunicacao/noticias', base:'https://www.gov.br/agu' },
  { id:'cvm',       nome:'CVM',                     url:'https://www.gov.br/cvm/pt-br/assuntos/noticias', base:'https://www.gov.br/cvm' },
  { id:'defesa',    nome:'Ministério da Defesa',    url:'https://www.gov.br/defesa/pt-br/centrais-de-conteudo/noticias', base:'https://www.gov.br/defesa' },
  { id:'justica',   nome:'Ministério da Justiça',   url:'https://www.gov.br/mj/pt-br/assuntos/noticias', base:'https://www.gov.br/mj' },
  { id:'fazenda',   nome:'Ministério da Fazenda',   url:'https://www.gov.br/fazenda/pt-br/assuntos/noticias', base:'https://www.gov.br/fazenda' },
  { id:'saude-fed', nome:'Ministério da Saúde',     url:'https://www.gov.br/saude/pt-br/assuntos/noticias', base:'https://www.gov.br/saude' },
  { id:'stm',       nome:'STM',                     url:'https://www.stm.jus.br/informacao/agencia-de-noticias', base:'https://www.stm.jus.br' },
  { id:'cnmp',      nome:'CNMP',                    url:'https://www.cnmp.mp.br/portal/todas-as-noticias', base:'https://www.cnmp.mp.br' },
  { id:'dpu',       nome:'Defensoria Pública da União', url:'https://www.dpu.def.br/noticias', base:'https://www.dpu.def.br' }
];

// ESTADOS — a configuração que torna o modelo replicável.
//
// Nacional e internacional são compartilhados por todos. O que muda de estado
// para estado é: os veículos que dão a pauta, as assessorias públicas de onde
// sai o texto, e as entidades setoriais da economia local.
//
// Para abrir um estado novo, copie um bloco e troque os endereços. Nada mais.

export const ESTADOS = {

  mt: {
    nome: 'Mato Grosso', uf: 'MT', capital: 'Cuiabá',
    cidades: ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Sorriso'],
    // termos que identificam uma notícia como sendo daqui
    marcadores: /(mato grosso|cuiaba|varzea grande|rondonopolis|sinop|sorriso|tangara|caceres|barra do garcas|lucas do rio verde|nova mutum|alta floresta|primavera do leste|pantanal)/,
    // e o que confunde com outro estado
    excluir: '-"Mato Grosso do Sul" -"Campo Grande"',

    veiculos: [
      { id:'g1mt',        nome:'g1 MT',          url:'https://g1.globo.com/rss/g1/mt/mato-grosso/' },
      { id:'odocumento',  nome:'O Documento',    url:'https://odocumento.com.br/feed' },
      { id:'estadaomt',   nome:'Estadão MT',     url:'https://www.estadaomatogrosso.com.br/feed' },
      { id:'olivre',      nome:'O Livre',        url:'https://www.olivre.com.br/feed' },
      { id:'issoenoticia',nome:'Isso É Notícia', url:'https://issoenoticia.com.br/feed' },
      { id:'muvuca',      nome:'Muvuca Popular', url:'https://www.muvucapopular.com.br/feed' },
      { id:'cenariomt',   nome:'CenárioMT',      url:'https://www.cenariomt.com.br/feed' },
      { id:'vgnoticias',  nome:'VG Notícias',    url:'https://www.vgnoticias.com.br/feed' },
      { id:'sonoticias',  nome:'Só Notícias',    url:'https://www.sonoticias.com.br/feed' },
      { id:'hipernoticias',nome:'Hipernotícias', url:'https://www.hipernoticias.com.br/rss' },
      { id:'reportermt',  nome:'Repórter MT',    url:'https://www.reportermt.com.br/rss' },
      { id:'primeirapagina',nome:'Primeira Página', url:'https://www.primeirapagina.com.br/feed/' }
    ],

    assessorias: [
      { id:'gov-mt',     nome:'Governo de MT',       base:'https://portal.mt.gov.br' },
      { id:'almt',       nome:'Assembleia de MT',    base:'https://www.al.mt.gov.br' },
      { id:'sema-mt',    nome:'Sema-MT',             base:'https://www.sema.mt.gov.br' },
      { id:'sefaz-mt',   nome:'Sefaz-MT',            base:'https://www5.sefaz.mt.gov.br' },
      { id:'cuiaba',     nome:'Prefeitura de Cuiabá',base:'https://www.cuiaba.mt.gov.br' },
      { id:'vg',         nome:'Prefeitura de VG',    base:'https://www.varzeagrande.mt.gov.br' },
      { id:'tre-mt',     nome:'TRE-MT',              base:'https://www.tre-mt.jus.br' }
    ],

    // a economia da praça: aqui sai conteúdo livre e exclusivo
    setoriais: [
      { id:'acrimat',  nome:'Acrimat',     url:'https://acrimat.org.br/feed/',            base:'https://acrimat.org.br' },
      { id:'fiemt',    nome:'Fiemt',       url:'https://www.fiemt.com.br/feed/',          base:'https://www.fiemt.com.br' }
    ]
  },

  rs: {
    nome: 'Rio Grande do Sul', uf: 'RS', capital: 'Porto Alegre',
    cidades: ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria'],
    marcadores: /(rio grande do sul|porto alegre|caxias do sul|pelotas|canoas|santa maria|gramado|novo hamburgo|passo fundo|rio grande|serra gaucha|gaucho|gaucha)/,
    excluir: '-"Rio Grande do Norte"',

    veiculos: [
      { id:'g1rs',       nome:'g1 RS',              url:'https://g1.globo.com/rss/g1/rs/rio-grande-do-sul/' },
      { id:'gzh',        nome:'GZH',                url:'https://gauchazh.clicrbs.com.br/rss/ultimas.xml' },
      { id:'correiodopovo',nome:'Correio do Povo',  url:'https://www.correiodopovo.com.br/rss/ultimas.xml' },
      { id:'jc',         nome:'Jornal do Comércio', url:'https://www.jornaldocomercio.com/rss' },
      { id:'sul21',      nome:'Sul21',              url:'https://sul21.com.br/feed/' },
      { id:'matinal',    nome:'Matinal',            url:'https://www.matinaljornalismo.com.br/feed/' },
      { id:'brasil247rs',nome:'Portal do Estado',   url:'https://www.portaldoestado.com.br/feed/' }
    ],

    assessorias: [
      { id:'gov-rs',   nome:'Governo do RS',            base:'https://estado.rs.gov.br' },
      { id:'alrs',     nome:'Assembleia do RS',         base:'https://www.al.rs.gov.br' },
      { id:'tce-rs',   nome:'TCE-RS',                   base:'https://www.tce.rs.gov.br' },
      { id:'tjrs',     nome:'TJRS',                     base:'https://www.tjrs.jus.br' },
      { id:'mprs',     nome:'MPRS',                     base:'https://www.mprs.mp.br' },
      { id:'poa',      nome:'Prefeitura de Porto Alegre', base:'https://prefeitura.poa.br' },
      { id:'camarapoa',nome:'Câmara de Porto Alegre',   base:'https://www.camarapoa.rs.gov.br' },
      { id:'tre-rs',   nome:'TRE-RS',                   base:'https://www.tre-rs.jus.br' },
      { id:'seapi-rs', nome:'Agricultura RS',           base:'https://www.agricultura.rs.gov.br' }
    ],

    setoriais: [
      { id:'farsul',  nome:'Farsul',  url:'https://www.farsul.org.br/feed/',    base:'https://www.farsul.org.br' },
      { id:'fiergs',  nome:'Fiergs',  url:'https://www.fiergs.org.br/feed',     base:'https://www.fiergs.org.br' },
      { id:'emater',  nome:'Emater',  url:'https://www.emater.tche.br/site/rss', base:'https://www.emater.tche.br' }
    ]
  },

  rj: {
    nome: 'Rio de Janeiro', uf: 'RJ', capital: 'Rio de Janeiro',
    cidades: ['Rio de Janeiro', 'Niterói', 'São Gonçalo', 'Duque de Caxias', 'Petrópolis'],
    marcadores: /(rio de janeiro|niteroi|sao goncalo|duque de caxias|petropolis|nova iguacu|campos dos goytacazes|baixada fluminense|fluminense|carioca|zona sul|zona norte|zona oeste)/,
    excluir: '-"Rio Grande"',

    // cidades com prefeitura, camara e imprensa propria: cada uma traz
    // fonte livre nova e engrossa a pauta regional
    cidades_busca: ['Niterói','São Gonçalo','Duque de Caxias','Nova Iguaçu','Petrópolis',
                    'Búzios','Cabo Frio','Angra dos Reis','Resende','Volta Redonda','Campos dos Goytacazes','Macaé'],

    veiculos: [
      { id:'g1rj',      nome:'g1 Rio',          url:'https://g1.globo.com/rss/g1/rio-de-janeiro/' },
      { id:'saogoncalo',nome:'O São Gonçalo',   url:'https://www.osaogoncalo.com.br/feed' },
      { id:'goncalense',nome:'O Gonçalense',    url:'https://jornalogoncalense.com.br/feed/' },
      { id:'tribpetro', nome:'Tribuna de Petrópolis', url:'https://www.tribunadepetropolis.com.br/feed/' },
      { id:'radio93',   nome:'Rádio 93',        url:'https://radio93.com.br/feed/' },
      { id:'tupi',      nome:'Super Rádio Tupi',url:'https://tupi.fm/feed/' },
      { id:'odia',      nome:'O Dia',           url:'https://odia.ig.com.br/rss/noticias.xml' },
      { id:'extra',     nome:'Extra',           url:'https://extra.globo.com/rss.xml' },
      { id:'diariodorio',nome:'Diário do Rio',  url:'https://diariodorio.com/feed/' },
      { id:'bandrio',   nome:'Band Rio',        url:'https://www.band.uol.com.br/rss/noticias' }
    ],

    assessorias: [
      { id:'gov-rj',   nome:'Governo do RJ',        base:'https://www.rj.gov.br' },
      { id:'alerj',    nome:'Alerj',                base:'https://www.alerj.rj.gov.br' },
      { id:'tce-rj',   nome:'TCE-RJ',               base:'https://www.tcerj.tc.br' },
      { id:'tjrj',     nome:'TJRJ',                 base:'https://www.tjrj.jus.br' },
      { id:'mprj',     nome:'MPRJ',                 base:'https://www.mprj.mp.br' },
      { id:'prefrio',  nome:'Prefeitura do Rio',    base:'https://prefeitura.rio' },
      { id:'camararj', nome:'Câmara do Rio',        base:'https://www.camara.rj.gov.br' },
      { id:'tre-rj',   nome:'TRE-RJ',               base:'https://www.tre-rj.jus.br' },
      { id:'niteroi',   nome:'Prefeitura de Niterói',    base:'https://www.niteroi.rj.gov.br' },
      { id:'saogoncalo-pref', nome:'Prefeitura de São Gonçalo', base:'https://www.saogoncalo.rj.gov.br' },
      { id:'buzios',    nome:'Prefeitura de Búzios',     base:'https://www.buzios.rj.gov.br' },
      { id:'petropolis',nome:'Prefeitura de Petrópolis', base:'https://www.petropolis.rj.gov.br' },
      { id:'cabofrio',  nome:'Prefeitura de Cabo Frio',  base:'https://www.cabofrio.rj.gov.br' },
      { id:'voltaredonda', nome:'Prefeitura de Volta Redonda', base:'https://www.voltaredonda.rj.gov.br' },
      { id:'caxias',    nome:'Prefeitura de Duque de Caxias', base:'https://duquedecaxias.rj.gov.br' },
      { id:'campos',    nome:'Prefeitura de Campos',     base:'https://www.campos.rj.gov.br' }
    ],

    setoriais: [
      { id:'firjan',      nome:'Firjan',      url:'https://www.firjan.com.br/rss',          base:'https://www.firjan.com.br' },
      { id:'fecomercio-rj',nome:'Fecomércio RJ', url:'https://www.fecomercio-rj.org.br/feed/', base:'https://www.fecomercio-rj.org.br' }
    ]
  }
};

// BR e MUNDO agora sao edicoes proprias, nao mais carona das estaduais.
// Antes as tres maquinas dos estados buscavam as mesmas fontes nacionais e
// gastavam as vagas de reescrita com Brasilia — o regional ficava de fora.
/* ==================================================================== 
   JORNALISMO EM LICENCA ABERTA
   ====================================================================
   Ate aqui o jornal so tinha dois tipos de fonte: assessoria publica
   (release oficial) e veiculo comercial (so pauta, nunca texto).

   Falta o meio-termo, que no Brasil e forte: agencia de jornalismo sem
   fins lucrativos que publica em Creative Commons e QUER ser republicada.
   E reportagem de verdade — investigacao, campo, meses de apuracao —
   entrando de graca e com autorizacao expressa.

   ATENCAO A LICENCA. Elas nao sao todas iguais, e confundir da processo:

     editavel  = permite adaptar o texto (a Publica autoriza edicao leve
                 e ate mudanca de titulo). Pode passar pelo redator.
     integral  = ND, sem derivacao. NAO pode ser reescrito. Ou publica
                 identico com credito, ou nao publica. Enquanto o caminho
                 de republicacao integral nao existir, entra so como pauta.

   Na duvida sobre uma licenca, marque 'integral'. O erro barato e deixar
   de publicar; o caro e reescrever quem proibiu reescrita.                */

// Cada fonte carrega tres informacoes que decidem o que pode ser feito com ela:
//
//   esteira 1 = licenca permite adaptar. Passa pelo redator, pode ser
//               traduzida, serve as duas linguas do jornal.
//   esteira 2 = ND, sem derivacao. Republicacao identica, com credito.
//               NAO pode ser traduzida — tradução é obra derivada.
//               Portanto esteira 2 nunca alimenta o Meridiano Italia.
//
//   comercial: false = clausula NC. Hoje o jornal nao tem anuncio, entao
//              tudo bem. No dia em que entrar publicidade, patrocinio ou
//              assinatura, TODAS as fontes com comercial:false viram
//              violacao de licenca de uma vez — inclusive o que ja esta
//              publicado. Por isso o campo existe desde agora: para saber
//              exatamente o que desligar naquele dia.

export const ABERTAS = [

  /* ---------------- ESTEIRA 1 — pode reescrever e traduzir --------------- */

  { id:'fapesp',    nome:'Agência FAPESP',   url:'https://agencia.fapesp.br/rss',
    base:'https://agencia.fapesp.br',        esteira:1, comercial:true,
    licenca:'editavel', cc:'CC BY', editoria:'brasil', credito:'Agência FAPESP' },

  // A Global Voices tem edicao em portugues propria — nao e traducao
  // automatica, e redacao lusofona. Melhor porta de entrada da lista.
  { id:'globalvoices-pt', nome:'Global Voices',  url:'https://pt.globalvoices.org/feed/',
    base:'https://pt.globalvoices.org',      esteira:1, comercial:true,
    licenca:'editavel', cc:'CC BY', editoria:'internacional', credito:'Global Voices' },

  { id:'globalvoices-en', nome:'Global Voices (EN)', url:'https://globalvoices.org/feed/',
    base:'https://globalvoices.org',         esteira:1, comercial:true,
    licenca:'editavel', cc:'CC BY', editoria:'internacional', credito:'Global Voices' },

  { id:'scidev',    nome:'SciDev.Net',       url:'https://www.scidev.net/global/feed/',
    base:'https://www.scidev.net',           esteira:1, comercial:true,
    licenca:'editavel', cc:'CC BY', editoria:'internacional', credito:'SciDev.Net' },

  { id:'usp',       nome:'Jornal da USP',    url:'https://jornal.usp.br/feed/',
    base:'https://jornal.usp.br',            esteira:1, comercial:true,
    licenca:'editavel', cc:'CC BY', editoria:'brasil', credito:'Jornal da USP' },

  { id:'unicamp',   nome:'Unicamp',          url:'https://www.unicamp.br/unicamp/rss.xml',
    base:'https://www.unicamp.br',           esteira:1, comercial:true,
    licenca:'editavel', cc:'CC BY', editoria:'brasil', credito:'Unicamp' },

  { id:'unesp',     nome:'Jornal da Unesp',  url:'https://jornal.unesp.br/feed/',
    base:'https://jornal.unesp.br',          esteira:1, comercial:true,
    licenca:'editavel', cc:'CC BY', editoria:'brasil', credito:'Jornal da Unesp' },

  // Governo dos EUA: dominio publico, sem restricao. Nao e noticia pronta —
  // e dado bruto de clima, satelite e safra, que rende pauta propria.
  { id:'nasa',      nome:'NASA',             url:'https://www.nasa.gov/rss/dyn/breaking_news.rss',
    base:'https://www.nasa.gov',             esteira:1, comercial:true,
    licenca:'editavel', cc:'domínio público', editoria:'internacional', credito:'NASA' },

  { id:'usgs',      nome:'USGS',             url:'https://www.usgs.gov/news/rss',
    base:'https://www.usgs.gov',             esteira:1, comercial:true,
    licenca:'editavel', cc:'domínio público', editoria:'internacional', credito:'USGS' },

  // Volume alto, qualidade irregular: vale mais como pauta que como texto.
  { id:'wikinews-es', nome:'Wikinoticias',   url:'https://es.wikinews.org/w/index.php?title=Especial:CanalDeNoticias&feed=rss',
    base:'https://es.wikinews.org',          esteira:1, comercial:true,
    licenca:'editavel', cc:'CC BY 2.5', editoria:'internacional', credito:'Wikinotícias' },

  /* ---------------- ESTEIRA 2 — republicacao integral ------------------- */
  /* Aguardam o caminho de republicacao. Nenhuma pode ser traduzida.        */

  { id:'mongabay',  nome:'Mongabay',         url:'https://news.mongabay.com/feed/',
    base:'https://news.mongabay.com',        esteira:2, comercial:true,
    licenca:'integral', cc:'CC BY-ND 4.0', editoria:'brasil', credito:'Mongabay', uf:'mt' },

  { id:'bori',      nome:'Agência Bori',     url:'https://abori.com.br/feed/',
    base:'https://abori.com.br',             esteira:2, comercial:true,
    licenca:'integral', cc:'CC BY-ND', editoria:'brasil', credito:'Agência Bori' },

  { id:'groundup',  nome:'GroundUp',         url:'https://groundup.org.za/feed/',
    base:'https://groundup.org.za',          esteira:2, comercial:true,
    licenca:'integral', cc:'CC BY-ND 4.0', editoria:'internacional', credito:'GroundUp' },

  // Marcada como editavel ate hoje pelas normas de republicacao da propria
  // Publica, que autorizam edicao leve. Se a licenca formal for ND, isso e
  // concessao do veiculo e nao da licenca — o seguro e tratar como integral.
  { id:'publica',   nome:'Agência Pública',  url:'https://apublica.org/feed/',
    base:'https://apublica.org',             esteira:2, comercial:true,
    licenca:'integral', cc:'CC BY-ND 4.0', editoria:'brasil', credito:'Agência Pública' },

  { id:'amazoniareal', nome:'Amazônia Real', url:'https://amazoniareal.com.br/feed/',
    base:'https://amazoniareal.com.br',      esteira:2, comercial:true,
    licenca:'integral', cc:'CC BY-ND 4.0', editoria:'brasil', credito:'Amazônia Real', uf:'mt' },

  { id:'reporterbr', nome:'Repórter Brasil', url:'https://reporterbrasil.org.br/feed/',
    base:'https://reporterbrasil.org.br',    esteira:2, comercial:true,
    licenca:'integral', cc:'CC BY-NC-ND', editoria:'brasil', credito:'Repórter Brasil' },

  /* --- NC: proibido uso comercial. Desligar se o jornal monetizar. ------ */

  { id:'propublica',nome:'ProPublica',       url:'https://www.propublica.org/feeds/propublica/main',
    base:'https://www.propublica.org',       esteira:2, comercial:false,
    licenca:'integral', cc:'CC BY-NC-ND 4.0', editoria:'internacional', credito:'ProPublica' },

  { id:'marshall',  nome:'The Marshall Project', url:'https://www.themarshallproject.org/rss/recent.rss',
    base:'https://www.themarshallproject.org', esteira:2, comercial:false,
    licenca:'integral', cc:'CC BY-NC-ND 4.0', editoria:'internacional', credito:'The Marshall Project' },

  { id:'kff',       nome:'KFF Health News',  url:'https://kffhealthnews.org/feed/',
    base:'https://kffhealthnews.org',        esteira:2, comercial:false,
    licenca:'integral', cc:'CC BY-NC-ND 4.0', editoria:'internacional', credito:'KFF Health News' },

  { id:'e360',      nome:'Yale Environment 360', url:'https://e360.yale.edu/feed.rss',
    base:'https://e360.yale.edu',            esteira:2, comercial:false,
    licenca:'integral', cc:'CC BY-NC-ND', editoria:'internacional', credito:'Yale Environment 360' },

  { id:'restofworld', nome:'Rest of World',  url:'https://restofworld.org/feed/latest',
    base:'https://restofworld.org',          esteira:2, comercial:false,
    licenca:'integral', cc:'CC BY-NC-ND', editoria:'internacional', credito:'Rest of World' },

  { id:'ponte',     nome:'Ponte Jornalismo', url:'https://ponte.org/feed/',
    base:'https://ponte.org',                esteira:2, comercial:false,
    licenca:'integral', cc:'CC BY-NC-ND', editoria:'brasil', credito:'Ponte Jornalismo' },

  { id:'azmina',    nome:'AzMina',           url:'https://azmina.com.br/feed/',
    base:'https://azmina.com.br',            esteira:2, comercial:false,
    licenca:'integral', cc:'CC BY-NC-ND', editoria:'brasil', credito:'Revista AzMina' },

  { id:'marcozero', nome:'Marco Zero',       url:'https://marcozero.org/feed/',
    base:'https://marcozero.org',            esteira:2, comercial:false,
    licenca:'integral', cc:'CC BY-NC-ND', editoria:'brasil', credito:'Marco Zero Conteúdo' },

  { id:'catarinas', nome:'Portal Catarinas', url:'https://catarinas.info/feed/',
    base:'https://catarinas.info',           esteira:2, comercial:false,
    licenca:'integral', cc:'CC BY-NC-ND', editoria:'brasil', credito:'Portal Catarinas' },

  { id:'colabora',  nome:'#Colabora',        url:'https://projetocolabora.com.br/feed/',
    base:'https://projetocolabora.com.br',   esteira:2, comercial:false,
    licenca:'integral', cc:'CC BY-NC-ND', editoria:'brasil', credito:'#Colabora' }
];

// Instituicoes internacionais que autorizam reuso do proprio material.
// A UE tem regra explicita: a Decisao 2011/833/UE libera a reutilizacao dos
// documentos das instituicoes, inclusive comercial, mediante credito. Agencias
// da ONU e orgaos do governo dos EUA seguem linha parecida.
//
// Diferente dos onze cadastrados no cacador: aqueles servem para CONFIRMAR
// documento; estes podem virar TEXTO.
export const INTERNACIONAIS_LIVRES = [
  { id:'ec-noticias', nome:'Comissão Europeia', url:'https://ec.europa.eu/commission/presscorner/api/rss?language=pt&pagesize=20', base:'https://ec.europa.eu/commission/presscorner' },
  { id:'eeas-pt',     nome:'Serviço Diplomático da UE', url:'https://www.eeas.europa.eu/eeas/rss.xml', base:'https://www.eeas.europa.eu' },
  { id:'irini-news',  nome:'Operação EUNAVFOR MED Irini', url:'https://www.operationirini.eu/feed/', base:'https://www.operationirini.eu' },
  { id:'acnur',       nome:'Acnur', url:'https://www.acnur.org/portugues/feed/', base:'https://www.acnur.org/portugues' },
  { id:'unicef-br',   nome:'Unicef', url:'https://www.unicef.org/brazil/rss.xml', base:'https://www.unicef.org/brazil' },
  { id:'oms-news',    nome:'OMS', url:'https://www.who.int/rss-feeds/news-english.xml', base:'https://www.who.int' },
  { id:'voa-pt',      nome:'Voz da América', url:'https://www.voaportugues.com/api/zq$omekvi_', base:'https://www.voaportugues.com' }
];

export const ABERTAS_EDITAVEIS = ABERTAS.filter(f => f.esteira === 1);
export const ABERTAS_INTEGRAIS = ABERTAS.filter(f => f.esteira === 2);
// As que morrem no dia em que o jornal tiver anuncio.
export const ABERTAS_SO_SEM_ANUNCIO = ABERTAS.filter(f => !f.comercial);

export const EDICOES_GERAIS = {
  br: {
    nome: 'Brasil', uf: 'br',
    pauta: [
      { id:'g1',         nome:'g1',          url:'https://g1.globo.com/rss/g1/' },
      { id:'oglobo',     nome:'O Globo',     url:'https://oglobo.globo.com/rss.xml' },
      { id:'valor',      nome:'Valor',       url:'https://valor.globo.com/rss/' },
      { id:'zh',         nome:'Zero Hora',   url:'https://gauchazh.clicrbs.com.br/rss/ultimas.xml' },
      { id:'correiobraz',nome:'Correio Braziliense', url:'https://www.correiobraziliense.com.br/rss/noticia/ultimas/rss.xml' },
      { id:'gazetapovo', nome:'Gazeta do Povo', url:'https://www.gazetadopovo.com.br/feed/rss2.xml' },
      { id:'exame',      nome:'Exame',       url:'https://exame.com/feed/' },
      { id:'cartacapital',nome:'CartaCapital',url:'https://www.cartacapital.com.br/feed/' },
      { id:'r7',         nome:'R7',          url:'https://noticias.r7.com/feed.xml' },
      { id:'bbcbr',      nome:'BBC Brasil',  url:'https://feeds.bbci.co.uk/portuguese/rss.xml' },
      { id:'congresso',  nome:'Congresso em Foco', url:'https://www.congressoemfoco.com.br/feed/' },
      { id:'migalhas',   nome:'Migalhas',    url:'https://www.migalhas.com.br/rss' },
      { id:'g1politica', nome:'g1 Política', url:'https://g1.globo.com/rss/g1/politica/' },
      { id:'g1economia', nome:'g1 Economia', url:'https://g1.globo.com/rss/g1/economia/' },
      { id:'folha',      nome:'Folha',       url:'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml' },
      { id:'cnn',        nome:'CNN Brasil',  url:'https://www.cnnbrasil.com.br/feed/' },
      { id:'uol',        nome:'UOL',         url:'https://rss.uol.com.br/feed/noticias.xml' },
      { id:'estadao',    nome:'Estadão',     url:'https://www.estadao.com.br/arquivo/rss/ultimas.xml' },
      { id:'poder360',   nome:'Poder360',    url:'https://www.poder360.com.br/feed/' },
      { id:'metropoles', nome:'Metrópoles',  url:'https://www.metropoles.com/feed' },
      { id:'infomoney',  nome:'InfoMoney',   url:'https://www.infomoney.com.br/feed/' },
      { id:'jota',       nome:'JOTA',        url:'https://www.jota.info/feed' },
      { id:'globorural', nome:'Agro',        url:'https://g1.globo.com/rss/g1/economia/agronegocios/' }
    ],
    livres: [
      { id:'ab-politica', nome:'Agência Brasil', url:'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml' },
      { id:'ab-economia', nome:'Agência Brasil', url:'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml' },
      { id:'ab-justica',  nome:'Agência Brasil', url:'https://agenciabrasil.ebc.com.br/rss/justica/feed.xml' },
      { id:'ab-geral',    nome:'Agência Brasil', url:'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml' },
      { id:'camara',      nome:'Agência Câmara Notícias', url:'https://www.camara.leg.br/noticias/rss/ultimas.xml', base:'https://www.camara.leg.br/noticias' },
      { id:'senado',      nome:'Agência Senado', url:'https://www12.senado.leg.br/noticias/rss/ultimas', base:'https://www12.senado.leg.br/noticias' },
      { id:'embrapa',     nome:'Embrapa', url:'https://www.embrapa.br/busca-de-noticias/-/asset_publisher/rss', base:'https://www.embrapa.br' },
      { id:'conab',       nome:'Conab',   url:'https://www.conab.gov.br/ultimas-noticias?format=feed&type=rss', base:'https://www.conab.gov.br' },
      { id:'gov-br',      nome:'gov.br',  url:'https://www.gov.br/pt-br/noticias/RSS', base:'https://www.gov.br/pt-br/noticias' },
      { id:'stf',         nome:'STF',     url:'https://noticias.stf.jus.br/postsrss', base:'https://noticias.stf.jus.br' },
      { id:'stj',         nome:'STJ',     url:'https://www.stj.jus.br/sites/portalp/rss', base:'https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias' },
      { id:'tse',         nome:'TSE',     url:'https://www.tse.jus.br/rss/noticias.xml', base:'https://www.tse.jus.br/comunicacao/noticias' },
      { id:'bc',          nome:'Banco Central', url:'https://www.bcb.gov.br/rss/noticias', base:'https://www.bcb.gov.br/detalhenoticia' },
      { id:'ibge',        nome:'IBGE',    url:'https://agenciadenoticias.ibge.gov.br/agencia-noticias/2013-agencia-de-noticias/releases.rss', base:'https://agenciadenoticias.ibge.gov.br' },
      { id:'inmet',       nome:'Inmet',   url:'https://portal.inmet.gov.br/rss', base:'https://portal.inmet.gov.br/noticias' },
      { id:'anp',         nome:'ANP',     url:'https://www.gov.br/anp/pt-br/noticias/RSS', base:'https://www.gov.br/anp/pt-br/noticias' },
      { id:'mapa',        nome:'Ministério da Agricultura', url:'https://www.gov.br/agricultura/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/agricultura/pt-br/assuntos/noticias' },
      ...ABERTAS_EDITAVEIS.map(f => ({ id:f.id, nome:f.nome, url:f.url, base:f.base })),
      { id:'saude',       nome:'Ministério da Saúde', url:'https://www.gov.br/saude/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/saude/pt-br/assuntos/noticias' },
      { id:'pf',          nome:'Polícia Federal', url:'https://www.gov.br/pf/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/pf/pt-br/assuntos/noticias' },
      { id:'prf',         nome:'Polícia Rodoviária Federal', url:'https://www.gov.br/prf/pt-br/noticias/RSS', base:'https://www.gov.br/prf/pt-br/noticias' },
      { id:'cgu',         nome:'CGU', url:'https://www.gov.br/cgu/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/cgu/pt-br/assuntos/noticias' },
      { id:'ibama',       nome:'Ibama', url:'https://www.gov.br/ibama/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/ibama/pt-br/assuntos/noticias' },
      { id:'icmbio',      nome:'ICMBio', url:'https://www.gov.br/icmbio/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/icmbio/pt-br/assuntos/noticias' },
      { id:'mma',         nome:'Ministério do Meio Ambiente', url:'https://www.gov.br/mma/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/mma/pt-br/assuntos/noticias' },
      { id:'mec',         nome:'Ministério da Educação', url:'https://www.gov.br/mec/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/mec/pt-br/assuntos/noticias' },
      { id:'mj',          nome:'Ministério da Justiça', url:'https://www.gov.br/mj/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/mj/pt-br/assuntos/noticias' },
      { id:'fazenda',     nome:'Ministério da Fazenda', url:'https://www.gov.br/fazenda/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/fazenda/pt-br/assuntos/noticias' },
      { id:'mds',         nome:'Ministério do Desenvolvimento Social', url:'https://www.gov.br/mds/pt-br/noticias/RSS', base:'https://www.gov.br/mds/pt-br/noticias' },
      { id:'cidades',     nome:'Ministério das Cidades', url:'https://www.gov.br/cidades/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/cidades/pt-br/assuntos/noticias' },
      { id:'transportes', nome:'Ministério dos Transportes', url:'https://www.gov.br/transportes/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/transportes/pt-br/assuntos/noticias' },
      { id:'mme',         nome:'Ministério de Minas e Energia', url:'https://www.gov.br/mme/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/mme/pt-br/assuntos/noticias' },
      { id:'trabalho',    nome:'Ministério do Trabalho', url:'https://www.gov.br/trabalho-e-emprego/pt-br/noticias-e-conteudo/RSS', base:'https://www.gov.br/trabalho-e-emprego/pt-br/noticias-e-conteudo' },
      { id:'inss',        nome:'INSS', url:'https://www.gov.br/inss/pt-br/noticias/RSS', base:'https://www.gov.br/inss/pt-br/noticias' },
      { id:'anvisa',      nome:'Anvisa', url:'https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/RSS', base:'https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa' },
      { id:'funai',       nome:'Funai', url:'https://www.gov.br/funai/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/funai/pt-br/assuntos/noticias' },
      { id:'dnit',        nome:'Dnit', url:'https://www.gov.br/dnit/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/dnit/pt-br/assuntos/noticias' },
      { id:'inpe',        nome:'Inpe', url:'https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias/RSS', base:'https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias' },
      { id:'fiocruz',     nome:'Fiocruz', url:'https://portal.fiocruz.br/rss.xml', base:'https://portal.fiocruz.br/noticias' },
      { id:'tcu',         nome:'TCU', url:'https://portal.tcu.gov.br/imprensa/noticias/rss.xml', base:'https://portal.tcu.gov.br/imprensa/noticias' },
      { id:'ipea',        nome:'Ipea', url:'https://www.ipea.gov.br/portal/rss', base:'https://www.ipea.gov.br/portal' },
      { id:'fapesp',      nome:'Agência FAPESP', url:'https://agencia.fapesp.br/rss', base:'https://agencia.fapesp.br' }
    ,
      // Os federais voltam — agora pela esteira 2. O robo detecta a licenca
      // pelo dominio e manda para republicacao integral em vez de reescrita.
      ...FEDERAIS_ESTEIRA2
    ]
  },
  mundo: {
    nome: 'Mundo', uf: 'mundo',
    pauta: [
      { id:'g1mundo',    nome:'g1 Mundo',    url:'https://g1.globo.com/rss/g1/mundo/' },
      { id:'folhamundo', nome:'Folha Mundo', url:'https://feeds.folha.uol.com.br/mundo/rss091.xml' },
      { id:'bbcbrasil',  nome:'BBC Brasil',  url:'https://feeds.bbci.co.uk/portuguese/rss.xml' },
      { id:'dw',         nome:'DW Brasil',   url:'https://rss.dw.com/rdf/rss-br-all' },
      { id:'rfi',        nome:'RFI Brasil',  url:'https://www.rfi.fr/br/rss' },
      { id:'euronews',   nome:'Euronews',    url:'https://pt.euronews.com/rss' }
    ],
    livres: [
      { id:'ab-inter',     nome:'Agência Brasil',  url:'https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml' },
      { id:'onu',          nome:'ONU News',        url:'https://news.un.org/feed/subscribe/pt/news/all/rss.xml' },
      { id:'conversation', nome:'The Conversation',url:'https://theconversation.com/br/articles.atom' },
      { id:'vaticano',     nome:'Vatican News',    url:'https://www.vaticannews.va/pt.rss.xml' }
    ,
      // Editaveis internacionais que estavam so na edicao Brasil, sem chegar
      // aqui — justamente onde mais fazem sentido.
      ...ABERTAS.filter(f => f.esteira === 1 && f.editoria === 'internacional')
                .map(f => ({ id:f.id, nome:f.nome, url:f.url, base:f.base })),
      ...INTERNACIONAIS_LIVRES
    ]
  }
};

// Compartilhado por todos os estados.



export const NACIONAL = [
  { id:'ab-politica', nome:'Agência Brasil', editoria:'brasil',        url:'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml' },
  { id:'ab-economia', nome:'Agência Brasil', editoria:'brasil',        url:'https://agenciabrasil.ebc.com.br/rss/economia/feed.xml' },
  { id:'ab-justica',  nome:'Agência Brasil', editoria:'brasil',        url:'https://agenciabrasil.ebc.com.br/rss/justica/feed.xml' },
  { id:'ab-geral',    nome:'Agência Brasil', editoria:'brasil',        url:'https://agenciabrasil.ebc.com.br/rss/geral/feed.xml' },
  { id:'ab-inter',    nome:'Agência Brasil', editoria:'internacional', url:'https://agenciabrasil.ebc.com.br/rss/internacional/feed.xml' },
  { id:'camara',      nome:'Agência Câmara Notícias', editoria:'brasil', url:'https://www.camara.leg.br/noticias/rss/ultimas.xml', base:'https://www.camara.leg.br/noticias' },
  { id:'senado',      nome:'Agência Senado', editoria:'brasil',        url:'https://www12.senado.leg.br/noticias/rss/ultimas', base:'https://www12.senado.leg.br/noticias' },
  { id:'onu',         nome:'ONU News',       editoria:'internacional', url:'https://news.un.org/feed/subscribe/pt/news/all/rss.xml' },
  { id:'conversation',nome:'The Conversation',editoria:'internacional',url:'https://theconversation.com/br/articles.atom' },
  { id:'vaticano',    nome:'Vatican News',   editoria:'internacional', url:'https://www.vaticannews.va/pt.rss.xml' },
  { id:'embrapa',     nome:'Embrapa',        editoria:'brasil',        url:'https://www.embrapa.br/busca-de-noticias/-/asset_publisher/rss', base:'https://www.embrapa.br' },
  { id:'conab',       nome:'Conab',          editoria:'brasil',        url:'https://www.conab.gov.br/ultimas-noticias?format=feed&type=rss', base:'https://www.conab.gov.br' },
  { id:'pf', nome:'Polícia Federal', editoria:'brasil', url:'https://www.gov.br/pf/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/pf/pt-br/assuntos/noticias' },
  { id:'cgu', nome:'CGU', editoria:'brasil', url:'https://www.gov.br/cgu/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/cgu/pt-br/assuntos/noticias' },
  { id:'ibama', nome:'Ibama', editoria:'brasil', url:'https://www.gov.br/ibama/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/ibama/pt-br/assuntos/noticias' },
  { id:'mec', nome:'Ministério da Educação', editoria:'brasil', url:'https://www.gov.br/mec/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/mec/pt-br/assuntos/noticias' },
  { id:'mj', nome:'Ministério da Justiça', editoria:'brasil', url:'https://www.gov.br/mj/pt-br/assuntos/noticias/RSS', base:'https://www.gov.br/mj/pt-br/assuntos/noticias' },
  { id:'anvisa', nome:'Anvisa', editoria:'brasil', url:'https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/RSS', base:'https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa' },
  { id:'inss', nome:'INSS', editoria:'brasil', url:'https://www.gov.br/inss/pt-br/noticias/RSS', base:'https://www.gov.br/inss/pt-br/noticias' },
  { id:'inpe', nome:'Inpe', editoria:'brasil', url:'https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias/RSS', base:'https://www.gov.br/inpe/pt-br/assuntos/ultimas-noticias' },
  { id:'fiocruz', nome:'Fiocruz', editoria:'brasil', url:'https://portal.fiocruz.br/rss.xml', base:'https://portal.fiocruz.br/noticias' },
  { id:'tcu', nome:'TCU', editoria:'brasil', url:'https://portal.tcu.gov.br/imprensa/noticias/rss.xml', base:'https://portal.tcu.gov.br/imprensa/noticias' },
  { id:'fapesp', nome:'Agência FAPESP', editoria:'brasil', url:'https://agencia.fapesp.br/rss', base:'https://agencia.fapesp.br' }
];

// Pauta nacional e internacional, igual para todos os estados.
export const PAUTA_GERAL = [
  { id:'g1',         nome:'g1',          editoria:'brasil',        url:'https://g1.globo.com/rss/g1/' },
  { id:'g1politica', nome:'g1 Política', editoria:'brasil',        url:'https://g1.globo.com/rss/g1/politica/' },
  { id:'g1economia', nome:'g1 Economia', editoria:'brasil',        url:'https://g1.globo.com/rss/g1/economia/' },
  { id:'g1mundo',    nome:'g1 Mundo',    editoria:'internacional', url:'https://g1.globo.com/rss/g1/mundo/' },
  // Agencia italiana publicando em portugues, com pauta que cruza Brasil e
  // Italia. SO PAUTA: a ANSA proibe expressamente republicacao dos feeds.
  { id:'ansabr',     nome:'ANSA Brasil', editoria:'brasil',        url:'https://www.ansa.it/brasil/rss.xml' },
  // Economia e o assunto com mais republicacao em cadeia: seis veiculos dando
  // o mesmo numero do mesmo boletim. Servem de termometro; o dado vem da fonte.
  { id:'veja',       nome:'Veja',            editoria:'brasil', url:'https://veja.abril.com.br/feed/' },
  { id:'vejaeco',    nome:'Veja Economia',   editoria:'brasil', url:'https://veja.abril.com.br/economia/feed/' },
  { id:'moneytimes', nome:'Money Times',     editoria:'brasil', url:'https://www.moneytimes.com.br/feed/' },
  { id:'diariocom',  nome:'Diário do Comércio', editoria:'brasil', url:'https://diariodocomercio.com.br/feed/' },
  { id:'jbrasilia',  nome:'Jornal de Brasília', editoria:'brasil', url:'https://jornaldebrasilia.com.br/feed/' },
  { id:'aominuto',   nome:'Notícias ao Minuto', editoria:'brasil', url:'https://www.noticiasaominuto.com.br/rss/economia' },
  { id:'seudinheiro',nome:'Seu Dinheiro',    editoria:'brasil', url:'https://www.seudinheiro.com/feed/' },
  { id:'folha',      nome:'Folha',       editoria:'brasil',        url:'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml' },
  { id:'folhamundo', nome:'Folha Mundo', editoria:'internacional', url:'https://feeds.folha.uol.com.br/mundo/rss091.xml' },
  { id:'cnn',        nome:'CNN Brasil',  editoria:'brasil',        url:'https://www.cnnbrasil.com.br/feed/' },
  { id:'uol',        nome:'UOL',         editoria:'brasil',        url:'https://rss.uol.com.br/feed/noticias.xml' },
  { id:'estadao',    nome:'Estadão',     editoria:'brasil',        url:'https://www.estadao.com.br/arquivo/rss/ultimas.xml' },
  { id:'poder360',   nome:'Poder360',    editoria:'brasil',        url:'https://www.poder360.com.br/feed/' },
  { id:'metropoles', nome:'Metrópoles',  editoria:'brasil',        url:'https://www.metropoles.com/feed' },
  { id:'bbcbrasil',  nome:'BBC Brasil',  editoria:'internacional', url:'https://feeds.bbci.co.uk/portuguese/rss.xml' },
  { id:'dw',         nome:'DW Brasil',   editoria:'internacional', url:'https://rss.dw.com/rdf/rss-br-all' },
  { id:'rfi',        nome:'RFI Brasil',  editoria:'internacional', url:'https://www.rfi.fr/br/rss' },
  { id:'euronews',   nome:'Euronews',    editoria:'internacional', url:'https://pt.euronews.com/rss' },
  { id:'infomoney',  nome:'InfoMoney',   editoria:'brasil',        url:'https://www.infomoney.com.br/feed/' },
  { id:'jota',       nome:'JOTA',        editoria:'brasil',        url:'https://www.jota.info/feed' },
  { id:'globorural', nome:'Globo Rural', editoria:'brasil',        url:'https://g1.globo.com/rss/g1/economia/agronegocios/' }
];

// Estes bloqueiam robô por firewall ou montam a página em JavaScript. O texto
// deles não conseguimos ler — mas o Google indexa. Entram como pauta de peso:
// se o TCE publicou, a história é oficial, mesmo que a gente busque o texto
// em outra fonte. Confirmado pelo espião em 28/07/2026.
export const BLOQUEADOS = {
  mt: [
    { id:'tce-mt',   nome:'TCE-MT',      dominio:'tce.mt.gov.br',        motivo:'recusa conexao' },
    { id:'tjmt',     nome:'TJMT',        dominio:'tjmt.jus.br',          motivo:'site em Angular' },
    { id:'mpmt',     nome:'MPMT',        dominio:'mpmt.mp.br',           motivo:'recusa conexao' },
    { id:'sesp-mt',  nome:'Sesp-MT',     dominio:'seguranca.mt.gov.br',  motivo:'recusa conexao' },
    { id:'sinfra',   nome:'Sinfra-MT',   dominio:'sinfra.mt.gov.br',     motivo:'firewall' },
    { id:'imea',     nome:'Imea',        dominio:'imea.com.br',          motivo:'site em JavaScript' },
    { id:'aprosoja', nome:'Aprosoja-MT', dominio:'aprosoja.com.br',      motivo:'Cloudflare 403' },
    { id:'famato',   nome:'Famato',      dominio:'sistemafamato.org.br', motivo:'recusa conexao' }
  ],
  rs: [
    { id:'gov-rs', nome:'Governo do RS', dominio:'estado.rs.gov.br',  motivo:'a confirmar' },
    { id:'tce-rs', nome:'TCE-RS',        dominio:'tce.rs.gov.br',     motivo:'a confirmar' },
    { id:'tjrs',   nome:'TJRS',          dominio:'tjrs.jus.br',       motivo:'a confirmar' },
    { id:'fiergs', nome:'Fiergs',        dominio:'fiergs.org.br',     motivo:'a confirmar' }
  ],
  rj: [
    { id:'gov-rj', nome:'Governo do RJ', dominio:'rj.gov.br',         motivo:'a confirmar' },
    { id:'alerj',  nome:'Alerj',         dominio:'alerj.rj.gov.br',   motivo:'a confirmar' },
    { id:'tce-rj', nome:'TCE-RJ',        dominio:'tcerj.tc.br',       motivo:'a confirmar' }
  ]
};

export const CAMINHOS_ASSESSORIA = ['/noticias', '/noticia', '/imprensa', '/comunicacao/noticias', '/sala-de-imprensa', '/'];
