/*
 * MontaCalc — Definições de blocos Blockly (Bloco -> IR via Serialize).
 * O toolbox é filtrado por nível (nivel.js fornece botões/ações permitidos).
 * Cores por categoria conforme spec/03.
 */
(function(root) {
  'use strict';
  if (!root.Blockly) return;

  var COLORS = {
    estrutura: '#E86A5A', // terracota (Estrutura / visual da calculadora)
    evento: '#3FAE8F',  // verde-água (Eventos)
    visor:  '#4A90D9',  // azul (Visor)
    oper:   '#F5A623',  // laranja (Operadores)
    logica: '#8E6ACB'   // roxo (Lógica/Erros)
  };

  // Opções do dropdown de botão. IMPORTANTE: precisa conter TODOS os botões já
  // liberados (acúmulo dos níveis 1..N), não só os novos do nível. O Blockly troca
  // o valor de um dropdown por outro da lista quando o valor guardado some — e isso
  // transformaria silenciosamente um bloco "botão 7" do nível 3 em "botão 2" no nível 4.
  var DEFAULT_BUTTONS = ['0','1','2','3','4','5','6','7','8','9','.','+','-','*','/','=','C','del'];
  var currentButtons = [];
  function setAllowedButtons(list) { currentButtons = (list || []).map(String); }
  function buttonOptions() {
    var list = currentButtons.length ? currentButtons : DEFAULT_BUTTONS;
    return list.map(function(b) { return [b, b]; });
  }

  var Blockly = root.Blockly;

  Blockly.Blocks['q_botao'] = { init: function() {
    this.appendDummyInput().appendField('quando clicar em')
      .appendField(new Blockly.FieldDropdown(buttonOptions), 'BTN');
    this.setColour(COLORS.evento);
    this.setTooltip('Este bloco é o GATILHO: a ação acontece quando você clica neste botão.');
    // bloco "chapéu": sem entrada anterior, mas com conexão de "próximo" para empilhar ações.
    this.setPreviousStatement(false, null);
    this.setNextStatement(true, null);
  }};

  // ---- Estrutura (montar a calculadora do zero) ----
  Blockly.Blocks['q_iniciar'] = { init: function() {
    this.appendDummyInput().appendField('quando o programa iniciar');
    this.setColour(COLORS.estrutura);
    this.setTooltip('O gatilho da ESTRUTURA: o que você encaixar aqui vira o HTML e o CSS da calculadora (as caixas de cima do painel de código).');
    this.setPreviousStatement(false, null);
    this.setNextStatement(true, null);
  }};

  Blockly.Blocks['e_corpo'] = { init: function() {
    this.appendDummyInput().appendField('criar o corpo da calculadora');
    this.setColour(COLORS.estrutura);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Cria o <style> (CSS) e a moldura completa: <form> com uma <table> de 6 linhas × 4 colunas de casas vazias. Veja os passos reais no painel de código.');
  }};

  Blockly.Blocks['e_visor'] = { init: function() {
    this.appendDummyInput().appendField('adicionar o visor');
    this.setColour(COLORS.estrutura);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Cria um <input id="tela"> e o coloca na casa da linha 0, já reservada para ele (o visor é a memória: tela.value).');
  }};

  Blockly.Blocks['e_botao'] = { init: function() {
    this.appendDummyInput().appendField('adicionar botão')
      .appendField(new Blockly.FieldDropdown(buttonOptions), 'BOT');
    this.setColour(COLORS.estrutura);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Cria um <input type="button"> e o coloca na casa definitiva dele na grade (nada é empurrado).');
  }};

  Blockly.Blocks['a_acrescentar'] = { init: function() {
    this.appendDummyInput().appendField('acrescentar')
      .appendField(new Blockly.FieldTextInput(''), 'VALOR')
      .appendField('no visor');
    this.setColour(COLORS.visor);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Acrescenta um caractere ao visor (o visor é a memória).');
  }};

  Blockly.Blocks['a_limpar'] = { init: function() {
    this.appendDummyInput().appendField('limpar o visor');
    this.setColour(COLORS.visor);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Apaga TUDO que está no visor.');
  }};

  Blockly.Blocks['a_apagar_ultimo'] = { init: function() {
    this.appendDummyInput().appendField('apagar o último do visor');
    this.setColour(COLORS.visor);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Remove só o último caractere do visor.');
  }};

  Blockly.Blocks['a_inserir_op'] = { init: function() {
    this.appendDummyInput().appendField('inserir operador')
      .appendField(new Blockly.FieldDropdown([['+','+'],['-','-'],['×','*'],['÷','/']]), 'OP');
    this.setColour(COLORS.oper);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Acrescenta um operador (com espaços) para formar uma expressão.');
  }};

  Blockly.Blocks['a_calcular'] = { init: function() {
    this.appendDummyInput().appendField('calcular o visor (=)');
    this.setColour(COLORS.oper);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Lê o visor, calcula e mostra o resultado.');
  }};

  Blockly.Blocks['a_mostrar_erro'] = { init: function() {
    this.appendDummyInput().appendField('mostrar')
      .appendField(new Blockly.FieldTextInput('Erro'), 'VALOR')
      .appendField('no visor');
    this.setColour(COLORS.logica);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Coloca uma mensagem no visor (ex.: Erro).');
  }};

  Blockly.Blocks['tentar'] = { init: function() {
    this.appendDummyInput().appendField('tentar');
    this.appendStatementInput('TENTE').setCheck(null);
    this.appendDummyInput().appendField('se der erro');
    this.appendStatementInput('SEERRO').setCheck(null);
    this.setColour(COLORS.logica);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Protege uma ação: se der erro, executa a parte "se der erro".');
  }};

  // ---- Toolbox (XML) filtrado por nível ----
  // Categorias com novidade deste nível ganham "✨ NOVO" no nome e a primeira
  // delas abre sozinha (expanded="true"), para o aluno achar os blocos novos.
  function toolboxFor(level, opts) {
    opts = opts || {};
    var btns = level.options.buttons || [];
    var acts = level.options.actions || [];
    var estrutura = level.options.estrutura || [];
    var novidadesCats = (opts.newCats || []);
    var firstNew = novidadesCats.length ? novidadesCats[0] : null;
    function cat(name, colour) {
      var open = name === firstNew;
      return '<category name="' + name + (novidadesCats.indexOf(name) !== -1 ? ' ✨ NOVO' : '') +
        '" colour="' + colour + '"' + (open ? ' expanded="true"' : '') + '>';
    }
    var xml = '<xml>';
    // Estrutura (construir a calculadora)
    if (estrutura.length) {
      xml += cat('Estrutura', '#E86A5A');
      xml += '<block type="q_iniciar"></block>';
      if (estrutura.indexOf('e_corpo') !== -1) xml += '<block type="e_corpo"></block>';
      if (estrutura.indexOf('e_visor') !== -1) xml += '<block type="e_visor"></block>';
      if (estrutura.indexOf('e_botao') !== -1) {
        btns.forEach(function(b) { xml += '<block type="e_botao"><field name="BOT">' + b + '</field></block>'; });
      }
      xml += '</category>';
    }
    // Eventos
    xml += cat('Eventos', '#3FAE8F');
    btns.forEach(function(b) { xml += '<block type="q_botao"><field name="BTN">' + b + '</field></block>'; });
    xml += '</category>';
    // Visor (o bloco roxo "mostrar Erro" fica SÓ na Lógica, não aqui)
    if (acts.some(function(a){return a==='a_acrescentar';})) {
      xml += cat('Visor', '#4A90D9');
      if (acts.indexOf('a_acrescentar') !== -1) xml += '<block type="a_acrescentar"></block>';
      if (acts.indexOf('a_limpar') !== -1) xml += '<block type="a_limpar"></block>';
      if (acts.indexOf('a_apagar_ultimo') !== -1) xml += '<block type="a_apagar_ultimo"></block>';
      xml += '</category>';
    }
    // Operadores / Conta
    var hasOp = acts.indexOf('a_inserir_op') !== -1 || acts.indexOf('a_calcular') !== -1;
    if (hasOp) {
      xml += cat('Operadores', '#F5A623');
      if (acts.indexOf('a_inserir_op') !== -1) {
        var ops = level.options.opSymbols || ['+', '-', '*', '/'];
        ops.forEach(function(sym) { xml += '<block type="a_inserir_op"><field name="OP">' + sym + '</field></block>'; });
      }
      if (acts.indexOf('a_calcular') !== -1) xml += '<block type="a_calcular"></block>';
      xml += '</category>';
    }
    // Lógica
    if (acts.indexOf('tentar') !== -1) {
      xml += cat('Lógica', '#8E6ACB');
      xml += '<block type="tentar"></block>';
      xml += '<block type="a_mostrar_erro"></block>';
      xml += '</category>';
    }
    xml += '</xml>';
    return xml;
  }

  var API = { setAllowedButtons: setAllowedButtons, toolboxFor: toolboxFor, COLORS: COLORS };
  root.MontaCalc = root.MontaCalc || {};
  root.MontaCalc.BlockDefs = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
