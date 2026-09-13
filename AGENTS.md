# MontaCalc — Guia do projeto (para agentes/desenvolvedores)

## O que é
Plataforma educacional de programação visual por blocos (pt-BR, ~12 anos) que reproduz,
por engenharia reversa, uma calculadora de referência (`calc.html`, `estilos.css`, `operacoes.js`).
O estudante liga `BLOCOS → CÓDIGO → COMPORTAMENTO`, **construindo a calculadora do zero**:
avançando por 12 níveis, monta a estrutura (corpo → visor → botões) e liga os comportamentos,
até reconstruir a calculadora completa.

## Fonte de verdade
- **`spec/01-especificacao.md`** — especificação funcional (comportamentos B#, casos golden G#).
- `spec/02-progressao.md` (pedagogia), `spec/03-ux.md` (visual), `spec/04-arquitetura.md` (técnico),
  `spec/05-plano-testes.md` (QA).
- Mudanças em decisões fundamentais exigem registro `CHANGE:` + aprovação do orquestrador.

## Comandos
- Rodar testes: `npm test` (node:test + jsdom). Esperado: tudo verde.
- Abrir a aplicação: abrir `app/index.html` em um navegador (funciona via `file://`, offline, sem build).
- dependências: `npm install` (blockly, jsdom — dev mais testável).

## Arquitetura (resumo)
```
BLOCKS (Blockly) → IR (JSON semântico) → validação → CODEGEN (JS legível) → RUNTIME (iframe sandbox)
```
- `app/src/ir/serialize.js` — Blockly workspace → IR (`serializeWorkspace`) / `irFromBlocks` (puro).
- `app/src/compiler/codegen.js` — IR → **JS real e comentado** (puro). Emite os passos de
  verdade (`document.createElement`, `setAttribute`, `appendChild`, `addEventListener`) —
  nunca chamadas-atalho tipo `criarCorpo()` — com comentários que mostram o HTML/CSS
  equivalente e explicam cada linha. É o texto que o aluno lê E o que realmente roda.
- `app/src/runtime/evaluator.js` — parser matemático (`parseEval`), fonte (`parseEval.toString()`)
  é reutilizada no sandbox (fonte única). Sem `eval`.
- `app/src/runtime/calc-dom.js` — **fonte única do layout**: grade 6×4 (linha 0 = visor),
  rótulos, `buttonSlot` (ordem B11), `CSS_LINES` (as regras de `estilos.css`) e
  `calculatorMarkup()` (usado nos testes de referência). Consumido pelo codegen.
- `app/src/runtime/sandbox.js` — iframe `sandbox="allow-scripts"` (sem allow-same-origin), começa
  **vazio e sem o CSS da calculadora**: o próprio código do aluno cria o `<style>` e o DOM.
  O ambiente só oferece `avaliar` (a matemática). Harness `postMessage` (`install`/`case`/`struct`).
- `app/src/blocks/block-defs.js` — blocos Blockly (evento + estrutura) + toolbox por nível.
- `app/src/levels/levels.js` — 12 níveis + casos de sucesso (estrutura cumulativa + comportamento).
- `app/src/ui/app.js` — bootstrap: sincroniza blocos/código/preview/feedback/progresso
  (workspace acumulativo + snapshots por nível).

## Convenções
- Módulos clássicos `(function(root){...})(...)` com namespace global `MontaCalc` **e**
  `module.exports` (guarda `typeof module !== 'undefined'`) — assim funcionam em `file://`
  (Sem ES modules) e em `node:test`.
- Não usar `eval`/`new Function` para código do estudante no host (só no iframe isolado, código nosso).
- O código gerado usa `var tela = document.querySelector('#tela')` (o visor é a memória) e a
  função global `avaliar`. Não redeclare `avaliar` localmente (causa recursão).
- **Encaixe de blocos:** os hats `q_botao` (evento) e `q_iniciar` (estrutura) devem ter
  `this.setNextStatement(true, null)` (conexão "próximo") para as ações/estrutura encaixarem abaixo;
  as ações têm `previous`/`next`. Sem isso, o IR sai com `body: []` / `setup: []` e nada encaixa.
  Coberto por `tests/dom/blockly-connections.test.js`.
- **Código real, sem caixa-preta:** o bloco é simplificado, o código NÃO. Se um passo novo for
  adicionado, ele precisa aparecer no painel como código executável comentado. Nada de funções
  auxiliares injetadas por fora do que o aluno lê.
- **A grade nasce completa:** `ui.createBody` cria a moldura definitiva (6 linhas × 4 colunas,
  linha 0 = casa do visor com `colspan="4"`). Visor e botões apenas PREENCHEM casas existentes
  (`tabela.rows[l].cells[c]`), então a calculadora nunca "cresce" nem desloca peças.
- **Construção aditiva:** o sandbox começa vazio; o preview mostra exatamente o que o aluno montou.
  A estrutura esperada de um nível é a união cumulativa dos botões dos níveis 1..N
  (`Levels.expectedStructure(id)`), injetada como primeiro `caso` (`{ estrutura }`) de cada nível.
  Os casos de comportamento usam **apenas botões já liberados** no nível.
- **Blockly 13:** `Blockly.Xml.textToDom` NÃO existe mais — use `Blockly.utils.xml.textToDom`
  (ver `xmlTextToDom` em `app.js`). Carregar XML sempre por `replaceWorkspaceXml` (limpa antes),
  nunca por cima, senão os blocos duplicam.
- **Dropdown de botões cumulativo:** `BlockDefs.setAllowedButtons` recebe
  `Levels.cumulativeButtons(id)` (todos os já liberados), não só os do nível — senão o Blockly
  troca o valor de blocos antigos ("botão 7" viraria "botão 2" ao mudar de nível).
- **Novidades por nível (CHANGE-007):** cada nível pode declarar `novidades.blocos` (`[{tipo,texto}]`).
  Botões novos são derivados automaticamente de `options.buttons`. `Levels.newFeatures(id)` e
  `Levels.newBlocks(id)` calculam o que entrou de novo (fonte única). A UI mostra um cartão
  "✨ O que há de novo" ao entrar no nível + uma barra fixa no painel de blocos; a toolbox marca
  categorias com novidade com "✨ NOVO" no nome e abre a primeira (`expanded="true"`).
  `block-defs.toolboxFor(level, {newCats})` recebe as categorias novas. Cada tipo de bloco é
  anunciado como novidade em exatamente UM nível (ver `tests/unit/levels-novidades.test.js`).
- **Dica 💡 fixa:** `updateCode()` NÃO sobrescreve uma mensagem de dica em andamento
  (`el.feedback.dataset.sticky === '1'`); só mensagens de sucesso/erro (`feedback(msg, type)`)
  dão lugar a ela. Use `setStickyFeedback(msg)` para exibir uma dica fixa (como `doDica`).
- **Bloco roxo na Lógica:** `a_mostrar_erro` vive SÓ na categoria roxa "Lógica" (não na Visor
  azul) — ver `blockCategory` em `levels.js`.
- **Persistência (localStorage):** `montacalc-progress-v2` (nível/estrelas), `montacalc-workspace-v2`
  (XML atual), `montacalc-snap-<id>` (snapshot ao concluir o nível). "Reiniciar nível" restaura o
  snapshot do nível anterior (desfaz só o atual, mantém o acúmulo).
- Bitáculo `#tela` + `[data-btn]` para botões; a referência usa `document.formulario.tela`
  (polyfill no harness de teste, pois o jsdom não suporta acesso nomeado legado).
- `npm test` usa `node --test` (descoberta automática, não um caminho de diretório).

## Limitações conhecidas do ambiente de teste
- `Blockly.inject` não roda em jsdom (usa `fetch`/WebAudio). A ponte `serializeWorkspace` é testada
  com um workspace mockado; a renderização do editor é validada por inspeção de estrutura +
  teste de carregamento do bundle. Verificação visual final em navegador real recomendada.
