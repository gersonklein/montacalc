/*
 * MontaCalc — Avaliador de expressões.
 *
 * REUTILIZAÇÃO DA FONTE: `parseEval` é uma função ÚNICA e autossuficiente
 * (tokenizador + parser recursivo embutidos). Sua fonte (`parseEval.toString()`)
 * é incorporada no sandbox (iframe) para garantir que a matemática executada
 * no navegador seja EXATAMENTE a mesma testada em node:test.
 *
 * Semântica: reproduz fielmente o `eval` da calculadora de referência
 * (`operacoes.js:11-16`) para os casos suportados:
 *   - números inteiros e decimais, com `.` ou `.5`;
 *   - operadores binários + - * /;
 *   - operador unário `-`;
 *   - parênteses;
 *   - precedência: * / sobre + -; 
 *   - divisão por zero → Infinity (e 0/0 → NaN), idêntico ao JS/Eval.
 * Em expressão inválida → lança (SyntaxError-like). Não usa eval()/new Function.
 */
(function(root) {
  'use strict';

  // Self-contained parser. Retorna um Number ou lança Error.
  function parseEval(expr) {
    if (typeof expr !== 'string') throw new SyntaxError('Expressão precisa ser texto.');
    var s = expr;
    var i = 0;

    function skipSpaces() {
      while (i < s.length && (s[i] === ' ' || s[i] === '\t' || s[i] === '\n' || s[i] === '\r')) i++;
    }
    function peek() {
      skipSpaces();
      return i < s.length ? s[i] : null;
    }
    function parseNumber() {
      skipSpaces();
      var start = i;
      var sawDot = false;
      while (i < s.length) {
        var c = s[i];
        if (c >= '0' && c <= '9') { i++; }
        else if (c === '.' && !sawDot) { sawDot = true; i++; }
        else break;
      }
      if (i === start) throw new SyntaxError('Número esperado: "' + s.slice(start) + '"');
      var numStr = s.slice(start, i);
      if (numStr === '.') throw new SyntaxError('Número inválido: "."');
      var n = parseFloat(numStr);
      if (isNaN(n)) throw new SyntaxError('Número inválido: "' + numStr + '"');
      return n;
    }
    function parseFactor() {
      var c = peek();
      if (c === '-') { i++; return -parseFactor(); }
      if (c === '+') { i++; return parseFactor(); }
      if (c === '(') {
        i++;
        var v = parseExpr();
        skipSpaces();
        if (peek() !== ')') throw new SyntaxError('Parêntese fechando esperado');
        i++;
        return v;
      }
      return parseNumber();
    }
    function parseTerm() {
      var v = parseFactor();
      for (;;) {
        var c = peek();
        if (c === '*') { i++; v = v * parseFactor(); }
        else if (c === '/') { i++; v = v / parseFactor(); } // divisão JS => Infinity/NaN
        else break;
      }
      return v;
    }
    function parseExpr() {
      var v = parseTerm();
      for (;;) {
        var c = peek();
        if (c === '+') { i++; v = v + parseTerm(); }
        else if (c === '-') { i++; v = v - parseTerm(); }
        else break;
      }
      return v;
    }

    var result = parseExpr();
    skipSpaces();
    if (i < s.length) throw new SyntaxError('Símbolo não esperado: "' + s.slice(i) + '"');
    return result;
  }

  // Avalia e devolve Number; lança Error se inválida (espelha `eval`).
  function evaluate(expr) {
    return parseEval(expr);
  }

  // Avalia e devolve Number, ou null se inválida (não lança).
  function safeEvaluate(expr) {
    try { return parseEval(expr); } catch (e) { return null; }
  }

  var API = {
    parseEval: parseEval,
    evaluate: evaluate,
    safeEvaluate: safeEvaluate,
    fnSource: function() { return parseEval.toString(); }
  };

  root.MontaCalc = root.MontaCalc || {};
  root.MontaCalc.Evaluator = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
