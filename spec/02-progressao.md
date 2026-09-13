# Progressão Pedagógica — MontaCalc (12 níveis, construção aditiva)

> **Agente 2 — Learning Designer.** Entrada: exclusivamente `spec/01-especificacao.md` (e CHANGE-006).
> Público: ~12 anos. Idioma: pt-BR. Sem conceitos não necessários ao produto.
> Todo nível usa apenas blocos/comportamento já especificados (B#, op's da IR, eventos).

---

## 0. Modelo pedagógico

- **Princípio central (transparência):** o estudante percebe a tríade
  **BLOCO → CÓDIGO → COMPORTAMENTO** a cada nível. O código gerado é sempre visível e muda
  em tempo real conforme os blocos.
- **Construção aditiva (CHANGE-006):** a calculadora é **construída do zero**. O sandbox começa
  vazio; o programa do aluno monta corpo → visor → botões e depois liga os comportamentos.
  O workspace **cresce** nível a nível (persistência + snapshots): a cada nível o aluno apenas
  adiciona a peça nova daquele nível.
- **Loop de aprendizagem por nível:** ler objetivo → montar blocos → ver código → executar →
  testar → feedback imediato → concluir.
- **Progressão:** cada nível adiciona exatamente o mínimo necessário. Só desbloqueia o próximo
  ao cumprir o objetivo (verificação automática, não "olho humano").
- **Conceito-guia:** "o visor é a memória" é introduzido no nível 2 e consolidado ao longo do percurso.

---

## 1. Mapa de conceitos (do simples ao complexo)

| # | Conceito | Nível(s) |
|---|---|---|
| C0 | Estrutura visual (corpo/visor/botões na grade) | 1–2, e toda montagem |
| C1 | Instrução simples / ação | 3 |
| C2 | Evento (clique → ação) | 3–4 |
| C3 | Dado / valor literal | 3–5 |
| C4 | Sequência de instruções | 5 |
| C5 | Concatenação (agregar texto) | 5 |
| C6 | Limpeza de estado | 6 |
| C7 | Remoção de dado no fim | 7 |
| C8 | Operador matemático binário | 8–9 |
| C9 | Precedência de operadores | 9 |
| C10 | Avaliar / computar | 10 |
| C11 | Persistência de resultado + entrada contínua | 10–11 |
| C12 | Componentização (teclado completo) | 11 |
| C13 | Tratamento de erro | 12 |

---

## 2. Níveis em detalhe

> Convenção de verificação: cada nível tem casos de teste de `spec/01 §6` (G#). O nível é
> **concluído** quando o primeiro caso de **estrutura** (corpo/visor/botões cumulativos) e
> todos os casos de **comportamento** passam.

### Nível 1 — "A casca"
- **Objetivo:** criar o corpo da calculadora — a moldura COMPLETA (6×4), já no tamanho final,
  com as casas vazias esperando o visor e os botões. No painel de código o aluno vê o `<style>`
  (CSS) e as tags `<form>`/`<table>` sendo criadas de verdade.
- **Blocos:** `quando o programa iniciar` + `criar o corpo da calculadora`. (Só estrutura.)
- **Conceitos:** C0.
- **Verificável:** corpo presente (`form[name="formulario"]`), sem visor, sem botões.

### Nível 2 — "O visor"
- **Objetivo:** adicionar o visor (a tela que guarda os números — a memória).
- **Blocos:** `adicionar o visor` abaixo do corpo.
- **Conceitos:** C0, "visor é a memória".
- **Verificável:** corpo + visor (`#tela`, readonly, maxlength=18).

### Nível 3 — "Acenda o visor"
- **Objetivo:** adicionar o botão 7 e ligá-lo para mostrar o 7.
- **Blocos:** `adicionar botão 7` + `quando clicar em 7 → acrescentar 7`.
- **Conceitos:** C1, C2, C3.
- **Verificável:** estrutura (botão 7) + `7` clicado → `7`.

### Nível 4 — "Responda ao clique"
- **Objetivo:** adicionar o botão 2 e ligá-lo. Notar a linha do `addEventListener`.
- **Blocos:** `adicionar botão 2` + `quando clicar em 2 → acrescentar 2`.
- **Conceitos:** C2.
- **Verificável:** `2` → `2`.

### Nível 5 — "Junte dígitos"
- **Objetivo:** adicionar os botões 1 e 3 e formar o número 123.
- **Blocos:** `adicionar botão 1`, `adicionar botão 3` + seus eventos.
- **Conceitos:** C4, C5.
- **Verificável:** `1`,`2`,`3` → `123`.

### Nível 6 — "Apague tudo"
- **Objetivo:** adicionar o botão C e ligá-lo para limpar o visor.
- **Blocos:** `adicionar botão C` + `quando clicar em C → limpar visor`.
- **Conceitos:** C6.
- **Verificável:** `1`,`2`,`C` → `''`.

### Nível 7 — "Apague um"
- **Objetivo:** adicionar o botão del e ligá-lo para apagar o último caractere.
- **Blocos:** `adicionar botão del` + `apagar o último do visor`.
- **Conceitos:** C7.
- **Verificável:** `1`,`2`,`del` → `1`; `del` → `''`.

### Nível 8 — "Some e subtraia"
- **Objetivo:** adicionar os botões + e − e ligá-los aos operadores.
- **Blocos:** `adicionar botão +` / `-` + `inserir operador`.
- **Conceitos:** C8 (início).
- **Verificável:** `1`,`+`,`2` → `1 + 2`.

### Nível 9 — "Multiplique e divida"
- **Objetivo:** adicionar os botões × e ÷ e entender que a ordem importa.
- **Blocos:** `adicionar botão ×` / `÷` + `inserir operador`.
- **Conceitos:** C9.
- **Verificável:** `2`,`*`,`3` → `2 * 3`; `7`,`/`,`2` → `7 / 2`.

### Nível 10 — "Igual!"
- **Objetivo:** adicionar o botão = (e o 0) e ligá-los. Testar conta e divisão por zero.
- **Blocos:** `adicionar botão =` / `0` + `calcular o visor`.
- **Conceitos:** C10, C11.
- **Verificável:** `1`,`+`,`2`,`=` → `3`; `1`,`/`,`0`,`=` → `Infinity`.

### Nível 11 — "Teclado completo"
- **Objetivo:** adicionar todos os botões que faltam (4,5,6,8,9,.) e ligá-los. Teclado completo.
- **Blocos:** todos os gatilhos + ações + ponto decimal.
- **Conceitos:** C11, C12.
- **Verificável:** G01–G20 (teclado completo, layout exato da referência).

### Nível 12 — "Calculadora à prova de falhas"
- **Objetivo:** blindar a calculadora contra expressões inválidas. É o **único nível de
  modificação**: o aluno reestrutura a pilha `quando clicar em =` que já montou (o workspace
  vem do snapshot do nível 11), colocando `tentar` no lugar do `calcular o visor` e movendo
  este para dentro do bloco roxo.
- **Blocos:** `tentar` / `se der erro → mostrar "Erro"`.
- **Conceitos:** C13.
- **Dicas (receita):** ① clique em Testar e veja a conta `1 + =` travar; ② ache a pilha
  `quando clicar em =`; ③ `tentar` entra **no lugar** do `calcular o visor`; ④ arraste o
  `calcular` para **dentro** do `tentar`; ⑤ em "se der erro", encaixe `mostrar "Erro"`.
- **Verificável:** `1`,`+`,`=` → `Erro`; `1`,`+`,`2`,`=` → `3`.

---

## 3. Sequência de desbloqueio (toolbox por nível)

O teclado do preview é **construído pelo aluno**: o sandbox mostra exatamente o que ele montou.
A toolbox revela apenas os botões **novos do nível** (o acúmulo já está no workspace).

| Nível | Toolbox liberada |
|---|---|
| 1 | `e_corpo` |
| 2 | `e_corpo`, `e_visor` |
| 3 | + `e_botao` (botão 7), evento 7, acrescentar |
| 4 | + botão 2, evento 2 |
| 5 | + botões 1, 3 e eventos |
| 6 | + botão C, limpar |
| 7 | + botão del, apagar último |
| 8 | + botões +, −, inserir operador |
| 9 | + botões ×, ÷ |
| 10 | + botões =, 0, calcular |
| 11 | + botões 4,5,6,8,9,.; teclado completo |
| 12 | tentar / capturar erro |

> **Anúncio de novidades (CHANGE-007):** ao entrar em um nível, um cartão "✨ O que há de
> novo" lista os blocos novos (com chip colorido da categoria e 1 linha de explicação) e os
> botões novos. Uma barra fixa "Blocos novos deste nível" fica no topo do painel de blocos.
> Na toolbox, categorias com novidade ganham "✨ NOVO" no nome e a primeira delas abre sozinha.
> Os dados vêm de `Levels.newFeatures(id)` (diff entre o nível e os anteriores).

---

## 4. Critérios de sucesso (verificação automática — contrato para o runtime)

Cada nível expõe `casos` — lista de verificações. Cada caso é de um de dois tipos:
- `{ estrutura: { corpo, visor, botoes[] } }` — o programa montado deve produzir esse DOM
  (verificado via `struct` no sandbox);
- `{ clicks: [...], espera: '...' }` — sequência de cliques → valor do visor.

A aprendizagem é confirmada ⇔ todos os `casos` passam ⇒ nível concluído ⇒ desbloqueia o próximo.
O caso de estrutura é derivado automaticamente da união dos botões dos níveis 1..N
(`Levels.expectedStructure(id)`).

---

## 5. Feedback (princípios)
- **Imediato:** cada mudança nos blocos re-instala o programa no preview (a calculadora aparece
  peça a peça, sem esperar "verificar").
- **Explicativo:** mensagens citam o bloco/código ("o bloco 'criar corpo' criou a moldura").
- **Não punitivo:** erro → dica, nunca "começa tudo de novo".
- **Gamificado:** concluir nível libera estrelas/selo (ver `03-ux.md`).

---

## 6. Registro de mudanças (CHANGE)
| ID | Descrição | Status |
|---|---|---|
| CHANGE-002 | Sem loops; não necessários. Verificável: nenhum nível pede repetição/condição além do `tentar` do nível 12. | Aprovado |
| CHANGE-006 | Construção aditiva (do zero): níveis 1–2 constroem o visual; 3+ adicionam botões do nível e os ligam; workspace acumulativo com snapshots. 12 níveis. | Aprovado |
| CHANGE-007 | Anúncio de novidades por nível (cartão "O que há de novo" + barra fixa + ✨ na toolbox) e reescrita do nível 12 como receita de modificação. | Aprovado |
