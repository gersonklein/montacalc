/*
 * MontaCalc — Dados dos 12 níveis (progressão + casos de sucesso).
 * Cada nível define: titulo, objetivo, dicas, opções de toolbox (estrutura/botões/ações),
 * e `casos` = sequências de cliques com resultado esperado (verificação automática).
 *
 * PROGRESSÃO ADITIVA (construir a calculadora do zero):
 *   - níveis 1–2 constroem a ESTRUTURA (corpo, visor);
 *   - do nível 3 em diante, cada nível ADICIONA os botões daquele nível E os liga;
 *   - a montagem é cumulativa: o workspace do aluno cresce nível a nível.
 *
 * Cada nível ganha automaticamente um caso de ESTRUTURA (corpo/visor/botões cumulativos)
 * no início de `casos`, derivado da união dos botões dos níveis 1..N (fonte única).
 * Comportamentos referenciados: spec §2 (B#), progressão spec/02.
 */
(function(root) {
  'use strict';

  // Opções de estrutura (construção visual) por nível.
  var ESTRUTURA_BASICA = ['e_corpo'];
  var ESTRUTURA_COM_VISOR = ['e_corpo', 'e_visor'];
  var ESTRUTURA_COM_BOTAO = ['e_corpo', 'e_visor', 'e_botao'];

  var LEVELS = [
    {
      id: 1, titulo: 'A casca',
      objetivo: 'Crie o corpo da calculadora — a moldura já no tamanho final.',
      dicas: [
        'Arraste o bloco "quando o programa iniciar" para o espaço de trabalho.',
        'Encaixe abaixo dele o bloco "criar o corpo da calculadora".',
        'Leia o código ao lado: ele cria o <style> (CSS) e as tags <form> e <table>.',
        'A grade nasce COMPLETA: 6 linhas × 4 colunas de casas vazias. Nada vai crescer depois — cada peça só ocupa a casa dela.'
      ],
      options: { estrutura: ESTRUTURA_BASICA, buttons: [], actions: [] },
      novidades: {
        blocos: [
          { tipo: 'q_iniciar', texto: 'O gatilho da montagem: "quando o programa iniciar" roda antes de qualquer clique.' },
          { tipo: 'e_corpo', texto: 'Cria o CSS e a moldura da calculadora: uma tabela de 6 linhas × 4 colunas.' }
        ]
      },
      casos: []
    },
    {
      id: 2, titulo: 'O visor',
      objetivo: 'Adicione o visor — a tela que guarda os números (a memória).',
      dicas: [
        'Encaixe o bloco "adicionar o visor" abaixo do corpo.',
        'No código: um <input> com id="tela" entra na casa da linha 0, que já estava reservada (colspan="4").',
        'Nele aparecerão os números; ele é a memória da calculadora — tudo fica em tela.value.'
      ],
      options: { estrutura: ESTRUTURA_COM_VISOR, buttons: [], actions: [] },
      novidades: {
        blocos: [
          { tipo: 'e_visor', texto: 'Cria o visor (uma caixinha que guarda os números). É a memória: tudo fica em tela.value.' }
        ]
      },
      casos: []
    },
    {
      id: 3, titulo: 'Acenda o visor',
      objetivo: 'Adicione o botão 7 e ligue-o para mostrar o 7 no visor.',
      dicas: [
        'Na Estrutura, use "adicionar botão 7" para colocar o botão na grade.',
        'No código: o botão é um <input type="button"> que entra na casa tabela.rows[4].cells[0] — que já existe.',
        'Ligue o "quando clicar em 7" ao bloco "acrescentar 7 no visor" e veja a linha addEventListener aparecer.',
        'Clique em "Testar ✓" para ver se acendeu.'
      ],
      options: { estrutura: ESTRUTURA_COM_BOTAO, buttons: ['7'], actions: ['a_acrescentar'] },
      novidades: {
        blocos: [
          { tipo: 'e_botao', texto: 'Coloca um botão na grade, na casa que já é dele — nada é empurrado de lugar.' },
          { tipo: 'q_botao', texto: 'O gatilho do clique: "quando clicar em 7" diz a ação que roda ao apertar esse botão.' },
          { tipo: 'a_acrescentar', texto: 'Acrescenta um caractere no visor (ex.: 1, depois 2, depois 3 → 123).' }
        ]
      },
      casos: [{ clicks: ['7'], espera: '7' }]
    },
    {
      id: 4, titulo: 'Responda ao clique',
      objetivo: 'Adicione o botão 2 e ligue-o. Note a linha do addEventListener.',
      dicas: [
        'Adicione o botão 2 na grade.',
        'Ligue o "quando clicar em 2" ao "acrescentar 2 no visor".',
        'Compare com o nível anterior: o que muda no código é a linha do evento.'
      ],
      options: { estrutura: ESTRUTURA_COM_BOTAO, buttons: ['2'], actions: ['a_acrescentar'] },
      novidades: { blocos: [] },
      casos: [{ clicks: ['2'], espera: '2' }]
    },
    {
      id: 5, titulo: 'Junte dígitos',
      objetivo: 'Adicione os botões 1 e 3 e forme o número 123.',
      dicas: [
        'Adicione os botões 1 e 3 na grade.',
        'Ligue cada um ao seu valor: 1 acrescenta 1, 3 acrescenta 3.',
        'Clique em 1, depois 2, depois 3 — o visor guarda os três.'
      ],
      options: { estrutura: ESTRUTURA_COM_BOTAO, buttons: ['1', '3'], actions: ['a_acrescentar'] },
      novidades: { blocos: [] },
      casos: [{ clicks: ['1', '2', '3'], espera: '123' }]
    },
    {
      id: 6, titulo: 'Apague tudo',
      objetivo: 'Adicione o botão C e ligue-o para limpar o visor.',
      dicas: [
        'Adicione o botão C na grade.',
        'Ligue o "quando clicar em C" ao bloco "limpar o visor".',
        'Teste: digite algo (ex.: 1, 2) e depois clique em C.'
      ],
      options: { estrutura: ESTRUTURA_COM_BOTAO, buttons: ['C'], actions: ['a_acrescentar', 'a_limpar'] },
      novidades: {
        blocos: [
          { tipo: 'a_limpar', texto: 'Apaga TUDO que está no visor de uma vez (o botão C limpa a memória).' }
        ]
      },
      casos: [{ clicks: ['1', '2', 'C'], espera: '' }]
    },
    {
      id: 7, titulo: 'Apague um',
      objetivo: 'Adicione o botão del e ligue-o para apagar só o último caractere.',
      dicas: [
        'Adicione o botão del na grade.',
        'Ligue o "quando clicar em del" ao bloco "apagar o último do visor".',
        'É como o backspace: tira só o último que entrou.'
      ],
      options: { estrutura: ESTRUTURA_COM_BOTAO, buttons: ['del'], actions: ['a_acrescentar', 'a_limpar', 'a_apagar_ultimo'] },
      novidades: {
        blocos: [
          { tipo: 'a_apagar_ultimo', texto: 'Apaga SÓ o último caractere do visor (o del é o backspace da calculadora).' }
        ]
      },
      casos: [
        { clicks: ['1', '2', 'del'], espera: '1' },
        { clicks: ['del'], espera: '' }
      ]
    },
    {
      id: 8, titulo: 'Some e subtraia',
      objetivo: 'Adicione os botões + e - e ligue-os para inserir operadores.',
      dicas: [
        'Adicione os botões + e - na grade.',
        'Ligue cada um ao bloco "inserir operador" com o símbolo certo.',
        'O operador entra com um espaquinho dos dois lados.'
      ],
      options: { estrutura: ESTRUTURA_COM_BOTAO, buttons: ['+', '-'], actions: ['a_acrescentar', 'a_inserir_op'], opSymbols: ['+', '-'] },
      novidades: {
        blocos: [
          { tipo: 'a_inserir_op', texto: 'Coloca um operador (+, −, ×, ÷) na conta, com espaços dos dois lados.' }
        ]
      },
      casos: [{ clicks: ['1', '+', '2'], espera: '1 + 2' }]
    },
    {
      id: 9, titulo: 'Multiplique e divida',
      objetivo: 'Adicione os botões × e ÷ e veja a ordem da conta.',
      dicas: [
        'Adicione os botões × e ÷ na grade.',
        'Ligue cada um ao bloco "inserir operador" com o símbolo certo.',
        'Multiplicação e divisão vêm antes da soma e subtração.'
      ],
      options: { estrutura: ESTRUTURA_COM_BOTAO, buttons: ['*', '/'], actions: ['a_acrescentar', 'a_inserir_op'], opSymbols: ['*', '/'] },
      novidades: { blocos: [] },
      casos: [
        { clicks: ['2', '*', '3'], espera: '2 * 3' },
        { clicks: ['7', '/', '2'], espera: '7 / 2' }
      ]
    },
    {
      id: 10, titulo: 'Igual!',
      objetivo: 'Adicione o botão = (e o 0) e ligue-os. Teste uma conta e também divisão por zero.',
      dicas: [
        'Adicione os botões = e 0 na grade.',
        'Ligue o "quando clicar em =" ao bloco "calcular o visor".',
        'Teste 1 + 2 = e também 1 / 0 = (que dá Infinity).'
      ],
      options: { estrutura: ESTRUTURA_COM_BOTAO, buttons: ['=', '0'], actions: ['a_acrescentar', 'a_inserir_op', 'a_calcular'], opSymbols: ['+', '*', '/'] },
      novidades: {
        blocos: [
          { tipo: 'a_calcular', texto: 'Lê o que está no visor, calcula a conta e mostra o resultado (o botão =).' }
        ]
      },
      casos: [
        { clicks: ['1', '+', '2', '='], espera: '3' },
        { clicks: ['1', '/', '0', '='], espera: 'Infinity' }
      ]
    },
    {
      id: 11, titulo: 'Teclado completo',
      objetivo: 'Adicione todos os botões que faltam (4,5,6,8,9,.) e ligue-os. Você reconstrói a calculadora!',
      dicas: [
        'Adicione os botões 4, 5, 6, 8, 9 e o ponto decimal.',
        'Cada dígito acrescenta o seu valor; operadores entram entre espaços; . não tem espaços.',
        'Agora a calculadora de referência está completa, construída por você!'
      ],
      options: { estrutura: ESTRUTURA_COM_BOTAO, buttons: ['4', '5', '6', '8', '9', '.'],
                 actions: ['a_acrescentar', 'a_inserir_op', 'a_calcular', 'a_limpar', 'a_apagar_ultimo'],
                 opSymbols: ['+', '-', '*', '/'] },
      novidades: { blocos: [] },
      casos: FULL_CALC_CASES()
    },
    {
      id: 12, titulo: 'Calculadora à prova de falhas',
      objetivo: 'Sua calculadora TRAVA com a conta "1 + =". Proteja o botão = para ela mostrar "Erro" em vez de quebrar.',
      dicas: [
        'Antes de mexer, clique em Testar: você vai ver que a conta "1 + =" trava o visor. É esse o problema.',
        'Ache a pilha "quando clicar em =" que você já montou. O bloco roxo "tentar" entra NO LUGAR do "calcular o visor".',
        'Arraste o "calcular o visor" para DENTRO do "tentar" (na parte de cima, branca).',
        'Na parte "se der erro" (de baixo), encaixe o bloco "mostrar Erro no visor".',
        'No código aparece try { ... } catch (e) { ... } — leia: "tente; se der erro, faça isto".'
      ],
      options: { estrutura: ESTRUTURA_COM_BOTAO, buttons: ['='], actions: ['a_acrescentar', 'a_inserir_op', 'a_calcular', 'tentar', 'a_mostrar_erro'], opSymbols: ['+'] },
      novidades: {
        blocos: [
          { tipo: 'tentar', texto: 'Protege uma ação: tenta primeiro; se der erro, roda a parte "se der erro".' },
          { tipo: 'a_mostrar_erro', texto: 'Coloca uma mensagem no visor (ex.: "Erro") quando algo dá errado.' }
        ]
      },
      casos: [
        { clicks: ['1', '+', '='], espera: 'Erro' },
        { clicks: ['1', '+', '2', '='], espera: '3' }
      ]
    }
  ];

  // ---- Auxiliares cumulativos (fonte única para estrutura esperada) ----
  function cumulativeButtons(id) {
    var seen = [];
    for (var i = 0; i < LEVELS.length; i++) {
      var lvl = LEVELS[i];
      if (lvl.id > id) break;
      (lvl.options.buttons || []).forEach(function(b) {
        if (seen.indexOf(b) === -1) seen.push(b);
      });
    }
    return seen;
  }

  function expectedStructure(id) {
    return { corpo: true, visor: id >= 2, botoes: cumulativeButtons(id) };
  }

  // ---- Novidades por nível (o que entrou de novo neste nível) ----
  // Categoria visual de cada tipo de bloco (espelha block-defs.js COLORS/agrupamento).
  function blockCategory(tipo) {
    if (tipo === 'q_iniciar' || tipo === 'e_corpo' || tipo === 'e_visor' || tipo === 'e_botao') return 'Estrutura';
    if (tipo === 'q_botao') return 'Eventos';
    if (tipo === 'a_acrescentar' || tipo === 'a_limpar' || tipo === 'a_apagar_ultimo') return 'Visor';
    if (tipo === 'a_inserir_op' || tipo === 'a_calcular') return 'Operadores';
    if (tipo === 'tentar' || tipo === 'a_mostrar_erro') return 'Lógica';
    return null;
  }

  function levelIndex(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return i;
    return -1;
  }

  // Conjuntos "novos" do nível: botões (options.buttons), tipos de estrutura e ações ainda não vistos.
  function newBlocks(id) {
    var idx = levelIndex(id);
    if (idx < 0) return { botoes: [], blocos: [] };
    var level = LEVELS[idx];
    var seenButtons = cumulativeButtons(id - 1); // botões liberados até o nível anterior
    var seenOps = {};
    for (var i = 0; i < idx; i++) {
      (LEVELS[i].options.actions || []).forEach(function(a) { seenOps[a] = true; });
      (LEVELS[i].options.estrutura || []).forEach(function(e) { seenOps[e] = true; });
    }
    var botoes = (level.options.buttons || []).filter(function(b) { return seenButtons.indexOf(b) === -1; });
    var tipos = (level.novidades && level.novidades.blocos || []).map(function(n) { return n.tipo; });
    return { botoes: botoes, blocos: tipos };
  }

  function newFeatures(id) {
    var idx = levelIndex(id);
    if (idx < 0) return { botoes: [], blocos: [] };
    var level = LEVELS[idx];
    return {
      botoes: newBlocks(id).botoes,
      blocos: level.novidades && level.novidades.blocos || [],
      categorias: uniqueCats(level.novidades && level.novidades.blocos || [], newBlocks(id).botoes)
    };
  }

  function uniqueCats(blocos, botoes) {
    var cats = [];
    (blocos || []).forEach(function(b) {
      var c = blockCategory(b.tipo);
      if (c && cats.indexOf(c) === -1) cats.push(c);
    });
    if (botoes && botoes.length) {
      if (cats.indexOf('Estrutura') === -1) cats.push('Estrutura');
      if (cats.indexOf('Eventos') === -1) cats.push('Eventos');
    }
    return cats;
  }

  // Injeta, no início de cada nível, um caso de ESTRUTURA derivado do acúmulo.
  LEVELS.forEach(function(level) {
    var structureCase = { estrutura: expectedStructure(level.id) };
    level.casos = [structureCase].concat(level.casos || []);
  });

  // Casos completos da calculadora (golden) — equivale ao teclado completo (nível 11).
  function FULL_CALC_CASES() {
    return [
      { clicks: ['7'], espera: '7' },
      { clicks: ['1', '2', '3'], espera: '123' },
      { clicks: ['1', '+', '2', '='], espera: '3' },
      { clicks: ['9', '-', '4', '='], espera: '5' },
      { clicks: ['5', '*', '6', '='], espera: '30' },
      { clicks: ['1', '0', '/', '4', '='], espera: '2.5' },
      { clicks: ['1', '2', 'del'], espera: '1' },
      { clicks: ['1', '2', 'C'], espera: '' },
      { clicks: ['del'], espera: '' },
      { clicks: ['5', '/', '0', '='], espera: 'Infinity' },
      { clicks: ['7', '9', 'C', '3'], espera: '3' },
      { clicks: ['1', '5', '.', '5'], espera: '15.5' },
      { clicks: ['2', '+', '3', '=', '7'], espera: '57' },
      { clicks: ['7', '.', '5', '+', '2', '.', '5', '='], espera: '10' },
      { clicks: ['1', '+', '2', '=', 'C'], espera: '' }
    ];
  }

  function getLevel(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return null;
  }

  var API = {
    LEVELS: LEVELS, getLevel: getLevel, FULL_CALC_CASES: FULL_CALC_CASES,
    cumulativeButtons: cumulativeButtons, expectedStructure: expectedStructure,
    newBlocks: newBlocks, newFeatures: newFeatures, blockCategory: blockCategory
  };
  root.MontaCalc = root.MontaCalc || {};
  root.MontaCalc.Levels = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
