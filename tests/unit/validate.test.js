'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Validate } = require('../helpers');

function validIR() {
  return { version: 1, handlers: [{ event: 'button.click', button: '7', body: [{ op: 'display.append', value: '7' }] }] };
}

test('IR válido passa', () => {
  assert.strictEqual(Validate.validateIR(validIR()).ok, true);
});
test('versão errada falha', () => {
  const ir = validIR(); ir.version = 3;
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});
test('programa vazio falha', () => {
  assert.strictEqual(Validate.validateIR({ version: 1, handlers: [] }).ok, false);
});
test('evento inválido falha', () => {
  const ir = validIR(); ir.handlers[0].event = 'key.press';
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});
test('botão inválido falha', () => {
  const ir = validIR(); ir.handlers[0].button = 'x';
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});
test('botão duplicado falha', () => {
  const ir = validIR();
  ir.handlers.push({ event: 'button.click', button: '7', body: [] });
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});
test('op desconhecida falha', () => {
  const ir = validIR(); ir.handlers[0].body = [{ op: 'foo' }];
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});
test('display.append sem value falha', () => {
  const ir = validIR(); ir.handlers[0].body = [{ op: 'display.append' }];
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});
test('try sem try[] falha', () => {
  const ir = validIR(); ir.handlers[0].body = [{ op: 'try' }];
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});
test('display.clear válido', () => {
  const ir = validIR(); ir.handlers[0].body = [{ op: 'display.clear' }];
  assert.strictEqual(Validate.validateIR(ir).ok, true);
});
test('try aninhado válido', () => {
  const ir = validIR();
  ir.handlers[0].body = [{ op: 'try', 'try': [{ op: 'display.evaluate' }], 'catch': [{ op: 'expression.setValue', value: 'Erro' }] }];
  assert.strictEqual(Validate.validateIR(ir).ok, true);
});

// ---- IR v2 (construção aditiva) ----
function validV2() {
  return {
    version: 2,
    setup: [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }, { op: 'ui.addButton', token: '7' }],
    handlers: [{ event: 'button.click', button: '7', body: [{ op: 'display.append', value: '7' }] }]
  };
}

test('IR v2 válido passa', () => {
  assert.strictEqual(Validate.validateIR(validV2()).ok, true);
});

test('v2: visor sem corpo falha', () => {
  const ir = validV2(); ir.setup = [{ op: 'ui.createVisor' }, { op: 'ui.addButton', token: '7' }];
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});

test('v2: corpo não pode vir depois (precisa ser o primeiro)', () => {
  const ir = validV2(); ir.setup = [{ op: 'ui.createVisor' }, { op: 'ui.createBody' }];
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});

test('v2: botão exige corpo e visor antes', () => {
  const ir = validV2(); ir.setup = [{ op: 'ui.createBody' }, { op: 'ui.addButton', token: '7' }];
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});

test('v2: handler exige botão adicionado no setup', () => {
  const ir = validV2(); ir.setup = [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }];
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});

test('v2: botão duplicado no setup falha', () => {
  const ir = validV2(); ir.setup.push({ op: 'ui.addButton', token: '7' });
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});

test('v2: ação do visor exige visor no setup', () => {
  const ir = validV2(); ir.setup = [{ op: 'ui.createBody' }, { op: 'ui.addButton', token: '7' }];
  assert.strictEqual(Validate.validateIR(ir).ok, false);
});

test('v2: só estrutura (corpo) é um programa válido (nível 1)', () => {
  const ir = { version: 2, setup: [{ op: 'ui.createBody' }], handlers: [] };
  assert.strictEqual(Validate.validateIR(ir).ok, true);
});

test('v2: corpo + visor sem botões é válido (nível 2)', () => {
  const ir = { version: 2, setup: [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }], handlers: [] };
  assert.strictEqual(Validate.validateIR(ir).ok, true);
});
