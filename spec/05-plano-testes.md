# Plano de Testes — MontaCalc

> **Agente 5 — QA / Validation Engineer.** Compara: REFERENCE vs SPECIFICATION vs IMPLEMENTATION
> vs BLOCK PROGRAM vs EXECUTION. Nada de "parece funcionar": só evidência verificável.
> Comando: `npm test` (node:test + jsdom).

---

## 0. Princípios

- **Fonte de verdade:** `spec/01-especificacao.md`. Cada teste referencia comportamentos (B#)
  e casos golden (G#).
- **Fidelidade:** o programa de blocos (calculadora reconstruída) deve produzir SAÍDA IDÊNTICA
  à referência para todos os casos válidos.
- **Pipeline testado de ponta a ponta:** IR → codegen → execução em DOM real (jsdom) e no sandbox.
- **Nada é aceito sem `assert`.**

## 1. Camadas de teste

### Unit (`tests/unit/`)
| Arquivo | Escopo |
|---|---|
| `evaluator.test.js` | parser: + - * /, precedência, parênteses, unário `-`, `.5`, `5.`, `Infinity`, `NaN`, `5 +`→lança (B9), `1.2.3`→lança, `safeEvaluate`→null. |
| `validate.test.js` | schema IR (v1/v2): version, handlers, eventos, botões válidos, sem duplicado, op desconhecida, `display.append` sem value, `try` sem try/catch; **regras v2**: corpo primeiro, visor exige corpo, botão exige corpo+visor, handler exige botão no setup, botão duplicado. |
| `codegen.test.js` | IR→JS: listener correto (`data-btn`), `avaliar`, `clear`, `slice`, operador com espaços, `try/catch`, determinismo; **v2**: `montarCalculadora` com os passos REAIS do DOM (createElement/setAttribute/appendChild), CSS emitido junto do corpo, comentários com o HTML equivalente, ausência de `criarCorpo`/`criarVisor`/`adicionarBotao`, código sintaticamente válido, `tela` só se visor, montar antes do listener. |
| `ir-serialize.test.js` | `irFromBlocks`: cada bloco→op, espaços no operador, `tentar`→try/catch, sequência de ações; **v2**: `q_iniciar`+`e_*`→`setup`. |
| `serialize-workspace.test.js` | ponte Blockly→IR: hats de topo, cadeia de ações, `tentar`, `q_iniciar`→`setup`. |

### Behavior (`tests/behavior/`)
| Arquivo | Escopo |
|---|---|
| `reference.test.js` | **Golden:** calculadora de blocos (programa completo) reproduz a referência (DOM com `eval` real) para G01–G20; programa parcial roda (incremental); programa protegido (nível 12) mostra `Erro` e ainda calcula válido. |
| `levels.test.js` | Progressão alcançável: cada um dos **12** níveis satisfaz seus casos de sucesso (estrutura cumulativa + comportamento); níveis têm casos/opções/dicas; nível 12 contém `tentar`; estrutura esperada é cumulativa. |

### DOM / Integração (`tests/dom/`)
| Arquivo | Escopo |
|---|---|
| `calculator.test.js` | markup replica referência (visor `#tela` readonly `maxlength=18`, 18 botões, layout 6 linhas, botões B11); `srcdoc` contém formulário + `avaliar`. |
| `montagem-real.test.js` | **Montagem pelo código real:** roda o JS gerado (o mesmo que o aluno lê) e confere o DOM: equivalência com a referência, `<style>` criado pelo próprio programa, corpo já completo 6×4 no nível 1, a grade NÃO cresce ao adicionar peças, posições fixas B11, montagem parcial na casa definitiva. |
| `toolbox.test.js` | toolbox por nível: nível 1 só Estrutura (sem eventos), nível 3 libera botão 7, nível 11 teclado completo, nível 12 `tentar`, categorias coloridas. |
| `blockly-connections.test.js` | conexões de encaixe (`nextConnection`/`previousConnection`) de evento, ações e **estrutura**; `q_iniciar`+`e_*`→`setup`. |
| `sandbox.test.js` | sandbox: `runCase` não trava, `setCode` não lança/pendura, `buildSrcdoc` contém `avaliar`, helpers de montagem e harness. |
| `sandbox-harness.test.js` | harness: instala programa, roda caso (dígito, `Infinity`, `Erro`), e `struct` reporta a estrutura montada. |
| `app-integration.test.js` | `index.html` referencia só arquivos existentes; ordem Blockly→block-defs, evaluator→UI, `app.js` último; painéis presentes. |

## 2. Evidência de fidelidade (o teste que mais importa)

`tests/behavior/reference.test.js` constrói **dois** DOMs:
1. **Referência** (`buildReferenceWindow`): markup idêntico + funções `limpar/deletar/inserir/total`
   **byte a byte como em operacoes.js**, usando `eval` real, com `onclick` inline fiel a `calc.html`
   (e polyfill de `document.formulario.tela` no jsdom).
2. **Blocos** (`buildBlockWindow`): instalou o IR da calculadora completa via codegen + execução.

Para cada sequência golden (`G01..G20`), dispara os mesmos cliques nos dois DOMs e compara
`visor.value` — **exige igualdade** com a referência **e** com o esperado da spec.

> Caso de erro (B9) é testado à parte no nível 10 (programa protegido → `Erro`), pois a
> referência lança `SyntaxError` sem tratar (comportamento reproduzido, não punitivo).

## 3. Estratégia de executar os casos

- **Simulação de cliques determinística** via `makeSimulator` (jsdom).
- Programas instalados **uma vez**, vários casos por reset (`tela.value=''`) — o visor é a memória.
- No navegador, o mesmo pipeline roda no **sandbox** via `postMessage` (casos `install`/`case`).

## 4. Resultado atual

```
tests 95 | pass 95 | fail 0
```
Nenhuma funcionalidade crítica sem teste; todos os fluxos principais da referência validados,
incluindo a montagem aditiva (estrutura por blocos).

## 5. Loop de correção (QA → ISSUE → correção → QA)

Registro de issues resolvidas durante a build:
| # | Issue | Correção |
|---|---|---|
| QA-01 | Codegen gerava `0if (tela.value)` (indent numérico) | Refatorado genOp p/ indent em string |
| QA-02 | `avaliar` recursivo (wrapper encobria global) → stack overflow | Removido wrapper; usado global `avaliar` |
| QA-03 | `document.formulario.tela` inexistente no jsdom | Polyfill no harness da referência |
| QA-04 | `fnSource` perdia `this` do `toString` | Redeclarado como closure |
| QA-05 | `node --test tests/` não resolve glob | Script alterado p/ `node --test` |
| QA-06 | **Jogo não progredia:** `whenReady` do sandbox registrava `load` a cada chamada; com iframe já carregado o evento nunca disparava → `runCase` travava para sempre (Testar pendurava). | flag `ready` persistente + fila + timeout de segurança; `setCode` agora confirma instalação (`installed`); avanço automático de nível. |
| QA-07 | Blocos não encaixavam (evento sem `nextConnection`) → `body:[]`. | `setNextStatement(true, null)` no `q_botao`; coberto por headers de conexão. |
| QA-08 | **Montagem aditiva:** o sandbox entregava a calculadora pronta; casos de comportamento usavam botões ainda não construídos no nível. | Sandbox começa vazio; IR v2 com `setup` (`ui.*`); casos de estrutura derivados da união cumulativa de botões; casos de comportamento ajustados aos botões disponíveis no nível. |

## 6. Contratos de aceitação (mapecados a testes)

| Critério (spec/01 §10) | Evidência |
|---|---|
| Calculadora reproduz funcionalmente a referência | `behavior/reference.test.js` (G01–G20) |
| Todo comportamento relevante representado em blocos | `ir-serialize.test.js` + blocos em `block-defs` |
| Código visualizável e reflete o programa | `codegen.test.js` + painel em `index.html` |
| Programa roda em qualquer estágio | `behavior/reference.test.js` (parcial) |
| Feedback imediato | UI (`app.js`) + `levels.test.js` |
| Progressão pedagógica de 12 níveis (aditiva) | `behavior/levels.test.js` |
| Construção da estrutura via blocos (do zero) | `dom/montar-equivalence.test.js` + `sandbox-harness.test.js` (struct) |
| Testes automatizados passam | `npm test` → 95/95 |
| Principais fluxos da referência validados | golden |
| Erros tratados | nível 12 (`protectedProgram`) |
| Nenhuma funcionalidade crítica sem teste | cobertura acima |
