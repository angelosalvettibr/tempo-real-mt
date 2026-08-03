// RETROFIT — poe os botoes nas materias que ja estao no ar
//
// As paginas em /materia sao HTML estatico: nascem com o formato do dia em que
// foram geradas e ficam congeladas. Quando o molde ganha algo novo — os botoes
// de compartilhar, o de acompanhar o caso — o acervo antigo nao acompanha.
//
// Regerar as 380 pelo Gemini seria caro e inutil: o texto delas nao mudou, so
// falta o rodape. Este script faz edicao de texto, sem IA, e resolve o acervo
// inteiro em segundos.
//
// E idempotente: rodar duas vezes nao duplica nada.
//
// Uso:  node scripts/retrofit.mjs
//       node scripts/retrofit.mjs --simular    (nao grava, so conta)

import { readdir, readFile, writeFile } from 'node:fs/promises';

const PASTA = 'materia';
const SIMULAR = process.argv.includes('--simular');

const CSS = `
.acoes{display:flex;gap:9px;flex-wrap:wrap;margin:30px 0 6px;padding-top:16px;border-top:1px solid var(--linha)}
.acoes button{font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;background:none;border:1.5px solid var(--tinta);color:var(--tinta);padding:10px 15px;cursor:pointer;transition:.14s}
.acoes button:hover{background:var(--tinta);color:var(--papel)}
.acoes button.zap{border-color:var(--verde);color:var(--verde)}
.acoes button.zap:hover{background:var(--verde);color:#fff}
.acoes button.seg{border-color:var(--sinal);color:var(--sinal)}
.acoes button.seg:hover{background:var(--sinal);color:#fff}
.acoes button.seg.on{background:var(--sinal);color:#fff}
.acoes button.ctx{border-color:#1F4D7A;color:#1F4D7A}
.acoes button.ctx:hover{background:#1F4D7A;color:#fff}
.ctx-bloco{border:1px solid #1F4D7A;background:#F4F8FC;padding:19px 22px;margin:26px 0}
.ctx-bloco b.tit{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#1F4D7A;display:block;margin-bottom:12px}
.ctx-bloco p{font-family:'Source Serif 4',Georgia,serif;font-size:16px;line-height:1.65;color:#2A3540;margin-bottom:12px}
.ctx-bloco p:last-of-type{margin-bottom:0}
.ctx-bloco .fontes{font-family:'IBM Plex Mono',monospace;font-size:10.5px;color:#5A6B7C;margin-top:14px;padding-top:12px;border-top:1px solid #CBD9E6;line-height:1.6}
.ctx-bloco .nada{font-family:'Source Serif 4',Georgia,serif;font-size:15px;color:#5A6B7C}
`;

// O id da historia nao existe no HTML antigo. Usamos o proprio nome do arquivo,
// que e estavel e unico — e e assim que o robo tambem identifica a materia.
const BLOCO = arquivo => `
  <div class="acoes">
    <button class="zap" id="bt-zap">Enviar no WhatsApp</button>
    <button id="bt-link">Copiar link</button>
    <button id="bt-ouvir">Ouvir a matéria</button>
    <button class="seg" id="bt-seguir" data-id="mat:${arquivo.replace(/\.html$/,'')}" data-nivel="confirmado">Acompanhar este caso</button>
    <button class="ctx" id="bt-ctx">Entender o contexto</button>
  </div>
  <div id="ctx-area"></div>
`;

const SCRIPT = `
<script>
(function(){
  var t = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : document.title;
  var u = location.href;

  var zap = document.getElementById('bt-zap');
  if (zap) zap.addEventListener('click', function(){
    window.open('https://wa.me/?text=' + encodeURIComponent(t + '\\n\\n' + u), '_blank', 'noopener');
  });

  var lk = document.getElementById('bt-link');
  if (lk) lk.addEventListener('click', function(){
    var pronto = function(){ var v = lk.textContent; lk.textContent = 'Link copiado'; setTimeout(function(){ lk.textContent = v; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(pronto, pronto);
    else { var c = document.createElement('textarea'); c.value = u; document.body.appendChild(c); c.select();
           try { document.execCommand('copy'); } catch(e){} document.body.removeChild(c); pronto(); }
  });

  var ov = document.getElementById('bt-ouvir');
  if (ov && 'speechSynthesis' in window) {
    var lendo = false;
    ov.addEventListener('click', function(){
      if (lendo) { speechSynthesis.cancel(); lendo = false; ov.textContent = 'Ouvir a matéria'; return; }
      var ps = [].slice.call(document.querySelectorAll('.corpo p')).map(function(p){ return p.textContent; });
      var f = new SpeechSynthesisUtterance(t + '. ' + ps.join(' '));
      f.lang = 'pt-BR'; f.rate = 1;
      f.onend = function(){ lendo = false; ov.textContent = 'Ouvir a matéria'; };
      speechSynthesis.cancel(); speechSynthesis.speak(f);
      lendo = true; ov.textContent = 'Parar';
    });
  } else if (ov) { ov.style.display = 'none'; }

  var bc = document.getElementById('bt-ctx');
  var ca = document.getElementById('ctx-area');
  if (bc) bc.addEventListener('click', function(){
    bc.disabled = true; bc.textContent = 'procurando…';
    var res = document.querySelector('.linhafina');
    fetch('/api/contexto', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: location.pathname.split('/').pop().replace(/\\.html$/,''),
        titulo: t, resumo: res ? res.textContent : '' }) })
      .then(function(r){ return r.json(); })
      .then(function(j){
        bc.style.display = 'none';
        if (j.ok && j.precisa) {
          ca.innerHTML = '<div class="ctx-bloco"><b class="tit">Para entender</b>'
            + j.paragrafos.map(function(p){ return '<p>' + p.replace(/[<>]/g,'') + '</p>'; }).join('')
            + (j.fontes ? '<div class="fontes">Levantado em: ' + j.fontes.join(' · ').replace(/[<>]/g,'') + '</div>' : '')
            + '</div>';
        } else if (j.ok) {
          ca.innerHTML = '<div class="ctx-bloco"><b class="tit">Para entender</b>'
            + '<p class="nada">Esta notícia não pede contexto adicional — o que ela informa se explica sozinho.</p></div>';
        } else {
          bc.style.display = ''; bc.disabled = false; bc.textContent = 'Entender o contexto';
        }
      })
      .catch(function(){ bc.disabled = false; bc.textContent = 'Entender o contexto'; });
  });

  var sg = document.getElementById('bt-seguir');
  var ap = null;
  try {
    // A capa guarda o apelido em 'meridiano_apelido', como texto simples.
    // Eu procurava em 'meridiano-leitor' esperando um objeto JSON — chave
    // errada e formato errado, entao nunca achava e o botao dizia para
    // escolher um apelido que ja existia.
    ap = localStorage.getItem('meridiano_apelido') || null;
    if (!ap) ap = (JSON.parse(localStorage.getItem('meridiano-leitor') || '{}').apelido) || null;
  } catch(e){}
  if (sg) sg.addEventListener('click', function(){
    if (!ap) { sg.textContent = 'Escolha um apelido na capa'; return; }
    sg.disabled = true;
    fetch('/api/leitor', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ acao:'acompanhar', apelido: ap, id: sg.dataset.id,
        nivel: sg.dataset.nivel, titulo: t, link: location.pathname }) })
      .then(function(r){ return r.json(); })
      .then(function(j){
        sg.disabled = false;
        if (j && j.seguindo) { sg.classList.add('on'); sg.textContent = 'Acompanhando'; }
        else { sg.classList.remove('on'); sg.textContent = 'Acompanhar este caso'; }
      })
      .catch(function(){ sg.disabled = false; });
  });
})();
</script>
`;

const arquivos = (await readdir(PASTA)).filter(f => f.endsWith('.html'));
let feitas = 0, puladas = 0, semAncora = 0;

for (const arq of arquivos) {
  const caminho = `${PASTA}/${arq}`;
  let h = await readFile(caminho, 'utf8');

  // Corrige tambem as paginas que receberam o botao com id vazio — nelas ele
  // existia mas se escondia sozinho.
  // Paginas que ja receberam o botao mas leem a chave errada do navegador.
  if (h.includes("localStorage.getItem('meridiano-leitor')") && !h.includes("getItem('meridiano_apelido')")) {
    h = h.replace(
      "ap = JSON.parse(localStorage.getItem('meridiano-leitor') || '{}').apelido || null;",
      "ap = localStorage.getItem('meridiano_apelido') || null;");
    h = h.replace(/data-id=""/g, `data-id="mat:${arq.replace(/\.html$/,'')}"`);
    if (!SIMULAR) await writeFile(caminho, h, 'utf8');
    feitas++; continue;
  }

  if (h.includes('data-id=""')) {
    h = h.replace(/data-id=""/g, `data-id="mat:${arq.replace(/\.html$/,'')}"`);
    h = h.replace(/if \(sg && !sg\.dataset\.id\) \{ sg\.style\.display = 'none'; \}\s*else if \(sg\) \{/, 'if (sg) {');
    if (!SIMULAR) await writeFile(caminho, h, 'utf8');
    feitas++; continue;
  }
  // Ja tem os botoes de compartilhar e seguir, mas nao o de contexto.
  if (h.includes('bt-seguir') && !h.includes('bt-ctx')) {
    h = h.replace('</div>\n  <a class="voltar"',
      `  <button class="ctx" id="bt-ctx">Entender o contexto</button>\n  </div>\n  <div id="ctx-area"></div>\n  <a class="voltar"`);
    if (!h.includes('bt-ctx')) {
      // molde diferente: injeta antes do link de volta
      const v = h.match(/<a class="voltar"[^>]*>[\s\S]*?<\/a>/);
      if (v) h = h.replace(v[0], '<div class="acoes"><button class="ctx" id="bt-ctx">Entender o contexto</button></div>\n<div id="ctx-area"></div>\n' + v[0]);
    }
    if (h.includes('</style>')) h = h.replace('</style>', CSS + '</style>');
    h = h.includes('</body>') ? h.replace('</body>', SCRIPT + '</body>') : h + SCRIPT;
    if (!SIMULAR) await writeFile(caminho, h, 'utf8');
    feitas++; continue;
  }

  if (h.includes('bt-seguir')) { puladas++; continue; }

  // O link de volta e a ancora: existe em todas as materias, do primeiro dia
  // ate hoje, e marca exatamente o fim do conteudo.
  const volta = h.match(/<a class="voltar"[^>]*>[\s\S]*?<\/a>/);
  if (!volta) { semAncora++; continue; }

  h = h.replace(volta[0], BLOCO(arq) + '\n' + volta[0]);

  if (h.includes('</style>')) h = h.replace('</style>', CSS + '</style>');
  h = h.includes('</body>') ? h.replace('</body>', SCRIPT + '</body>') : h + SCRIPT;

  if (!SIMULAR) await writeFile(caminho, h, 'utf8');
  feitas++;
}

console.log('');
console.log(`  RETROFIT ${SIMULAR ? '(simulacao, nada gravado)' : ''}`);
console.log(`  ${arquivos.length} materias no acervo`);
console.log(`  ${feitas} receberam os botoes`);
console.log(`  ${puladas} ja tinham`);
if (semAncora) console.log(`  ${semAncora} sem o link de volta — nao alteradas`);
console.log('');
