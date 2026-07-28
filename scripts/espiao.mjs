// ESPIÃO — para de adivinhar por que um site não abre.
//
// Busca a página de cada órgão travado e conta o que realmente chegou:
// tamanho, quantos links, se o conteúdo é montado por JavaScript, se existe
// sitemap, e uma amostra dos links e títulos.
//
// Não escreve nada. Roda com: ESTADO=mt node scripts/espiao.mjs

import { ESTADOS, CAMINHOS_ASSESSORIA } from './estados.mjs';
import { lerListagem, CAMINHOS_SITEMAP, lerSitemap, ehIndice } from './assessorias.mjs';

const UF = (process.env.ESTADO || 'mt').trim().toLowerCase();
const E = ESTADOS[UF] || ESTADOS.mt;
const SO = (process.env.ORGAO || '').trim();   // opcional: espiar um só

async function pegar(url, ms = 12000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal:c.signal, redirect:'follow',
      headers:{
        'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language':'pt-BR,pt;q=0.9'
      }});
    const txt = await r.text();
    return { ok:r.ok, status:r.status, txt, tipo:r.headers.get('content-type')||'', destino:r.url };
  } finally { clearTimeout(t); }
}

// Sinais de que a página é montada por JavaScript e chega vazia ao robô.
function diagnosticar(html){
  const links = (html.match(/<a[^>]+href=/gi) || []).length;
  const texto = html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'')
                    .replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const scripts = (html.match(/<script/gi) || []).length;
  const frameworks = [];
  if (/__NEXT_DATA__|_next\/static/i.test(html)) frameworks.push('Next.js');
  if (/ng-version|ng-app|angular/i.test(html)) frameworks.push('Angular');
  if (/data-reactroot|react(-dom)?\./i.test(html)) frameworks.push('React');
  if (/vue(\.runtime)?\.|data-v-/i.test(html)) frameworks.push('Vue');
  if (/liferay|com_liferay/i.test(html)) frameworks.push('Liferay');
  if (/wp-content|wp-includes/i.test(html)) frameworks.push('WordPress');
  if (/joomla|com_content/i.test(html)) frameworks.push('Joomla');
  if (/drupal/i.test(html)) frameworks.push('Drupal');

  const montadoPorJS = links < 25 && scripts > 8 && texto.length < 2500;
  return { links, scripts, tamanhoTexto: texto.length, frameworks, montadoPorJS,
           amostraTexto: texto.slice(0, 180) };
}

console.log(`\n  ESPIÃO · ${E.nome} · ${new Date().toISOString()}`);
console.log('  ' + '='.repeat(78));

const alvos = [...E.assessorias, ...E.setoriais.filter(x => x.base)]
  .filter(o => !SO || o.id === SO);

for (const o of alvos) {
  console.log(`\n  ${o.nome}  (${o.base})`);
  console.log('  ' + '-'.repeat(78));

  // 1. o que responde em cada caminho
  for (const c of CAMINHOS_ASSESSORIA) {
    try {
      const r = await pegar(o.base + c);
      if (!r.ok) { console.log(`    ${c.padEnd(24)} HTTP ${r.status}`); continue; }
      const d = diagnosticar(r.txt);
      const m = lerListagem(r.txt, o.base);
      const redir = r.destino && !r.destino.startsWith(o.base + c) ? ` → ${r.destino.slice(0,50)}` : '';
      console.log(`    ${c.padEnd(24)} HTTP 200 · ${String(d.links).padStart(4)} links · ${String(d.tamanhoTexto).padStart(6)} car. texto · ${d.frameworks.join('+') || 'html puro'}${d.montadoPorJS ? ' · MONTADO POR JS' : ''}${redir}`);
      if (m.length) {
        console.log(`      >>> extraiu ${m.length} manchetes. Primeira: ${m[0].titulo.slice(0,56)}`);
      } else if (d.links > 25) {
        // mostra alguns links para eu entender o padrão de URL do site
        const exemplos = [...r.txt.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{25,120}?)<\/a>/gi)]
          .map(x => ({ u:x[1], t:x[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim() }))
          .filter(x => x.t.length > 30).slice(0, 3);
        if (exemplos.length) {
          console.log(`      links com texto longo (padrão de URL deste site):`);
          exemplos.forEach(x => console.log(`        ${x.u.slice(0,62)}`));
          exemplos.forEach(x => console.log(`        "${x.t.slice(0,62)}"`));
        } else {
          console.log(`      nenhum link com texto de manchete · amostra: ${d.amostraTexto.slice(0,90)}`);
        }
      } else {
        console.log(`      pagina quase vazia para o robo · amostra: ${d.amostraTexto.slice(0,90)}`);
      }
    } catch (e) {
      console.log(`    ${c.padEnd(24)} ${String(e.message).slice(0,44)}`);
    }
  }

  // 2. existe sitemap?
  let achouSitemap = false;
  for (const c of CAMINHOS_SITEMAP) {
    try {
      const r = await pegar(o.base + c, 10000);
      if (!r.ok || !/<(urlset|sitemapindex)/i.test(r.txt)) continue;
      const e = lerSitemap(r.txt);
      const comData = e.filter(x => x.data).length;
      const noticia = e.filter(x => /\/(noticia|not|imprensa|materia|release)/i.test(x.url)).length;
      console.log(`    sitemap ${c.padEnd(16)} ${e.length} URLs · ${comData} com data · ${noticia} com cara de notícia${ehIndice(r.txt) ? ' · É ÍNDICE' : ''}`);
      e.slice(0, 3).forEach(x => console.log(`        ${x.url.slice(0,66)}  ${x.data.slice(0,10)}`));
      achouSitemap = true;
      break;
    } catch {}
  }
  if (!achouSitemap) console.log(`    sitemap                  nenhum encontrado`);

  // 3. o robots.txt costuma apontar o sitemap verdadeiro
  try {
    const r = await pegar(o.base + '/robots.txt', 8000);
    const mapas = [...(r.txt || '').matchAll(/Sitemap:\s*(\S+)/gi)].map(m => m[1]);
    if (mapas.length) {
      console.log(`    robots.txt aponta sitemap:`);
      mapas.slice(0,3).forEach(m => console.log(`        ${m.slice(0,70)}`));
    }
  } catch {}
}

console.log('\n  ' + '='.repeat(78));
console.log('  Nada foi gravado.\n');
