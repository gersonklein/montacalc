'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Serialize, Validate } = require('../helpers');

// Mock de workspace Blockly (só a API que serializeWorkspace consome), para testar a ponte
// BLOCOS -> IR sem depender do render Blockly (que o jsdom não suporta: usa fetch/AudioContext).
function mockBlock(type, fields, next) {
  const b = {
    type,
    _fields: fields || {},
    _next: next || null,
    _inputs: {},
    getFieldValue(name) { return this._fields[name]; },
    getNextBlock() { return this._next; },
    getParent() { return this._parent || null; },
    setParent(p) { this._parent = p; return this; },
    getInputTargetBlock(name) { return this._inputs[name] || null; }
  };
  if (next) next.setParent(b);
  return b;
}

function mockWorkspace(blocks) {
  return { getAllBlocks() { return blocks; } };
}

// Monta uma pilha de estrutura (q_iniciar -> e_corpo -> e_visor -> e_botao(token)).
function structStack(token) {
  const botao = mockBlock('e_botao', { BOT: token });
  const visor = mockBlock('e_visor', null, botao);
  const corpo = mockBlock('e_corpo', null, visor);
  const iniciar = mockBlock('q_iniciar', null, corpo);
  return [iniciar, corpo, visor, botao];
}

test('serializeWorkspace: bloco evento + acrescentar -> IR', () => {
  const ac = mockBlock('a_acrescentar', { VALOR: '7' });
  const hat = mockBlock('q_botao', { BTN: '7' }, ac);
  const ws = mockWorkspace([hat, ac]);
  const ir = Serialize.serializeWorkspace(ws);
  assert.strictEqual(ir.handlers[0].button, '7');
  assert.deepStrictEqual(ir.handlers[0].body, [{ op: 'display.append', value: '7' }]);
});

test('serializeWorkspace: apenas hats de topo viram handlers', () => {
  // um bloco a_calcular que tem parent (não é hat) não vira handler
  const ac = mockBlock('a_calcular');
  const hat = mockBlock('q_botao', { BTN: '=' }, ac);
  const orphan = mockBlock('a_limpar');
  const ws = mockWorkspace([hat, ac, orphan]);
  const ir = Serialize.serializeWorkspace(ws);
  assert.strictEqual(ir.handlers.length, 1);
  assert.strictEqual(ir.handlers[0].button, '=');
  assert.deepStrictEqual(ir.handlers[0].body, [{ op: 'display.evaluate' }]);
});

test('serializeWorkspace: múltiplas ações empilhadas', () => {
  const a2 = mockBlock('a_acrescentar', { VALOR: '2' });
  const a1 = mockBlock('a_acrescentar', { VALOR: '1' }, a2);
  const hat = mockBlock('q_botao', { BTN: '1' }, a1);
  const ws = mockWorkspace([hat, a1, a2]);
  const ir = Serialize.serializeWorkspace(ws);
  assert.strictEqual(ir.handlers[0].body.length, 2);
  assert.strictEqual(ir.handlers[0].body[1].value, '2');
});

test('serializeWorkspace: bloco tentar com tentar/capturar', () => {
  const guard = mockBlock('tentar');
  const tente = mockBlock('a_calcular');
  const seErro = mockBlock('a_mostrar_erro', { VALOR: 'Erro' });
  guard._inputs.TENTE = tente; tente.setParent(guard);
  guard._inputs.SEERRO = seErro; seErro.setParent(guard);
  const hat = mockBlock('q_botao', { BTN: '=' }, guard);
  const ws = mockWorkspace([hat, guard, tente, seErro]);
  const ir = Serialize.serializeWorkspace(ws);
  assert.strictEqual(ir.handlers[0].body[0].op, 'try');
  assert.deepStrictEqual(ir.handlers[0].body[0]['try'], [{ op: 'display.evaluate' }]);
  assert.deepStrictEqual(ir.handlers[0].body[0]['catch'], [{ op: 'expression.setValue', value: 'Erro' }]);
});

test('serializeWorkspace: q_iniciar com estrutura vira setup (v2)', () => {
  const ac = mockBlock('a_acrescentar', { VALOR: '7' });
  const hat = mockBlock('q_botao', { BTN: '7' }, ac);
  const struct = structStack('7');
  const ws = mockWorkspace(struct.concat([hat, ac]));
  const ir = Serialize.serializeWorkspace(ws);
  assert.strictEqual(ir.version, 2);
  assert.deepStrictEqual(ir.setup, [
    { op: 'ui.createBody' }, { op: 'ui.createVisor' }, { op: 'ui.addButton', token: '7' }
  ]);
  assert.deepStrictEqual(ir.handlers[0].body, [{ op: 'display.append', value: '7' }]);
  assert.strictEqual(Validate.validateIR(ir).ok, true);
});
