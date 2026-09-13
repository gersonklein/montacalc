'use strict';
const test = require('node:test');
const assert = require('node:assert');

// Stub mínimo de Blockly para exercitar block-defs (init não é chamado; só definição+toolbox).
globalThis.Blockly = { Blocks: {}, Events: {} };
const BlockDefs = require('../../app/src/blocks/block-defs.js');
const Levels = require('../../app/src/levels/levels.js');

test('toolbox do nível 11 contém todos os blocos (teclado completo)', () => {
  BlockDefs.setAllowedButtons(Levels.getLevel(11).options.buttons);
  const xml = BlockDefs.toolboxFor(Levels.getLevel(11));
  assert.match(xml, /<block type="q_botao"><field name="BTN">4<\/field><\/block>/);
  assert.match(xml, /q_botao/);
  assert.match(xml, /a_limpar/);
  assert.match(xml, /a_apagar_ultimo/);
  assert.match(xml, /a_calcular/);
  assert.match(xml, /a_inserir_op/);
  assert.match(xml, /e_botao/);
});

test('toolbox do nível 1 é só estrutura (sem botões/eventos)', () => {
  const lvl = Levels.getLevel(1);
  BlockDefs.setAllowedButtons(lvl.options.buttons);
  const xml = BlockDefs.toolboxFor(lvl);
  assert.match(xml, /Estrutura/);
  assert.match(xml, /q_iniciar/);
  assert.match(xml, /e_corpo/);
  assert.ok(!/q_botao/.test(xml), 'nível 1 não deve ter eventos (sem botões ainda)');
});

test('toolbox do nível 3 libera o botão 7 (estrutura + evento)', () => {
  const lvl = Levels.getLevel(3);
  BlockDefs.setAllowedButtons(lvl.options.buttons);
  const xml = BlockDefs.toolboxFor(lvl);
  assert.match(xml, /BTN">7</);
  assert.match(xml, /e_botao/);
  assert.ok(!/BTN">2</.test(xml), 'botão 2 não deve estar no nível 3');
});

test('toolbox do nível 12 inclui o bloco tentar', () => {
  BlockDefs.setAllowedButtons(Levels.getLevel(12).options.buttons);
  const xml = BlockDefs.toolboxFor(Levels.getLevel(12));
  assert.match(xml, /tentar/);
  assert.match(xml, /a_mostrar_erro/);
});

test('categorias coloridas (Estrutura/Eventos/Visor/Operadores/Lógica) presentes', () => {
  BlockDefs.setAllowedButtons(Levels.getLevel(12).options.buttons);
  const xml = BlockDefs.toolboxFor(Levels.getLevel(12));
  assert.match(xml, /Estrutura/);
  assert.match(xml, /Eventos/);
  assert.match(xml, /Visor/);
  assert.match(xml, /Lógica/);
});

test('o bloco roxo a_mostrar_erro fica SÓ na Lógica (não na Visor azul)', () => {
  BlockDefs.setAllowedButtons(Levels.getLevel(12).options.buttons);
  const xml = BlockDefs.toolboxFor(Levels.getLevel(12));
  // categoria Visor não deve conter a_mostrar_erro
  const visor = xml.match(/<category name="Visor" colour="#4A90D9">([\s\S]*?)<\/category>/);
  assert.ok(visor, 'categoria Visor existe no nível 12');
  assert.ok(!visor[1].includes('a_mostrar_erro'), 'a_mostrar_erro NÃO deve ocupar a categoria Visor');
  // categoria Lógica deve conter a_mostrar_erro
  const logica = xml.match(/<category name="Lógica[^"]*" colour="#8E6ACB">([\s\S]*?)<\/category>/);
  assert.ok(logica && logica[1].includes('a_mostrar_erro'), 'a_mostrar_erro deve estar na Lógica');
});

test('categorias com novidade ganham "✨ NOVO"; a primeira abre sozinha', () => {
  BlockDefs.setAllowedButtons(Levels.getLevel(12).options.buttons);
  const feats = Levels.newFeatures(12);
  const xml = BlockDefs.toolboxFor(Levels.getLevel(12), { newCats: feats.categorias });
  assert.match(xml, /Lógica ✨ NOVO/);
  // a primeira categoria com novidade (Lógica) abre com expanded="true"
  assert.match(xml, /<category name="Lógica ✨ NOVO" colour="#8E6ACB" expanded="true">/);
});

test('categorias novas de botões (nível 3) aparecem com ✨', () => {
  BlockDefs.setAllowedButtons(Levels.getLevel(3).options.buttons);
  const feats = Levels.newFeatures(3);
  const xml = BlockDefs.toolboxFor(Levels.getLevel(3), { newCats: feats.categorias });
  assert.match(xml, /Estrutura ✨ NOVO/);
  assert.match(xml, /Eventos ✨ NOVO/);
});
