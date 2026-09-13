'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { Evaluator } = require('../helpers');

test('avalia soma simples', () => {
  assert.strictEqual(Evaluator.evaluate('1 + 2'), 3);
});
test('avalia subtração', () => {
  assert.strictEqual(Evaluator.evaluate('9 - 4'), 5);
});
test('avalia multiplicação', () => {
  assert.strictEqual(Evaluator.evaluate('5 * 6'), 30);
});
test('avalia divisão', () => {
  assert.strictEqual(Evaluator.evaluate('10 / 4'), 2.5);
});
test('precedência: multiplicação antes da soma', () => {
  assert.strictEqual(Evaluator.evaluate('2 + 3 * 4'), 14);
});
test('parênteses', () => {
  assert.strictEqual(Evaluator.evaluate('(2 + 3) * 4'), 20);
});
test('unário negativo', () => {
  assert.strictEqual(Evaluator.evaluate('-5 + 5'), 0);
});
test('número decimal com ponto final (ex.: "5.")', () => {
  assert.strictEqual(Evaluator.evaluate('5.') , 5);
});
test('número decimal iniciando com ponto (ex.: ".5")', () => {
  assert.strictEqual(Evaluator.evaluate('.5 + .5'), 1);
});
test('divisão por zero -> Infinity (fiel à referência)', () => {
  assert.strictEqual(Evaluator.evaluate('5 / 0'), Infinity);
});
test('zero sobre zero -> NaN', () => {
  assert.ok(Number.isNaN(Evaluator.evaluate('0 / 0')));
});
test('decimais concatenados resolvem número', () => {
  assert.strictEqual(Evaluator.evaluate('7.5 + 2.5'), 10);
});
test('H0: expressão incompleta lança (B9)', () => {
  assert.throws(() => Evaluator.evaluate('5 +'), SyntaxError);
});
test('H0: dois pontos lançam (B9)', () => {
  assert.throws(() => Evaluator.evaluate('1.2.3'), SyntaxError);
});
test('safeEvaluate devolve null em inválido', () => {
  assert.strictEqual(Evaluator.safeEvaluate('5 +'), null);
  assert.strictEqual(Evaluator.safeEvaluate('1 + 2'), 3);
});
