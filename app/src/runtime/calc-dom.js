/*
 * MontaCalc — FONTE ÚNICA do layout da calculadora (grade, rótulos e CSS).
 * Réplica fiel da referência calc.html/estilos.css: visor readonly maxlength=18,
 * botões 40x40 numa grade de 4 colunas.
 *
 * Quem consome:
 *   - `compiler/codegen.js` — emite o CÓDIGO REAL que constrói esta grade (o que o aluno lê);
 *   - testes (jsdom) — `calculatorMarkup()` monta a calculadora de referência.
 *
 * A GRADE É FIXA E COMPLETA: 6 linhas × 4 colunas.
 *   linha 0 → a casa do visor (colspan="4");
 *   linhas 1..5 → o teclado (18 teclas + 2 casas vazias no fim).
 * Assim o corpo nasce com o tamanho FINAL e nada se desloca quando uma peça é
 * adicionada: cada peça só ocupa a casa que já era dela.
 */
(function(root) {
  'use strict';

  // Tokens de botão na ordem do layout (B11). label é o que aparece no botão.
  var BUTTONS = [
    { token: 'C',   label: ' C ' },
    { token: 'del', label: ' del ' },
    { token: '-',   label: ' - ' },
    { token: '+',   label: ' + ' },
    { token: '1',   label: ' 1 ' },
    { token: '2',   label: ' 2 ' },
    { token: '3',   label: ' 3 ' },
    { token: '/',   label: ' / ' },
    { token: '4',   label: ' 4 ' },
    { token: '5',   label: ' 5 ' },
    { token: '6',   label: ' 6 ' },
    { token: '*',   label: ' * ' },
    { token: '7',   label: ' 7 ' },
    { token: '8',   label: ' 8 ' },
    { token: '9',   label: ' 9 ' },
    { token: '=',   label: ' = ' },
    { token: '.',   label: ' . ' },
    { token: '0',   label: ' 0 ' }
  ];

  var LINHAS = 6;   // 1 do visor + 5 do teclado
  var COLUNAS = 4;

  // CSS da calculadora — as MESMAS regras de estilos.css (fonte única).
  // Acrescentamos só `td { width/height }` para que as casas vazias já ocupem
  // o seu lugar: a moldura nasce no tamanho final e nada cresce depois.
  var CSS_LINES = [
    'table { background-color: #737373; padding: 3px; }',
    'td { width: 40px; height: 40px; }',
    '.resultado { color: #000000; background-color: #BDA442;',
    '             width: 168px; height: 40px;',
    '             font-size: 18px; font-weight: bold; }',
    '.botao { color: #ffffff; background-color: #000000;',
    '         width: 40px; height: 40px; font-size: 14px; }'
  ];

  function cssText() { return CSS_LINES.join('\n'); }

  function buttonLabel(token) {
    for (var i = 0; i < BUTTONS.length; i++) {
      if (BUTTONS[i].token === String(token)) return BUTTONS[i].label;
    }
    return ' ' + token + ' ';
  }

  function buttonSchema(token) {
    var map = { '+':' ' + token + ' ', '-':' ' + token + ' ', '*':' ' + token + ' ', '/':' ' + token + ' ' };
    return map[token] || ' ' + token + ' ';
  }

  // Casa (slot) de um botão na grade de 4 colunas (B11).
  // Devolve { row, col } com a LINHA 0 reservada ao visor (teclado = linhas 1..5).
  function buttonSlot(token) {
    var index = -1;
    for (var i = 0; i < BUTTONS.length; i++) {
      if (BUTTONS[i].token === String(token)) { index = i; break; }
    }
    if (index === -1) return null;
    return { row: 1 + Math.floor(index / COLUNAS), col: index % COLUNAS };
  }

  // Gera o markup da calculadora. `buttonTokens` opcional: mostra apenas os botões
  // liberados (a máquina é construída progressivamente). Sem argumento, teclado completo.
  function calculatorMarkup(buttonTokens) {
    var list = buttonTokens ? BUTTONS.filter(function(b) { return buttonTokens.indexOf(b.token) !== -1; }) : BUTTONS;
    var out = '<form name="formulario">\n<table>\n';
    out += '<tr><td colspan="4"><input type="text" maxlength="18" class="resultado" name="tela" id="tela" readonly></td></tr>\n';
    for (var r = 0; r < LINHAS - 1; r++) {
      out += '<tr>';
      for (var c = 0; c < COLUNAS; c++) {
        var idx = r * COLUNAS + c;
        if (idx < list.length) {
          var b = list[idx];
          out += '<td><input type="button" value="' + b.label + '" class="botao" data-btn="' + b.token + '"></td>';
        } else {
          out += '<td></td>';
        }
      }
      out += '</tr>\n';
    }
    out += '</table>\n</form>';
    return out;
  }

  var API = {
    BUTTONS: BUTTONS, LINHAS: LINHAS, COLUNAS: COLUNAS,
    CSS_LINES: CSS_LINES, cssText: cssText,
    calculatorMarkup: calculatorMarkup, buttonSchema: buttonSchema,
    buttonSlot: buttonSlot, buttonLabel: buttonLabel
  };
  root.MontaCalc = root.MontaCalc || {};
  root.MontaCalc.Dom = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
