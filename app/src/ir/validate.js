/*
 * MontaCalc — Validação da Representação Intermediária (IR).
 * Puro (sem DOM/Blockly). Testável em node.
 * Contrato de IR (spec §5.2 / §5.5):
 *   { version:2, setup:[op,...], handlers:[ { event:"button.click", button:"<token>", body:[op,...] } ] }
 * Ops de setup (v2): ui.createBody, ui.createVisor, ui.addButton (token).
 * Ops de handler: display.append, display.clear, display.deleteLast, display.evaluate,
 *                 expression.setValue, try (com try[]/catch[]).
 */
(function(root) {
  'use strict';

  var ALLOWED_BUTTONS = ['0','1','2','3','4','5','6','7','8','9','.','+','-','*','/','=','C','del'];
  var ALLOWED_EVENTS = ['button.click'];
  var ALLOWED_OPS = ['display.append','display.clear','display.deleteLast','display.evaluate','expression.setValue','try'];
  var ALLOWED_SETUP = ['ui.createBody','ui.createVisor','ui.addButton'];
  var VALID_VERSIONS = [1, 2];

  function isAllowedButton(b) { return ALLOWED_BUTTONS.indexOf(b) !== -1; }

  function validateIR(ir) {
    var errors = [];
    if (!ir || typeof ir !== 'object') return { ok: false, errors: ['IR não é objeto'] };
    if (VALID_VERSIONS.indexOf(ir.version) === -1) errors.push('version deve ser 1 ou 2');
    var version = ir.version;

    var setup = version === 2 ? (ir.setup || []) : [];
    if (version === 2 && !Array.isArray(ir.setup)) { errors.push('setup deve ser um array'); }

    var hasBody = false;
    var hasVisor = false;
    var buttonsAdded = {};
    var order = 0;
    var bodySeen = false;
    var visorSeen = false;
    setup.forEach(function(op, idx) {
      var p = 'setup[' + idx + ']';
      if (!op || typeof op !== 'object') { errors.push(p + ' não é objeto'); return; }
      if (ALLOWED_SETUP.indexOf(op.op) === -1) { errors.push(p + '.op inválido: ' + op.op); return; }
      if (op.op === 'ui.createBody') {
        if (bodySeen) errors.push(p + ': corpo duplicado');
        if (order !== 0) errors.push(p + ': o corpo deve ser o primeiro passo');
        bodySeen = true; hasBody = true;
      } else if (op.op === 'ui.createVisor') {
        if (visorSeen) errors.push(p + ': visor duplicado');
        if (!hasBody) errors.push(p + ': o visor exige o corpo antes');
        visorSeen = true; hasVisor = true;
      } else if (op.op === 'ui.addButton') {
        var t = String(op.token);
        if (!hasBody) errors.push(p + ': botão exige o corpo antes');
        if (!hasVisor) errors.push(p + ': botão exige o visor antes');
        if (!isAllowedButton(t)) errors.push(p + '.token inválido: ' + t);
        if (buttonsAdded[t]) errors.push(p + '.token duplicado: ' + t);
        buttonsAdded[t] = true;
      }
      order++;
    });

    if (!Array.isArray(ir.handlers)) { errors.push('handlers deve ser um array'); return { ok: errors.length === 0, errors: errors }; }
    if (ir.handlers.length === 0 && setup.length === 0) errors.push('programa vazio: monte a estrutura ou ligue um botão');

    var seen = {};
    ir.handlers.forEach(function(h, idx) {
      var p = 'handlers[' + idx + ']';
      if (!h || typeof h !== 'object') { errors.push(p + ' não é objeto'); return; }
      if (ALLOWED_EVENTS.indexOf(h.event) === -1) errors.push(p + '.event inválido: ' + h.event);
      if (h.event === 'button.click') {
        if (!isAllowedButton(h.button)) errors.push(p + '.button inválido: ' + h.button);
        if (seen[h.button]) errors.push(p + '.button duplicado: ' + h.button);
        seen[h.button] = true;
        if (version === 2 && !buttonsAdded[h.button]) errors.push(p + ': botão "' + h.button + '" precisa ser adicionado no setup (adicionar botão)');
      }
      if (!Array.isArray(h.body)) { errors.push(p + '.body deve ser array'); return; }
      validateOps(h.body, p + '.body', errors, version === 2 ? hasVisor : undefined);
    });
    return { ok: errors.length === 0, errors: errors };
  }

  function validateOps(ops, path, errors, hasVisor) {
    ops.forEach(function(op, i) {
      var p = path + '[' + i + ']';
      if (!op || typeof op !== 'object') { errors.push(p + ' não é objeto'); return; }
      if (ALLOWED_OPS.indexOf(op.op) === -1) { errors.push(p + '.op inválido: ' + op.op); return; }
      if (op.op === 'display.append' || op.op === 'display.clear' || op.op === 'display.deleteLast' ||
          op.op === 'display.evaluate' || op.op === 'expression.setValue') {
        if (hasVisor === false) errors.push(p + ': ação do visor exige o visor criado no setup');
      }
      if (op.op === 'display.append') {
        if (typeof op.value !== 'string') errors.push(p + ' exige .value string (display.append)');
      }
      if (op.op === 'expression.setValue') {
        if (typeof op.value !== 'string') errors.push(p + ' exige .value string (expression.setValue)');
      }
      if (op.op === 'try') {
        if (!Array.isArray(op['try'])) { errors.push(p + ' exige .try[] (try)'); return; }
        if (!Array.isArray(op['catch'])) errors.push(p + ' exige .catch[] (try)');
        validateOps(op['try'] || [], p + '.try', errors, hasVisor);
        validateOps(op['catch'] || [], p + '.catch', errors, hasVisor);
      }
    });
  }

  var API = { validateIR: validateIR, ALLOWED_BUTTONS: ALLOWED_BUTTONS, ALLOWED_OPS: ALLOWED_OPS, ALLOWED_SETUP: ALLOWED_SETUP };
  root.MontaCalc = root.MontaCalc || {};
  root.MontaCalc.Validate = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
