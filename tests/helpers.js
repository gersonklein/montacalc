'use strict';
/*
 * MontaCalc — utilidades de teste.
 * - buildReferenceWindow(): calculadora da REFERÊNCIA (eval real, inline onclick), fiel a calc.html/operacoes.js.
 * - buildBlockWindow(): janela para instalar um programa de blocos (IR -> JS -> execução).
 * - referenceProgram(): IR completo que reconstruye a calculadora de referência.
 * - runSequence(win, clicks): acrescenta manualmente? Não — aqui expomos o simulador.
 */
const { JSDOM } = require('jsdom');

const Evaluator = require('../app/src/runtime/evaluator.js');
const Validate = require('../app/src/ir/validate.js');
const Codegen = require('../app/src/compiler/codegen.js');
const Dom = require('../app/src/runtime/calc-dom.js');
const Runner = require('../app/src/runtime/run-program.js');
const Serialize = require('../app/src/ir/serialize.js');
const Levels = require('../app/src/levels/levels.js');
const Sandbox = require('../app/src/runtime/sandbox.js');

const BASE_HTML = '<!DOCTYPE html><html lang="pt-br"><head><meta charset="utf-8"></head><body></body></html>';

function newWindow() {
  return new JSDOM(BASE_HTML, { runScripts: 'dangerously', pretendToBeVisual: true }).window;
}

function fillCalculator(window) {
  window.document.body.innerHTML = Dom.calculatorMarkup();
}

// ---- Referência: inline onclick fiel a calc.html ----
function wireReference(window) {
  // jsdom não suporta acesso nomeado legado document.formulario.tela; criamos o polyfill
  // para os funções de referência rodarem VERBATIM como em calc.html/operacoes.js.
  const formulario = window.document.querySelector('form[name="formulario"]');
  window.document.formulario = formulario;
  formulario.tela = window.document.querySelector('#tela');

  window.eval([
    'function limpar(){ document.formulario.tela.value = ""; }',
    'function deletar(){ var e = document.formulario.tela.value; document.formulario.tela.value = e.substring(0, e.length-1); }',
    'function inserir(valor){ document.formulario.tela.value = document.formulario.tela.value + valor; }',
    'function total(){ var r = document.formulario.tela.value; if(r){ document.formulario.tela.value = eval(r); } }'
  ].join('\n'));

  const mapping = {
    'C': 'limpar()',
    'del': 'deletar()',
    '-': "inserir(' - ')",
    '+': "inserir(' + ')",
    '*': "inserir(' * ')",
    '/': "inserir(' / ')",
    '.': "inserir('.')",
    '=': 'total()'
  };
  window.document.querySelectorAll('[data-btn]').forEach((btn) => {
    const t = btn.getAttribute('data-btn');
    if (mapping[t]) { btn.setAttribute('onclick', mapping[t]); }
    else { btn.setAttribute('onclick', `inserir(${t})`); }
  });
}

function buildReferenceWindow() {
  const win = newWindow();
  fillCalculator(win);
  wireReference(win);
  return win;
}

function simOf(win) { return Runner.makeSimulator(win); }

// ---- Programa de blocos (full) ----
function referenceProgram() {
  const setup = [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }];
  Dom.BUTTONS.forEach((b) => setup.push({ op: 'ui.addButton', token: b.token }));
  const handlers = [];
  Dom.BUTTONS.forEach((b) => {
    const t = b.token;
    let body;
    if (t === 'C') body = [{ op: 'display.clear' }];
    else if (t === 'del') body = [{ op: 'display.deleteLast' }];
    else if (t === '=') body = [{ op: 'display.evaluate' }];
    else if (t === '-' || t === '+' || t === '*' || t === '/') body = [{ op: 'display.append', value: ' ' + t + ' ' }];
    else body = [{ op: 'display.append', value: t }];
    handlers.push({ event: 'button.click', button: t, body });
  });
  const ir = { version: 2, setup, handlers };
  const check = Validate.validateIR(ir);
  if (!check.ok) throw new Error('referenceProgram inválido: ' + check.errors.join('; '));
  return ir;
}

function buildBlockWindow(ir) {
  const win = newWindow();
  // o programa constrói a própria calculadora (corpo/visor/botões) a partir do vazio
  Runner.installProgram(ir, win);
  return win;
}

// Programa protegido (nível 12): botão "=" usa try/catch p/ não quebrar em expressão inválida.
function protectedProgram() {
  const base = referenceProgram();
  base.handlers.forEach((h) => {
    if (h.button === '=') {
      h.body = [{ op: 'try', 'try': [{ op: 'display.evaluate' }], 'catch': [{ op: 'expression.setValue', value: 'Erro' }] }];
    }
  });
  const check = Validate.validateIR(base);
  if (!check.ok) throw new Error('protectedProgram inválido: ' + check.errors.join('; '));
  return base;
}

// Programa "correto" CUMULATIVO de um nível: constrói a estrutura dos botões já
// liberados (níveis 1..N) e liga o comportamento deles. Usado para validar que a
// progressão é alcançável (todos os casos do nível passam com o acúmulo esperado).
function programaDeNivel(level) {
  const btns = Levels.cumulativeButtons(level.id);
  const setup = [{ op: 'ui.createBody' }];
  if (level.id >= 2) setup.push({ op: 'ui.createVisor' });
  btns.forEach((t) => setup.push({ op: 'ui.addButton', token: t }));
  const handlers = btns.map((t) => {
    let body;
    if (t === 'C') body = [{ op: 'display.clear' }];
    else if (t === 'del') body = [{ op: 'display.deleteLast' }];
    else if (t === '=') body = [{ op: 'display.evaluate' }];
    else if (t === '-' || t === '+' || t === '*' || t === '/') body = [{ op: 'display.append', value: ' ' + t + ' ' }];
    else body = [{ op: 'display.append', value: t }];
    if (level.id === 12 && t === '=') body = [{ op: 'try', 'try': [{ op: 'display.evaluate' }], 'catch': [{ op: 'expression.setValue', value: 'Erro' }] }];
    return { event: 'button.click', button: t, body };
  });
  const ir = { version: 2, setup, handlers };
  const check = Validate.validateIR(ir);
  if (!check.ok) throw new Error('programaDeNivel inválido: ' + check.errors.join('; '));
  return ir;
}

module.exports = {
  Evaluator, Validate, Codegen, Dom, Runner, Serialize, Levels, Sandbox, JSDOM,
  newWindow, fillCalculator, buildReferenceWindow, buildBlockWindow,
  referenceProgram, protectedProgram, simOf, programaDeNivel
};
