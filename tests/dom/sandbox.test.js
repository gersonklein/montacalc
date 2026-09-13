'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const APP = path.join(__dirname, '..', '..', 'app');
const read = (p) => fs.readFileSync(path.join(APP, p), 'utf8');

function env() {
  const dom = new JSDOM('<!doctype html><html><body><div id="preview"></div></body></html>', { runScripts: 'dangerously' });
  const w = dom.window;
  w.eval(read('src/runtime/evaluator.js'));
  w.eval(read('src/runtime/calc-dom.js'));
  w.eval(read('src/runtime/sandbox.js'));
  return w;
}

test('sandbox: runCase NÃO trava (responde sempre), mesmo sem resposta do iframe', async () => {
  const w = env();
  const sandbox = w.MontaCalc.Sandbox.createSandbox(w.document.getElementById('preview'), {
    timeout: 200 // curto só para o teste ser rápido
  });
  const start = Date.now();
  // jsdom não executa o script do srcdoc, então não há caseResult; o safety deve resolver.
  const value = await sandbox.runCase(['7']);
  const elapsed = Date.now() - start;
  assert.strictEqual(value, null, 'deve resolver (null) em vez de pendurar');
  assert.ok(elapsed < 3000, 'resolvido em tempo razoável (' + elapsed + 'ms)');
  sandbox.destroy();
});

test('sandbox: setCode não lança e não pendura', async () => {
  const w = env();
  const sandbox = w.MontaCalc.Sandbox.createSandbox(w.document.getElementById('preview'), {
    timeout: 200
  });
  const ok = await sandbox.setCode('var tela = document.querySelector("#tela"); tela.value = "x";');
  assert.strictEqual(typeof ok, 'boolean', 'setCode resolve com um booleano (instalou ou não)');
  const value = await sandbox.runCase(['7']);
  assert.strictEqual(value, null);
  sandbox.destroy();
});

test('sandbox: buildSrcdoc contém avaliar, __install e o harness de caso', () => {
  const w = env();
  const src = w.MontaCalc.Sandbox.buildSrcdoc('', w.MontaCalc.Evaluator.fnSource);
  assert.match(src, /var avaliar = function parseEval/);
  assert.match(src, /__install/);
  assert.match(src, /type === "install"/);
  assert.match(src, /type === "case"/);
  assert.match(src, /caseResult/);
});
