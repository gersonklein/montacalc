'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Codegen } = require('../helpers');

test('codegen registra listener no botão certo', () => {
  const ir = { version: 1, handlers: [{ event: 'button.click', button: '7', body: [{ op: 'display.append', value: '7' }] }] };
  const code = Codegen.codegen(ir);
  assert.match(code, /data-btn="7"/);
  assert.match(code, /addEventListener\('click'/);
  assert.match(code, /function aoClicar7/);
});
test('codegen usa avaliar para calcular', () => {
  const ir = { version: 1, handlers: [{ event: 'button.click', button: '=', body: [{ op: 'display.evaluate' }] }] };
  const code = Codegen.codegen(ir);
  assert.match(code, /avaliar\(tela\.value\)/);
});
test('codegen limpa visor', () => {
  const ir = { version: 1, handlers: [{ event: 'button.click', button: 'C', body: [{ op: 'display.clear' }] }] };
  const code = Codegen.codegen(ir);
  assert.match(code, /tela\.value = ''/);
});
test('codegen apaga último com slice', () => {
  const ir = { version: 1, handlers: [{ event: 'button.click', button: 'del', body: [{ op: 'display.deleteLast' }] }] };
  const code = Codegen.codegen(ir);
  assert.match(code, /slice\(0, tela\.value\.length - 1\)/);
});
test('codegen operador com espaços', () => {
  const ir = { version: 1, handlers: [{ event: 'button.click', button: '+', body: [{ op: 'display.append', value: ' + ' }] }] };
  const code = Codegen.codegen(ir);
  assert.match(code, /tela\.value \+ " \+ ";|tela\.value \+ ' \+ ';/);
});
test('codegen try/catch', () => {
  const ir = { version: 1, handlers: [{ event: 'button.click', button: '=', body: [{ op: 'try', 'try': [{ op: 'display.evaluate' }], 'catch': [{ op: 'expression.setValue', value: 'Erro' }] }] }] };
  const code = Codegen.codegen(ir);
  assert.match(code, /try \{/);
  assert.match(code, /\} catch \(e\) \{/);
  assert.match(code, /"Erro"|'Erro'/);
});
test('codegen é determinístico', () => {
  const ir = { version: 1, handlers: [{ event: 'button.click', button: '1', body: [{ op: 'display.append', value: '1' }] }] };
  assert.strictEqual(Codegen.codegen(ir), Codegen.codegen(ir));
});

// ---- IR v2: o codigo emitido e REAL (sem funcoes-caixa-preta) ----
test('codegen v2 emite os passos REAIS do DOM (nada de criarCorpo/criarVisor)', () => {
  const ir = {
    version: 2,
    setup: [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }, { op: 'ui.addButton', token: '7' }],
    handlers: [{ event: 'button.click', button: '7', body: [{ op: 'display.append', value: '7' }] }]
  };
  const code = Codegen.codegen(ir);
  assert.match(code, /function montarCalculadora\(\)/);
  assert.match(code, /montarCalculadora\(\);/);
  // corpo: tags de verdade, criadas com a API real do DOM
  assert.match(code, /document\.createElement\('form'\)/);
  assert.match(code, /document\.createElement\('table'\)/);
  assert.match(code, /document\.createElement\('td'\)/);
  assert.match(code, /document\.body\.appendChild\(form\)/);
  // visor: os mesmos atributos do HTML da referencia
  assert.match(code, /visor\.setAttribute\('maxlength', '18'\)/);
  assert.match(code, /visor\.setAttribute\('readonly', ''\)/);
  assert.match(code, /tabela\.rows\[0\]\.cells\[0\]\.appendChild\(visor\)/);
  // botao: elemento real na casa definitiva da grade
  assert.match(code, /var botao7 = document\.createElement\('input'\)/);
  assert.match(code, /tabela\.rows\[4\]\.cells\[0\]\.appendChild\(botao7\)/);
  // nenhuma chamada magica
  assert.ok(!/criarCorpo\(/.test(code), 'sem criarCorpo()');
  assert.ok(!/criarVisor\(/.test(code), 'sem criarVisor()');
  assert.ok(!/adicionarBotao\(/.test(code), 'sem adicionarBotao()');
  // montar vem ANTES do listener
  const idxMontar = code.indexOf('montarCalculadora();');
  const idxListener = code.indexOf("addEventListener('click'");
  assert.ok(idxMontar !== -1 && idxListener !== -1 && idxMontar < idxListener, 'montar antes do listener');
});

test('codegen v2 emite o CSS junto do corpo (HTML + CSS reais)', () => {
  const code = Codegen.codegen({ version: 2, setup: [{ op: 'ui.createBody' }], handlers: [] });
  assert.match(code, /document\.createElement\('style'\)/);
  assert.match(code, /document\.head\.appendChild\(estilo\)/);
  assert.match(code, /\.botao \{/);
  assert.match(code, /#BDA442/);
});

test('codegen v2 explica o codigo em comentarios (HTML equivalente)', () => {
  const code = Codegen.codegen({
    version: 2,
    setup: [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }, { op: 'ui.addButton', token: '7' }],
    handlers: [{ event: 'button.click', button: '7', body: [{ op: 'display.append', value: '7' }] }]
  });
  assert.match(code, /\/\/ .*<form name="formulario">/);
  assert.match(code, /\/\/ .*<input type="button" value=" 7 " class="botao">/);
  assert.match(code, /PARTE 1/);
  assert.match(code, /PARTE 2/);
  assert.match(code, /data-btn/);
});

test('codegen v2: o codigo gerado e sintaticamente valido', () => {
  const setup = [{ op: 'ui.createBody' }, { op: 'ui.createVisor' },
                 { op: 'ui.addButton', token: '7' }, { op: 'ui.addButton', token: '.' },
                 { op: 'ui.addButton', token: '+' }, { op: 'ui.addButton', token: '=' }];
  const handlers = [
    { event: 'button.click', button: '7', body: [{ op: 'display.append', value: '7' }] },
    { event: 'button.click', button: '.', body: [{ op: 'display.append', value: '.' }] },
    { event: 'button.click', button: '+', body: [{ op: 'display.append', value: ' + ' }] },
    { event: 'button.click', button: '=', body: [{ op: 'try', 'try': [{ op: 'display.evaluate' }], 'catch': [{ op: 'expression.setValue', value: "O'Erro" }] }] }
  ];
  const code = Codegen.codegen({ version: 2, setup, handlers });
  assert.doesNotThrow(() => new Function(code), 'o codigo emitido precisa compilar');
});

test('codegen v2: tela emitido apenas se houver visor', () => {
  const comVisor = Codegen.codegen({
    version: 2,
    setup: [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }],
    handlers: []
  });
  assert.match(comVisor, /var tela = document\.querySelector\('#tela'\)/);

  const semVisor = Codegen.codegen({
    version: 2,
    setup: [{ op: 'ui.createBody' }],
    handlers: []
  });
  assert.ok(!/var tela/.test(semVisor), 'sem visor nao deve declarar tela');
});
