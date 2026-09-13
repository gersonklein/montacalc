# Arquitetura Técnica — MontaCalc

> **Agente 4 — Runtime / Compiler Engineer.** Entrada: spec/01, 02, 03.
> Implementação real em `app/`. Pipeline: **BLOCKS → IR → JS → RUNTIME** (sem geração de JS por strings frágeis).

---

## 1. Visão geral

```
+-------------+      +---------------------------+      +----------------+      +-----------------------+
|  BLOCKS     |      |  IR  (semântico, versionado)|      |  JS (legível)  |      |  RUNTIME (sandbox)    |
|  Blockly    |---→  |  JSON validado por schema  |---→  |  indentado     |---→  |  iframe sandbox+jsdom |
|  workspace  | read |  {version, handlers[..]}   |codegen|  por handler   | exec |  + avaliar (parser)   |
+-------------+      +---------------------------+      +----------------+      +-----------------------+
```

O estudante interage com BLOCKS. Cada mudança é serializada a IR, validada e compilada; o
código resultante é exibido (painel central) e instalado no preview (sandbox). Nenhuma parte do
sistema gera JS concatenando strings de blocos — o IR é a fonte canônica para o codegen.

## 2. Árvore de arquivos (`app/`)

```
app/
  index.html                 # página única; ordem carrega Blockly → core → UI (último)
  styles/app.css             # layout 3 painéis, feedback, progresso
  vendor/blockly/            # Blockly offline (blockly_compressed.js, pt-br.js)
  src/
    ir/
      validate.js            # Validador de IR (schema + regras) — puro/node
      serialize.js           # Blockly workspace → blockTree → IR  (+ irFromBlocks puro)
    compiler/
      codegen.js             # IR → JS legível — puro/node
    runtime/
      evaluator.js           # parser de expressões (parseEval) — puro/node, fonte reutilizada
      calc-dom.js            # markup da calculadora (fonte única) + buttonSlot — puro/node
      run-program.js         # installProgram(IR→JS→exec) + makeSimulator — node
      sandbox.js             # iframe isolado + harness postMessage — browser
    blocks/
      block-defs.js          # blocos Blockly + toolbox por nível
    levels/
      levels.js              # 12 níveis + casos de sucesso (dados, cumulativo)
    ui/
      app.js                 # bootstrap: sincroniza blocos/código/preview/feedback/progresso
```

### Módulos duais (node + navegador)
Os módulos de núcleo (`evaluator`, `validate`, `codegen`, `calc-dom`,
`run-program`, `serialize`, `levels`) usam o padrão **namespace global + module.exports** com
guarda `if (typeof module !== 'undefined' && module.exports)`, o que permite:
- rodar no navegador via `file://` (sem build, sem ES modules/CORS);
- ser `require`d em `node:test`.

## 3. Representação intermediária (IR)

```jsonc
{
  "version": 2,
  "setup": [
    { "op": "ui.createBody" },
    { "op": "ui.createVisor" },
    { "op": "ui.addButton", "token": "7" }
  ],
  "handlers": [
    { "event": "button.click", "button": "7", "body": [ { "op": "display.append", "value": "7" } ] }
  ]
}
```

Ops de `setup` (v2 — construção aditiva):
| op | efeito |
|---|---|
| `ui.createBody` | cria `<style>` + form + tabela 6×4 completa (linha 0 = casa do visor) |
| `ui.createVisor` | adiciona `#tela` (readonly, maxlength=18) na 1ª linha |
| `ui.addButton{token}` | coloca o botão na casa fixa da grade (B11) |

Ops de `handlers`:
| op | efeito |
|---|---|
| `display.append{value}` | `tela.value = tela.value + value` |
| `display.clear` | `tela.value = ''` |
| `display.deleteLast` | remove último caractere |
| `display.evaluate` | `if (tela.value) tela.value = avaliar(tela.value)` |
| `expression.setValue{value}` | `tela.value = value` |
| `try{try[],catch[]}` | `try { ... } catch (e) { ... }` (nível 12) |

`button` ∈ `0..9 . + - * / = C del`. O IR é validado por `validate.js` (schema + regras,
incluindo a ordem de setup: corpo primeiro; visor exige corpo; botão exige corpo+visor;
handler exige botão no setup; sem duplicados; value obrigatório em append/setValue; try/catch completos).

## 4. Blocos → IR (serialize)

`serialize.js` oferece dois caminhos:
1. `irFromBlocks(blockTree)` — **puro/testável**: recebe uma árvore de blocos em JSON
   (independente de Blockly) e devolve o IR. É a unidade de verdade do mapeamento.
2. `serializeWorkspace(workspace)` — ponte fina: lê o workspace Blockly, percorre os hats
   (`q_iniciar` para estrutura e `q_botao` para eventos) e suas pilhas (`next`), extrai
   tipo/campos e chama `irFromBlocks`.

Bloco → op:
| Bloco | IR |
|---|---|
| `q_iniciar` (estrutura) | `setup` com as ops dos blocos `e_*` |
| `e_corpo` | `ui.createBody` |
| `e_visor` | `ui.createVisor` |
| `e_botao` | `ui.addButton` (token = campo BOT) |
| `q_botao` (evento) | handler `button.click` com `button` = campo BTN |
| `a_acrescentar` | `display.append` (value = campo VALOR) |
| `a_limpar` | `display.clear` |
| `a_apagar_ultimo` | `display.deleteLast` |
| `a_inserir_op` | `display.append` com value `' '+OP+' '` (espaços, fiel a B4) |
| `a_calcular` | `display.evaluate` |
| `a_mostrar_erro` | `expression.setValue` |
| `tentar` | `try{ try, catch }` |

## 5. Codegen (IR → JS real)

**Princípio pedagógico (CHANGE-007):** o painel de código não pode conter atalhos mágicos.
O BLOCO é simplificado; o CÓDIGO é o de verdade — o mesmo que uma pessoa escreveria à mão.
O codegen NÃO emite chamadas do tipo `criarCorpo()`: emite os passos reais do DOM, com
comentários que mostram o HTML/CSS equivalente e explicam o que cada linha faz.

- **Parte 1** — `montarCalculadora()`: cria o `<style>` (regras de `estilos.css`, vindas de
  `calc-dom.CSS_LINES`), depois `<form>` > `<table>` com a grade **completa** 6×4
  (linha 0 = casa do visor com `colspan="4"`). Visor e botões só preenchem casas já existentes
  via `tabela.rows[l].cells[c].appendChild(...)` — nada cresce nem se desloca.
- **Parte 2** — comportamento: `var tela = document.querySelector('#tela')` (o visor é a
  memória), uma função nomeada por botão e o `addEventListener` correspondente.
- Comentário explicativo de cada operação é emitido **na primeira ocorrência**, para o código
  não virar um muro de comentários repetidos.
- `var tela` só é declarado se o visor existir no `setup`.
- Textos emitidos usam aspas simples (estilo uniforme). Determinístico (mesmo IR → mesmo JS).

Exemplo (trecho, `setup: [createBody, createVisor, addButton '7']`):

```js
function montarCalculadora() {
  // ---- O ESTILO (CSS) ----
  var estilo = document.createElement('style');
  estilo.textContent = `
    table { background-color: #737373; padding: 3px; }
    td { width: 40px; height: 40px; }
    ...
  `;
  document.head.appendChild(estilo);

  // ---- O CORPO (HTML) ----
  //   <form name="formulario"><table>...</table></form>
  var form = document.createElement('form');
  form.setAttribute('name', 'formulario');
  var tabela = document.createElement('table');
  // linha 0: a casa do visor (colspan="4"); linhas 1..5: 4 casas cada
  ...
  document.body.appendChild(form);

  // ---- O VISOR ----
  var visor = document.createElement('input');
  visor.setAttribute('maxlength', '18');
  ...
  tabela.rows[0].cells[0].appendChild(visor);

  // ---- A TECLA " 7 " ----
  var botao7 = document.createElement('input');
  botao7.setAttribute('data-btn', '7');
  tabela.rows[4].cells[0].appendChild(botao7);  // linha 4, coluna 0
}

montarCalculadora();

var tela = document.querySelector('#tela');

function aoClicar7() {
  tela.value = tela.value + '7';
}

document.querySelector('[data-btn="7"]').addEventListener('click', aoClicar7);
```

## 6. Avaliador de expressões (`evaluator.js`)

- `parseEval(expr)`: parser recursivo autossuficiente (números, `.`, `+ - * /`, unário `-`,
  parênteses, precedência, `whitespace`). NÃO usa `eval`/`new Function`.
- Reproduz a semântica da referência: divisão por zero → `Infinity` (e `0/0` → `NaN`);
  expressão inválida → lança `SyntaxError`.
- `evaluate` (lança) / `safeEvaluate` (retorna null se inválida).
- **Fonte única:** `parseEval.toString()` é embutida no sandbox (iframe), garantindo que a
  matemática executada no navegador é idêntica à testada em node.

## 6b. Layout da calculadora (`calc-dom.js`)

- **Fonte única** da grade: `BUTTONS` (ordem/rótulos B11), `LINHAS`/`COLUNAS` (6×4),
  `buttonSlot(token)` → `{row, col}` com a linha 0 reservada ao visor, e `CSS_LINES`
  (as regras de `estilos.css` + `td { width/height }`, para as casas vazias já ocuparem
  o lugar delas e a moldura nascer no tamanho final).
- Consumido pelo `codegen` (que emite o código real) e por `calculatorMarkup()`, usado nos
  testes para montar a calculadora de referência.
- Equivalência garantida por `tests/dom/montagem-real.test.js`: rodar o **código gerado**
  produz o mesmo DOM (grade, visor, 18 botões nas casas certas) da referência.

## 7. Runtime (sandbox)

- Preview = `<iframe sandbox="allow-scripts">` via `srcdoc`, **sem** `allow-same-origin`
  (código do estudante não acessa o DOM da aplicação host nem a origem pai).
- O `srcdoc` começa com **corpo vazio e sem o CSS da calculadora** (só um estilo base
  `#estilo-base` que centraliza a página). Contém `avaliar` (de `parseEval.toString()`) e um
  harness de `postMessage`. Estrutura E aparência vêm do código do aluno:
  - `{type:"install", code}` → limpa o corpo e os `<style>` do programa anterior, depois
    avalia o código gerado (que cria estilo + estrutura e liga os handlers);
  - `{type:"struct", id}` → responde `{type:"structResult", id, struct:{hasBody,hasVisor,buttons[]}}`;
  - `{type:"case", id, clicks}` → reinicia o visor, dispara os cliques e responde
    `{type:"caseResult", id, value}`.
- **Construção aditiva:** o preview mostra exatamente o que o aluno montou. A MOLDURA não
  cresce: ela nasce completa no nível 1 e as peças vão preenchendo as casas.
- **Executável em qualquer estágio:** programas parciais rodam (testado).

## 8. Segurança

- Nenhum `eval`/`new Function` a partir de entrada do estudante no host; a única `eval`
  ocorre dentro do iframe isolado para instalar o código **gerado por nós**.
- O código do estudante nunca é JS cru — sempre o produto determinístico do codegen.
- Sem backend; sem dados sensíveis; progresso apenas em `localStorage`.

## 9. Persistência

`localStorage` guarda:
- `montacalc-progress-v2` = `{ level, stars, completed }`;
- `montacalc-workspace-v2` = XML do workspace atual (a calculadora em construção);
- `montacalc-snap-<id>` = XML do workspace no momento em que o nível `id` foi concluído
  (usado para o próximo nível e para "Reiniciar nível" desfazer só o nível atual).

## 10. Desvios / decisões registradas

| ID | Decisão |
|---|---|
| DUAL-MOD | .js clássico + module.exports (não ES modules) para funcionar via `file://` e ser testado em node. |
| FNT-SRC | `parseEval.toString()` embutido no sandbox = fonte única da matemática. |
| CODE-REAL (CHANGE-007) | O codegen emite o código REAL (createElement/setAttribute/appendChild/addEventListener) comentado, sem funções-atalho; o sandbox não injeta nada além de `avaliar`. O que o aluno lê é o que roda. |
| GRADE-FIXA (CHANGE-007) | `ui.createBody` cria a grade definitiva 6×4; visor e botões só preenchem casas existentes (nada cresce/desloca). |
| EVAL-SAFE | Avaliador próprio, sem `eval`; reproduz Infinity/NaN e lança em inválido (fiel a B9). |
| CHANGE-006 | Sandbox vazio; o programa monta a estrutura (IR v2, `setup` com `ui.*`); 12 níveis aditivos; workspace acumulativo. |
