// REDATOR DIÁRIO — roda uma vez por dia, sozinho.
// Lê dados/edicao.json, pega o que veio de fonte que autoriza reprodução,
// manda o Gemini reescrever e grava dados/materias.json + páginas em /materia.

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { reescrever, textoCompleto, temChave, modeloUsado } from './redator.mjs';
import { pagina, slug } from './radar.mjs';

const QUANTAS = 8;
const PODE = /(agenciabrasil\.ebc\.com\.br|camara\.leg\.br|senado\.leg\.br|\.gov\.br)/i;
const dormir = ms => new Promise(r => setTimeout(r, ms));

console.log('\n  REDATOR · ' + new Date().toISOString());
console.log('  ' + '-'.repeat(60));

if (!temChave()) {
  console.log('  sem GEMINI_API_KEY — nada a fazer\n');
  process.exit(0);
}

let edicao;
try {
  edicao = JSON.parse(await readFile('dados/edicao.json','utf8'));
} catch {
  console.log('  dados/edicao.json ainda não existe. Rode as manchetes primeiro.\n');
  process.exit(0);
}

const candidatos = (edicao.itens || [])
  .filter(i => i.link && PODE.test(i.link))
  .sort((a,b) => Date.parse(b.iso) - Date.parse(a.iso))
  .slice(0, QUANTAS);

console.log(`  ${candidatos.length} candidatos de fonte licenciada`);

await mkdir('materia', { recursive: true });
await mkdir('dados', { recursive: true });

const itens = [];
for (const i of candidatos) {
  try {
    const texto = await textoCompleto(i.link);
    const m = await reescrever({ fonte: i.fonte, titulo: i.titulo, texto });
    const arquivo = slug(m.titulo) + '.html';
    await writeFile('materia/' + arquivo,
      pagina({ chapeu:'Notícia', titulo:m.titulo, linhaFina:m.linhaFina, corpo:m.corpo, checar:[] },
             { link: i.link, municipio:'' }, i.iso), 'utf8');
    itens.push({
      id: 'nosso:' + slug(m.titulo),
      editoria: i.editoria, chapeu: 'Nosso texto',
      titulo: m.titulo, resumo: m.linhaFina,
      fonte: 'Tempo Real MT, com informações de ' + i.fonte,
      link: '/materia/' + arquivo, imagem: '',
      iso: i.iso, hora: i.hora, licenciado: true, original: true
    });
    console.log('  ok    ' + m.titulo.slice(0,62));
    await dormir(1500);
  } catch (e) {
    console.log('  pulou ' + String(e.message).slice(0,70));
  }
}

await writeFile('dados/materias.json', JSON.stringify({
  gerado: new Date().toISOString(), modelo: modeloUsado(), itens
}, null, 2), 'utf8');

console.log('  ' + '-'.repeat(60));
console.log(`  ${itens.length} matérias reescritas · modelo ${modeloUsado()}\n`);
