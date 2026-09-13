'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const APP_DIR = path.join(__dirname, '..', '..', 'app');
const INDEX = path.join(APP_DIR, 'index.html');

function refs(pattern) {
  const html = fs.readFileSync(INDEX, 'utf8');
  const srcs = [];
  const re = new RegExp('src="([^"]+)"', 'g');
  let m;
  while ((m = re.exec(html))) srcs.push(m[1]);
  const css = [];
  const cre = new RegExp('href="([^"]+\\.css)"', 'g');
  while ((m = cre.exec(html))) css.push(m[1]);
  return { html, srcs, css };
}

test('index.html referencia apenas arquivos existentes', () => {
  const { srcs, css } = refs();
  [...srcs, ...css].forEach((r) => {
    assert.ok(fs.existsSync(path.join(APP_DIR, r)), `recurso ausente: ${r}`);
  });
});

test('ordem dos scripts: Blockly antes do block-defs; core antes da UI', () => {
  const { srcs } = refs();
  const order = srcs;
  const idxBlockly = order.indexOf('vendor/blockly/blockly_compressed.js');
  const idxDefs = order.indexOf('src/blocks/block-defs.js');
  const idxEval = order.indexOf('src/runtime/evaluator.js');
  const idxApp = order.indexOf('src/ui/app.js');
  assert.ok(idxBlockly !== -1 && idxBlockly < idxDefs, 'Blockly carrega antes de block-defs');
  assert.ok(idxEval !== -1 && idxEval < idxApp, 'evaluator antes da UI');
  assert.ok(idxApp !== -1 && idxApp === order.length - 1, 'app.js é o último script');
});

test('index.html contém os painéis da UI', () => {
  const { html } = refs();
  ['blockDiv', 'code', 'preview', 'feedback', 'nivel', 'objetivo', 'dots'].forEach((id) => {
    assert.ok(html.includes('id="' + id + '"'), `falta id: ${id}`);
  });
});

test('index.html contém a interface de novidades (cartão + barra fixa)', () => {
  const { html } = refs();
  ['novidadesBar', 'novidadesList', 'novoBtn', 'novoOverlay', 'novoCorpo', 'novoEntendi'].forEach((id) => {
    assert.ok(html.includes('id="' + id + '"'), `falta id: ${id}`);
  });
});
