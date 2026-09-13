'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { JSDOM, Dom, Sandbox, Evaluator, Codegen } = require('../helpers');

test('markup da calculadora replica a referência (estrutura)', () => {
  const doc = new JSDOM('<!doctype html><html><body>' + Dom.calculatorMarkup() + '</body></html>').window.document;
  const tela = doc.querySelector('#tela');
  assert.ok(tela, 'visor #tela presente');
  assert.strictEqual(tela.getAttribute('readonly'), '', 'visor readonly');
  assert.strictEqual(tela.getAttribute('maxlength'), '18', 'maxlength 18');

  const btns = doc.querySelectorAll('[data-btn]');
  assert.strictEqual(btns.length, 18, '18 botões');
  // layout 4 colunas: cada linha tem até 4 células; total de linhas-td contáveis via <tr>
  const rows = doc.querySelectorAll('tr');
  assert.strictEqual(rows.length, 6, '1 linha do visor + 5 do teclado');
});

test('presença de todos os botões (B11)', () => {
  const doc = new JSDOM('<!doctype html><html><body>' + Dom.calculatorMarkup() + '</body></html>').window.document;
  const tokens = Array.from(doc.querySelectorAll('[data-btn]')).map((b) => b.getAttribute('data-btn'));
  ['C','del','-','+','1','2','3','/','4','5','6','*','7','8','9','=','.','0'].forEach((t) => {
    assert.ok(tokens.includes(t), `botão ${t} presente`);
  });
});

test('markup progressivo: só os botões liberados do nível aparecem', () => {
  const doc = new JSDOM('<!doctype html><html><body>' + Dom.calculatorMarkup(['7']) + '</body></html>').window.document;
  assert.deepStrictEqual(
    Array.from(doc.querySelectorAll('[data-btn]')).map((b) => b.getAttribute('data-btn')),
    ['7']
  );
  // nível 3 libera 1,2,3
  const doc3 = new JSDOM('<!doctype html><html><body>' + Dom.calculatorMarkup(['1','2','3']) + '</body></html>').window.document;
  assert.deepStrictEqual(
    Array.from(doc3.querySelectorAll('[data-btn]')).map((b) => b.getAttribute('data-btn')),
    ['1','2','3']
  );
  // o visor está sempre presente
  assert.ok(doc.querySelector('#tela'), 'visor presente no teclado progressivo');
});

test('srcdoc do sandbox NAO traz a calculadora pronta: so avaliar + harness', () => {
  const src = Sandbox.buildSrcdoc('', Evaluator.fnSource);
  assert.match(src, /var avaliar = function parseEval/, 'a matematica e oferecida pelo ambiente');
  assert.match(src, /__install/);
  // o ambiente comeca vazio: nem estrutura nem estilo da calculadora
  assert.ok(!/form name="formulario"/.test(src), 'sem formulario pronto');
  assert.ok(!/data-btn="7"/.test(src), 'sem botoes prontos');
  assert.ok(!/\.botao\{|\.botao \{/.test(src), 'sem CSS da calculadora pronto');
});

test('quem traz estrutura e estilo e o codigo do aluno', () => {
  const code = Codegen.codegen({
    version: 2,
    setup: [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }, { op: 'ui.addButton', token: '7' }],
    handlers: [{ event: 'button.click', button: '7', body: [{ op: 'display.append', value: '7' }] }]
  });
  assert.match(code, /formulario/);
  assert.match(code, /#tela/);
  assert.match(code, /data-btn/);
  assert.match(code, /\.botao \{/);
});
