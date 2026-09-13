'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Levels, programaDeNivel, buildBlockWindow, simOf } = require('../helpers');

// Cada nível define casos de sucesso verificáveis (estrutura + comportamento).
// O programa "correto" cumulativo (programaDeNivel) deve satisfazer TODOS os casos
// de cada nível. Isso valida que a progressão é alcançável e consistente.
test('a progressão (12 níveis) é alcançável e verificável', () => {
  Levels.LEVELS.forEach((level) => {
    const ir = programaDeNivel(level);
    const win = buildBlockWindow(ir);
    const doc = win.document;

    // 1) estrutura esperada
    const expected = Levels.expectedStructure(level.id);
    assert.strictEqual(!!doc.querySelector('form[name="formulario"]'), expected.corpo, `nível ${level.id}: corpo`);
    assert.strictEqual(!!doc.querySelector('#tela'), expected.visor, `nível ${level.id}: visor`);
    const tokens = Array.from(doc.querySelectorAll('[data-btn]')).map((b) => b.getAttribute('data-btn'));
    expected.botoes.forEach((t) => assert.ok(tokens.includes(t), `nível ${level.id}: falta botão ${t}`));

    // 2) casos de comportamento (clicks -> espera)
    const blk = simOf(win);
    level.casos.forEach((caso) => {
      if (caso.estrutura) return; // estrutura já verificada acima
      blk.reset();
      caso.clicks.forEach((c) => blk.click(c));
      assert.strictEqual(
        blk.value(),
        caso.espera,
        `nível ${level.id} («${level.titulo}») falhou: ${caso.clicks.join(' ')} -> "${blk.value()}" (esperado "${caso.espera}")`
      );
    });
  });
});

test('cada nível tem casos, opções e dicas definidos', () => {
  Levels.LEVELS.forEach((level) => {
    assert.ok(level.casos.length > 0, `nível ${level.id} sem casos`);
    assert.ok(level.options.estrutura.length > 0, `nível ${level.id} sem estrutura`);
    // níveis de estrutura (1–2) não têm ações; os demais têm
    if (level.id >= 3) assert.ok(level.options.actions.length > 0, `nível ${level.id} sem ações`);
    assert.ok(level.dicas.length > 0, `nível ${level.id} sem dicas`);
  });
});

test('níveis de estrutura (1–2) não têm botões/ações, mas têm estrutura', () => {
  const l1 = Levels.getLevel(1);
  const l2 = Levels.getLevel(2);
  assert.deepStrictEqual(l1.options.buttons, [], 'nível 1 sem botões');
  assert.deepStrictEqual(l1.options.actions, [], 'nível 1 sem ações');
  assert.deepStrictEqual(l2.options.buttons, [], 'nível 2 sem botões');
  assert.ok(l1.options.estrutura.includes('e_corpo'), 'nível 1 cria corpo');
  assert.ok(l2.options.estrutura.includes('e_visor'), 'nível 2 adiciona visor');
});

test('o nível 12 tem o bloco tentar (tratamento de erro)', () => {
  const l12 = Levels.getLevel(12);
  assert.ok(l12.options.actions.includes('tentar'));
});

test('a estrutura esperada é cumulativa (o teclado cresce)', () => {
  const n3 = Levels.expectedStructure(3).botoes;
  const n11 = Levels.expectedStructure(11).botoes;
  assert.ok(n3.includes('7'), 'nível 3 libera 7');
  assert.strictEqual(n11.length, 18, 'nível 11 tem os 18 botões');
});
