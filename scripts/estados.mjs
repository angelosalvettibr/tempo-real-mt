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
      { id:'hipernoticias',nome:'Hipernotícias', url:'https://www.hipernoticias.com.br/feed/' },
      { id:'reportermt',  nome:'Repórter MT',    url:'https://www.reportermt.com.br/feed/' },
      { id:'primeirapagina',nome:'Primeira Página', url:'https://www.primeirapagina.com.br/feed/' }
    ],

    assessorias: [
      { id:'gov-mt',     nome:'Governo de MT',       base:'https://www.mt.gov.br' },
      { id:'almt',       nome:'Assembleia de MT',    base:'https://www.al.mt.gov.br' },
      { id:'tce-mt',     nome:'TCE-MT',              base:'https://www.tce.mt.gov.br' },
      { id:'tjmt',       nome:'TJMT',                base:'https://www.tjmt.jus.br' },
      { id:'mpmt',       nome:'MPMT',                base:'https://www.mpmt.mp.br' },
      { id:'sinfra-mt',  nome:'Sinfra-MT',           base:'https://www.sinfra.mt.gov.br' },
      { id:'sesp-mt',    nome:'Sesp-MT',             base:'https://www.seguranca.mt.gov.br' },
      { id:'sema-mt',    nome:'Sema-MT',             base:'https://www.sema.mt.gov.br' },
      { id:'sefaz-mt',   nome:'Sefaz-MT',            base:'https://www.sefaz.mt.gov.br' },
      { id:'cuiaba',     nome:'Prefeitura de Cuiabá',base:'https://www.cuiaba.mt.gov.br' },
      { id:'vg',         nome:'Prefeitura de VG',    base:'https://www.varzeagrande.mt.gov.br' },
      { id:'tre-mt',     nome:'TRE-MT',              base:'https://www.tre-mt.jus.br' }
    ],

    // a economia da praça: aqui sai conteúdo livre e exclusivo
    setoriais: [
      { id:'imea',     nome:'Imea',        url:'https://www.imea.com.br/imea-site/rss',  base:'https://www.imea.com.br' },
      { id:'aprosoja', nome:'Aprosoja-MT', url:'https://aprosoja.com.br/feed/',           base:'https://aprosoja.com.br' },
      { id:'famato',   nome:'Famato',      url:'https://sistemafamato.org.br/feed/',      base:'https://sistemafamato.org.br' },
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
      { id:'gzh',        nome:'GZH',                url:'https://gauchazh.clicrbs.com.br/rss/ultimas/' },
      { id:'correiodopovo',nome:'Correio do Povo',  url:'https://www.correiodopovo.com.br/rss/' },
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

    veiculos: [
      { id:'g1rj',      nome:'g1 Rio',          url:'https://g1.globo.com/rss/g1/rio-de-janeiro/' },
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
      { id:'niteroi',  nome:'Prefeitura de Niterói',base:'https://www.niteroi.rj.gov.br' }
    ],

    setoriais: [
      { id:'firjan',      nome:'Firjan',      url:'https://www.firjan.com.br/rss',          base:'https://www.firjan.com.br' },
      { id:'fecomercio-rj',nome:'Fecomércio RJ', url:'https://www.fecomercio-rj.org.br/feed/', base:'https://www.fecomercio-rj.org.br' }
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
  { id:'camara',      nome:'Agência Câmara', editoria:'brasil',        url:'https://www.camara.leg.br/noticias/rss' },
  { id:'senado',      nome:'Agência Senado', editoria:'brasil',        url:'https://www12.senado.leg.br/noticias/ultimas/feed' },
  { id:'onu',         nome:'ONU News',       editoria:'internacional', url:'https://news.un.org/feed/subscribe/pt/news/all/rss.xml' },
  { id:'conversation',nome:'The Conversation',editoria:'internacional',url:'https://theconversation.com/br/articles.atom' },
  { id:'vaticano',    nome:'Vatican News',   editoria:'internacional', url:'https://www.vaticannews.va/pt.rss.xml' },
  { id:'embrapa',     nome:'Embrapa',        editoria:'brasil',        url:'https://www.embrapa.br/rss/noticias' },
  { id:'conab',       nome:'Conab',          editoria:'brasil',        url:'https://www.conab.gov.br/rss/noticias' }
];

// Pauta nacional e internacional, igual para todos os estados.
export const PAUTA_GERAL = [
  { id:'g1',         nome:'g1',          editoria:'brasil',        url:'https://g1.globo.com/rss/g1/' },
  { id:'g1politica', nome:'g1 Política', editoria:'brasil',        url:'https://g1.globo.com/rss/g1/politica/' },
  { id:'g1economia', nome:'g1 Economia', editoria:'brasil',        url:'https://g1.globo.com/rss/g1/economia/' },
  { id:'g1mundo',    nome:'g1 Mundo',    editoria:'internacional', url:'https://g1.globo.com/rss/g1/mundo/' },
  { id:'folha',      nome:'Folha',       editoria:'brasil',        url:'https://feeds.folha.uol.com.br/emcimadahora/rss091.xml' },
  { id:'folhamundo', nome:'Folha Mundo', editoria:'internacional', url:'https://feeds.folha.uol.com.br/mundo/rss091.xml' },
  { id:'cnn',        nome:'CNN Brasil',  editoria:'brasil',        url:'https://www.cnnbrasil.com.br/feed/' },
  { id:'uol',        nome:'UOL',         editoria:'brasil',        url:'https://rss.uol.com.br/feed/noticias.xml' },
  { id:'estadao',    nome:'Estadão',     editoria:'brasil',        url:'https://www.estadao.com.br/rss/ultimas.xml' },
  { id:'poder360',   nome:'Poder360',    editoria:'brasil',        url:'https://www.poder360.com.br/feed/' },
  { id:'metropoles', nome:'Metrópoles',  editoria:'brasil',        url:'https://www.metropoles.com/feed' },
  { id:'bbcbrasil',  nome:'BBC Brasil',  editoria:'internacional', url:'https://feeds.bbci.co.uk/portuguese/rss.xml' },
  { id:'dw',         nome:'DW Brasil',   editoria:'internacional', url:'https://rss.dw.com/rdf/rss-br-all' },
  { id:'rfi',        nome:'RFI Brasil',  editoria:'internacional', url:'https://www.rfi.fr/br/rss' },
  { id:'euronews',   nome:'Euronews',    editoria:'internacional', url:'https://pt.euronews.com/rss' },
  { id:'infomoney',  nome:'InfoMoney',   editoria:'brasil',        url:'https://www.infomoney.com.br/feed/' },
  { id:'jota',       nome:'JOTA',        editoria:'brasil',        url:'https://www.jota.info/feed' },
  { id:'globorural', nome:'Globo Rural', editoria:'brasil',        url:'https://globorural.globo.com/rss/ultimas/feed.xml' }
];

export const CAMINHOS_ASSESSORIA = ['/noticias', '/noticia', '/imprensa', '/comunicacao/noticias', '/sala-de-imprensa', '/'];
