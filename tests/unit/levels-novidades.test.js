'use strict';
const test = require('node:test');
const assert = require('node:assert');

const Levels = require('../../app/src/levels/levels.js');

// Tipos de bloco "novidade": os estruturais + as ações que entram pela primeira vez.
// `q_iniciar` é o gatilho de montagem: vive na toolbox de qualquer nível, então só é
// "novo" (anunciado) uma vez, no nível 1, como apresentação.
function collectFirstAppearance() {
  const first = {};
  Levels.LEVELS.forEach((lvl) => {
    (lvl.options.estrutura || []).forEach((t) => { if (!(t in first)) first[t] = lvl.id; });
    (lvl.options.actions || []).forEach((t) => { if (!(t in first)) first[t] = lvl.id; });
  });
  return first;
}
const FIRST_APPEAR = collectFirstAppearance();
const MAX_LEVEL = Levels.LEVELS[(Levels.LEVELS.length - 1)].id;
// Blocos "chapéu" (gatilhos) sempre presentes na toolbox: não derivam de options,
// mas são anunciados uma vez, no nível em que passam a fazer sentido.
const RESERVED = { q_iniciar: 1, q_botao: 3 };
function reservedLevel(tipo) { return RESERVED[tipo] || null; }

test('cada tipo de bloco novo aparece como novidade em exatamente um nível', () => {
  const anuncios = {}; // tipo -> [niveis]
  Levels.LEVELS.forEach((lvl) => {
    (lvl.novidades?.blocos || []).forEach((n) => {
      (anuncios[n.tipo] = anuncios[n.tipo] || []).push(lvl.id);
    });
  });
  // Todo tipo que entra em algum nível é anunciado exatamente uma vez.
  Object.keys(FIRST_APPEAR).forEach((tipo) => {
    assert.ok(anuncios[tipo], `"${tipo}" deveria ser anunciado como novidade`);
    assert.strictEqual(anuncios[tipo].length, 1, `"${tipo}" anunciado mais de uma vez`);
    assert.strictEqual(anuncios[tipo][0], FIRST_APPEAR[tipo], `"${tipo}" anunciado no nível errado`);
  });
  // Os blocos "chapéu" reservados também são anunciados uma única vez, no nível certo.
  Object.keys(RESERVED).forEach((tipo) => {
    assert.ok(anuncios[tipo], `"${tipo}" deveria ser anunciado como novidade`);
    assert.strictEqual(anuncios[tipo].length, 1, `"${tipo}" anunciado mais de uma vez`);
    assert.strictEqual(anuncios[tipo][0], RESERVED[tipo], `"${tipo}" anunciado no nível errado`);
  });
  // Nenhum nível anuncia um tipo que já existia antes (exceto os reservados, no nível certo).
  Levels.LEVELS.forEach((lvl) => {
    (lvl.novidades?.blocos || []).forEach((n) => {
      const rl = reservedLevel(n.tipo);
      if (rl !== null) {
        assert.strictEqual(lvl.id, rl, `"${n.tipo}" só pode ser novidade no nível ${rl}`);
        return;
      }
      assert.ok(FIRST_APPEAR[n.tipo] !== undefined, `"${n.tipo}" não é um tipo de bloco conhecido`);
      assert.strictEqual(FIRST_APPEAR[n.tipo], lvl.id, `"${n.tipo}" no nível ${lvl.id} não é novo (já existia em ${FIRST_APPEAR[n.tipo]})`);
    });
  });
});

test('newBlocks: botões novos são os ainda não liberados no nível anterior', () => {
  Level: for (let id = 1; id <= MAX_LEVEL; id++) {
    const lvl = Levels.getLevel(id);
    const seen = [];
    for (let i = 0; i < Levels.LEVELS.length; i++) {
      const before = Levels.LEVELS[i];
      if (before.id >= id) break;
      (before.options.buttons || []).forEach((b) => { if (seen.indexOf(b) === -1) seen.push(b); });
    }
    const novinhos = (lvl.options.buttons || []).filter((b) => seen.indexOf(b) === -1).sort();
    const got = Levels.newBlocks(id).botoes.slice().sort();
    assert.deepStrictEqual(got, novinhos, `botões novos do nível ${id}`);
  }
});

test('newBlocks: tipos novos batem com os declarados em novidades', () => {
  for (let id = 1; id <= MAX_LEVEL; id++) {
    const lvl = Levels.getLevel(id);
    const esperado = (lvl.novidades?.blocos || []).map((n) => n.tipo).sort();
    assert.deepStrictEqual(Levels.newBlocks(id).blocos.slice().sort(), esperado, `tipos novos do nível ${id}`);
  }
});

test('blockCategory mapeia os blocos de Lógica do nível 12 para "Lógica"', () => {
  assert.strictEqual(Levels.blockCategory('tentar'), 'Lógica');
  assert.strictEqual(Levels.blockCategory('a_mostrar_erro'), 'Lógica');
  // O chip de novidade deve refletir onde o aluno acha o bloco (Lógica, não Visor).
  const feats = Levels.newFeatures(12);
  assert.ok(feats.categorias.includes('Lógica'));
  assert.ok(!feats.categorias.includes('Visor'), 'a_mostrar_erro não é novidade da categoria Visor');
});

test('nível 12 anuncia o tratamento de erro (tentar + mostrar Erro)', () => {
  const feats = Levels.newFeatures(12);
  const tipos = feats.blocos.map((n) => n.tipo);
  assert.ok(tipos.includes('tentar'));
  assert.ok(tipos.includes('a_mostrar_erro'));
  assert.ok(Levels.getLevel(12).novidades.blocos.every((n) => typeof n.texto === 'string' && n.texto.length));
});
