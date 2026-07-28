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
export function lerListagem(html, base){
  const RUIM = /^(leia|veja|mais|clique|saiba|acesse|home|in[ií]cio|contato|expediente|publicidade|voltar|pr[óo]xim|anterior|todas|todos|ouvidoria|transpar|portal|acesso|fale|mapa|login|entrar|pesquis|buscar|menu|compartilh)/i;

  const achados = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{20,200}?)<\/a>/gi)]
    .map(m => {
      let link = m[1].trim();
      if (link.startsWith('//')) link = 'https:' + link;
      else if (link.startsWith('/')) link = base + link;
      const titulo = m[2]
        .replace(/<[^>]+>/g,' ')
        .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"')
        .replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>')
        .replace(/\s+/g,' ').trim();
      return { titulo, link };
    })
    .filter(i =>
      i.titulo.length >= 28 &&
      i.titulo.split(' ').length >= 5 &&
      !RUIM.test(i.titulo) &&
      /^https?:\/\//.test(i.link) &&
      i.link.startsWith(base) &&
      // link de manchete costuma ter caminho longo ou id numérico
      (i.link.split('/').length >= 5 || /\d{3,}/.test(i.link))
    );

  const visto = new Set();
  return achados.filter(i => {
    const k = semAcento(i.titulo).slice(0, 50);
    if (visto.has(k)) return false;
    visto.add(k);
    return true;
  }).slice(0, 15);
}
