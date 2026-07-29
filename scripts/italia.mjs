// ITALIA — edizioni, fonti libere, enti ufficiali e comuni
//
// Stessa disciplina del Brasile, tradotta:
//
//   PAUTA  = quello che i giornali stanno coprendo. Serve solo a sapere di che
//            cosa vale la pena occuparsi. Da qui non si copia MAI una riga.
//   FONTE  = chi autorizza la ripubblicazione. Da qui si scrive.
//
// ANSA sta fuori dalle fonti: il regolamento dei suoi feed vieta espressamente
// di pubblicare i titoli su un sito. Corriere, Repubblica e Stampa idem.
// Entrano come pauta, mai come fonte.
//
// La Toscana e la Lombardia sono le due regioni con agenzia di stampa propria
// — Toscana Notizie e Lombardia Notizie Online — ed e per questo che partiamo
// da loro. Toscana Notizie invita esplicitamente al rilancio dei suoi pezzi.
//
// ATTENZIONE: gli indirizzi qui sotto entrano come CANDIDATI. Prima di
// fidarsi, lanciare il Diagnostico: Actions -> Diagnostico -> Run workflow.

/* ------------------------------------------------------------------ PAUTA */
// Solo per sapere di che cosa si parla. Nessun testo viene preso da qui.
export const PAUTA_IT = [
  { id:'gn-it',      nome:'Google News Italia',   url:'https://news.google.com/rss?hl=it&gl=IT&ceid=IT:it' },
  { id:'gn-it-pol',  nome:'Google News Politica', url:'https://news.google.com/rss/headlines/section/topic/NATION?hl=it&gl=IT&ceid=IT:it' },
  { id:'gn-it-mondo',nome:'Google News Mondo',    url:'https://news.google.com/rss/headlines/section/topic/WORLD?hl=it&gl=IT&ceid=IT:it' }
];

/* ------------------------------------------------------ EDIZIONI ITALIANE */
export const EDIZIONI = {

  italia: {
    nome:'Italia', codigo:'italia', idioma:'it', tipo:'nazionale', ativa:true,
    marcadores:/(italia|italian[oa]|roma|governo|parlamento|camera|senato|quirinale|palazzo chigi|ministero)/i,
    livres: [
      { id:'governo',    nome:'Governo Italiano',        url:'https://www.governo.it/it/articolo-rss.xml',      base:'https://www.governo.it' },
      { id:'camera',     nome:'Camera dei Deputati',     url:'https://www.camera.it/leg19/1',                   base:'https://www.camera.it' },
      { id:'senato',     nome:'Senato della Repubblica', url:'https://www.senato.it/notizie',                   base:'https://www.senato.it' },
      { id:'quirinale',  nome:'Quirinale',               url:'https://www.quirinale.it/feed/rss',               base:'https://www.quirinale.it' },
      { id:'protciv',    nome:'Protezione Civile',       url:'https://www.protezionecivile.gov.it/it/notizie-rss', base:'https://www.protezionecivile.gov.it' },
      { id:'istat',      nome:'Istat',                   url:'https://www.istat.it/comunicato-stampa/feed/',    base:'https://www.istat.it' },
      { id:'iss',        nome:'Istituto Superiore di Sanità', url:'https://www.iss.it/rss',                     base:'https://www.iss.it' },
      { id:'salute',     nome:'Ministero della Salute',  url:'https://www.salute.gov.it/portale/news/p3_2.html',base:'https://www.salute.gov.it' },
      { id:'interno',    nome:'Ministero dell\'Interno', url:'https://www.interno.gov.it/it/notizie',           base:'https://www.interno.gov.it' },
      { id:'esteri',     nome:'Farnesina',               url:'https://www.esteri.it/it/sala_stampa/archivionotizie/', base:'https://www.esteri.it' },
      { id:'polizia',    nome:'Polizia di Stato',        url:'https://www.poliziadistato.it/articolo/rss',      base:'https://www.poliziadistato.it' },
      { id:'carabinieri',nome:'Arma dei Carabinieri',    url:'https://www.carabinieri.it/in-vostro-aiuto/comunicati-stampa', base:'https://www.carabinieri.it' },
      { id:'vvf',        nome:'Vigili del Fuoco',        url:'https://www.vigilfuoco.it/aspx/notizie.aspx',     base:'https://www.vigilfuoco.it' },
      { id:'gdf',        nome:'Guardia di Finanza',      url:'https://www.gdf.gov.it/it/stampa/comunicati',     base:'https://www.gdf.gov.it' },
      { id:'inps',       nome:'Inps',                    url:'https://www.inps.it/it/it/dettaglio-news.rss',    base:'https://www.inps.it' },
      { id:'bankit',     nome:'Banca d\'Italia',         url:'https://www.bancaditalia.it/media/comunicati/',   base:'https://www.bancaditalia.it' },
      { id:'regioni',    nome:'Regioni.it',              url:'https://www.regioni.it/rss/',                     base:'https://www.regioni.it' }
    ]
  },

  mondo: {
    nome:'Mondo', codigo:'mondo', idioma:'it', tipo:'mondo', ativa:true,
    marcadores:/./,
    livres: [
      { id:'vatican-it', nome:'Vatican News',    url:'https://www.vaticannews.va/it.rss.xml',    base:'https://www.vaticannews.va' },
      { id:'esteri-int', nome:'Farnesina',       url:'https://www.esteri.it/it/sala_stampa/archivionotizie/', base:'https://www.esteri.it' },
      { id:'ue-it',      nome:'Commissione UE',  url:'https://italia.representation.ec.europa.eu/notizie_it', base:'https://italia.representation.ec.europa.eu' }
    ]
  },

  // Toscana fica pronta mas fora do ar. Para ligar: ativa:true.
  // Vale lembrar que a Toscana Notizie e a melhor fonte regional da Italia,
  // e convida explicitamente ao rilancio — e a regiao mais facil de todas.
  toscana: {
    nome:'Toscana', codigo:'toscana', idioma:'it', tipo:'regione', ativa:false,
    marcadores:/(toscana|toscan[oi]|firenze|fiorentin|pisa|pisan|livorno|labronic|lucca|lucches|viareggio|versilia|prato|pratese|siena|senes|arezzo|aretin|grosseto|grossetan|massa|carrara|pistoia|pistoies|empoli|chianti|maremma|mugello|garfagnana|apuan)/i,
    livres: [
      { id:'toscana-notizie', nome:'Toscana Notizie',    url:'https://www.toscana-notizie.it/rss',           base:'https://www.toscana-notizie.it' },
      { id:'regione-toscana', nome:'Regione Toscana',    url:'https://www.regione.toscana.it/-/notizie',     base:'https://www.regione.toscana.it' },
      { id:'arpat',           nome:'Arpat',              url:'https://www.arpat.toscana.it/notizie/comunicati-stampa', base:'https://www.arpat.toscana.it' },
      { id:'firenze',         nome:'Comune di Firenze',  url:'https://press.comune.fi.it',                   base:'https://press.comune.fi.it' },
      { id:'pisa',            nome:'Comune di Pisa',     url:'https://www.comune.pisa.it/it/notizie',        base:'https://www.comune.pisa.it' },
      { id:'livorno',         nome:'Comune di Livorno',  url:'https://www.comune.livorno.it/notizie',        base:'https://www.comune.livorno.it' },
      { id:'lucca',           nome:'Comune di Lucca',    url:'https://www.comune.lucca.it/notizie',          base:'https://www.comune.lucca.it' },
      { id:'viareggio',       nome:'Comune di Viareggio',url:'https://www.comune.viareggio.lu.it/notizie',   base:'https://www.comune.viareggio.lu.it' }
    ]
  },

  lombardia: {
    nome:'Lombardia', codigo:'lombardia', idioma:'it', tipo:'regione', ativa:true,
    marcadores:/(lombardia|lombard[oi]|milano|milanes|bergamo|bergamasc|brescia|brescian|monza|brianza|como|comasc|varese|varesin|pavia|pavese|cremona|cremones|mantova|mantovan|lecco|lecches|sondrio|valtellina|lodi|lodigian)/i,
    livres: [
      { id:'lombardia-notizie', nome:'Lombardia Notizie Online', url:'https://www.lombardianotizie.online/feed/', base:'https://www.lombardianotizie.online' },
      { id:'regione-lombardia', nome:'Regione Lombardia',        url:'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/istituzione/comunicazione', base:'https://www.regione.lombardia.it' },
      { id:'arpa-lombardia',    nome:'Arpa Lombardia',           url:'https://www.arpalombardia.it/notizie',       base:'https://www.arpalombardia.it' },
      { id:'milano',            nome:'Comune di Milano',         url:'https://www.comune.milano.it/-/comunicati-stampa', base:'https://www.comune.milano.it' },
      { id:'bergamo',           nome:'Comune di Bergamo',        url:'https://www.comune.bergamo.it/notizie',      base:'https://www.comune.bergamo.it' },
      { id:'brescia',           nome:'Comune di Brescia',        url:'https://www.comune.brescia.it/notizie',      base:'https://www.comune.brescia.it' }
    ]
  },

  lazio: {
    nome:'Lazio', codigo:'lazio', idioma:'it', tipo:'regione', ativa:true,
    marcadores:/(lazio|lazial|roma\b|roman[oi]|capitolin|campidoglio|trastevere|testaccio|garbatella|ostia|eur\b|latina|pontin|frosinone|ciociar|viterbo|viterbes|rieti|reatin|civitavecchia|fiumicino|tivoli|guidonia|anzio|nettuno|aprilia|velletri|castelli romani)/i,
    livres: [
      { id:'regione-lazio', nome:'Regione Lazio',      url:'https://www.regione.lazio.it/notizie',        base:'https://www.regione.lazio.it' },
      { id:'consiglio-lazio', nome:'Consiglio Regionale del Lazio', url:'https://www.consiglio.regione.lazio.it/consiglio-regionale/?vw=comunicatidettaglio', base:'https://www.consiglio.regione.lazio.it' },
      { id:'roma-capitale', nome:'Roma Capitale',      url:'https://www.comune.roma.it/web/it/notizia.page', base:'https://www.comune.roma.it' },
      { id:'arpalazio',   nome:'Arpa Lazio',           url:'https://www.arpalazio.it/notizie',            base:'https://www.arpalazio.it' },
      { id:'salute-lazio',nome:'Salute Lazio',         url:'https://www.salutelazio.it/notizie',          base:'https://www.salutelazio.it' },
      { id:'latina',      nome:'Comune di Latina',     url:'https://www.comune.latina.it/notizie',        base:'https://www.comune.latina.it' },
      { id:'viterbo',     nome:'Comune di Viterbo',    url:'https://www.comune.viterbo.it/notizie',       base:'https://www.comune.viterbo.it' }
    ]
  },

  sicilia: {
    nome:'Sicilia', codigo:'sicilia', idioma:'it', tipo:'regione', ativa:true,
    marcadores:/(sicilia|sicilian|palermo|palermitan|mondello|ballaro|catania|catanes|etna|acireale|messina|messines|stretto di messina|siracusa|siracusan|ortigia|trapani|trapanes|marsala|ragusa|ibleo|agrigento|agrigentin|valle dei templi|caltanissetta|nisseno|\benna\b|\bgela\b|modica|noto\b|taormina|lampedusa|pantelleria|eolie)/i,
    livres: [
      { id:'regione-sicilia', nome:'Regione Siciliana', url:'https://www.regione.sicilia.it/comunicazione/area-stampa', base:'https://www.regione.sicilia.it' },
      { id:'sicilia-informa', nome:'La Regione Informa', url:'https://www.regione.sicilia.it/la-regione-informa', base:'https://www.regione.sicilia.it' },
      { id:'ars',         nome:'Assemblea Regionale Siciliana', url:'https://www.ars.sicilia.it/comunicati-stampa', base:'https://www.ars.sicilia.it' },
      { id:'arpa-sicilia',nome:'Arpa Sicilia',         url:'https://www.arpa.sicilia.it/notizie',         base:'https://www.arpa.sicilia.it' },
      { id:'ingv-etneo',  nome:'INGV Osservatorio Etneo', url:'https://www.ct.ingv.it/index.php/comunicati', base:'https://www.ct.ingv.it' },
      { id:'palermo',     nome:'Comune di Palermo',    url:'https://www.comune.palermo.it/noticias.php',  base:'https://www.comune.palermo.it' },
      { id:'catania',     nome:'Comune di Catania',    url:'https://www.comune.catania.it/notizie',       base:'https://www.comune.catania.it' },
      { id:'messina',     nome:'Comune di Messina',    url:'https://www.comune.messina.it/notizie',       base:'https://www.comune.messina.it' }
    ]
  }
};

/* -------------------------------------------- ENTI PER IL CACCIATORE ----- */
// Chi custodisce l'atto. Prigione sta in Questura, alluvione in Protezione
// Civile, appalto truccato in Procura, opera pubblica in Corte dei conti.
export const UFFICIALI = {

  toscana: [
    { id:'questura-fi', nome:'Questura di Firenze',   url:'https://questure.poliziadistato.it/Firenze',  base:'https://questure.poliziadistato.it', temas:['policia'] },
    { id:'vvf-toscana', nome:'Vigili del Fuoco Toscana', url:'https://www.vigilfuoco.it/aspx/notizie.aspx', base:'https://www.vigilfuoco.it', temas:['defesa','policia'] },
    { id:'protciv-tos', nome:'Protezione Civile Toscana', url:'https://www.regione.toscana.it/protezionecivile', base:'https://www.regione.toscana.it', temas:['defesa'] },
    { id:'arpat-t',     nome:'Arpat',                 url:'https://www.arpat.toscana.it/notizie/comunicati-stampa', base:'https://www.arpat.toscana.it', temas:['ambiente'] },
    { id:'ars-toscana', nome:'Regione Toscana Salute',url:'https://www.regione.toscana.it/salute',       base:'https://www.regione.toscana.it', temas:['saude'] },
    { id:'toscana-n',   nome:'Toscana Notizie',       url:'https://www.toscana-notizie.it/rss',          base:'https://www.toscana-notizie.it', temas:[] },
    { id:'com-firenze', nome:'Comune di Firenze',     url:'https://press.comune.fi.it',                  base:'https://press.comune.fi.it', temas:[] },
    { id:'com-pisa',    nome:'Comune di Pisa',        url:'https://www.comune.pisa.it/it/notizie',       base:'https://www.comune.pisa.it', temas:[] },
    { id:'com-viareggio',nome:'Comune di Viareggio',  url:'https://www.comune.viareggio.lu.it/notizie',  base:'https://www.comune.viareggio.lu.it', temas:[] }
  ],

  lombardia: [
    { id:'questura-mi', nome:'Questura di Milano',    url:'https://questure.poliziadistato.it/Milano',   base:'https://questure.poliziadistato.it', temas:['policia'] },
    { id:'vvf-lomb',    nome:'Vigili del Fuoco Lombardia', url:'https://www.vigilfuoco.it/aspx/notizie.aspx', base:'https://www.vigilfuoco.it', temas:['defesa','policia'] },
    { id:'protciv-lom', nome:'Protezione Civile Lombardia', url:'https://www.regione.lombardia.it/wps/portal/istituzionale/HP/protezione-civile', base:'https://www.regione.lombardia.it', temas:['defesa'] },
    { id:'arpa-lom',    nome:'Arpa Lombardia',        url:'https://www.arpalombardia.it/notizie',        base:'https://www.arpalombardia.it', temas:['ambiente'] },
    { id:'lomb-n',      nome:'Lombardia Notizie Online', url:'https://www.lombardianotizie.online/feed/', base:'https://www.lombardianotizie.online', temas:[] },
    { id:'com-milano',  nome:'Comune di Milano',      url:'https://www.comune.milano.it/-/comunicati-stampa', base:'https://www.comune.milano.it', temas:[] },
    { id:'com-bergamo', nome:'Comune di Bergamo',     url:'https://www.comune.bergamo.it/notizie',       base:'https://www.comune.bergamo.it', temas:[] }
  ],

  lazio: [
    { id:'questura-rm', nome:'Questura di Roma',      url:'https://questure.poliziadistato.it/Roma',     base:'https://questure.poliziadistato.it', temas:['policia'] },
    { id:'protciv-laz', nome:'Protezione Civile Lazio', url:'https://www.regione.lazio.it/protezione-civile', base:'https://www.regione.lazio.it', temas:['defesa'] },
    { id:'arpa-laz',    nome:'Arpa Lazio',            url:'https://www.arpalazio.it/notizie',            base:'https://www.arpalazio.it', temas:['ambiente'] },
    { id:'salute-laz',  nome:'Salute Lazio',          url:'https://www.salutelazio.it/notizie',          base:'https://www.salutelazio.it', temas:['saude'] },
    { id:'reg-lazio',   nome:'Regione Lazio',         url:'https://www.regione.lazio.it/notizie',        base:'https://www.regione.lazio.it', temas:[] },
    { id:'com-roma',    nome:'Roma Capitale',         url:'https://www.comune.roma.it/web/it/notizia.page', base:'https://www.comune.roma.it', temas:[] }
  ],

  sicilia: [
    { id:'questura-pa', nome:'Questura di Palermo',   url:'https://questure.poliziadistato.it/Palermo',  base:'https://questure.poliziadistato.it', temas:['policia'] },
    { id:'questura-ct', nome:'Questura di Catania',   url:'https://questure.poliziadistato.it/Catania',  base:'https://questure.poliziadistato.it', temas:['policia'] },
    { id:'ingv-ct',     nome:'INGV Osservatorio Etneo', url:'https://www.ct.ingv.it/index.php/comunicati', base:'https://www.ct.ingv.it', temas:['defesa','ambiente'] },
    { id:'protciv-sic', nome:'Protezione Civile Sicilia', url:'https://www.protezionecivilesicilia.it/notizie', base:'https://www.protezionecivilesicilia.it', temas:['defesa'] },
    { id:'arpa-sic',    nome:'Arpa Sicilia',          url:'https://www.arpa.sicilia.it/notizie',         base:'https://www.arpa.sicilia.it', temas:['ambiente'] },
    { id:'ars-s',       nome:'Assemblea Regionale Siciliana', url:'https://www.ars.sicilia.it/comunicati-stampa', base:'https://www.ars.sicilia.it', temas:['legislativo'] },
    { id:'reg-sicilia', nome:'Regione Siciliana',     url:'https://www.regione.sicilia.it/comunicazione/area-stampa', base:'https://www.regione.sicilia.it', temas:[] },
    { id:'com-palermo', nome:'Comune di Palermo',     url:'https://www.comune.palermo.it/noticias.php',  base:'https://www.comune.palermo.it', temas:[] },
    { id:'com-catania', nome:'Comune di Catania',     url:'https://www.comune.catania.it/notizie',       base:'https://www.comune.catania.it', temas:[] }
  ],

  nazionale: [
    { id:'polizia-n',   nome:'Polizia di Stato',      url:'https://www.poliziadistato.it/articolo/rss',  base:'https://www.poliziadistato.it', temas:['policia'] },
    { id:'carabinieri-n',nome:'Arma dei Carabinieri', url:'https://www.carabinieri.it/in-vostro-aiuto/comunicati-stampa', base:'https://www.carabinieri.it', temas:['policia'] },
    { id:'gdf-n',       nome:'Guardia di Finanza',    url:'https://www.gdf.gov.it/it/stampa/comunicati', base:'https://www.gdf.gov.it', temas:['policia','ministerio','economia'] },
    { id:'protciv-n',   nome:'Protezione Civile',     url:'https://www.protezionecivile.gov.it/it/notizie-rss', base:'https://www.protezionecivile.gov.it', temas:['defesa'] },
    { id:'cassazione',  nome:'Corte di Cassazione',   url:'https://www.cortedicassazione.it/corte-di-cassazione/it/comunicati.page', base:'https://www.cortedicassazione.it', temas:['justica'] },
    { id:'consulta',    nome:'Corte Costituzionale',  url:'https://www.cortecostituzionale.it/actionNewsStampa.do', base:'https://www.cortecostituzionale.it', temas:['justica'] },
    { id:'corteconti',  nome:'Corte dei conti',       url:'https://www.corteconti.it/Home/Comunicazione', base:'https://www.corteconti.it', temas:['contas','obras'] },
    { id:'anac',        nome:'Anac',                  url:'https://www.anticorruzione.it/comunicati-stampa', base:'https://www.anticorruzione.it', temas:['contas','ministerio'] },
    { id:'salute-n',    nome:'Ministero della Salute',url:'https://www.salute.gov.it/portale/news/p3_2.html', base:'https://www.salute.gov.it', temas:['saude'] },
    { id:'iss-n',       nome:'Istituto Superiore di Sanità', url:'https://www.iss.it/rss',               base:'https://www.iss.it', temas:['saude'] },
    { id:'miur',        nome:'Ministero dell\'Istruzione', url:'https://www.miur.gov.it/web/guest/news', base:'https://www.miur.gov.it', temas:['educacao'] },
    { id:'mit',         nome:'Ministero Infrastrutture', url:'https://www.mit.gov.it/comunicazione/news', base:'https://www.mit.gov.it', temas:['obras'] },
    { id:'mase',        nome:'Ministero Ambiente',    url:'https://www.mase.gov.it/comunicati',          base:'https://www.mase.gov.it', temas:['ambiente'] },
    { id:'istat-n',     nome:'Istat',                 url:'https://www.istat.it/comunicato-stampa/feed/',base:'https://www.istat.it', temas:['economia'] },
    { id:'bankit-n',    nome:'Banca d\'Italia',       url:'https://www.bancaditalia.it/media/comunicati/',base:'https://www.bancaditalia.it', temas:['economia'] },
    { id:'viminale',    nome:'Ministero dell\'Interno', url:'https://www.interno.gov.it/it/notizie',     base:'https://www.interno.gov.it', temas:['eleicao','policia'] },
    { id:'camera-n',    nome:'Camera dei Deputati',   url:'https://www.camera.it/leg19/1',               base:'https://www.camera.it', temas:['legislativo'] },
    { id:'senato-n',    nome:'Senato della Repubblica', url:'https://www.senato.it/notizie',             base:'https://www.senato.it', temas:['legislativo'] },
    { id:'governo-n',   nome:'Governo Italiano',      url:'https://www.governo.it/it/articolo-rss.xml',  base:'https://www.governo.it', temas:[] },
    { id:'farnesina-n', nome:'Farnesina',             url:'https://www.esteri.it/it/sala_stampa/archivionotizie/', base:'https://www.esteri.it', temas:['internacional'] }
  ]
};

/* ------------------------------------------------------------- COMUNI ---- */
// Stessa regola del Brasile: vale solo il termine che non esiste altrove.
// "Centro" non serve; "Versilia" e "Brianza" servono.
export const COMUNI = {

  toscana: [
    { id:'firenze',   nome:'Firenze',   destaque:true, marcadores:/(firenze|fiorentin|palazzo vecchio|oltrarno|campo di marte|novoli|rifredi|scandicci|sesto fiorentino)/ },
    { id:'pisa',      nome:'Pisa',      destaque:true, marcadores:/(\bpisa\b|pisan[oi]|torre pendente|cisanello|marina di pisa|tirrenia)/ },
    { id:'viareggio', nome:'Viareggio', destaque:true, marcadores:/(viareggio|viareggin|versilia|torre del lago|darsena di viareggio|passeggiata di viareggio)/ },
    { id:'livorno',   nome:'Livorno',   marcadores:/(livorno|labronic|ardenza|antignano)/ },
    { id:'lucca',     nome:'Lucca',     marcadores:/(\blucca\b|lucches|mura di lucca|garfagnana)/ },
    { id:'prato',     nome:'Prato',     marcadores:/(\bprato\b|pratese|macrolotto)/ },
    { id:'siena',     nome:'Siena',     marcadores:/(\bsiena\b|senes|palio di siena|contrad)/ },
    { id:'arezzo',    nome:'Arezzo',    marcadores:/(arezzo|aretin|casentino|valdarno)/ },
    { id:'grosseto',  nome:'Grosseto',  marcadores:/(grosseto|grossetan|maremma)/ },
    { id:'massa',     nome:'Massa-Carrara', marcadores:/(massa carrara|massa-carrara|carrara|apuan|lunigiana)/ },
    { id:'pistoia',   nome:'Pistoia',   marcadores:/(pistoia|pistoies|montecatini)/ },
    { id:'empoli',    nome:'Empoli',    marcadores:/(\bempoli\b|empoles)/ }
  ],

  lazio: [
    { id:'roma',      nome:'Roma',      destaque:true, marcadores:/(\broma\b|roman[oi]|capitolin|campidoglio|trastevere|testaccio|garbatella|\bostia\b|\beur\b|tor bella monaca|san lorenzo roma|monteverde|prati\b)/ },
    { id:'latina',    nome:'Latina',    destaque:true, marcadores:/(\blatina\b|pontin|agro pontino|sabaudia|terracina)/ },
    { id:'viterbo',   nome:'Viterbo',   marcadores:/(viterbo|viterbes|tuscia)/ },
    { id:'frosinone', nome:'Frosinone', marcadores:/(frosinone|ciociar|cassino)/ },
    { id:'rieti',     nome:'Rieti',     marcadores:/(\brieti\b|reatin)/ },
    { id:'civitavecchia', nome:'Civitavecchia', marcadores:/(civitavecchia)/ },
    { id:'fiumicino', nome:'Fiumicino', marcadores:/(fiumicino)/ },
    { id:'tivoli',    nome:'Tivoli',    marcadores:/(\btivoli\b|guidonia)/ },
    { id:'anzio',     nome:'Anzio',     marcadores:/(\banzio\b|nettuno)/ }
  ],

  sicilia: [
    { id:'palermo',   nome:'Palermo',   destaque:true, marcadores:/(palermo|palermitan|mondello|ballaro|\bzisa\b|brancaccio|monreale)/ },
    { id:'catania',   nome:'Catania',   destaque:true, marcadores:/(catania|catanes|\betna\b|acireale|misterbianco|paterno\b)/ },
    { id:'messina',   nome:'Messina',   marcadores:/(messina|messines|stretto di messina|milazzo|taormina)/ },
    { id:'siracusa',  nome:'Siracusa',  marcadores:/(siracusa|siracusan|ortigia|\bnoto\b|augusta\b)/ },
    { id:'trapani',   nome:'Trapani',   marcadores:/(trapani|trapanes|marsala|erice|mazara)/ },
    { id:'ragusa',    nome:'Ragusa',    marcadores:/(ragusa|ibleo|modica|\bscicli\b|vittoria\b)/ },
    { id:'agrigento', nome:'Agrigento', marcadores:/(agrigento|agrigentin|valle dei templi|sciacca|lampedusa)/ },
    { id:'caltanissetta', nome:'Caltanissetta', marcadores:/(caltanissetta|nisseno|\bgela\b)/ },
    { id:'enna',      nome:'Enna',      marcadores:/(\benna\b|ennese|piazza armerina)/ }
  ],

  lombardia: [
    { id:'milano',    nome:'Milano',    destaque:true, marcadores:/(milano|milanes|duomo di milano|navigli|porta nuova|city life|corvetto|lambrate|bicocca|san siro)/ },
    { id:'bergamo',   nome:'Bergamo',   destaque:true, marcadores:/(bergamo|bergamasc|citta alta|orio al serio|valle seriana|valle brembana)/ },
    { id:'brescia',   nome:'Brescia',   marcadores:/(brescia|brescian|val trompia|franciacorta|garda bresciano)/ },
    { id:'monza',     nome:'Monza',     marcadores:/(\bmonza\b|brianza|autodromo di monza)/ },
    { id:'como',      nome:'Como',      marcadores:/(\bcomo\b|comasc|lago di como|lariano)/ },
    { id:'varese',    nome:'Varese',    marcadores:/(varese|varesin|malpensa|busto arsizio)/ },
    { id:'pavia',     nome:'Pavia',     marcadores:/(\bpavia\b|pavese|oltrepo)/ },
    { id:'cremona',   nome:'Cremona',   marcadores:/(cremona|cremones)/ },
    { id:'mantova',   nome:'Mantova',   marcadores:/(mantova|mantovan)/ },
    { id:'lecco',     nome:'Lecco',     marcadores:/(\blecco\b|lecches)/ },
    { id:'sondrio',   nome:'Sondrio',   marcadores:/(sondrio|valtellina|bormio|livigno)/ },
    { id:'lodi',      nome:'Lodi',      marcadores:/(\blodi\b|lodigian)/ }
  ]
};
