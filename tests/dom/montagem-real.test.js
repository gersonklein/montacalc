'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { JSDOM, Dom, Codegen } = require('../helpers');

/*
 * O CÓDIGO GERADO é a única fonte da montagem: não existem funções prontas
 * (criarCorpo/criarVisor/adicionarBotao) injetadas por fora. Estes testes rodam
 * exatamente o texto que o aluno lê no painel de código e conferem o DOM que sai.
 */
function rodar(setup) {
  const win = new JSDOM('<!doctype html><html><head></head><body></body></html>', { runScripts: 'dangerously' }).window;
  win.eval(Codegen.codegen({ version: 2, setup, handlers: [] }));
  return win;
}

function setupCompleto() {
  const setup = [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }];
  Dom.BUTTONS.forEach((b) => setup.push({ op: 'ui.addButton', token: b.token }));
  return setup;
}

test('o código gerado monta a calculadora equivalente à referência', () => {
  const doc = rodar(setupCompleto()).document;
  const tela = doc.querySelector('#tela');
  assert.ok(tela, 'visor #tela presente');
  assert.strictEqual(tela.getAttribute('readonly'), '', 'visor readonly');
  assert.strictEqual(tela.getAttribute('maxlength'), '18', 'maxlength 18');
  assert.strictEqual(tela.getAttribute('class'), 'resultado');
  assert.strictEqual(doc.querySelectorAll('tr').length, 6, '1 linha do visor + 5 do teclado');
  assert.strictEqual(doc.querySelectorAll('[data-btn]').length, 18, '18 botões');
  assert.ok(doc.querySelector('form[name="formulario"]'), 'formulario presente');
});

test('o código gerado também traz o CSS (a aparência não vem de fora)', () => {
  const doc = rodar([{ op: 'ui.createBody' }]).document;
  const estilo = doc.querySelector('head style');
  assert.ok(estilo, '<style> criado pelo próprio programa');
  assert.match(estilo.textContent, /\.botao\s*\{/, 'regra .botao');
  assert.match(estilo.textContent, /\.resultado\s*\{/, 'regra .resultado');
  assert.match(estilo.textContent, /#BDA442/, 'cor do visor igual à de estilos.css');
});

test('o CORPO já nasce completo: 6x4 casas antes de qualquer peça', () => {
  const doc = rodar([{ op: 'ui.createBody' }]).document;
  const rows = doc.querySelectorAll('tr');
  assert.strictEqual(rows.length, 6, 'a moldura completa já existe no nível 1');
  assert.strictEqual(rows[0].querySelectorAll('td').length, 1, 'linha do visor: 1 casa...');
  assert.strictEqual(rows[0].querySelector('td').getAttribute('colspan'), '4', '...com colspan 4');
  for (let r = 1; r < 6; r++) {
    assert.strictEqual(rows[r].querySelectorAll('td').length, 4, `linha ${r} com 4 casas`);
  }
  assert.strictEqual(doc.querySelectorAll('[data-btn]').length, 0, 'nenhum botão ainda');
  assert.strictEqual(doc.querySelector('#tela'), null, 'nenhum visor ainda');
});

test('a grade NÃO cresce: adicionar peças não muda o número de linhas/casas', () => {
  const contar = (doc) => ({
    linhas: doc.querySelectorAll('tr').length,
    casas: doc.querySelectorAll('td').length
  });
  const soCorpo = contar(rodar([{ op: 'ui.createBody' }]).document);
  const comVisor = contar(rodar([{ op: 'ui.createBody' }, { op: 'ui.createVisor' }]).document);
  const completa = contar(rodar(setupCompleto()).document);
  assert.deepStrictEqual(comVisor, soCorpo, 'o visor preenche a casa que já existia');
  assert.deepStrictEqual(completa, soCorpo, 'os botões preenchem casas que já existiam');
});

test('cada tecla vai para a sua casa definitiva (B11)', () => {
  const doc = rodar(setupCompleto()).document;
  const rows = doc.querySelectorAll('tr');
  const grid = [];
  for (let r = 1; r < rows.length; r++) {
    const line = [];
    rows[r].querySelectorAll('td').forEach((td) => {
      const b = td.querySelector('[data-btn]');
      line.push(b ? b.getAttribute('data-btn') : '');
    });
    grid.push(line);
  }
  assert.deepStrictEqual(grid, [
    ['C', 'del', '-', '+'],
    ['1', '2', '3', '/'],
    ['4', '5', '6', '*'],
    ['7', '8', '9', '='],
    ['.', '0', '', '']
  ]);
});

test('montagem parcial: a tecla 7 já ocupa a casa definitiva dela', () => {
  const doc = rodar([{ op: 'ui.createBody' }, { op: 'ui.createVisor' }, { op: 'ui.addButton', token: '7' }]).document;
  assert.deepStrictEqual(
    Array.from(doc.querySelectorAll('[data-btn]')).map((b) => b.getAttribute('data-btn')),
    ['7']
  );
  const slot = Dom.buttonSlot('7');
  const td = doc.querySelectorAll('tr')[slot.row].querySelectorAll('td')[slot.col];
  assert.ok(td.querySelector('[data-btn="7"]'), '7 na linha 4, coluna 0 — a mesma da referência');
});
