'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const APP = path.join(__dirname, '..', '..', 'app');
const read = (p) => fs.readFileSync(path.join(APP, p), 'utf8');

// Carrega os módulos de núcleo no window de teste.
function loadCore(w) {
  ['src/runtime/evaluator.js', 'src/ir/validate.js', 'src/compiler/codegen.js',
   'src/runtime/calc-dom.js', 'src/runtime/sandbox.js'].forEach((f) => w.eval(read(f)));
}

// Simula o IFRAME do sandbox: um window separado com o script do srcdoc.
// (jsdom não executa scripts de srcdoc de iframe, então reproduzimos o conteúdo do srcdoc.)
function makeHarnessIframe(w) {
  const srcdoc = w.MontaCalc.Sandbox.buildSrcdoc('', w.MontaCalc.Evaluator.fnSource);
  const script = srcdoc.split('<script>')[1].split('</script>')[0];

  const fw = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously', pretendToBeVisual: true }).window;
  // corpo VAZIO: é o código instalado que monta a calculadora
  const messages = [];
  fw.parent = { postMessage: (m) => messages.push(m) };

  fw.eval(script);
  if (!fw.mcDone) fw.document.dispatchEvent(new fw.Event('DOMContentLoaded'));

  function send(payload) {
    fw.dispatchEvent(new fw.MessageEvent('message', { data: payload }));
  }
  function last(type) {
    const r = messages.filter((m) => m && m.type === type);
    return r[r.length - 1];
  }
  return { send, last, fw };
}

test('harness do sandbox: instala um programa e roda um caso (dígito)', () => {
  const w = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously' }).window;
  loadCore(w);
  const hf = makeHarnessIframe(w);

  const ir = {
    version: 2,
    setup: [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }, { op: 'ui.addButton', token: '7' }],
    handlers: [{ event: 'button.click', button: '7', body: [{ op: 'display.append', value: '7' }] }]
  };
  const code = w.MontaCalc.Codegen.codegen(ir);
  hf.send({ type: 'install', id: 'i1', code });
  assert.strictEqual(hf.last('caseResult'), undefined, 'ainda sem caseResult');

  hf.send({ type: 'case', id: 'c1', clicks: ['7'] });
  const r = hf.last('caseResult');
  assert.strictEqual(r.id, 'c1');
  assert.strictEqual(r.value, '7');
});

test('harness do sandbox: calculadora completa executa matemática via avaliar (Infinity)', () => {
  const w = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously' }).window;
  loadCore(w);
  const hf = makeHarnessIframe(w);

  const ir = {
    version: 2,
    setup: [
      { op: 'ui.createBody' }, { op: 'ui.createVisor' },
      { op: 'ui.addButton', token: '+' }, { op: 'ui.addButton', token: '/' },
      { op: 'ui.addButton', token: '5' }, { op: 'ui.addButton', token: '0' },
      { op: 'ui.addButton', token: '=' }
    ],
    handlers: [
      { event: 'button.click', button: '+', body: [{ op: 'display.append', value: ' + ' }] },
      { event: 'button.click', button: '/', body: [{ op: 'display.append', value: ' / ' }] },
      { event: 'button.click', button: '5', body: [{ op: 'display.append', value: '5' }] },
      { event: 'button.click', button: '0', body: [{ op: 'display.append', value: '0' }] },
      { event: 'button.click', button: '=', body: [{ op: 'display.evaluate' }] }
    ]
  };
  hf.send({ type: 'install', id: 'i1', code: w.MontaCalc.Codegen.codegen(ir) });
  hf.send({ type: 'case', id: 'c1', clicks: ['5', '/', '0', '='] });
  assert.strictEqual(hf.last('caseResult').value, 'Infinity');
});

test('harness do sandbox: proteção (tentar/capturar) em expressão inválida -> Erro', () => {
  const w = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously' }).window;
  loadCore(w);
  const hf = makeHarnessIframe(w);

  const ir = {
    version: 2,
    setup: [
      { op: 'ui.createBody' }, { op: 'ui.createVisor' },
      { op: 'ui.addButton', token: '1' }, { op: 'ui.addButton', token: '+' }, { op: 'ui.addButton', token: '=' }
    ],
    handlers: [
      { event: 'button.click', button: '+', body: [{ op: 'display.append', value: ' + ' }] },
      { event: 'button.click', button: '1', body: [{ op: 'display.append', value: '1' }] },
      {
        event: 'button.click', button: '=',
        body: [{ op: 'try', 'try': [{ op: 'display.evaluate' }], 'catch': [{ op: 'expression.setValue', value: 'Erro' }] }]
      }
    ]
  };
  hf.send({ type: 'install', id: 'i1', code: w.MontaCalc.Codegen.codegen(ir) });
  hf.send({ type: 'case', id: 'c1', clicks: ['1', '+', '='] });
  assert.strictEqual(hf.last('caseResult').value, 'Erro');
});

test('harness do sandbox: struct reporta a estrutura montada', () => {
  const w = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously' }).window;
  loadCore(w);
  const hf = makeHarnessIframe(w);

  const ir = {
    version: 2,
    setup: [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }, { op: 'ui.addButton', token: '7' }],
    handlers: [{ event: 'button.click', button: '7', body: [{ op: 'display.append', value: '7' }] }]
  };
  hf.send({ type: 'install', id: 'i1', code: w.MontaCalc.Codegen.codegen(ir) });
  hf.send({ type: 'struct', id: 's1' });
  const r = hf.last('structResult');
  assert.strictEqual(r.id, 's1');
  assert.strictEqual(r.struct.hasBody, true);
  assert.strictEqual(r.struct.hasVisor, true);
  // via JSON (o array vem do realm do jsdom)
  assert.strictEqual(JSON.stringify(r.struct.buttons), JSON.stringify(['7']));
});
