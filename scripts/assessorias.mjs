// ASSESSORIAS DE MATO GROSSO
//
// Os órgãos públicos de MT produzem release o dia inteiro e quase nenhum tem
// RSS. Este módulo lê a página de notícias deles direto.
//
// Sem dilema aqui: release de assessoria pública existe para ser publicado.
// É dinheiro público pagando gente para divulgar o ato. A única obrigação é
// dar o crédito, e damos em toda matéria.

const semAcento = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export const ORGAOS = [
  { id:'tce-mt',   nome:'TCE-MT',                url:'https://www.tce.mt.gov.br/noticias',            base:'https://www.tce.mt.gov.br' },
  { id:'tjmt',     nome:'TJMT',                  url:'https://www.tjmt.jus.br/noticias',              base:'https://www.tjmt.jus.br' },
  { id:'almt',     nome:'Assembleia de MT',      url:'https://www.al.mt.gov.br/noticias',             base:'https://www.al.mt.gov.br' },
  { id:'mpmt',     nome:'MPMT',                  url:'https://www.mpmt.mp.br/noticias',               base:'https://www.mpmt.mp.br' },
  { id:'gov-mt',   nome:'Governo de MT',         url:'https://www.mt.gov.br/noticias',                base:'https://www.mt.gov.br' },
  { id:'sinfra',   nome:'Sinfra-MT',             url:'https://www.sinfra.mt.gov.br/noticias',         base:'https://www.sinfra.mt.gov.br' },
  { id:'sesp',     nome:'Sesp-MT',               url:'https://www.seguranca.mt.gov.br/noticias',      base:'https://www.seguranca.mt.gov.br' },
  { id:'sema',     nome:'Sema-MT',               url:'https://www.sema.mt.gov.br/noticias',           base:'https://www.sema.mt.gov.br' },
  { id:'sefaz',    nome:'Sefaz-MT',              url:'https://www.sefaz.mt.gov.br/noticias',          base:'https://www.sefaz.mt.gov.br' },
  { id:'cuiaba',   nome:'Prefeitura de Cuiabá',  url:'https://www.cuiaba.mt.gov.br/noticias',         base:'https://www.cuiaba.mt.gov.br' },
  { id:'vg',       nome:'Prefeitura de VG',      url:'https://www.varzeagrande.mt.gov.br/noticias',   base:'https://www.varzeagrande.mt.gov.br' },
  { id:'camara-cba', nome:'Câmara de Cuiabá',    url:'https://www.camaracuiaba.mt.gov.br/noticias',   base:'https://www.camaracuiaba.mt.gov.br' },
  { id:'tre-mt',   nome:'TRE-MT',                url:'https://www.tre-mt.jus.br/comunicacao/noticias', base:'https://www.tre-mt.jus.br' }
];

// Caminhos alternativos, caso /noticias não exista.
export const ALTERNATIVOS = ['/noticias', '/noticia', '/imprensa', '/comunicacao/noticias', '/', '/sala-de-imprensa'];

// Extrai manchetes de uma página de listagem. Como cada órgão usa um sistema
// diferente, procuramos links com cara de manchete e descartamos menu, rodapé
// e link de serviço.
// O extrator antigo pegava menu: "Secretaria de Gestao de Pessoas", "Carta de
// Servicos ao Cidadao". Agora exigimos que o link TENHA CARA DE NOTICIA e que
// o titulo TENHA CARA DE FRASE. Ponto a ponto, so passa quem convence.
export function lerListagem(html, base){

  // 1. o link precisa apontar para uma noticia, nao para uma secao
  const LINK_NOTICIA = [
    /\/(noticia|noticias|not|imprensa|comunicacao|sala-de-imprensa|press|release)s?\//i,
    /\/20\d{2}[\/-]\d{2}/,          // /2026/07 ou /2026-07
    /[?&](id|codigo|cod|materia)=\d{2,}/i,
    /\/\d{4,}(\/|$|\.)/             // termina com id numerico longo
  ];

  // 2. titulo de secao e curto e sem verbo. Manchete tem verbo.
  const VERBOS = /\b(e|sao|foi|foram|tem|tera|teve|vai|vao|deve|devem|pode|podem|faz|fazem|fez|diz|dizem|disse|abre|abrem|abriu|fecha|fechou|aprova|aprovou|aprovam|nega|negou|lanca|lancou|anuncia|anunciou|apresenta|apresentou|recebe|recebeu|entrega|entregou|realiza|realizou|inicia|iniciou|comeca|comecou|termina|terminou|suspende|suspendeu|determina|determinou|decide|decidiu|julga|julgou|condena|condenou|prende|prendeu|autoriza|autorizou|libera|liberou|amplia|ampliou|reduz|reduziu|cresce|cresceu|cai|caiu|sobe|subiu|passa|passou|chega|chegou|segue|seguem|participa|participou|assina|assinou|define|definiu|convoca|convocou|publica|publicou|investiga|apura|elege|elegeu|empossa|empossou|avalia|defende|propoe|propos|volta|voltou|marca|marcou|registra|registrou|atinge|atingiu|supera|superou|garante|garantiu|reforca|amplia|destaca|alerta|orienta|explica|confirma|confirmou)\b/i;

  const MENU = /^(leia|veja|mais|clique|saiba|acesse|home|in[ií]cio|contato|expediente|publicidade|voltar|pr[óo]xim|anterior|todas|todos|ouvidoria|transpar[êe]ncia|portal|acesso|fale|mapa|login|entrar|pesquis|buscar|menu|compartilh|carta de servi|secretaria|superintend|coordenad|assessoria|gabinete|diretoria|departamento|ver a program|confira a program|servi[çc]os|institucional|legisla[çc]|licita[çc][õo]es|concursos?|not[íi]cias|galeria|v[íi]deos?|fotos?|agenda|webmail|intranet|perguntas)/i;

  const achados = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{20,240}?)<\/a>/gi)]
    .map(m => {
      let link = m[1].trim();
      if (link.startsWith('//')) link = 'https:' + link;
      else if (link.startsWith('/')) link = base + link;
      const titulo = m[2]
        .replace(/<[^>]+>/g,' ')
        .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
        .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
        .replace(/&#\d+;/g,' ')
        .replace(/\s+/g,' ').trim();
      return { titulo, link };
    })
    .filter(i => {
      if (!/^https?:\/\//.test(i.link) || !i.link.startsWith(base)) return false;
      if (!LINK_NOTICIA.some(re => re.test(i.link))) return false;   // link tem que ser de noticia
      const t = i.titulo;
      if (t.length < 32) return false;                               // manchete e longa
      if (t.split(/\s+/).length < 6) return false;                   // e tem varias palavras
      if (MENU.test(t)) return false;                                // nao e item de menu
      if (!VERBOS.test(semAcento(t))) return false;                  // manchete tem verbo
      if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{20,}$/.test(t)) return false;          // TUDO MAIUSCULO e banner
      return true;
    });

  const visto = new Set();
  return achados.filter(i => {
    const k = semAcento(i.titulo).slice(0, 50);
    if (visto.has(k)) return false;
    visto.add(k);
    return true;
  }).slice(0, 15);
}
