'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Serialize, Validate } = require('../helpers');

test('bloco q_botao + acrescentar -> IR display.append', () => {
  const tree = [
    { type: 'q_iniciar', stmt: [{ type: 'e_corpo' }, { type: 'e_visor' }, { type: 'e_botao', token: '7' }] },
    { type: 'q_botao', btn: '7', stmt: [{ type: 'a_acrescentar', value: '7' }] }
  ];
  const ir = Serialize.irFromBlocks(tree);
  assert.strictEqual(ir.version, 2);
  assert.strictEqual(ir.handlers[0].button, '7');
  assert.deepStrictEqual(ir.handlers[0].body, [{ op: 'display.append', value: '7' }]);
  assert.deepStrictEqual(ir.setup, [
    { op: 'ui.createBody' }, { op: 'ui.createVisor' }, { op: 'ui.addButton', token: '7' }
  ]);
  assert.strictEqual(Validate.validateIR(ir).ok, true);
});

test('bloco a_limpar -> display.clear', () => {
  const tree = [
    { type: 'q_iniciar', stmt: [{ type: 'e_corpo' }, { type: 'e_visor' }, { type: 'e_botao', token: 'C' }] },
    { type: 'q_botao', btn: 'C', stmt: [{ type: 'a_limpar' }] }
  ];
  const ir = Serialize.irFromBlocks(tree);
  assert.deepStrictEqual(ir.handlers[0].body, [{ op: 'display.clear' }]);
});

test('bloco a_apagar_ultimo -> display.deleteLast', () => {
  const tree = [
    { type: 'q_iniciar', stmt: [{ type: 'e_corpo' }, { type: 'e_visor' }, { type: 'e_botao', token: 'del' }] },
    { type: 'q_botao', btn: 'del', stmt: [{ type: 'a_apagar_ultimo' }] }
  ];
  const ir = Serialize.irFromBlocks(tree);
  assert.deepStrictEqual(ir.handlers[0].body, [{ op: 'display.deleteLast' }]);
});

test('bloco a_inserir_op adiciona espaços', () => {
  const tree = [
    { type: 'q_iniciar', stmt: [{ type: 'e_corpo' }, { type: 'e_visor' }, { type: 'e_botao', token: '+' }] },
    { type: 'q_botao', btn: '+', stmt: [{ type: 'a_inserir_op', op: '+' }] }
  ];
  const ir = Serialize.irFromBlocks(tree);
  assert.deepStrictEqual(ir.handlers[0].body, [{ op: 'display.append', value: ' + ' }]);
});

test('bloco a_calcular -> display.evaluate', () => {
  const tree = [
    { type: 'q_iniciar', stmt: [{ type: 'e_corpo' }, { type: 'e_visor' }, { type: 'e_botao', token: '=' }] },
    { type: 'q_botao', btn: '=', stmt: [{ type: 'a_calcular' }] }
  ];
  const ir = Serialize.irFromBlocks(tree);
  assert.deepStrictEqual(ir.handlers[0].body, [{ op: 'display.evaluate' }]);
});

test('bloco tentar -> try/catch', () => {
  const tree = [
    { type: 'q_iniciar', stmt: [{ type: 'e_corpo' }, { type: 'e_visor' }, { type: 'e_botao', token: '=' }] },
    { type: 'q_botao', btn: '=', stmt: [{
      type: 'tentar',
      tente: [{ type: 'a_calcular' }],
      seErro: [{ type: 'a_mostrar_erro', value: 'Erro' }]
    }] }
  ];
  const ir = Serialize.irFromBlocks(tree);
  assert.strictEqual(ir.handlers[0].body[0].op, 'try');
  assert.deepStrictEqual(ir.handlers[0].body[0]['try'], [{ op: 'display.evaluate' }]);
  assert.deepStrictEqual(ir.handlers[0].body[0]['catch'], [{ op: 'expression.setValue', value: 'Erro' }]);
  assert.strictEqual(Validate.validateIR(ir).ok, true);
});

test('múltiplas ações no mesmo handler viram sequência', () => {
  const tree = [
    { type: 'q_iniciar', stmt: [{ type: 'e_corpo' }, { type: 'e_visor' }, { type: 'e_botao', token: '1' }] },
    { type: 'q_botao', btn: '1', stmt: [{ type: 'a_acrescentar', value: '1' }, { type: 'a_acrescentar', value: '2' }] }
  ];
  const ir = Serialize.irFromBlocks(tree);
  assert.strictEqual(ir.handlers[0].body.length, 2);
});

test('q_iniciar com estrutura vira setup (v2)', () => {
  const tree = [
    { type: 'q_iniciar', stmt: [{ type: 'e_corpo' }, { type: 'e_visor' }, { type: 'e_botao', token: '7' }, { type: 'e_botao', token: '2' }] },
    { type: 'q_botao', btn: '7', stmt: [{ type: 'a_acrescentar', value: '7' }] }
  ];
  const ir = Serialize.irFromBlocks(tree);
  assert.strictEqual(ir.version, 2);
  assert.deepStrictEqual(ir.setup, [
    { op: 'ui.createBody' }, { op: 'ui.createVisor' },
    { op: 'ui.addButton', token: '7' }, { op: 'ui.addButton', token: '2' }
  ]);
  assert.strictEqual(Validate.validateIR(ir).ok, true);
});
