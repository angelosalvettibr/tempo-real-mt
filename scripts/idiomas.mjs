// IDIOMAS
//
// Tudo que e lingua estava cravado no codigo: os textos da interface, os
// prompts do Gemini e — o mais perigoso — as travas de seguranca, que sao
// expressoes regulares em portugues. Uma trava que procura "foi preso" nao
// segura nada num texto que diz "e stato arrestato".
//
// Este arquivo isola isso. O motor (cruzamento, cacador, arquivo, cidades)
// continua igual para as duas linguas; so a casca muda.
//
// Para acrescentar uma terceira lingua, copie um bloco inteiro e traduza.
// Nao invente chave nova: se uma chave existe em pt, tem que existir na outra.

export const IDIOMAS = {

  /* ==================================================================== PT */
  pt: {
    codigo:'pt-BR', html:'pt-BR', raiz:'', bandeira:'Português',
    fuso:'America/Cuiaba',
    localeData:'pt-BR',

    ui: {
      capa:'Capa', mundo:'Mundo', nacional:'Brasil', meuLugar:'Meu estado',
      cidade:'cidade', todoOLugar:'Todo o estado',
      voltar:'← Voltar para a capa',
      confirmado:'Confirmado oficialmente',
      atribuido:'Atribuído a fonte oficial',
      semConfirmacao:'Sem confirmação oficial',
      nossoTexto:'Nosso texto',
      redacao:'Redação Meridiano',
      apuracao:'O que procuramos antes de publicar',
      seSabe:'O que se sabe',
      falta:'O que falta para confirmar',
      circulou:'Onde esta informação circulou',
      relacionadas:'Já publicamos sobre isso',
      contexto:'O que isso quer dizer',
      resgate:'Como esta matéria chegou aqui',
      zap:'Enviar no WhatsApp', copiar:'Copiar link', copiado:'Link copiado',
      ouvir:'Ouvir a matéria', parar:'Parar',
      documento:'Documento',
      nadaHoje:'Nada nesta editoria nas últimas 24 horas.',
      orgaosConsultados:'órgãos consultados',
      publicacoesLidas:'publicações lidas',
      responderam:'responderam',
      naoRespondeu:'não respondeu',
      nadaNoPeriodo:'nada publicado no período',
      portaCerta:'porta certa',
      maiorSemelhanca:'maior semelhança'
    },

    aviso: {
      naoConfirmada:'Esta informação está circulando na imprensa. Procuramos registro oficial e não localizamos até o fechamento desta edição. Isso não significa que seja falsa — significa que não está confirmada.',
      contribua:'Se você souber de registro oficial que não encontramos, escreva para a redação: corrigimos e transformamos em matéria confirmada, com o documento à vista.',
      naoReproduzimos:'Não reproduzimos o texto de ninguém. Listamos quem publicou, com o endereço original, para você conferir na fonte.'
    },

    // Travas de saida. Se o modelo escrever isto, a nota e descartada.
    travas: {
      afirmativo: [
        'foi (preso|presa|condenad[oa]|indiciad[oa]|demitid[oa])',
        'e (fals[ao]|mentira|verdade|culpad[oa]|inocente)',
        '(confirmou|comprovou|desmentiu|provou) que',
        'nao e verdade', 'trata-se de (fake|mentira|boato)', 'fake news comprovad'
      ],
      opiniao: [
        'indica que','sugere que','especialistas','provavelmente','deve levar',
        'tende a','pode significar','e um sinal','aponta para'
      ],
      rotulos: 'EDITORIA|MANCHETES?|INFORMA[ÇC][ÃA]O|DETALHE|FORMATO|TOM|REGRAS?|T[IÍ]TULO|CORPO|SESABE|FALTA'
    },

    prompt: {
      lingua:'português do Brasil',
      condicional:'"teria", "estaria", "seria"',
      rotuloTitulo:'TITULO', rotuloCorpo:'CORPO',
      rotuloSabe:'SESABE', rotuloFalta:'FALTA'
    }
  },

  /* ==================================================================== IT */
  it: {
    codigo:'it-IT', html:'it', raiz:'/it', bandeira:'Italiano',
    fuso:'Europe/Rome',
    localeData:'it-IT',

    ui: {
      capa:'Prima pagina', mundo:'Mondo', nacional:'Italia', meuLugar:'La mia regione',
      cidade:'città', todoOLugar:'Tutta la regione',
      voltar:'← Torna alla prima pagina',
      confirmado:'Confermato ufficialmente',
      atribuido:'Attribuito a fonte ufficiale',
      semConfirmacao:'Senza conferma ufficiale',
      nossoTexto:'Testo nostro',
      redacao:'Redazione Meridiano',
      apuracao:'Che cosa abbiamo cercato prima di pubblicare',
      seSabe:'Che cosa si sa',
      falta:'Che cosa manca per confermare',
      circulou:'Dove è circolata questa informazione',
      relacionadas:'Ne abbiamo già scritto',
      contexto:'Che cosa significa',
      resgate:'Come questo articolo è arrivato qui',
      zap:'Invia su WhatsApp', copiar:'Copia il link', copiado:'Link copiato',
      ouvir:'Ascolta l\'articolo', parar:'Ferma',
      documento:'Documento',
      nadaHoje:'Niente in questa sezione nelle ultime 24 ore.',
      orgaosConsultados:'enti consultati',
      publicacoesLidas:'comunicati letti',
      responderam:'hanno risposto',
      naoRespondeu:'non ha risposto',
      nadaNoPeriodo:'niente pubblicato nel periodo',
      portaCerta:'porta giusta',
      maiorSemelhanca:'massima somiglianza'
    },

    aviso: {
      naoConfirmada:'Questa informazione sta circolando sulla stampa. Abbiamo cercato un atto ufficiale e non lo abbiamo trovato alla chiusura di questa edizione. Questo non significa che sia falsa: significa che non è confermata.',
      contribua:'Se conosci un atto ufficiale che non abbiamo trovato, scrivi alla redazione: correggiamo e trasformiamo il pezzo in articolo confermato, con il documento in vista.',
      naoReproduzimos:'Non riproduciamo il testo di nessuno. Elenchiamo chi ha pubblicato, con l\'indirizzo originale, perché tu possa verificare alla fonte.'
    },

    travas: {
      // Italiano usa il condizionale: "sarebbe", "avrebbe". Le trappole qui
      // sotto bloccano l'indicativo, cioe l'affermazione come fatto certo.
      afirmativo: [
        'e stat[oa] (arrestat|condannat|licenziat|indagat)',
        'e (fals[oa]|una bufala|vero|colpevole|innocente)',
        '(ha confermato|ha smentito|ha provato|ha dimostrato) che',
        'non e vero', 'si tratta di (una bufala|una fake)', 'fake news confermat'
      ],
      opiniao: [
        'indica che','suggerisce che','gli esperti','probabilmente','dovrebbe portare',
        'tende a','potrebbe significare','e un segnale','punta verso'
      ],
      rotulos: 'SEZIONE|TITOLI|INFORMAZIONE|DETTAGLIO|FORMATO|TONO|REGOLE?|TITOLO|CORPO|SISA|MANCA'
    },

    prompt: {
      lingua:'italiano',
      condicional:'il condizionale: "sarebbe", "avrebbe", "risulterebbe"',
      rotuloTitulo:'TITOLO', rotuloCorpo:'CORPO',
      rotuloSabe:'SISA', rotuloFalta:'MANCA'
    }
  }
};

// Atalho: IDIOMA('it').ui.capa
export const IDIOMA = cod => IDIOMAS[cod] || IDIOMAS.pt;

// Monta a expressao regular de uma trava, sem acento, para comparar com texto
// tambem sem acento.
export function trava(cod, qual){
  const lista = IDIOMA(cod).travas[qual] || [];
  return new RegExp(lista.join('|'), 'i');
}
