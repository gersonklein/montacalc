'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const APP = path.join(__dirname, '..', '..', 'app');
const read = (p) => fs.readFileSync(path.join(APP, p), 'utf8');

// Workspace Blockly "headless" (sem inject) para validar a PONTE real Bloco -> IR,
// incluindo as CONEXÕES de encaixe (propriedade que estava faltando).
function makeEnv() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously' });
  const w = dom.window;
  w.eval(read('vendor/blockly/blockly_compressed.js'));
  w.eval('window.Blockly.Msg = window.Blockly.Msg || {};');
  w.eval(read('vendor/blockly/pt-br.js'));
  ['src/ir/serialize.js', 'src/levels/levels.js', 'src/blocks/block-defs.js'].forEach((f) => w.eval(read(f)));
  return w;
}

test('bloco de evento tem conexão de encaixe (nextConnection)', () => {
  const w = makeEnv();
  const ws = new w.Blockly.Workspace();
  w.MontaCalc.BlockDefs.setAllowedButtons(['1', '2', '7']);
  const hat = ws.newBlock('q_botao');
  assert.ok(hat.nextConnection, 'q_botao deve ter nextConnection (o "encaixe" das ações)');
  const act = ws.newBlock('a_acrescentar');
  assert.ok(act.previousConnection, 'ação deve ter previousConnection');
  assert.ok(act.nextConnection, 'ação deve ter nextConnection (para encaixar na próxima)');
});

test('acões encaixam no bloco de evento e geram IR com corpo', () => {
  const w = makeEnv();
  const ws = new w.Blockly.Workspace();
  w.MontaCalc.BlockDefs.setAllowedButtons(['1', '2', '7']);
  const hat = ws.newBlock('q_botao'); hat.setFieldValue('1', 'BTN');
  const a1 = ws.newBlock('a_acrescentar'); a1.setFieldValue('1', 'VALOR');
  hat.nextConnection.connect(a1.previousConnection);
  const ir = JSON.parse(JSON.stringify(w.MontaCalc.Serialize.serializeWorkspace(ws)));
  assert.strictEqual(ir.handlers.length, 1);
  assert.deepStrictEqual(ir.handlers[0].body, [{ op: 'display.append', value: '1' }]);
  assert.strictEqual(ir.handlers[0].body.length, 1);
});

test('duas pilhas (dois eventos) geram dois handlers', () => {
  const w = makeEnv();
  const ws = new w.Blockly.Workspace();
  w.MontaCalc.BlockDefs.setAllowedButtons(['1', '2', '7']);
  const h1 = ws.newBlock('q_botao'); h1.setFieldValue('1', 'BTN');
  const a1 = ws.newBlock('a_acrescentar'); a1.setFieldValue('1', 'VALOR');
  h1.nextConnection.connect(a1.previousConnection);
  const h2 = ws.newBlock('q_botao'); h2.setFieldValue('2', 'BTN');
  const a2 = ws.newBlock('a_acrescentar'); a2.setFieldValue('2', 'VALOR');
  h2.nextConnection.connect(a2.previousConnection);
  const ir = w.MontaCalc.Serialize.serializeWorkspace(ws);
  assert.strictEqual(ir.handlers.length, 2);
  assert.strictEqual(ir.handlers[0].button, '1');
  assert.strictEqual(ir.handlers[1].button, '2');
});

test('blocos de estrutura encaixam no q_iniciar e geram setup', () => {
  const w = makeEnv();
  const ws = new w.Blockly.Workspace();
  w.MontaCalc.BlockDefs.setAllowedButtons(['7']);
  const iniciar = ws.newBlock('q_iniciar');
  const corpo = ws.newBlock('e_corpo');
  const visor = ws.newBlock('e_visor');
  const botao = ws.newBlock('e_botao'); botao.setFieldValue('7', 'BOT');
  iniciar.nextConnection.connect(corpo.previousConnection);
  corpo.nextConnection.connect(visor.previousConnection);
  visor.nextConnection.connect(botao.previousConnection);
  const ir = w.MontaCalc.Serialize.serializeWorkspace(ws);
  assert.strictEqual(ir.version, 2);
  // compara via JSON (os objetos vêm do realm do jsdom; deepStrictEqual acusa protótipo)
  assert.strictEqual(
    JSON.stringify(ir.setup),
    JSON.stringify([{ op: 'ui.createBody' }, { op: 'ui.createVisor' }, { op: 'ui.addButton', token: '7' }])
  );
});
