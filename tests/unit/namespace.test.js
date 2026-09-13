'use strict';
const test = require('node:test');
const assert = require('node:assert');

// Carrega todos os módulos de núcleo e verifica o registro no namespace global MontaCalc.
// (block-defs exige o global Blockly — fornecemos um stub mínimo.)
globalThis.Blockly = globalThis.Blockly || { Blocks: {}, Events: {} };

require('../../app/src/runtime/evaluator.js');
require('../../app/src/ir/validate.js');
require('../../app/src/compiler/codegen.js');
require('../../app/src/runtime/calc-dom.js');
require('../../app/src/runtime/run-program.js');
require('../../app/src/ir/serialize.js');
require('../../app/src/levels/levels.js');
require('../../app/src/runtime/sandbox.js');
require('../../app/src/blocks/block-defs.js');

const M = globalThis.MontaCalc;

test('todos os módulos estão registrados no namespace MontaCalc', () => {
  ['Evaluator','Validate','Codegen','Dom','Runner','Serialize','Levels','Sandbox','BlockDefs'].forEach((k) => {
    assert.ok(M[k], 'falta módulo: ' + k);
  });
});

test('módulos expõem as funções esperadas', () => {
  assert.strictEqual(typeof M.Evaluator.evaluate, 'function');
  assert.strictEqual(typeof M.Validate.validateIR, 'function');
  assert.strictEqual(typeof M.Codegen.codegen, 'function');
  assert.strictEqual(typeof M.Dom.calculatorMarkup, 'function');
  assert.strictEqual(typeof M.Dom.buttonSlot, 'function');
  assert.strictEqual(typeof M.Dom.cssText, 'function');
  assert.strictEqual(typeof M.Runner.installProgram, 'function');
  assert.strictEqual(typeof M.Serialize.irFromBlocks, 'function');
  assert.strictEqual(typeof M.Levels.getLevel, 'function');
  assert.strictEqual(typeof M.Sandbox.buildSrcdoc, 'function');
  assert.strictEqual(typeof M.BlockDefs.toolboxFor, 'function');
});
