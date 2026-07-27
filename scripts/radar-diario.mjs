// RADAR DIÁRIO — roda uma vez por dia, sozinho.
// Lê o PNCP, apura pelas regras, escreve as matérias e grava dados/radar.json.
// Se o PNCP não responder, este robô falha sozinho e não afeta as manchetes.

import { writeFile, mkdir } from 'node:fs/promises';
import { coletarPNCP, apurar, escrever, pagina, slug } from './radar.mjs';

const horaBR = iso => new Date(iso)
  .toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:'America/Cuiaba'}).replace(':','h');
const semAcento = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

console.log('\n  RADAR · ' + new Date().toISOString());
console.log('  ' + '-'.repeat(60));

const { contratacoes, relatorio } = await coletarPNCP();
relatorio.forEach(l => console.log('  ' + l));
console.log(`  ${contratacoes.length} contratações em MT`);

const historias = apurar(contratacoes).slice(0, 10);
await mkdir('materia', { recursive: true });
await mkdir('dados', { recursive: true });

const itens = [];
for (const h of historias) {
  const m = escrever(h);
  const iso = h.c.publicacao ? new Date(h.c.publicacao).toISOString() : new Date().toISOString();
  const arquivo = slug(m.titulo) + '.html';
  await writeFile('materia/' + arquivo, pagina(m, h.c, iso), 'utf8');
  itens.push({
    id: 'radar:' + slug(m.titulo),
    editoria: /cuiaba/i.test(semAcento(h.c.municipio)) ? 'cuiaba'
            : /varzea/i.test(semAcento(h.c.municipio)) ? 'vg' : 'mt',
    chapeu: 'Exclusivo · Radar', titulo: m.titulo, resumo: m.linhaFina,
    fonte: 'Tempo Real MT', link: '/materia/' + arquivo, imagem: '',
    iso, hora: horaBR(iso), licenciado: true, original: true, peso: h.peso
  });
}

await writeFile('dados/radar.json', JSON.stringify({
  gerado: new Date().toISOString(), itens
}, null, 2), 'utf8');

console.log('  ' + '-'.repeat(60));
console.log(`  ${itens.length} matérias originais escritas em /materia\n`);
