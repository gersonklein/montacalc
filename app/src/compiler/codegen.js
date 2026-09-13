/*
 * MontaCalc — Compilador IR -> JavaScript REAL, comentado e explicado.
 * Puro (sem DOM/Blockly). Testável em node.
 *
 * PRINCÍPIO PEDAGÓGICO: o painel de código não pode conter atalhos mágicos.
 * O BLOCO é simplificado; o CÓDIGO é o de verdade — o mesmo que uma pessoa
 * escreveria à mão para construir esta página. Por isso NÃO emitimos chamadas
 * do tipo `criarCorpo()`: emitimos os passos reais (document.createElement,
 * setAttribute, appendChild, addEventListener), com comentários que mostram o
 * HTML equivalente e explicam o que cada linha faz.
 *
 * Saída (v2):
 *   PARTE 1 — montarCalculadora(): CSS (<style>) + estrutura (form > table > tr > td).
 *             A grade nasce COMPLETA (6x4); cada peça só preenche a casa dela.
 *   PARTE 2 — comportamento: uma função nomeada por botão + addEventListener.
 *
 * Layout (grade, rótulos, CSS) vem de `runtime/calc-dom.js` (fonte única).
 */
(function(root) {
  'use strict';

  var INDENT = '  ';
  var Q = "'";

  // Texto em JS com aspas simples (mesmo estilo do resto do código emitido).
  function jsString(v) {
    var s = String(v)
      .split('\\').join('\\\\')
      .split("'").join("\\'")
      .split('\n').join('\\n');
    return Q + s + Q;
  }

  // Layout (fonte única). Resolvido tarde: em file:// pelo namespace global,
  // em node pelo require relativo.
  function dom() {
    var D = root.MontaCalc && root.MontaCalc.Dom;
    if (!D && typeof require === 'function') {
      try { D = require('../runtime/calc-dom.js'); } catch (e) { D = null; }
    }
    if (!D) throw new Error('calc-dom.js (layout) precisa ser carregado antes do codegen');
    return D;
  }

  // Nome da função de comportamento: aoClicar7, aoClicarMais, aoClicarLimpar...
  function buttonIdToName(btn) {
    var map = { '+':'mais','-':'menos','*':'vezes','/':'dividir','=':'igual','C':'limpar','del':'apagar','.':'ponto' };
    var base = map[btn] || btn;
    var clean = String(base).replace(/[^A-Za-z0-9_]/g, '');
    return clean || 'botao';
  }

  function handlerName(btn) {
    var id = buttonIdToName(btn);
    return 'aoClicar' + id.charAt(0).toUpperCase() + id.slice(1);
  }

  // Nome da variável do elemento do botão: botao7, botaoMais, botaoDel...
  var VAR_SUFFIX = { '+':'Mais', '-':'Menos', '*':'Vezes', '/':'Dividir', '=':'Igual', '.':'Ponto', 'C':'C', 'del':'Del' };
  function buttonVarName(token) {
    var t = String(token);
    var suffix = VAR_SUFFIX[t] || t.replace(/[^A-Za-z0-9_]/g, '');
    return 'botao' + (suffix || 'Tecla');
  }

  function regua(prefixo, largura) {
    var n = Math.max(3, largura - prefixo.length);
    var traco = '';
    for (var i = 0; i < n; i++) traco += '-';
    return prefixo + ' ' + traco;
  }

  // ------------------------------------------------------------------
  // PARTE 1 — o código real que monta a calculadora
  // ------------------------------------------------------------------

  function genEstilo(indent) {
    var D = dom();
    var lines = [];
    lines.push(indent + regua('// ---- O ESTILO (CSS)', 66));
    lines.push(indent + '// <style> guarda as regras de aparência da página. São as mesmas');
    lines.push(indent + '// regras do arquivo estilos.css da calculadora original:');
    lines.push(indent + '//   .botao { ... } vale para TODO elemento com class="botao".');
    lines.push(indent + 'var estilo = document.createElement(' + Q + 'style' + Q + ');');
    lines.push(indent + 'estilo.textContent = `');
    D.CSS_LINES.forEach(function(l) { lines.push(indent + INDENT + l); });
    lines.push(indent + '`;');
    lines.push(indent + 'document.head.appendChild(estilo);');
    return lines;
  }

  function genCorpo(indent) {
    var lines = [];
    lines.push(indent + regua('// ---- O CORPO (HTML)', 66));
    lines.push(indent + '// Em HTML puro, o corpo da calculadora se escreve assim:');
    lines.push(indent + '//');
    lines.push(indent + '//   <form name="formulario">');
    lines.push(indent + '//     <table>');
    lines.push(indent + '//       <tr><td colspan="4"></td></tr>                <-- casa do visor');
    lines.push(indent + '//       <tr><td></td><td></td><td></td><td></td></tr> <-- 5 linhas');
    lines.push(indent + '//       ...                                               de 4 casas');
    lines.push(indent + '//     </table>');
    lines.push(indent + '//   </form>');
    lines.push(indent + '//');
    lines.push(indent + '// document.createElement("tag") cria a mesma tag por JavaScript e');
    lines.push(indent + '// appendChild(filho) coloca uma tag dentro da outra.');
    lines.push(indent + '// A grade nasce COMPLETA (6 linhas x 4 colunas): as casas ficam');
    lines.push(indent + '// vazias esperando o visor e os botões, e nada muda de lugar depois.');
    lines.push('');
    lines.push(indent + 'var form = document.createElement(' + Q + 'form' + Q + ');');
    lines.push(indent + 'form.setAttribute(' + Q + 'name' + Q + ', ' + Q + 'formulario' + Q + ');');
    lines.push('');
    lines.push(indent + 'var tabela = document.createElement(' + Q + 'table' + Q + ');');
    lines.push('');
    lines.push(indent + '// Linha 0: a casa do visor, esticada pelas 4 colunas (colspan="4").');
    lines.push(indent + 'var linhaDoVisor = document.createElement(' + Q + 'tr' + Q + ');');
    lines.push(indent + 'var casaDoVisor = document.createElement(' + Q + 'td' + Q + ');');
    lines.push(indent + 'casaDoVisor.setAttribute(' + Q + 'colspan' + Q + ', ' + Q + '4' + Q + ');');
    lines.push(indent + 'linhaDoVisor.appendChild(casaDoVisor);');
    lines.push(indent + 'tabela.appendChild(linhaDoVisor);');
    lines.push('');
    lines.push(indent + '// Linhas 1 a 5: o teclado — 4 casas (<td>) em cada linha.');
    lines.push(indent + 'for (var linha = 1; linha <= 5; linha++) {');
    lines.push(indent + INDENT + 'var tr = document.createElement(' + Q + 'tr' + Q + ');');
    lines.push(indent + INDENT + 'for (var coluna = 0; coluna < 4; coluna++) {');
    lines.push(indent + INDENT + INDENT + 'tr.appendChild(document.createElement(' + Q + 'td' + Q + '));');
    lines.push(indent + INDENT + '}');
    lines.push(indent + INDENT + 'tabela.appendChild(tr);');
    lines.push(indent + '}');
    lines.push('');
    lines.push(indent + '// Encaixa tudo: a <table> dentro do <form>, o <form> na página.');
    lines.push(indent + 'form.appendChild(tabela);');
    lines.push(indent + 'document.body.appendChild(form);');
    return lines;
  }

  function genVisor(indent) {
    var lines = [];
    lines.push(indent + regua('// ---- O VISOR', 66));
    lines.push(indent + '// Em HTML:');
    lines.push(indent + '//   <input type="text" maxlength="18" class="resultado"');
    lines.push(indent + '//          name="tela" id="tela" readonly>');
    lines.push(indent + '// O visor é a MEMÓRIA da calculadora: o que aparece nele fica');
    lines.push(indent + '// guardado em tela.value. O id="tela" é o nome que usamos para');
    lines.push(indent + '// reencontrá-lo depois com document.querySelector("#tela").');
    lines.push(indent + 'var visor = document.createElement(' + Q + 'input' + Q + ');');
    lines.push(indent + 'visor.setAttribute(' + Q + 'type' + Q + ', ' + Q + 'text' + Q + ');        // é um campo de texto');
    lines.push(indent + 'visor.setAttribute(' + Q + 'maxlength' + Q + ', ' + Q + '18' + Q + ');     // cabem 18 caracteres');
    lines.push(indent + 'visor.setAttribute(' + Q + 'class' + Q + ', ' + Q + 'resultado' + Q + ');  // usa a regra .resultado do CSS');
    lines.push(indent + 'visor.setAttribute(' + Q + 'name' + Q + ', ' + Q + 'tela' + Q + ');');
    lines.push(indent + 'visor.setAttribute(' + Q + 'id' + Q + ', ' + Q + 'tela' + Q + ');');
    lines.push(indent + 'visor.setAttribute(' + Q + 'readonly' + Q + ', ' + Q + Q + ');        // ninguém digita direto nele');
    lines.push('');
    lines.push(indent + '// Coloca o visor na casa que já estava reservada para ele (linha 0).');
    lines.push(indent + 'tabela.rows[0].cells[0].appendChild(visor);');
    return lines;
  }

  function genBotao(token, indent, primeiro) {
    var D = dom();
    var label = D.buttonLabel(token);
    var slot = D.buttonSlot(token);
    if (!slot) return [];
    var v = buttonVarName(token);
    var htmlLinha = '<td><input type="button" value="' + label + '" class="botao"></td>';
    var lines = [];
    lines.push(indent + regua('// ---- A TECLA "' + label + '"', 66));
    lines.push(indent + '// Em HTML: ' + htmlLinha);
    if (primeiro) {
      lines.push(indent + '// data-btn é uma etiqueta nossa: serve para reencontrar este');
      lines.push(indent + '// botão depois, na hora de ligar o clique (PARTE 2).');
      lines.push(indent + '// tabela.rows[linha].cells[coluna] é a casa que JÁ existe na');
      lines.push(indent + '// grade: a tecla só ocupa o lugar dela, nada é empurrado.');
    }
    lines.push(indent + 'var ' + v + ' = document.createElement(' + Q + 'input' + Q + ');');
    lines.push(indent + v + '.setAttribute(' + Q + 'type' + Q + ', ' + Q + 'button' + Q + ');');
    lines.push(indent + v + '.setAttribute(' + Q + 'value' + Q + ', ' + jsString(label) + ');');
    lines.push(indent + v + '.setAttribute(' + Q + 'class' + Q + ', ' + Q + 'botao' + Q + ');');
    lines.push(indent + v + '.setAttribute(' + Q + 'data-btn' + Q + ', ' + jsString(token) + ');');
    lines.push(indent + 'tabela.rows[' + slot.row + '].cells[' + slot.col + '].appendChild(' + v + ');'
      + '  // linha ' + slot.row + ', coluna ' + slot.col);
    return lines;
  }

  // Gera um op de setup (IR v2) -> linhas de código real.
  function genSetup(op, indent, ctx) {
    ctx = ctx || {};
    switch (op.op) {
      case 'ui.createBody':
        return genEstilo(indent).concat(['']).concat(genCorpo(indent));
      case 'ui.createVisor':
        return genVisor(indent);
      case 'ui.addButton':
        var primeiro = !ctx.jaTemBotao;
        ctx.jaTemBotao = true;
        return genBotao(op.token, indent, primeiro);
      default:
        throw new Error('Op de setup desconhecida: ' + op.op);
    }
  }

  // ------------------------------------------------------------------
  // PARTE 2 — o código real do comportamento
  // ------------------------------------------------------------------

  // Explicação de uma operação — emitida só na PRIMEIRA vez que ela aparece,
  // para o código não virar um muro de comentários repetidos.
  function explica(chave, ctx, linhas) {
    if (!ctx.explicado) ctx.explicado = {};
    if (ctx.explicado[chave]) return [];
    ctx.explicado[chave] = true;
    return linhas;
  }

  function push(lines, novas) { novas.forEach(function(l) { lines.push(l); }); }

  function genOp(op, indent, ctx) {
    indent = indent || '';
    ctx = ctx || { explicado: {} };
    var lines = [];
    switch (op.op) {
      case 'display.append':
        push(lines, explica('append', ctx, [
          indent + '// tela.value é o texto que está no visor agora.',
          indent + '// Somar textos junta um no fim do outro: "12" + "7" vira "127".'
        ]));
        if (/^ .+ $/.test(op.value)) {
          push(lines, explica('operador', ctx, [
            indent + '// Os espaços em volta do operador separam os números na conta.'
          ]));
        }
        lines.push(indent + 'tela.value = tela.value + ' + jsString(op.value) + ';');
        break;
      case 'display.clear':
        push(lines, explica('clear', ctx, [
          indent + '// Um texto vazio (' + Q + Q + ') apaga tudo o que estava no visor.'
        ]));
        lines.push(indent + 'tela.value = ' + Q + Q + ';');
        break;
      case 'display.deleteLast':
        push(lines, explica('del', ctx, [
          indent + '// slice(0, tamanho - 1) devolve o texto SEM o último caractere',
          indent + '// — é exatamente o que a tecla backspace faz.'
        ]));
        lines.push(indent + 'tela.value = tela.value.slice(0, tela.value.length - 1);');
        break;
      case 'display.evaluate':
        push(lines, explica('eval', ctx, [
          indent + '// Só calcula se houver alguma coisa escrita no visor.',
          indent + '// avaliar() recebe a conta como TEXTO ("1 + 2") e devolve o',
          indent + '// resultado (3). É a nossa versão segura do eval() do JavaScript,',
          indent + '// que a calculadora original usava exatamente aqui.'
        ]));
        lines.push(indent + 'if (tela.value) {');
        lines.push(indent + INDENT + 'tela.value = avaliar(tela.value);');
        lines.push(indent + '}');
        break;
      case 'expression.setValue':
        push(lines, explica('set', ctx, [
          indent + '// Troca o conteúdo do visor por uma mensagem.'
        ]));
        lines.push(indent + 'tela.value = ' + jsString(op.value) + ';');
        break;
      case 'try':
        push(lines, explica('try', ctx, [
          indent + '// try = "tente". Se a conta der erro, o programa NÃO quebra:',
          indent + '// ele pula direto para o catch ("se der erro") logo abaixo.'
        ]));
        lines.push(indent + 'try {');
        (op['try'] || []).forEach(function(sub) {
          push(lines, genOp(sub, indent + INDENT, ctx));
        });
        lines.push(indent + '} catch (e) {');
        (op['catch'] || []).forEach(function(sub) {
          push(lines, genOp(sub, indent + INDENT, ctx));
        });
        lines.push(indent + '}');
        break;
      default:
        throw new Error('Op desconhecida: ' + op.op);
    }
    return lines;
  }

  function genBody(body, ctx) {
    var lines = [];
    (body || []).forEach(function(op) {
      push(lines, genOp(op, INDENT, ctx));
    });
    return lines;
  }

  // ------------------------------------------------------------------
  // Programa completo
  // ------------------------------------------------------------------

  function codegen(ir) {
    var setup = (ir && ir.setup) || [];
    var handlers = (ir && ir.handlers) || [];
    var hasVisor = setup.some(function(op) { return op.op === 'ui.createVisor'; });

    var out = [
      '// ===================================================================',
      '// MontaCalc — o código REAL da sua calculadora.',
      '// É o mesmo JavaScript que uma pessoa escreveria à mão: primeiro o',
      '// ESTILO e a ESTRUTURA (o CSS e o HTML feitos por código), depois o',
      '// COMPORTAMENTO (o que acontece quando alguém clica num botão).',
      '// ===================================================================',
      '',
      '// -------------------------------------------------------------------',
      '// PARTE 1 — MONTAR A CALCULADORA (aparência + peças na tela)',
      '// -------------------------------------------------------------------',
      'function montarCalculadora() {'
    ];

    if (setup.length === 0) {
      out.push(INDENT + '// Nada montado ainda: arraste os blocos de Estrutura.');
    }
    var ctxSetup = {};
    setup.forEach(function(op, i) {
      if (i > 0) out.push('');
      push(out, genSetup(op, INDENT, ctxSetup));
    });
    out.push('}');
    out.push('');
    out.push('// Chamar a função é o que faz a calculadora aparecer na tela.');
    out.push('montarCalculadora();');

    if (handlers.length === 0 && !hasVisor) {
      return out.join('\n');
    }

    out.push('');
    out.push('// -------------------------------------------------------------------');
    out.push('// PARTE 2 — LIGAR OS BOTÕES (o que acontece ao clicar)');
    out.push('// -------------------------------------------------------------------');
    out.push('');

    if (hasVisor) {
      out.push('// O visor é a memória. querySelector("#tela") procura na página o');
      out.push('// elemento de id="tela" e guarda numa variável, para as funções abaixo.');
      out.push('var tela = document.querySelector(' + Q + '#tela' + Q + ');');
      out.push('');
    }

    var ctxBody = { explicado: {} };
    handlers.forEach(function(h) {
      if (h.event !== 'button.click') return;
      var body = genBody(h.body, ctxBody);
      out.push('// O que fazer quando clicarem no botão "' + h.button + '":');
      out.push('function ' + handlerName(h.button) + '() {');
      if (body.length === 0) { out.push(INDENT + '// nenhuma ação ligada a esta tecla ainda'); }
      push(out, body);
      out.push('}');
      out.push('');
    });

    var listeners = [];
    handlers.forEach(function(h) {
      if (h.event !== 'button.click') return;
      listeners.push('document.querySelector(' + Q + '[data-btn="' + h.button + '"]' + Q + ').addEventListener(' + Q + 'click' + Q + ', ' + handlerName(h.button) + ');');
    });

    if (listeners.length) {
      out.push('// Agora ligamos cada função ao seu botão:');
      out.push('// querySelector("[data-btn=...]") acha o botão pela etiqueta que');
      out.push('// colocamos na PARTE 1, e addEventListener("click", funcao) diz ao');
      out.push('// navegador: "quando clicarem aqui, execute esta função".');
      push(out, listeners);
    }

    return out.join('\n');
  }

  var API = { codegen: codegen, buttonIdToName: buttonIdToName, buttonVarName: buttonVarName, handlerName: handlerName };
  root.MontaCalc = root.MontaCalc || {};
  root.MontaCalc.Codegen = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
