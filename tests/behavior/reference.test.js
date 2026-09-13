'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { buildReferenceWindow, buildBlockWindow, referenceProgram, protectedProgram, simOf } = require('../helpers');

// Sequências de entrada (golden) — spec §6. O programa de blocos (calculadora completa)
// deve reproduzir EXATAMENTE a mesma saída da referência para todos os casos válidos.
const GOLDEN = [
  { clicks: ['7'], espera: '7' },
  { clicks: ['1','2','3'], espera: '123' },
  { clicks: ['1','+','2','='], espera: '3' },
  { clicks: ['9','-','4','='], espera: '5' },
  { clicks: ['5','*','6','='], espera: '30' },
  { clicks: ['1','0','/','4','='], espera: '2.5' },
  { clicks: ['1','2','del'], espera: '1' },
  { clicks: ['1','2','C'], espera: '' },
  { clicks: ['del'], espera: '' },
  { clicks: ['5','/','0','='], espera: 'Infinity' },
  { clicks: ['7','9','C','3'], espera: '3' },
  { clicks: ['1','5','.','5'], espera: '15.5' },
  { clicks: ['2','+','3','=','7'], espera: '57' },
  { clicks: ['7','.','5','+','2','.','5','='], espera: '10' },
  { clicks: ['1','+','2','=','C'], espera: '' }
];

test('calculadora de blocos reproduz funcionalmente a referência (G01–G20)', () => {
  const ref = simOf(buildReferenceWindow());
  const blk = simOf(buildBlockWindow(referenceProgram()));

  GOLDEN.forEach((g) => {
    ref.reset(); g.clicks.forEach((c) => ref.click(c));
    blk.reset(); g.clicks.forEach((c) => blk.click(c));
    assert.strictEqual(blk.value(), ref.value(), `sequência: ${g.clicks.join(' ')}`);
    assert.strictEqual(blk.value(), g.espera, `esperado: "${g.espera}" para ${g.clicks.join(' ')}`);
  });
});

test('programa parcial (incremental) roda; botão sem handler não reage', () => {
  const ir = {
    version: 2,
    setup: [{ op: 'ui.createBody' }, { op: 'ui.createVisor' }, { op: 'ui.addButton', token: '1' }, { op: 'ui.addButton', token: '2' }],
    handlers: [{ event: 'button.click', button: '1', body: [{ op: 'display.append', value: '1' }] }]
  };
  const blk = simOf(buildBlockWindow(ir));
  blk.click('1');
  assert.strictEqual(blk.value(), '1');
  blk.click('2'); // sem handler para o 2
  assert.strictEqual(blk.value(), '1');
});

test('programa protegido (nível 12) mostra "Erro" em expressão inválida', () => {
  const blk = simOf(buildBlockWindow(protectedProgram()));
  blk.reset(); ['1','+','='].forEach((c) => blk.click(c));
  assert.strictEqual(blk.value(), 'Erro');
});

test('programa protegido (nível 12) ainda calcula expressões válidas', () => {
  const blk = simOf(buildBlockWindow(protectedProgram()));
  blk.reset(); ['1','+','2','='].forEach((c) => blk.click(c));
  assert.strictEqual(blk.value(), '3');
});
