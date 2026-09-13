/*
 * MontaCalc — Serializador BLOCOS -> IR.
 * Dois caminhos:
 *   1) `irFromBlocks(blockTree)` — PURO e testável. blockTree é uma descrição de blocos
 *      em JSON (independente de Blockly), unidade de verdade para IR.
 *   2) `serializeWorkspace(workspace)` — lê um workspace Blockly e converte para blockTree,
 *      depois chama irFromBlocks. Esta ponte é fina (só extrai tipo/campos/conexões do Blockly).
 *
 * Contrato de blockTree (v2):
 *   [ { type:'q_iniciar', stmt:[ <estrutura> ] },
 *     { type:'q_botao', btn:'7', stmt:[ <actions> ] }, ... ]
 *   estrutura: e_corpo | e_visor | e_botao(token)
 *   actions: a_acrescentar(value) | a_limpar | a_apagar_ultimo | a_inserir_op(op)
 *            | a_calcular | a_mostrar_erro(value) | tentar(tente[], seErro[])
 *
 * IR v2:
 *   { version:2, setup:[{op:'ui.createBody'},{op:'ui.createVisor'},{op:'ui.addButton',token}],
 *     handlers:[{event:'button.click', button, body}] }
 */
(function(root) {
  'use strict';

  // ---- Parte pura: blockTree -> IR ----
  function stmtToOps(node) {
    if (!node) return [];
    switch (node.type) {
      case 'a_acrescentar': return [{ op: 'display.append', value: String(node.value == null ? '' : node.value) }];
      case 'a_limpar': return [{ op: 'display.clear' }];
      case 'a_apagar_ultimo': return [{ op: 'display.deleteLast' }];
      case 'a_inserir_op': return [{ op: 'display.append', value: ' ' + String(node.op) + ' ' }];
      case 'a_calcular': return [{ op: 'display.evaluate' }];
      case 'a_mostrar_erro': return [{ op: 'expression.setValue', value: String(node.value == null ? 'Erro' : node.value) }];
      case 'tentar': return [{
        op: 'try',
        'try': (node.tente || []).reduce(function(acc, n) { return acc.concat(stmtToOps(n)); }, []),
        'catch': (node.seErro || []).reduce(function(acc, n) { return acc.concat(stmtToOps(n)); }, [])
      }];
      default: return [];
    }
  }

  // estrutura -> op de setup (IR v2)
  function stmtToSetup(node) {
    if (!node) return [];
    switch (node.type) {
      case 'e_corpo': return [{ op: 'ui.createBody' }];
      case 'e_visor': return [{ op: 'ui.createVisor' }];
      case 'e_botao': return [{ op: 'ui.addButton', token: String(node.token == null ? '' : node.token) }];
      default: return [];
    }
  }

  function irFromBlocks(blockTree) {
    var setup = [];
    var handlers = [];
    (blockTree || []).forEach(function(hat) {
      if (!hat) return;
      if (hat.type === 'q_iniciar') {
        (hat.stmt || []).forEach(function(n) { setup = setup.concat(stmtToSetup(n)); });
      } else if (hat.type === 'q_botao') {
        var body = (hat.stmt || []).reduce(function(acc, n) { return acc.concat(stmtToOps(n)); }, []);
        handlers.push({ event: 'button.click', button: String(hat.btn), body: body });
      }
    });
    return { version: 2, setup: setup, handlers: handlers };
  }

  // ---- Ponte Blockly -> blockTree ----
  function blockToNode(block) {
    if (!block) return null;
    switch (block.type) {
      case 'q_iniciar':
        return { type: 'q_iniciar', stmt: chainNodes(block.getNextBlock()) };
      case 'q_botao':
        return { type: 'q_botao', btn: block.getFieldValue('BTN'), stmt: chainNodes(block.getNextBlock()) };
      case 'e_corpo': return { type: 'e_corpo' };
      case 'e_visor': return { type: 'e_visor' };
      case 'e_botao': return { type: 'e_botao', token: block.getFieldValue('BOT') };
      case 'a_acrescentar': return { type: 'a_acrescentar', value: block.getFieldValue('VALOR') };
      case 'a_limpar': return { type: 'a_limpar' };
      case 'a_apagar_ultimo': return { type: 'a_apagar_ultimo' };
      case 'a_inserir_op': return { type: 'a_inserir_op', op: block.getFieldValue('OP') };
      case 'a_calcular': return { type: 'a_calcular' };
      case 'a_mostrar_erro': return { type: 'a_mostrar_erro', value: block.getFieldValue('VALOR') };
      case 'tentar':
        var tente = chainNodes(block.getInputTargetBlock('TENTE'));
        var seErro = chainNodes(block.getInputTargetBlock('SEERRO'));
        return { type: 'tentar', tente: tente, seErro: seErro };
      default: return null;
    }
  }

  // percorre a pilha de blocos conectados por next (chain) a partir do primeiro
  function chainNodes(first) {
    var arr = [];
    var b = first;
    var guard = 0;
    while (b && guard < 500) {
      var n = blockToNode(b);
      if (n) arr.push(n);
      b = b.getNextBlock ? b.getNextBlock() : null;
      guard++;
    }
    return arr;
  }

  function serializeWorkspace(workspace) {
    var blockTree = [];
    var all = workspace.getAllBlocks ? workspace.getAllBlocks(false) : [];
    all.forEach(function(block) {
      if (block.type !== 'q_iniciar' && block.type !== 'q_botao') return;
      // só hats de topo (sem antecessor) viram handlers/setup
      if (block.getParent && block.getParent()) return;
      var node = blockToNode(block);
      if (node) blockTree.push(node);
    });
    return irFromBlocks(blockTree);
  }

  var API = { irFromBlocks: irFromBlocks, serializeWorkspace: serializeWorkspace, blockToNode: blockToNode };
  root.MontaCalc = root.MontaCalc || {};
  root.MontaCalc.Serialize = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
