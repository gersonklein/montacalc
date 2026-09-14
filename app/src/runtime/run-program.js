/*
 * MontaCalc — Execução de um programa (IR) num contexto JS (jsdom ou sandbox do host).
 * O código do estudante é SEMPRE o código gerado pelo codegen (nunca JS do estudante).
 * `installProgram` avalia código gerado no escopo global de `win`.
 * Simulador: reset, click(token), value().
 */
(function(root) {
  'use strict';

  // Instala (avalia) o programa gerado a partir do IR no contexto `win`.
  function installProgram(ir, win, opts) {
    opts = opts || {};
    var code = root.MontaCalc.Codegen.codegen(ir);
    // garante a função matemática global disponível para o código gerado
    var avaliar = opts.avaliar;
    if (!avaliar && root.MontaCalc && root.MontaCalc.Evaluator) avaliar = root.MontaCalc.Evaluator.evaluate;
    if (!avaliar && win.MontaCalc && win.MontaCalc.Evaluator) avaliar = win.MontaCalc.Evaluator.evaluate;
    if (typeof win.avaliar !== 'function') win.avaliar = avaliar;
    // O código gerado vem em 3 partes e é instalado como no sandbox:
    // CSS num <style>, HTML no <body> e, por último, o JS do comportamento.
    var doc = win.document;
    var estilo = doc.createElement('style');
    estilo.textContent = code.css;
    doc.head.appendChild(estilo);
    doc.body.innerHTML = code.html;
    win.eval(code.js);
    return code;
  }

  // Cria um simulador de cliques sobre os botões do domínio `win`.
  function makeSimulator(win) {
    var tela = win.document.querySelector('#tela');
    var byToken = {};
    win.document.querySelectorAll('[data-btn]').forEach(function(btn) {
      byToken[btn.getAttribute('data-btn')] = btn;
    });
    return {
      reset: function() { if (tela) tela.value = ''; },
      click: function(token) {
        var btn = byToken[String(token)];
        if (!btn) throw new Error('Botão não encontrado: ' + token);
        btn.dispatchEvent(new win.Event('click', { bubbles: true }));
      },
      clicks: function(tokens) {
        tokens.forEach(function(t) { this.click(t); }.bind(this));
      },
      value: function() { return tela ? tela.value : ''; }
    };
  }

  var API = { installProgram: installProgram, makeSimulator: makeSimulator };
  root.MontaCalc = root.MontaCalc || {};
  root.MontaCalc.Runner = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
