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
      const t = i.titulo;

      // eliminatorios: nao adianta pontuar quem e claramente menu
      if (t.length < 30) return false;
      if (t.split(/\s+/).length < 5) return false;
      if (MENU.test(t)) return false;
      if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]{20,}$/.test(t)) return false;

      // pontuacao: cada sinal de que e manchete vale pontos.
      // Exigir todos os sinais derrubou 3 de 5 orgaos que funcionavam.
      let p = 0;
      if (LINK_NOTICIA.some(re => re.test(i.link))) p += 2;   // link de noticia
      if (VERBOS.test(semAcento(t))) p += 2;                  // titulo com verbo
      if (t.split(/\s+/).length >= 8) p += 1;                 // frase longa
      if (t.length >= 45) p += 1;
      if (/[:,;]|"|"|'/.test(t)) p += 1;                      // pontuacao interna
      return p >= 3;
    });

  const visto = new Set();
  return achados.filter(i => {
    const k = semAcento(i.titulo).slice(0, 50);
    if (visto.has(k)) return false;
    visto.add(k);
    return true;
  }).slice(0, 15);
}

/* ---------------------------------------------------------- sitemap ------ */
// Muitos sites de órgão público montam a lista de notícias por JavaScript — o
// robô baixa a página e ela vem vazia. Mas quase todos publicam sitemap.xml,
// que é o mapa que eles entregam ao Google. XML puro, com a URL de cada
// notícia e a data. É o caminho mais confiável que existe para esses sites.

export const CAMINHOS_SITEMAP = [
  '/sitemap.xml', '/sitemap_index.xml', '/sitemap-news.xml',
  '/news-sitemap.xml', '/sitemap/sitemap-index.xml', '/wp-sitemap.xml'
];

// Lê <loc> e <lastmod> de um sitemap ou de um índice de sitemaps.
export function lerSitemap(xml){
  const blocos = [...xml.matchAll(/<(?:url|sitemap)>([\s\S]*?)<\/(?:url|sitemap)>/gi)].map(m => m[1]);
  return blocos.map(b => ({
    url: (b.match(/<loc>([\s\S]*?)<\/loc>/i)?.[1] || '').trim(),
    data: (b.match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1]
        || b.match(/<news:publication_date>([\s\S]*?)<\/news:publication_date>/i)?.[1] || '').trim(),
    titulo: (b.match(/<news:title>([\s\S]*?)<\/news:title>/i)?.[1] || '')
      .replace(/<!\[CDATA\[|\]\]>/g,'').trim()
  })).filter(i => i.url);
}

export const ehIndice = xml => /<sitemapindex/i.test(xml);

// Um sitemap tem milhares de URLs. Só interessam as de notícia e recentes.
export function filtrarNoticias(entradas, horas = 48){
  const corte = Date.now() - horas * 3600 * 1000;
  const ehNoticia = u => /\/(noticia|noticias|not|imprensa|comunicacao|sala-de-imprensa|press|release|materia|materias)s?\//i.test(u)
                      || /\/20\d{2}[\/-]\d{2}/.test(u);
  return entradas
    .filter(e => ehNoticia(e.url))
    .filter(e => { const t = Date.parse(e.data); return Number.isNaN(t) ? false : t >= corte; })
    .sort((a,b) => Date.parse(b.data) - Date.parse(a.data))
    .slice(0, 20);
}

// Quando o sitemap não traz o título, pegamos do <title> ou do og:title da página.
export function tituloDaPagina(html){
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const tt = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const bruto = (og || tt || '')
    .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
    .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/\s+/g,' ').trim();
  // tira o sufixo do veículo: "Manchete - TCE-MT" ou "Manchete | Governo de MT"
  return bruto.split(/\s+[|–—]\s+|\s+-\s+(?=[A-ZÁÉÍÓÚ][^-]{2,28}$)/)[0].trim();
}
