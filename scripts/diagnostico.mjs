// DIAGNÓSTICO — testa tudo, nos três estados, e não escreve nada.
// Roda no GitHub Actions com permissão apenas de leitura.

import { ESTADOS, NACIONAL, PAUTA_GERAL, CAMINHOS_ASSESSORIA } from './estados.mjs';
import { lerListagem } from './assessorias.mjs';

const CHAVE = process.env.GEMINI_API_KEY || '';
const SO_ESTADO = process.env.ESTADO || '';   // opcional: testar um estado só
const dormir = ms => new Promise(r => setTimeout(r, ms));

let verdes = 0, vermelhos = 0;
const problemas = [], receita = { veiculos:[], assessorias:[], setoriais:[] };

async function pegar(url, ms = 12000){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { signal:c.signal, redirect:'follow',
      headers:{ 'User-Agent':'IlMeridiano/1.0 (+contato@ilmeridiano.com.br)',
                Accept:'application/rss+xml, application/atom+xml, application/xml, text/html, */*' }});
    const bytes = new Uint8Array(await r.arrayBuffer());
    const ct = r.headers.get('content-type') || '';
    let cs = (ct.match(/charset=([\w-]+)/i) || [])[1];
    if (!cs) {
      const ini = new TextDecoder('latin1').decode(bytes.slice(0,200));
      cs = (ini.match(/encoding=["']([\w-]+)["']/i) || [])[1] || 'utf-8';
    }
    let txt;
    try { txt = new TextDecoder(cs.toLowerCase()).decode(bytes); }
    catch { txt = new TextDecoder('utf-8').decode(bytes); }
    return { ok:r.ok, status:r.status, txt, ms:Date.now()-t0, cs };
  } finally { clearTimeout(t); }
}

const contar = x => (x.match(/<(item|entry)\b/gi) || []).length;
function tituloDe(xml){
  const m = xml.match(/<title[^>]*>([\s\S]*?)<\/title>/gi) || [];
  return (m[1] || m[0] || '').replace(/<[^>]+>/g,'').replace(/<!\[CDATA\[|\]\]>/g,'').trim().slice(0,56);
}
const quebrado = s => /[�]/.test(s);

async function feed(id, nome, url, cesta){
  try {
    const r = await pegar(url);
    const n = contar(r.txt), tit = tituloDe(r.txt);
    if (r.ok && n > 0) {
      const alerta = quebrado(tit) ? '  ACENTO QUEBRADO' : '';
      console.log(`  ok    ${id.padEnd(16)} ${String(n).padStart(3)} itens · ${String(r.ms).padStart(5)}ms · ${r.cs.padEnd(10)}${alerta}`);
      console.log(`        ${tit}`);
      verdes++; if (cesta) receita[cesta].push(`${id} (${nome})`);
      if (alerta) problemas.push(`${id}: acento quebrado`);
    } else {
      console.log(`  FALHA ${id.padEnd(16)} HTTP ${r.status} · ${n} itens`);
      vermelhos++; problemas.push(`${id}: HTTP ${r.status}`);
    }
  } catch(e) {
    console.log(`  FALHA ${id.padEnd(16)} ${String(e.message).slice(0,44)}`);
    vermelhos++; problemas.push(`${id}: ${String(e.message).slice(0,34)}`);
  }
  await dormir(250);
}

console.log('\n  DIAGNÓSTICO IL MERIDIANO · ' + new Date().toISOString());
console.log('  nada será gravado · nenhum commit será feito');
console.log('  ' + '='.repeat(76));

console.log('\n  PAUTA GERAL — nacional e internacional, igual para todos os estados');
console.log('  ' + '-'.repeat(76));
for (const f of PAUTA_GERAL) await feed(f.id, f.nome, f.url, null);

console.log('\n  FONTE LIVRE NACIONAL — daqui sai o texto');
console.log('  ' + '-'.repeat(76));
for (const f of NACIONAL) await feed(f.id, f.nome, f.url, null);

for (const [uf, E] of Object.entries(ESTADOS)) {
  if (SO_ESTADO && SO_ESTADO !== uf) continue;

  console.log(`\n  ${'='.repeat(76)}`);
  console.log(`  ESTADO: ${E.nome} (${E.uf}) · capital ${E.capital}`);
  console.log(`  ${'='.repeat(76)}`);

  console.log(`\n  veículos de pauta`);
  console.log('  ' + '-'.repeat(76));
  for (const v of E.veiculos) await feed(uf+':'+v.id, v.nome, v.url, 'veiculos');

  console.log(`\n  entidades setoriais — fonte livre da economia local`);
  console.log('  ' + '-'.repeat(76));
  for (const s of E.setoriais) {
    let ok = false;
    try {
      const r = await pegar(s.url);
      if (r.ok && contar(r.txt) > 0) {
        console.log(`  ok    ${(uf+':'+s.id).padEnd(16)} ${String(contar(r.txt)).padStart(3)} itens · RSS`);
        console.log(`        ${tituloDe(r.txt)}`);
        verdes++; receita.setoriais.push(`${uf}:${s.id} -> RSS`); ok = true;
      }
    } catch {}
    if (!ok && s.base) {
      for (const c of CAMINHOS_ASSESSORIA) {
        try {
          const r = await pegar(s.base + c, 10000);
          if (!r.ok) continue;
          const m = lerListagem(r.txt, s.base);
          if (m.length >= 3) {
            console.log(`  ok    ${(uf+':'+s.id).padEnd(16)} ${String(m.length).padStart(2)} manchetes · pagina ${c}`);
            console.log(`        ${m[0].titulo.slice(0,64)}`);
            verdes++; receita.setoriais.push(`${uf}:${s.id} -> pagina ${c}`); ok = true; break;
          }
        } catch {}
        await dormir(150);
      }
    }
    if (!ok) { console.log(`  FALHA ${(uf+':'+s.id).padEnd(16)} nem RSS nem pagina`); vermelhos++; problemas.push(`${uf}:${s.id}: sem fonte`); }
    await dormir(250);
  }

  console.log(`\n  assessorias públicas — testando ${CAMINHOS_ASSESSORIA.length} caminhos cada`);
  console.log('  ' + '-'.repeat(76));
  for (const o of E.assessorias) {
    let venceu = null;
    for (const c of CAMINHOS_ASSESSORIA) {
      try {
        const r = await pegar(o.base + c, 10000);
        if (!r.ok) continue;
        const m = lerListagem(r.txt, o.base);
        if (m.length >= 3) { venceu = { c, m }; break; }
      } catch {}
      await dormir(150);
    }
    if (venceu) {
      console.log(`  ok    ${(uf+':'+o.id).padEnd(16)} ${String(venceu.m.length).padStart(2)} manchetes · ${venceu.c}`);
      console.log(`        ${venceu.m[0].titulo.slice(0,64)}`);
      verdes++; receita.assessorias.push(`${uf}:${o.id} -> ${venceu.c}`);
    } else {
      console.log(`  FALHA ${(uf+':'+o.id).padEnd(16)} nenhum caminho funcionou`);
      vermelhos++; problemas.push(`${uf}:${o.id}: sem página de notícias`);
    }
    await dormir(300);
  }
}

console.log('\n  GEMINI');
console.log('  ' + '-'.repeat(76));
if (!CHAVE) { console.log('  FALHA chave não chegou ao robô'); vermelhos++; }
else {
  console.log(`  ok    chave presente (${CHAVE.length} caracteres)`);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${CHAVE}&pageSize=100`);
    if (!r.ok) throw new Error('HTTP '+r.status);
    const j = await r.json();
    const nomes = (j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent'))
      .map(m=>String(m.name).replace(/^models\//,''));
    const flash = nomes.filter(n=>/flash/i.test(n) && !/vision|tts|audio|image|live/i.test(n));
    const esc = flash.find(n=>/^gemini-flash-latest$/.test(n)) || flash.find(n=>/^gemini-2\.5-flash$/.test(n)) || flash[0];
    console.log(`  ok    ${nomes.length} modelos · escolhido: ${esc}`);
    console.log(`        flash: ${flash.slice(0,6).join(', ')}`);

    const teste = 'O Tribunal de Contas do Estado aprovou nesta segunda-feira as contas do exercicio de 2025 com ressalvas. A decisao foi por unanimidade entre os 7 conselheiros. O relatorio apontou 3 irregularidades formais, sem dano ao erario. O prazo de regularizacao e de 60 dias.';
    const pedido = 'Reescreva com suas palavras, usando SOMENTE os fatos do texto.\nFormato:\nTITULO: (uma linha)\nLINHAFINA: (uma frase)\nCORPO:\n(2 paragrafos separados por linha em branco)\n\nTEXTO:\n'+teste;
    let rr, usouThinking = true;
    // alguns modelos recusam thinkingConfig com HTTP 400. Tenta com, depois sem.
    for (const comT of [true, false]) {
      const cfg = { temperature:0.4, maxOutputTokens:4000 };
      if (comT) cfg.thinkingConfig = { thinkingBudget: 0 };
      rr = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${esc}:generateContent?key=${CHAVE}`,{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ contents:[{parts:[{text:pedido}]}], generationConfig: cfg })
      });
      if (rr.ok) { usouThinking = comT; break; }
      if (rr.status !== 400) break;
    }
    console.log(`        thinkingConfig aceito: ${usouThinking && rr.ok ? 'sim' : 'nao, usando sem'}`);
    if (!rr.ok) { console.log(`  FALHA geracao HTTP ${rr.status}: ${(await rr.text()).slice(0,120)}`); vermelhos++; }
    else {
      const jj = await rr.json();
      const txt = jj?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('') || '';
      const limpo = txt.replace(/```[a-z]*\n?/gi,'').replace(/\*\*/g,'').trim();
      const tit = limpo.match(/T[IÍ]TULO\s*:\s*(.+)/i)?.[1]?.trim() || '';
      const corpo = (limpo.split(/CORPO\s*:\s*/i)[1]||'').split(/\n\s*\n/).filter(x=>x.trim().length>40);
      const nums = s => (String(s).match(/\d[\d.,]{1,}/g)||[]).map(n=>n.replace(/[.,]/g,''));
      const inv = nums(limpo).filter(n=>!new Set(nums(teste)).has(n));
      console.log(`  ok    reescrita: "${tit.slice(0,52)}"`);
      console.log(`        ${corpo.length} paragrafos · numeros inventados: ${inv.length?inv.join(', '):'nenhum'}`);
      if (tit && corpo.length>=2) verdes++; else { vermelhos++; console.log('        CRU: '+limpo.slice(0,160).replace(/\n/g,' | ')); }
    }
  } catch(e){ console.log('  FALHA '+e.message); vermelhos++; }
}

console.log('\n  ' + '='.repeat(76));
console.log(`  ${verdes} funcionando · ${vermelhos} com problema`);
console.log(`\n  RESUMO DO QUE FUNCIONA:`);
console.log(`    veiculos    ${receita.veiculos.length}`);
console.log(`    setoriais   ${receita.setoriais.length}`);
console.log(`    assessorias ${receita.assessorias.length}`);
if (receita.assessorias.length) {
  console.log('\n  CAMINHOS DE ASSESSORIA CONFIRMADOS:');
  receita.assessorias.forEach(r=>console.log('    '+r));
}
if (problemas.length) {
  console.log('\n  PARA CONSERTAR:');
  problemas.slice(0,40).forEach(p=>console.log('    · '+p));
  if (problemas.length>40) console.log(`    ... e mais ${problemas.length-40}`);
}
console.log('\n  Nenhum arquivo foi gravado.\n');
