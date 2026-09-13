# Especificação Formal — Calculadora de Referência (+ produto educacional de blocos)

> **Agente 1 — Reverse Engineer.** Fonte de verdade do projeto.
> Toda conclusão abaixo possui evidência nos arquivos de referência.
> Mudanças em decisões fundamentais exigem registro `CHANGE:` neste documento + aprovação do orquestrador.
>
> Leia antes: `00-plano-orquestracao.md`.

---

## 0. Identificação

| Item | Valor |
|---|---|
| Nome do produto | MontaCalc |
| Referência | `calc.html`, `estilos.css`, `operacoes.js` |
| Público | Estudantes ~12 anos (contexto escolar brasileiro) |
| Idioma | pt-BR |
| Tipo | Aplicação web estática, sem build, sem backend |

---

## 1. Arquitetura da aplicação de referência

### 1.1 Componentes
| Componente | Papel | Evidência |
|---|---|---|
| `calc.html` | Estrutura: formulário `formulario`, tabela, visor e 18 botões | `calc.html:9-44` |
| `operacoes.js` | Comportamento: 4 funções (`limpar`, `deletar`, `inserir`, `total`) | `operacoes.js:1-16` |
| `estilos.css` | Apresentação | `estilos.css:1-23` |

### 1.2 Modelo de estado — **"o visor é a memória"**
`document.formulario.tela.value` é **único estado** da aplicação. Não existe variável de estado
separada, contador, pilha ou memória. Toda a lógica lê e escreve diretamente no visor.
Evidência: todas as 4 funções referenciam `document.formulario.tela.value` (`operacoes.js:2,5,6,9,12,14`).

- **Estado inicial:** string vazia `''`.
- **Válido:** qualquer string (heap mutável); a validação de sintaxe matemática é adiada para o `eval`.

### 1.3 Fluxo de dados
```
[clique do usuário] → [handler in format onclick] → [função] → [escrita no visor .value]
                                              ↓ (somente em =)
                                       eval(expressão) → resultado escrito no visor
```

### 1.4 Dependências
Nenhuma biblioteca externa. Apenas APIs nativas: `eval`, `String.prototype.substring`,
manipulação direta de DOM0 (`document.formulario.tela`).

---

## 2. Catálogo de comportamentos (especificação funcional)

Cada comportamento é identificado com **B#**. São a base para: casos de teste, níveis pedagógicos e QA.

### B1 — Limpar (C)
- Disparo: clique no botão `C`.
- Ação: define o visor para string vazia.
- Evidência: `operacoes.js:1-3` (`document.formulario.tela.value = ''`).
- Código HTML: `calc.html:16`.

### B2 — Apagar último caractere (del)
- Disparo: clique no botão `del`.
- Ação: remove exatamente 1 caractere do final da string.
- Visor vazio: no-op seguro (resulta em `''`).
- Evidência: `operacoes.js:4-7` (`substring(0, length-1)`).
- **NOTE:** com `length-1 = -1`, `substring(0,-1)` → `substring(0,0)` → `''`. Caso válido e seguro.

### B3 — Inserir dígito (concatenar)
- Disparo: clique num botão de dígito `0..9`.
- Ação: concatena a representação do dígito ao valor atual.
- Implementação de referência: `document.formulario.tela.value + valor` (concatenação de string).
- Evidência: `operacoes.js:8-10`.
- Botões: `calc.html:22-24,28-30,34-36,40-41`.

### B4 — Inserir operador binário (com espaços)
- Disparo: clique em `+`, `-`, `*`, `/`.
- Ação: concatena a string do operador **envolta em espaços** (`' + '`, `' - '`, `' * '`, `' / '`).
- Evidência: `calc.html:19` (`+`), `calc.html:18` (`-`), `calc.html:25` (`/`), `calc.html:31` (`*`).
- **Por que espaços:** permitir que `eval` interprete os tokens adequadamente como expressão.

### B5 — Inserir separador decimal (.)
- Disparo: clique no botão `.`.
- Ação: concatena `'.'` **sem espaços**.
- Evidência: `calc.html:40`.

### B6 — Calcular total (=)
- Disparo: clique no botão `=`.
- Pré-condição: visor **não vazio** (falsy check `if(result)` em `operacoes.js:13`).
- Ação: avalia a expressão do visor via `eval` e escreve o resultado (número → string) no visor.
- Evidência: `operacoes.js:11-16`.
- **Data type de retorno:** `eval` pode retornar `number`; ao atribuir a `.value`, o navegador o
  converte para string (representação padrão, ex.: `3`, `3.14`, `Infinity`, `-5`, `0.5`).
- Visor vazio: **nenhuma ação** (não limpa, não muda).

### B7 — Restrições do visor
- `readonly`: o usuário não digita; só os botões alteram.
- `maxlength=18`: a concatenação acima de 18 caracteres é truncada silenciosamente.
- Evidência: `calc.html:13`.
- **NOTE:** o truncamento é na escrita acumulada (a concatenação é cortada, não há aviso).

### B8 — Divisão por zero
- Comportamento da referência (via `eval`): `Infinity`.
- Evidência: `B6` usa `eval`; semântica padrão de divisão por zero de ponto flutuante → `Infinity`.

### B9 — Expressão inválida (erro não tratado)
- Comportamento da referência: `eval` lança `SyntaxError` para expressões malformadas
  (ex.: `'5 +'`, `'1.2.3'`, `'2 + * 3'`), NÃO capturado. A função `total` não retorna,
  o visor permanece com a expressão inválida e a interface "trava" para novos `=` até recarga.
- Evidência: `operacoes.js:11-16` — ausência de `try/catch`.
- **Decisão registrada (CHANGE-001):** o produto reproduz B9 nos níveis 1–9 e, no nível 10,
  oferece blocos de tratamento de erro (tentar/capturar → exibir `Erro`) como **extensão pedagógica**,
  sem alterar o comportamento dos níveis anteriores.

### B10 — Concatenação sobre resultado
- Após um calculo (visor = resultado), cliques subsequentes de dígitos/operadores continuam
  concatenando sobre a string do resultado.
- Evidência: `B3` e `B4` sempre concatenam ao valor corrente; `B6` muda o valor, não o modo.
- Exemplo: `2+3=` → `5`; depois `7` → `57`.

### B11 — Layout do teclado
Disposição fixa em 4 colunas (linha a linha):
```
C   del  -   +
1   2    3   /
4   5    6   *
7   8    9   =
.   0   (vazio) (vazio)
```
Evidência: `calc.html:15-42`.
- Visor ocupa as 4 colunas da primeira linha (`colspan="4"`, `calc.html:13`).

---

## 3. Regras de negócio (resumo acionável)

1. O visor é a única memória (1.2).
2. Entrada é string; matemática acontece apenas no `=` (via avaliador).
3. Operadores binários entram com espaços ao redor; dígito e `.` entram sem espaços.
4. `=` só executa em visor não vazio; caso contrário, no-op.
5. `del` é sempre seguro (inclusive em vazio).
6. Limite de 18 caracteres no visor (entrada truncada).
7. Após resultado, a entrada segue concatenando (não há "modo resultado").
8. Divisão por zero → `Infinity` (fiel à referência).
9. Expressão inválida → no nível 1–9 comporta-se como erro não tratado; no nível 10, tratado.

---

## 4. Mapa de interação (matriz botão → função → efeito)

| Botão | Handler (referência) | Efeito |
|---|---|---|
| C | `limpar()` | visor = `''` |
| del | `deletar()` | remove último char |
| `-` | `inserir(' - ')` | concatena `' - '` |
| `+` | `inserir(' + ')` | concatena `' + '` |
| `1`..`9`, `0` | `inserir(n)` | concatena dígito |
| `/` | `inserir(' / ')` | concatena `' / '` |
| `*` | `inserir(' * ')` | concatena `' * '` |
| `.` | `inserir('.')` | concatena `'.'` |
| `=` | `total()` | avalia expressão |

---

## 5. Especificação do produto educacional (Blocos)

### 5.1 Pipeline obrigatório
```
BLOCKS (Blockly workspace) → IR (JSON semântico versionado) → validação → CODEGEN → JS → SANDBOX (iframe)
```
- **Proibido**: gerar JS por manipulação de strings concatenadas/comentários do Blockly.
- O IR é a representação semântica canônica entre blocos e JS.

### 5.2 Representação intermediária (IR) — contrato
Formato JSON, versionado. Estrutura top-level (v2): um programa constrói a **estrutura** da
calculadora (`setup`) e liga os **comportamentos** (`handlers`).

```json
{
  "version": 2,
  "setup": [
    { "op": "ui.createBody" },
    { "op": "ui.createVisor" },
    { "op": "ui.addButton", "token": "7" }
  ],
  "handlers": [
    {
      "event": "button.click",
      "button": "7",
      "body": [
        { "op": "display.append", "value": "7" }
      ]
    }
  ]
}
```

**Operadores de `setup` (v2 — construção aditiva):**

| op | descrição |
|---|---|
| `ui.createBody` | cria o `<style>` e a moldura COMPLETA (form + tabela 6×4: linha 0 = casa do visor, linhas 1–5 = casas dos botões) — já no tamanho final |
| `ui.createVisor` | adiciona o visor (`#tela`, readonly, maxlength=18) na 1ª linha |
| `ui.addButton` | coloca um botão (`token`) na sua casa fixa da grade (B11) |

> Regras de ordem: `ui.createBody` deve ser o primeiro; `ui.createVisor` exige corpo;
> `ui.addButton` exige corpo e visor; cada op/token é único. Um handler de botão exige
> que esse botão tenha sido adicionado no `setup` ("não se liga um botão que não existe").

**Operadores (`op`) de handler** (o código do estudante NUNCA escreve JS cru):

| op | descrição |
|---|---|
| `display.append` | concatena `value` ao visor (espelha `inserir`) |
| `display.clear` | limpa o visor (espelha `limpar`) |
| `display.deleteLast` | remove último caractere (espelha `deletar`) |
| `display.evaluate` | avalia expressão atual e escreve resultado (espelha `total`) |
| `expression.setValue` | exibe `Erro` no visor (nível 12, extensão) |
| `try` | protege uma ação (`try[]`/`catch[]`) (nível 12, extensão) |

**Eventos (`event`):**

| event | descrição |
|---|---|
| `button.click` | clique num botão específico; `button` = `"0".."9"`, `"."`, `"+"`, `"-"`, `"*"`, `"/"`, `"="`, `"C"`, `"del"` |

### 5.3 Codegen → JS gerado (contrato de saída)
- JS legível, indentado, com nomes de variáveis claros.
- O código gerado referencia um "visor" via `document.querySelector('#tela')`.
- **Visibilidade:** o painel central mostra o código gerado em tempo real; qualquer mudança nos
  blocos regenera o código.
- Exemplo de saída (para o programa da 5.2):
```js
// Programa MontaCalc
const tela = document.querySelector('#tela');

function aoClicarBotao7() {
  tela.value = tela.value + '7';
}

document.getElementById('btn-7').addEventListener('click', aoClicarBotao7);
```

### 5.4 Runtime (sandbox)
- Execução do programa gerado dentro de `iframe sandbox="allow-scripts"` com `srcdoc`.
- A ponte `postMessage` conecta a calculadora no iframe à aplicação host (para feedback/estado).
- O código do estudante **não acessa** o DOM da aplicação host nem `window.parent`.
- O programa pode ser executado em **qualquer estágio** de montagem (programa parcial roda).

### 5.5 Validação
- IR é validado por schema (tipos, ops permitidos, eventos permitidos, ids únicos).
- Blocos desconectados/quebrados não geram IR inválido; erros de conexão são reportados no editor
  e bloqueiam a geração apenas se estruturais.

### 5.6 Segurança
- Nenhum `eval`/`new Function` no host a partir do código do estudante.
- A avaliação matemática do `=` pode usar um avaliador de expressões controlado (próprio parser)
  que reproduz a semântica do `eval` da referência (incl. `Infinity`) — decisão detalhada na arquitetura.

---

## 6. Casos de teste golden (referência)

Cada caso: sequência de cliques → valor esperado do visor.

| ID | Sequência | Visor final | Fundamentos |
|---|---|---|---|
| G01 | `7` | `7` | B3 |
| G02 | `1` `2` `3` | `123` | B3 (concatenação) |
| G03 | `1` `+` `2` `=` | `3` | B3,B4,B6 |
| G04 | `9` `-` `4` `=` | `5` | B4,B6 |
| G05 | `5` `*` `6` `=` | `30` | B4,B6 |
| G06 | `1` `0` `/` `4` `=` | `2.5` | B4,B6 |
| G07 | `5` `del` | `''` | B2 (após digitar 1, del → vazio; após 5, del → '') |
| G08 | `1` `2` `del` | `1` | B2 |
| G09 | `1` `2` `C` | `''` | B1 |
| G10 | `C` | `''` | B1 (em vazio, permanece vazio) |
| G11 | `del` (somente) | `''` | B2 (no-op seguro) |
| G12 | `5` `/` `0` `=` | `Infinity` | B8 |
| G13 | `7` `9` `C` `3` | `3` | B1+B3 |
| G14 | `1` `5` `.` `5` | `15.5` | B3,B5 |
| G15 | `2` `+` `3` `=` `7` | `57` | B10 (concatenação sobre resultado) |
| G16 | `1` `+` `=` | `SyntaxError (não tratado)` | B9 (referência: erro; produto nível 1–9 reproduz; nível 10 exibe `Erro`) |
| G17 | 18 dígitos `1` ×18 | string de 18 `1`s | B7 (maxlength) |
| G18 | 19 dígitos `1` ×19 | string de 18 `1`s (truncado) | B7 |
| G19 | `2` `+` `3` `=` | `5` | B6 (número → string) |
| G20 | `7` `.` `5` `+` `2` `.` `5` `=` | `10` | B3,B5,B6 |

> Nota de precisão G07: "digitar 5, del" → o visor contém `5`; `del` → `''`. Correto.
> Legenda de resultado `Infinity`: string exata produzida na referência via `eval`.

---

## 7. Estrutura de dados do produto (diagramas/fora de escopo de teste)
Details do editor, persistência e verificação de objetivos são especificados em `02-progressao.md` e `04-arquitetura.md`.

---

## 8. Fora de escopo (explicitamente NÃO implementar)
- Teclado físico do computador (a referência não tem listeners de teclado).
- Múltiplas memórias/histórico/parênteses (não existem na referência).
- Modo científico, porcentagem, mudança de sinal individual — não existem na referência.
- Loops/condições complexas — não necessários para reconstruir a referência (decisão registrada CHANGE-002).

---

## 9. Registro de mudanças (CHANGE)
| ID | Descrição | Status |
|---|---|---|
| CHANGE-001 | Nível 10 adiciona tratamento de erro (B9 → `Erro`) como extensão pedagógica. Níveis 1–9 fiéis à referência. | Aprovado |
| CHANGE-002 | Sem blocos de loops; não necessários à reconstrução. | Aprovado |
| CHANGE-003 | Observabilidade do produto: painéis de código e preview adicionais (não existem na referência) são parte do produto educacional, não de fidelidade. | Aprovado |
| CHANGE-004 | Execução sem build via `file://`: módulos clássicos + namespace global (`MontaCalc`) + `module.exports`, em vez de ES modules (CORS em file://). Complexidade: sandbox/testes criam `avaliar` global. | Aprovado |
| CHANGE-005 | Avaliador próprio reproduz a semântica do `eval` da referência (Infinity/NaN, precedência) SEM `eval`/`new Function` no host; o parser é fonte única via `parseEval.toString()`. | Aprovado |
| CHANGE-006 | **Construção aditiva da calculadora (do zero):** o sandbox começa vazio e é o programa do aluno que monta a estrutura (corpo/visor/botões) via IR v2 (`setup` com ops `ui.*`) antes de ligar comportamentos. Novos blocos de Estrutura (`q_iniciar`, `e_corpo`, `e_visor`, `e_botao`), categoria "Estrutura". Progressão reescrita para 12 níveis: 1–2 constroem visual, 3+ adicionam botões do nível e os ligam, até o teclado completo (11) e blindagem (12). Montagem acumulativa: workspace persiste entre níveis (snapshots por nível concluído). | Aprovado |

---

## 10. Critérios de aceitação (macro — ver `05-plano-testes.md`)
- [ ] A calculadora reconstruída reproduz funcionalmente a referência (G01–G20 sobre programa de blocos).
- [ ] Todo comportamento relevante da referência tem representação em blocos.
- [ ] O código pode ser visualizado e reflete o programa montado (relação 1:1).
- [ ] O programa roda em qualquer estágio (parcial e completo).
- [ ] Existência de feedback imediato.
- [ ] Progressão pedagógica de 12 níveis (construção aditiva do zero).
- [ ] Testes automatizados passam.
- [ ] Principais fluxos da referência validados (golden).
- [ ] Erros tratados (nível 10).
- [ ] Nenhuma funcionalidade crítica sem teste.
