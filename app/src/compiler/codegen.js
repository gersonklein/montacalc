/*
 * MontaCalc — Compilador IR -> código REAL (HTML + CSS + JavaScript), comentado.
 * Puro (sem DOM/Blockly). Testável em node.
 *
 * PRINCÍPIO PEDAGÓGICO: o painel de código não pode conter atalhos mágicos.
 * O BLOCO é simplificado; o CÓDIGO é o de verdade — o mesmo que uma pessoa
 * escreveria à mão, separado nas TRÊS partes de uma página web, como na
 * calculadora original (calc.html / estilos.css / operacoes.js):
 *
 *   html — a ESTRUTURA: <form> > <table> > <tr> > <td> com visor e botões.
 *          A grade nasce COMPLETA (6x4); cada peça só preenche a casa dela.
 *   css  — a APARÊNCIA: as regras de estilos.css.
 *   js   — o COMPORTAMENTO: uma função nomeada por botão + addEventListener.
 *
 * codegen(ir) devolve { html, css, js }. O sandbox instala exatamente esses
 * três textos (o CSS num <style>, o HTML no <body> e roda o JS).
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

  // Texto dentro de um atributo HTML (entre aspas duplas).
  function htmlAttr(v) {
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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

  function push(lines, novas) { novas.forEach(function(l) { lines.push(l); }); }

  // ------------------------------------------------------------------
  // HTML — a estrutura
  // ------------------------------------------------------------------

  function genHtml(setup) {
    var D = dom();
    var hasBody = false, hasVisor = false, botoes = {}, temBotao = false;
    setup.forEach(function(op) {
      if (op.op === 'ui.createBody') hasBody = true;
      else if (op.op === 'ui.createVisor') hasVisor = true;
      else if (op.op === 'ui.addButton') {
        var slot = D.buttonSlot(op.token);
        if (slot) { botoes[slot.row + ',' + slot.col] = String(op.token); temBotao = true; }
      }
    });

    if (!hasBody) {
      var vazio = ['<!-- Nada montado ainda: arraste os blocos de Estrutura. -->'];
      if (setup.length) vazio.push('<!-- O visor e os botões precisam do corpo antes. -->');
      return vazio.join('\n');
    }

    var I1 = INDENT, I2 = INDENT + INDENT, I3 = I2 + INDENT, I4 = I3 + INDENT;
    var out = [
      '<!-- O CORPO: um formulário com uma tabela dentro.',
      '     A tabela é a GRADE da calculadora: 6 linhas (<tr>) de 4 casas (<td>).',
      '     Ela já nasce COMPLETA, então nada muda de lugar depois. -->',
      '<form name="formulario">',
      I1 + '<table>',
      '',
      I2 + '<!-- linha 0: a casa do visor, esticada pelas 4 colunas -->',
      I2 + '<tr>'
    ];
    if (hasVisor) {
      out.push(I3 + '<td colspan="4">');
      out.push(I4 + '<!-- O VISOR é a memória: o que aparece nele fica em tela.value.');
      out.push(I4 + '     readonly = ninguém digita direto nele. -->');
      out.push(I4 + '<input type="text" maxlength="18" class="resultado" name="tela" id="tela" readonly>');
      out.push(I3 + '</td>');
    } else {
      out.push(I3 + '<td colspan="4"></td>  <!-- vazia: esperando o visor -->');
    }
    out.push(I2 + '</tr>');
    out.push('');
    out.push(I2 + '<!-- linhas 1 a 5: o teclado. Casas vazias (<td></td>) esperam botões.');
    if (temBotao) {
      out.push(I2 + '     data-btn é uma etiqueta nossa: o JavaScript usa ela para achar cada botão. -->');
    } else {
      out.push(I2 + '-->');
    }
    for (var r = 1; r < D.LINHAS; r++) {
      var casas = [], temNaLinha = false;
      for (var c = 0; c < D.COLUNAS; c++) {
        var token = botoes[r + ',' + c];
        if (token === undefined) {
          casas.push('<td></td>');
        } else {
          temNaLinha = true;
          casas.push('<td><input type="button" value="' + htmlAttr(D.buttonLabel(token)) +
            '" class="botao" data-btn="' + htmlAttr(token) + '"></td>');
        }
      }
      if (!temNaLinha) {
        // linha ainda sem botões: numa linha só, para o HTML não ficar comprido
        out.push(I2 + '<tr>' + casas.join('') + '</tr>');
      } else {
        out.push(I2 + '<tr>');
        casas.forEach(function(td) { out.push(I3 + td); });
        out.push(I2 + '</tr>');
      }
    }
    out.push(I1 + '</table>');
    out.push('</form>');
    return out.join('\n');
  }

  // ------------------------------------------------------------------
  // CSS — a aparência
  // ------------------------------------------------------------------

  function genCss(setup) {
    var hasBody = setup.some(function(op) { return op.op === 'ui.createBody'; });
    if (!hasBody) {
      return '/* Sem estilo ainda: as regras aparecem quando o corpo for montado. */';
    }
    var out = [
      '/* Regras de aparência — as mesmas do arquivo estilos.css original.',
      '   "table" vale para toda <table>;',
      '   ".resultado" vale para quem tem class="resultado" (o visor);',
      '   ".botao" vale para TODO elemento com class="botao". */'
    ];
    push(out, dom().CSS_LINES);
    return out.join('\n');
  }

  // ------------------------------------------------------------------
  // JavaScript — o comportamento
  // ------------------------------------------------------------------

  // Explicação de uma operação — emitida só na PRIMEIRA vez que ela aparece,
  // para o código não virar um muro de comentários repetidos.
  function explica(chave, ctx, linhas) {
    if (!ctx.explicado) ctx.explicado = {};
    if (ctx.explicado[chave]) return [];
    ctx.explicado[chave] = true;
    return linhas;
  }

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

  function genJs(setup, handlers) {
    var hasVisor = setup.some(function(op) { return op.op === 'ui.createVisor'; });
    var clicks = handlers.filter(function(h) { return h.event === 'button.click'; });

    var out = [
      '// O COMPORTAMENTO da calculadora: o que acontece quando alguém clica.',
      '// (A estrutura está no HTML e a aparência no CSS, nas caixas acima.)',
      ''
    ];

    if (!hasVisor && clicks.length === 0) {
      out.push('// Nenhum botão ligado ainda: arraste os blocos de Eventos.');
      return out.join('\n');
    }

    if (hasVisor) {
      out.push('// O visor é a memória. querySelector("#tela") procura na página o');
      out.push('// elemento de id="tela" (lá no HTML) e guarda numa variável.');
      out.push('var tela = document.querySelector(' + Q + '#tela' + Q + ');');
      out.push('');
    }

    var ctxBody = { explicado: {} };
    clicks.forEach(function(h) {
      var body = genBody(h.body, ctxBody);
      out.push('// O que fazer quando clicarem no botão "' + h.button + '":');
      out.push('function ' + handlerName(h.button) + '() {');
      if (body.length === 0) { out.push(INDENT + '// nenhuma ação ligada a esta tecla ainda'); }
      push(out, body);
      out.push('}');
      out.push('');
    });

    if (clicks.length) {
      out.push('// Agora ligamos cada função ao seu botão:');
      out.push('// querySelector("[data-btn=...]") acha o botão pela etiqueta que');
      out.push('// colocamos no HTML, e addEventListener("click", funcao) diz ao');
      out.push('// navegador: "quando clicarem aqui, execute esta função".');
      clicks.forEach(function(h) {
        out.push('document.querySelector(' + Q + '[data-btn="' + h.button + '"]' + Q + ').addEventListener(' + Q + 'click' + Q + ', ' + handlerName(h.button) + ');');
      });
    } else if (out[out.length - 1] === '') {
      out.pop();
    }

    return out.join('\n');
  }

  // ------------------------------------------------------------------
  // Programa completo: as três partes
  // ------------------------------------------------------------------

  function codegen(ir) {
    var setup = (ir && ir.setup) || [];
    var handlers = (ir && ir.handlers) || [];
    return {
      html: genHtml(setup),
      css: genCss(setup),
      js: genJs(setup, handlers)
    };
  }

  var API = { codegen: codegen, buttonIdToName: buttonIdToName, handlerName: handlerName };
  root.MontaCalc = root.MontaCalc || {};
  root.MontaCalc.Codegen = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
