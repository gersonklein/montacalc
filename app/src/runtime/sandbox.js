/*
 * MontaCalc — Sandbox de execução (iframe isolado).
 * O código gerado roda DENTRO de um iframe `sandbox="allow-scripts"` (sem allow-same-origin).
 * O iframe começa VAZIO e SEM estilos da calculadora: é o PRÓPRIO código do estudante
 * (o mesmo que ele lê no painel, em 3 partes) que entra: o CSS num <style>, o HTML no
 * <body> (corpo/visor/botões) e o JS que liga os cliques. A única coisa que o ambiente oferece é `avaliar` (a matemática), porque
 * na calculadora original esse papel era do eval() do navegador.
 * O código do estudante nunca toca o DOM da aplicação host.
 * Harness via postMessage:
 *   install(code:{html,css,js}) -> installed{ok}
 *   case{clicks}  -> caseResult{value}
 *   struct        -> structResult{struct:{hasBody,hasVisor,buttons[]}}
 */
(function(root) {
  'use strict';

  // Só o mínimo do ambiente (centralizar a página). A APARÊNCIA da calculadora
  // vem do <style> que o próprio código do estudante cria.
  var BASE_CSS = 'html,body{height:100%;margin:0;padding:0;font-family:sans-serif;}' +
    'body{display:flex;align-items:center;justify-content:center;}';

  function buildSrcdoc(extraSource, expect) {
    var fnSrc = expect();
    return '<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8">' +
      '<style id="estilo-base">' + BASE_CSS + '</style></head><body>' +
      '<script>'
      + 'var avaliar = ' + fnSrc + ';'
      + 'window.avaliar = avaliar;'
      + (extraSource || '')
      + 'function __limpar(){ document.body.innerHTML = ""; '
      + '  var antigos = document.querySelectorAll("head style:not(#estilo-base)"); '
      + '  for (var i=0;i<antigos.length;i++){ antigos[i].parentNode.removeChild(antigos[i]); } } '
      // O programa chega em 3 partes (html, css, js): o CSS vira um <style>, o HTML
      // vai para o <body> e o JS roda por último, quando os elementos já existem.
      + 'function __install(p){ try { __limpar(); if (typeof p === "string") p = { js: p }; p = p || {}; '
      + '  var estilo = document.createElement("style"); estilo.textContent = p.css || ""; document.head.appendChild(estilo); '
      + '  document.body.innerHTML = p.html || ""; '
      + '  (0,eval)(p.js || ""); return true; } catch(e) { return false; } }'
      + 'function __struct(){ var btns=[]; var list=document.querySelectorAll("[data-btn]"); '
      + '  for (var i=0;i<list.length;i++){ btns.push(list[i].getAttribute("data-btn")); } '
      + '  return { hasBody: !!document.querySelector("form[name=\\"formulario\\"]"), '
      + '           hasVisor: !!document.querySelector("#tela"), buttons: btns }; }'
      + 'function montacalcInit(){ if(window.mcDone) return; window.mcDone=true; '
      + '  window.addEventListener("message", function(ev){ '
      + '    var d = ev.data || {}; '
      + '    if (d.type === "install") { var ok = __install(d.code); window.parent.postMessage({type:"installed", id:d.id, ok:ok}, "*"); } '
      + '    else if (d.type === "struct") { var st = __struct(); window.parent.postMessage({type:"structResult", id:d.id, struct:st}, "*"); } '
      + '    else if (d.type === "case") { '
      + '      var tela = document.querySelector("#tela"); '
      + '      if (tela) tela.value = ""; '
      + '      (d.clicks || []).forEach(function(t){ var b=document.querySelector(\'[data-btn="\'+t+\'"]\'); if(b) b.dispatchEvent(new Event("click",{bubbles:true})); }); '
      + '      window.parent.postMessage({type:"caseResult", id:d.id, value: tela ? tela.value : ""}, "*"); '
      + '    } '
      + '  }); '
      + '} '
      + 'if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", montacalcInit); } else { montacalcInit(); }'
      + '</script></body></html>';
  }

  function createSandbox(mountEl, opts) {
    opts = opts || {};
    var iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('title', 'Calculadora');
    iframe.style.cssText = 'border:none;width:100%;height:100%;';
    mountEl.innerHTML = '';
    mountEl.appendChild(iframe);

    iframe.srcdoc = buildSrcdoc(opts.extraSource || '', root.MontaCalc.Evaluator.fnSource);

    var pending = {};
    var installPending = {};
    var count = 0;
    var safetyTimeout = opts.timeout || 3000;
    function onMsg(ev) {
      var d = ev.data || {};
      if (d.type === 'caseResult' && pending[d.id]) {
        var cb = pending[d.id]; delete pending[d.id];
        cb(d.value);
      }
      if (d.type === 'structResult' && pending[d.id]) {
        var scb = pending[d.id]; delete pending[d.id];
        scb(d.struct);
      }
      if (d.type === 'installed' && installPending[d.id]) {
        var icb = installPending[d.id]; delete installPending[d.id];
        icb(!!d.ok);
      }
    }
    window.addEventListener('message', onMsg);

    var ready = false;
    var readyQueue = [];
    function markReady() {
      if (ready) return;
      ready = true;
      var q = readyQueue; readyQueue = [];
      q.forEach(function(fn) { fn(); });
    }
    iframe.addEventListener('load', markReady);
    function whenReady(cb) {
      if (ready) { cb(); } else { readyQueue.push(cb); }
    }

    function post(type, payload) {
      iframe.contentWindow.postMessage(Object.assign({ type: type }, payload), '*');
    }

    var api = {
      setCode: function(code) {
        return new Promise(function(resolve) {
          var id = 'i' + (++count);
          var settled = false;
          installPending[id] = function(ok) { if (settled) return; settled = true; resolve(ok); };
          whenReady(function() { post('install', { id: id, code: code }); });
          setTimeout(function() {
            if (!settled) { if (installPending[id]) delete installPending[id]; settled = true; resolve(false); }
          }, safetyTimeout);
        });
      },
      runCase: function(clicks) {
        return new Promise(function(resolve) {
          var id = 'c' + (++count);
          var settled = false;
          pending[id] = function(v) { if (settled) return; settled = true; resolve(v); };
          whenReady(function() { post('case', { id: id, clicks: clicks }); });
          setTimeout(function() {
            if (!settled) { if (pending[id]) delete pending[id]; settled = true; resolve(null); }
          }, safetyTimeout);
        });
      },
      struct: function() {
        return new Promise(function(resolve) {
          var id = 's' + (++count);
          var settled = false;
          pending[id] = function(st) { if (settled) return; settled = true; resolve(st); };
          whenReady(function() { post('struct', { id: id }); });
          setTimeout(function() {
            if (!settled) { if (pending[id]) delete pending[id]; settled = true; resolve(null); }
          }, safetyTimeout);
        });
      },
      destroy: function() {
        window.removeEventListener('message', onMsg);
        iframe.removeEventListener('load', markReady);
      }
    };
    return api;
  }

  var API = { createSandbox: createSandbox, buildSrcdoc: buildSrcdoc };
  root.MontaCalc = root.MontaCalc || {};
  root.MontaCalc.Sandbox = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
