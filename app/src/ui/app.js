/*
 * MontaCalc — Bootstrap da interface.
 * Conecta: Blockly (blocos) -> codegen (código) -> sandbox (preview/comportamento),
 * feedback e progresso (localStorage). Executar/testar/dica/reiniciar.
 *
 * MONTAGEM ADITIVA: o workspace do aluno CRESCE nível a nível (a calculadora é construída
 * do zero). O sandbox começa vazio e é o código gerado que monta corpo/visor/botões.
 * Persistência: progresso + workspace + snapshots por nível concluído.
 */
(function(root) {
  'use strict';
  var M = root.MontaCalc;
  var Blockly = root.Blockly;
  var TOTAL = M.Levels.LEVELS.length;

  var CURRENT_LEVEL = 1;
  var DICA_INDEX = 0;
  var progress = { level: 1, stars: 0, completed: {} };

  var WS_KEY = 'montacalc-workspace-v2';
  var PROG_KEY = 'montacalc-progress-v2';
  function snapKey(id) { return 'montacalc-snap-' + id; }

  function loadProgress() {
    try {
      var raw = localStorage.getItem(PROG_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && typeof p.level === 'number') progress = p;
      }
    } catch (e) { /* ignora */ }
    CURRENT_LEVEL = progress.level || 1;
  }
  function saveProgress() {
    try { localStorage.setItem(PROG_KEY, JSON.stringify(progress)); } catch (e) {}
  }

  // ---- DOM refs ----
  var el = {};
  function $(id) { return document.getElementById(id); }

  // ---- código / sandbox ----
  var workspace = null;
  var sandbox = null;
  var currentCode = null;   // { html, css, js } — as 3 partes do programa gerado

  function currentLevel() { return M.Levels.getLevel(CURRENT_LEVEL); }

  function renderHeader() {
    var lvl = currentLevel();
    el.nivel.textContent = 'Nível ' + CURRENT_LEVEL + '/' + TOTAL;
    el.objetivo.textContent = lvl ? lvl.objetivo : '';
    renderProgressDots();
    el.pontos.textContent = progress.stars;
  }

  function renderProgressDots() {
    var html = '';
    for (var i = 1; i <= TOTAL; i++) {
      var state;
      if (progress.completed[i]) state = 'done';
      else if (i === CURRENT_LEVEL) state = 'current';
      else if (i <= progress.level) state = 'open';
      else state = 'future';
      html += '<span class="dot ' + state + '" data-level="' + i + '"></span>';
    }
    el.dots.innerHTML = html;
    el.dots.querySelectorAll('.dot').forEach(function(dot) {
      dot.addEventListener('click', function() {
        var l = parseInt(dot.getAttribute('data-level'), 10);
        if (l <= progress.level) goToLevel(l);
      });
    });
  }

  // ---- Novidades do nível (blocos novos) ----
  function escapeAttrs(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function renderNovidades(level) {
    var feats = M.Levels.newFeatures(level.id);
    var botoes = (feats.botoes || []).slice().sort();
    var blocos = feats.blocos || [];
    var hasOco = botoes.length > 0 || blocos.length > 0;
    if (el.novidadesBar) el.novidadesBar.hidden = !hasOco;
    if (!el.novidadesList || !hasOco) return;

    var html = '';
    if (botoes.length) {
      html += '<div class="nov-item"><span class="nov-botao">Botões novos: ' + botoes.join(', ') + '</span></div>';
    }
    blocos.forEach(function(b) {
      var tipo = b.tipo;
      var catLabel = M.Levels.blockCategory(tipo) || 'Visor';
      var cat = catLabel;
      html += '<div class="nov-item"><span class="nov-chip cat-' + escapeAttrs(cat) + '">' + escapeAttrs(catLabel) + '</span>' +
        ' <span class="nov-txt">' + escapeAttrs(b.texto) + '</span></div>';
    });
    el.novidadesList.innerHTML = html;
  }
  function cardHtml(level) {
    var feats = M.Levels.newFeatures(level.id);
    var botoes = (feats.botoes || []).slice().sort();
    var blocos = feats.blocos || [];
    var html = '';
    if (botoes.length) {
      html += '<div class="novo-section-title">Botões novos</div>';
      html += '<div class="nov-item"><span class="nov-botao">' + botoes.join(', ') + '</span></div>';
    }
    if (blocos.length) {
      html += '<div class="novo-section-title">Blocos novos</div>';
      blocos.forEach(function(b) {
        var cat = M.Levels.blockCategory(b.tipo) || 'Visor';
        html += '<div class="nov-item"><span class="nov-chip cat-' + escapeAttrs(cat) + '">' + escapeAttrs(cat) + '</span>' +
          ' <span class="nov-txt">' + escapeAttrs(b.texto) + '</span></div>';
      });
    }
    return html || '<div class="nov-item">Nada novo neste nível — já viu tudo antes!</div>';
  }
  function showNovoCard(level) {
    if (!el.novoOverlay || !el.novoCorpo) return;
    el.novoCorpo.innerHTML = cardHtml(level);
    el.novoOverlay.hidden = false;
  }

  // ---- persistência do workspace ----
  function workspaceXml() {
    try { return Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(workspace)); } catch (e) { return ''; }
  }
  // Blockly 13 moveu textToDom para Blockly.utils.xml (não existe mais em Blockly.Xml).
  function xmlTextToDom(xml) {
    if (Blockly.utils && Blockly.utils.xml && Blockly.utils.xml.textToDom) {
      return Blockly.utils.xml.textToDom(xml);
    }
    if (Blockly.Xml.textToDom) return Blockly.Xml.textToDom(xml);
    return new DOMParser().parseFromString(xml, 'text/xml').documentElement;
  }

  function loadWorkspaceXml(xml) {
    if (!xml || !workspace) return;
    try {
      Blockly.Xml.domToWorkspace(xmlTextToDom(xml), workspace);
    } catch (e) { /* XML inválido: ignora */ }
  }
  function saveWorkspace() {
    var xml = workspaceXml();
    if (xml) { try { localStorage.setItem(WS_KEY, xml); } catch (e) {} }
  }

  // Substitui o conteúdo do workspace (nunca carrega POR CIMA: isso duplicaria os blocos).
  function replaceWorkspaceXml(xml) {
    if (!workspace) return;
    workspace.clear();
    loadWorkspaceXml(xml);
  }

  // Restaura o baseline do nível: snapshot do nível anterior (acúmulo) ou workspace salvo.
  function restoreBaseline(id) {
    var xml = id > 1 ? localStorage.getItem(snapKey(id - 1)) : null;
    if (!xml) xml = localStorage.getItem(WS_KEY);
    replaceWorkspaceXml(xml);
    saveWorkspace();
  }

  function goToLevel(id) {
    CURRENT_LEVEL = id;
    progress.level = Math.max(progress.level, id);
    DICA_INDEX = 0;
    clearTimeout(nextTimer);
    saveProgress();
    updateToolboxForLevel();
    restoreBaseline(id);
    renderHeader();
    buildSandbox();
    updateCode();
    el.nextBtn.style.display = 'none';
    feedback('Nível ' + id + ': monte os blocos e clique em Testar.');
    renderNovidades(currentLevel());
    showNovoCard(currentLevel());
  }

  function toolboxForCurrent() {
    var level = currentLevel();
    var feats = M.Levels.newFeatures(level.id);
    return M.BlockDefs.toolboxFor(level, { newCats: feats.categorias || [] });
  }
  function updateToolboxForLevel() {
    var level = currentLevel();
    // dropdown: todos os botões já liberados (acúmulo), para não reescrever blocos antigos
    M.BlockDefs.setAllowedButtons(M.Levels.cumulativeButtons(level.id));
    if (workspace) {
      try { workspace.updateToolbox(toolboxForCurrent()); } catch (e) {}
    }
  }

  function initWorkspace() {
    if (workspace) { try { workspace.dispose(); } catch (e) {} workspace = null; }
    el.blockDiv.innerHTML = '';
    var level = currentLevel();
    // dropdown: todos os botões já liberados (acúmulo), para não reescrever blocos antigos
    M.BlockDefs.setAllowedButtons(M.Levels.cumulativeButtons(level.id));
    workspace = Blockly.inject(el.blockDiv, {
      toolbox: toolboxForCurrent(),
      grid: { spacing: 20, length: 3, colour: '#e6e6e6', snap: true },
      zoom: { controls: true, wheel: true, startScale: 1.0, maxScale: 1.4, minScale: 0.6 },
      trashcan: true,
      renderer: 'zelos',
      move: { scrollbars: true, drag: true, wheel: true }
    });
    workspace.addChangeListener(onWorkspaceChange);
    // restaura o trabalho em andamento (workspace salvo)
    var saved = localStorage.getItem(WS_KEY);
    if (saved) loadWorkspaceXml(saved);
  }

  // ---- painel de código ----
  // O código mostrado é REAL (o mesmo que roda), em 3 caixas: HTML, CSS e JavaScript.
  // Destacamos comentários, textos e palavras-chave para o aluno separar
  // "o que o computador faz" de "a explicação".
  var PALAVRAS = 'function|return|var|for|if|else|try|catch|new|true|false|null';
  var TOKENS = new RegExp(
    '(\\/\\/[^\\n]*)' +           // comentário de linha
    '|(`[^`]*`)' +                // texto entre crases
    "|('(?:[^'\\\\\\n]|\\\\.)*')" + // texto entre aspas simples
    '|("(?:[^"\\\\\\n]|\\\\.)*")' + // texto entre aspas duplas
    '|\\b(' + PALAVRAS + ')\\b', 'g');

  // HTML (já escapado): <!-- comentário -->, nome da tag, atributo="valor".
  var TOKENS_HTML = /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)|([a-zA-Z-]+)=("[^"]*")/g;
  // CSS: /* comentário */, seletor antes de "{", propriedade antes de ":", valores (#cor, 40px).
  var TOKENS_CSS = /(\/\*[\s\S]*?\*\/)|([.#]?[a-zA-Z][\w-]*)(\s*\{)|([a-z-]+)(\s*:)|(#[0-9A-Fa-f]{3,6}\b|\d+px)/g;

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function span(cls, txt) { return '<span class="' + cls + '">' + txt + '</span>'; }

  function realcar(code) {
    return escapeHtml(code).replace(TOKENS, function(m, comentario, crase, aspa1, aspa2, palavra) {
      if (comentario) return span('c-com', comentario);
      if (crase || aspa1 || aspa2) return span('c-str', crase || aspa1 || aspa2);
      return span('c-kw', palavra);
    });
  }

  function realcarHtml(code) {
    return escapeHtml(code).replace(TOKENS_HTML, function(m, comentario, abre, tag, attr, valor) {
      if (comentario) return span('c-com', comentario);
      if (tag) return abre + span('c-tag', tag);
      return span('c-attr', attr) + '=' + span('c-str', valor);
    });
  }

  function realcarCss(code) {
    return escapeHtml(code).replace(TOKENS_CSS, function(m, comentario, seletor, chave, prop, doisPontos, valor) {
      if (comentario) return span('c-com', comentario);
      if (seletor) return span('c-tag', seletor) + chave;
      if (prop) return span('c-prop', prop) + doisPontos;
      return span('c-str', valor);
    });
  }

  // Troca o conteúdo de uma caixa sem perder o lugar da leitura (cada uma rola sozinha).
  function mostrarCodigo(pre, html) {
    if (!pre) return;
    var pos = pre.scrollTop;
    pre.innerHTML = html;
    pre.scrollTop = pos;
  }

  function renderCode(parts) {
    parts = parts || {};
    mostrarCodigo(el.codeHtml, realcarHtml(parts.html || ''));
    mostrarCodigo(el.codeCss, realcarCss(parts.css || ''));
    mostrarCodigo(el.codeJs, realcar(parts.js || ''));
  }

  var debounceTimer = null;
  function onWorkspaceChange(e) {
    if (e && (e.isUiEvent || e.type === Blockly.Events.FINISHED_LOADING)) { /* ignore */ }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() { saveWorkspace(); updateCode(); }, 150);
  }

  function clearWorkspace() {
    if (!workspace) return;
    workspace.clear();
  }

  function updateCode() {
    var ir = M.Serialize.serializeWorkspace(workspace);
    var check = M.Validate.validateIR(ir);
    var code = M.Codegen.codegen(ir);
    currentCode = code;
    renderCode(code);

    if (ir.handlers.length === 0 && ir.setup.length === 0) {
      feedback('Arraste os blocos para montar a calculadora.');
    } else if (!check.ok) {
      feedback('⚠️ ' + check.errors.join('; '), 'error');
    } else if (el.feedback && el.feedback.dataset.sticky === '1') {
      // uma dica (💡) em andamento não some ao mexer nos blocos
    } else {
      feedback('Programa atualizado! Clique em "Executar" ou teste na calculadora.');
    }
    // instala no sandbox
    if (sandbox) sandbox.setCode(code);
  }

  function buildSandbox() {
    if (sandbox) sandbox.destroy();
    sandbox = M.Sandbox.createSandbox(el.preview, {});
    if (currentCode) sandbox.setCode(currentCode);
  }

  // ---- feedback / dicas ----
  function feedback(msg, type) {
    el.feedback.textContent = msg;
    el.feedback.className = 'feedback ' + (type || '');
    // mensagens de sucesso/erro "prendem" a atenção: uma dica em andamento dá lugar a elas
    if (type) delete el.feedback.dataset.sticky;
  }

  function showSuccess(msg) {
    feedback(msg, 'success');
  }

  // ---- execução e verificação ----
  function runExecutar() {
    if (sandbox && currentCode) sandbox.setCode(currentCode);
    showSuccess('▶ Programa executado: clique nos botões da calculadora.');
  }

  function structMatches(st, expected) {
    if (!st) return false;
    if (st.hasBody !== !!expected.corpo) return false;
    if (st.hasVisor !== !!expected.visor) return false;
    var a = (st.buttons || []).slice().sort();
    var e = (expected.botoes || []).slice().sort();
    return a.length === e.length && a.every(function(x, i) { return x === e[i]; });
  }

  // O programa possui o bloco "tentar" em algum lugar? (proteção contra erro no nível 12)
  function irHasTry(ir) {
    return (ir.handlers || []).some(function(h) {
      return (h.body || []).some(function(op) { return op.op === 'try'; });
    });
  }

  async function runTestar() {
    var level = currentLevel();
    var ir = M.Serialize.serializeWorkspace(workspace);
    var check = M.Validate.validateIR(ir);
    if (!check.ok) {
      feedback('⚠️ ' + check.errors.join('; '), 'error');
      return;
    }
    if (ir.handlers.length === 0 && ir.setup.length === 0) {
      feedback('Arraste os blocos para montar a calculadora.', 'error');
      return;
    }
    var code = M.Codegen.codegen(ir);
    currentCode = code;
    renderCode(code);
    var installed = sandbox.setCode(code);
    if (installed && typeof installed.then === 'function') await installed;
    feedback('Testando...');
    var allPass = true;
    var failures = 0;
    var failMsg = '';
    for (var i = 0; i < level.casos.length; i++) {
      var caso = level.casos[i];
      if (caso.estrutura) {
        var st = await sandbox.struct();
        if (!structMatches(st, caso.estrutura)) { allPass = false; failures++; failMsg = 'estrutura incompleta (faltam peças na calculadora)'; }
      } else {
        var value = await sandbox.runCase(caso.clicks);
        if (value !== caso.espera) {
          allPass = false; failures++;
          if (caso.espera === 'Erro' && !irHasTry(ir)) {
            failMsg = 'a conta quebrou a calculadora — envolva o "calcular o visor" com o bloco roxo "tentar" (categoria Lógica)';
          } else {
            failMsg = caso.clicks.join(' ') + ' -> "' + value + '" (esperado "' + caso.espera + '")';
          }
        }
      }
    }
    if (allPass) {
      completeLevel(level);
    } else {
      feedback('Ainda não: ' + failures + ' teste(s) falhou(aram). ' + failMsg, 'error');
    }
  }

  var nextTimer = null;
  function completeLevel(level) {
    if (!progress.completed[level.id]) {
      progress.completed[level.id] = true;
      progress.stars += 10;
    }
    // snapshot do nível concluído (acúmulo para o próximo nível)
    var xml = workspaceXml();
    if (xml) { try { localStorage.setItem(snapKey(level.id), xml); } catch (e) {} }
    var isLast = level.id >= TOTAL;
    if (isLast) {
      feedback('🏆 Você construiu a calculadora do zero e a blindou! (Bloco -> Código -> Comportamento)', 'success');
    } else {
      feedback('✅ Nível ' + level.id + ' concluído! Preparando o próximo nível...', 'success');
    }
    if (progress.level < TOTAL) progress.level = level.id + 1;
    saveProgress();
    renderHeader();
    if (isLast) {
      el.nextBtn.style.display = 'none';
      return;
    }
    el.nextBtn.style.display = 'block';
    el.nextBtn.textContent = 'Próximo nível ▶ (' + (level.id + 1) + ')';
    el.nextBtn.dataset.next = level.id + 1;
    clearTimeout(nextTimer);
    nextTimer = setTimeout(function() { goToLevel(level.id + 1); }, 1600);
  }

  function doDica() {
    var level = currentLevel();
    if (!level) return;
    var dicas = level.dicas;
    if (DICA_INDEX < dicas.length) {
      setStickyFeedback('💡 ' + dicas[DICA_INDEX]);
      DICA_INDEX++;
    } else {
      setStickyFeedback('💡 Dica: compare seu código gerado com o comportamento esperado.');
    }
  }

  // Marca a dica como "fixa": ela continua visível até a próxima ação de ter/executar.
  function setStickyFeedback(msg) {
    feedback(msg);
    if (el.feedback) el.feedback.dataset.sticky = '1';
  }

  function resetLevel() {
    var xml = CURRENT_LEVEL > 1 ? localStorage.getItem(snapKey(CURRENT_LEVEL - 1)) : null;
    replaceWorkspaceXml(xml);
    saveWorkspace();
    updateCode();
    feedback('Nível reiniciado. Monte de novo!');
  }

  function init() {
    loadProgress();
    ['nivel','objetivo','dots','pontos','blockDiv','codeHtml','codeCss','codeJs','preview','feedback','dicaBtn','execBtn','testBtn','nextBtn','resetBtn',
     'novidadesBar','novidadesList','novoBtn','novoOverlay','novoCorpo','novoEntendi'].forEach(function(id) {
      el[id] = $(id);
    });

    renderHeader();
    initWorkspace();
    updateCode();
    buildSandbox();
    renderNovidades(currentLevel());
    showNovoCard(currentLevel());

    el.execBtn.addEventListener('click', runExecutar);
    el.testBtn.addEventListener('click', runTestar);
    el.dicaBtn.addEventListener('click', doDica);
    el.resetBtn.addEventListener('click', resetLevel);
    el.nextBtn.addEventListener('click', function() {
      clearTimeout(nextTimer);
      var n = parseInt(el.nextBtn.dataset.next, 10);
      if (n >= 1 && n <= TOTAL) { goToLevel(n); }
      el.nextBtn.style.display = 'none';
    });
    if (el.novoEntendi) el.novoEntendi.addEventListener('click', function() { el.novoOverlay.hidden = true; });
    if (el.novoBtn) el.novoBtn.addEventListener('click', function() { showNovoCard(currentLevel()); });
    if (el.novoOverlay) el.novoOverlay.addEventListener('click', function(e) { if (e.target === el.novoOverlay) el.novoOverlay.hidden = true; });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
