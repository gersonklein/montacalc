# Plano Mestre de Orquestração — "MontaCalc"

> Plataforma educacional de programação visual por blocos para estudantes (~12 anos)
> reconstruírem funcionalmente a calculadora de referência (`calc.html`, `operacoes.js`, `estilos.css`).

**Fonte de verdade: `spec/01-especificacao.md`.** Este documento é o plano de trabalho.
Nenhum agente altera decisões fundamentais da especificação sem registrar explicitamente uma mudança.

---

## 0. Decisões aprovadas

| Decisão | Escolha |
|---|---|
| Motor de blocos | **Blockly** (vendored localmente, uso offline) |
| Erros da referência | **Fiel nos níveis 1–9** + **nível 10** de tratamento de erro (extensão pedagógica) |
| Estrutura | Subpastas `spec/`, `app/`, `tests/` neste diretório; referência intocada |
| Testes | **node:test + jsdom** (sem downloads pesados de navegador) |
| Idioma da UI | pt-BR (público ~12 anos, contexto escolar brasileiro) |
| Stack | Site estático sem build (abrir `index.html` funciona); ES modules vanilla |
| Sandbox | `iframe sandbox="allow-scripts"` + `srcdoc` + ponte `postMessage` |
| Persistência | Progresso do estudante em `localStorage` |

---

## 1. Engenharia reversa (insumo da FASE 1)

**Arquitetura da referência:** 3 arquivos, zero dependências externas, sem build.
Insight central: **o visor é a memória** — não há variável de estado separada;
todo o comportamento lê/escreve `document.formulario.tela.value`.

### Comportamentos catalogados (evidência `arquivo:linha`)
- **B1** `C` → limpa visor (`operacoes.js:1-3`)
- **B2** `del` → remove último caractere via `substring` (`operacoes.js:4-7`); em visor vazio é no-op seguro
- **B3** dígitos 0–9 → concatenação de string (`operacoes.js:8-10`)
- **B4** operadores inseridos **com espaços**: `' + ' ' - ' ' * ' ' / '` (`calc.html:18,19,25,31`)
- **B5** `.` inserido sem espaços (`calc.html:40`)
- **B6** `=` → só age se visor não-vazio; `eval()` da expressão (`operacoes.js:11-16`)
- **B7** visor `readonly`, `maxlength=18` (`calc.html:13`) — entrada truncada silenciosamente
- **B8** divisão por zero → `Infinity` (semântica do `eval`)
- **B9** expressão inválida (`5 +` + `=`) → `SyntaxError` **não tratado** (referência "trava")
- **B10** após resultado, digitar continua concatenando sobre ele
- **B11** layout 4 colunas: `C del - + / 1 2 3 / / 4 5 6 * / 7 8 9 = / . 0` (última linha com 2 células vazias implícitas)

### Desvios deliberados (modernização sem mudar comportamento observável)
- `document.formulario.tela.value` (DOM0) → `querySelector` no código gerado
- `onclick` inline → `addEventListener` no código gerado
- Sem suporte a teclado (referência não tem) — fora de escopo

---

## 2. Estrutura de pastas

```
Arquivo/
├── calc.html, estilos.css, operacoes.js   ← REFERÊNCIA (intocada)
├── spec/
│   ├── 00-plano-orquestracao.md   (este documento)
│   ├── 01-especificacao.md        (Agente 1 — fonte de verdade)
│   ├── 02-progressao.md           (Agente 2)
│   ├── 03-ux.md                   (Agente 3)
│   ├── 04-arquitetura.md          (Agente 4)
│   └── 05-plano-testes.md         (Agente 5)
├── app/
│   ├── index.html
│   ├── styles/
│   ├── vendor/blockly/            (copiado via npm)
│   └── src/
│       ├── ir/          schema JSON, validador, serializador
│       ├── compiler/    IR → JS legível (indentado, espelha blocos)
│       ├── runtime/     sandbox iframe + ponte postMessage + avaliador
│       ├── blocks/      definições Blockly + toolbox por nível
│       ├── levels/      dados dos 10 níveis + verificação de objetivos
│       └── ui/          editor, painel de código, preview, feedback
├── tests/
│   ├── unit/            IR, codegen, avaliador de expressões
│   ├── behavior/        golden: referência vs programa de blocos
│   └── dom/             níveis, desbloqueio, integração (jsdom)
├── package.json              (scripts de teste; devDep: jsdom)
└── AGENTS.md                 (contexto do projeto p/ futuros agentes)
```

---

## 3. Fases de orquestração

### FASE 1–2 — AGENTE 1: Reverse Engineer → `spec/01-especificacao.md`
Formalizar: componentes, eventos, estados, fluxo de dados, regras de negócio, operações,
quirks (B1–B11), desvios aprovados, mapa de interação, casos de teste golden
(sequências de cliques → resultado esperado). Toda afirmação com evidência `arquivo:linha`.
**Gate:** spec revisada e aprovada antes de prosseguir.

### FASE 3 — AGENTE 2: Learning Designer → `spec/02-progressao.md`
Progressão em 10 níveis derivada da spec (sem conceitos inventados), com blocos desbloqueáveis,
critérios de sucesso verificáveis automaticamente, dicas progressivas e feedback.

### FASE 4 — AGENTE 3: UX/Game Designer → `spec/03-ux.md`
Layout de 3 painéis (Blocos | Código | Preview da calculadora), paleta por categoria,
ícones, estados de sucesso/erro, mapa de níveis com desbloqueio visual.
**Clareza > decoração**; ambiente de descoberta, não IDE reduzida; pt-BR.

### FASE 5 — AGENTE 4: Runtime/Compiler Engineer → `app/`
Pipeline obrigatório — **sem geração de JS por strings frágeis**:

```
Blockly workspace → tradutor → IR (JSON semântico) → validador → codegen → JS → sandbox
```

- IR versionada, validada por schema
- Codegen emite JS legível e indentado, visível no painel central, sincronizado em tempo real
- Sandbox: `iframe sandbox="allow-scripts"` + `srcdoc` + ponte `postMessage`; código do
  estudante nunca toca o DOM da aplicação; executável em qualquer estágio (programa parcial roda)
- Preview da calculadora reproduz a aparência da referência (cores/dimensões da spec)

### FASE 6 — AGENTE 5: QA/Validation → `tests/` + gate final
- **Unit:** validador IR, codegen (IR→JS determinístico), avaliador
- **Behavior golden:** mesmas sequências de cliques executadas na referência e no programa de
  blocos devem produzir resultados idênticos (incl. `Infinity`, no-op de `del` vazio,
  truncamento 18 chars, concatenação pós-resultado)
- **DOM (jsdom):** carregamento de nível, montagem de blocos, verificação de objetivos, desbloqueio
- **Loop de correção:** falha → issue registrada → agente responsável → correção → QA novamente.
  Nunca avançar silenciosamente.

### Revisão final independente
Checklist de 10 pontos: fidelidade funcional, linguagem de blocos, clareza pedagógica, UX,
arquitetura, segurança da execução, testes, acessibilidade, consistência visual e jornada completa.
Só declarar **DONE** com evidência em todos.

---

## 4. Progressão (resumo — definição completa em `spec/02`)

| Nível | Tema | Comportamentos | Blocos desbloqueados |
|---|---|---|---|
| 1 | Acenda o visor | mostrar um dígito | evento clique, mostrar |
| 2 | Responda ao clique | evento → ação | + botões de dígito |
| 3 | Junte dígitos | concatenar (1,2 → 12) | concatenar |
| 4 | Apague tudo | B1 | limpar (C) |
| 5 | Apague um | B2 | deletar (del) |
| 6 | Some e subtraia | B4 (+ −) | operadores + − |
| 7 | Multiplique e divida | B4 (× ÷), precedência | operadores × ÷ |
| 8 | Igual! | B6, B8 | avaliar expressão (=) |
| 9 | Decimais + teclado completo | B5, B7, B10 | ponto, todos os botões |
| 10 | Blindagem | B9 → "Erro" amigável | tentar/capturar |

---

## 5. Nota sobre execução dos agentes

O ambiente disponibiliza apenas subagentes de exploração (leitura). Portanto, o orquestrador
executa os 5 papéis sequencialmente por fase, mantendo a separação de responsabilidades através
dos artefatos (cada agente produz/assina seu documento em `spec/` ou código em `app/`/`tests/`),
e delega pesquisas pontuais a subagentes quando útil.
