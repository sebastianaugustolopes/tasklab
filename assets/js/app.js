console.log("TaskLab iniciado.");

// Chave usada para guardar as tarefas no localStorage. Mantê-la em uma
// constante evita erros de digitação e facilita trocar o nome depois.
const CHAVE_ARMAZENAMENTO = "tasklab:tarefas";

// Lê as tarefas salvas no localStorage e devolve um array pronto para uso.
//
// Cuidados importantes:
// 1. localStorage só guarda strings, então o que está salvo ali é um JSON.
//    JSON.parse pode lançar uma exceção se o conteúdo estiver corrompido
//    (por exemplo, se alguém editar o valor manualmente no DevTools). Por
//    isso o try/catch: se der erro, tratamos como "não há dados válidos"
//    e voltamos para uma lista vazia, em vez de quebrar a aplicação toda.
// 2. Também validamos que o resultado é de fato um array (Array.isArray).
//    Sem essa checagem, um JSON válido mas com formato errado (por
//    exemplo um objeto único, ou o número 42) passaria pelo JSON.parse
//    sem lançar erro, e quebraria o restante do código, que espera
//    sempre um array de tarefas.
function carregarTarefas() {
    try {
        const dadosSalvos = localStorage.getItem(CHAVE_ARMAZENAMENTO);

        // Chave ainda não existe no localStorage (ex.: primeira visita).
        if (dadosSalvos === null) return [];

        const tarefasCarregadas = JSON.parse(dadosSalvos);

        if (!Array.isArray(tarefasCarregadas)) {
            console.warn("Dados de tarefas corrompidos (formato inesperado). Iniciando lista vazia.");
            return [];
        }

        return tarefasCarregadas;
    } catch (erro) {
        // JSON.parse falhou: o conteúdo salvo não é um JSON válido.
        console.warn("Não foi possível carregar as tarefas salvas. Iniciando lista vazia.", erro);
        return [];
    }
}

// Serializa o array de tarefas atual em JSON e grava no localStorage.
// Lê a variável `tarefas` diretamente (está no mesmo escopo do arquivo).
function salvarTarefas() {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(tarefas));
}

// Estado principal da aplicação: em vez de sempre começar vazio, começa
// com o que já estiver salvo no localStorage de visitas anteriores.
let tarefas = carregarTarefas();

// Seleção dos elementos (uma única vez, no topo do arquivo)
const elementoFormulario = document.querySelector("#formulario-tarefa");
const elementoCampoTitulo = document.querySelector("#campo-titulo");
const elementoCampoDescricao = document.querySelector("#campo-descricao");
const elementoCampoPrioridade = document.querySelector("#campo-prioridade");
const elementoCampoData = document.querySelector("#campo-data");
const elementoBotaoSalvar = document.querySelector("#botao-salvar");
const elementoBotaoCancelar = document.querySelector("#botao-cancelar");
const elementoLista = document.querySelector("#lista-tarefas");
const elementoMensagemVazia = document.querySelector("#mensagem-vazia");
const elementoContador = document.querySelector("#contador-tarefas");

const formatadorData = new Intl.DateTimeFormat("pt-BR");

// Guarda o id da tarefa em edição, ou `null` quando o formulário está em modo criação.
let idEmEdicao = null;

// Monta o objeto de tarefa a partir dos valores já lidos dos campos.
// Função pequena e pura: não lê o DOM, só recebe e devolve dados.
function criarTarefa({ titulo, descricao, prioridade, data }) {
    return {
        id: crypto.randomUUID(),
        titulo,
        descricao,
        prioridade,
        data,
        concluida: false,
    };
}

// Formata a data (yyyy-mm-dd, como vem do <input type="date">) para dd/mm/aaaa.
// Se o usuário não escolheu data, não mostramos nada.
function formatarData(data) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-").map(Number);
    return formatadorData.format(new Date(ano, mes - 1, dia));
}

// Cria o <li> correspondente a UMA tarefa.
function criarItemTarefa(tarefa) {
    const item = document.createElement("li");
    item.classList.add("item-tarefa", `prioridade-${tarefa.prioridade.toLowerCase()}`);
    if (tarefa.concluida) item.classList.add("concluida");
    item.dataset.id = tarefa.id;

    item.innerHTML = `
        <strong class="titulo-tarefa">${tarefa.titulo}</strong>
        <p class="descricao-tarefa">${tarefa.descricao}</p>
        <span class="prioridade-tarefa">Prioridade: ${tarefa.prioridade}</span>
        <span class="data-tarefa">${formatarData(tarefa.data)}</span>
        <div class="acoes-tarefa">
            <button type="button" class="botao-concluir" data-id="${tarefa.id}">
                ${tarefa.concluida ? "Reabrir" : "Concluir"}
            </button>
            <button type="button" class="botao-editar" data-id="${tarefa.id}">Editar</button>
            <button type="button" class="botao-excluir" data-id="${tarefa.id}">Excluir</button>
        </div>
    `;

    return item;
}

// Atualiza o texto "N tarefa(s) pendente(s)" com base no array atual.
function atualizarContador() {
    const pendentes = tarefas.filter((tarefa) => !tarefa.concluida).length;
    elementoContador.textContent = `${pendentes} tarefa(s) pendente(s)`;
}

// Desenha a lista inteira na tela, tratando o caso de array vazio.
function renderizarTarefas() {
    elementoLista.innerHTML = ""; // limpa a renderização anterior

    const estaVazia = tarefas.length === 0;
    elementoMensagemVazia.hidden = !estaVazia;

    if (!estaVazia) {
        const itens = tarefas.map(criarItemTarefa);
        elementoLista.append(...itens);
    }

    atualizarContador();
}

// Devolve uma cópia da tarefa com os campos editáveis atualizados,
// preservando id e status de conclusão originais.
function atualizarTarefa(tarefa, { titulo, descricao, prioridade, data }) {
    return { ...tarefa, titulo, descricao, prioridade, data };
}

// Escreve os dados de uma tarefa nos campos do formulário e entra em modo edição.
function preencherFormulario(tarefa) {
    elementoCampoTitulo.value = tarefa.titulo;
    elementoCampoDescricao.value = tarefa.descricao;
    elementoCampoPrioridade.value = tarefa.prioridade;
    elementoCampoData.value = tarefa.data;

    idEmEdicao = tarefa.id;
    elementoBotaoSalvar.textContent = "Atualizar tarefa";
    elementoCampoTitulo.focus();
}

// Limpa o formulário e volta ao modo criação (usado após salvar edição ou cancelar).
function sairDoModoEdicao() {
    elementoFormulario.reset();
    idEmEdicao = null;
    elementoBotaoSalvar.textContent = "Salvar tarefa";
}

// Lida com o envio do formulário: impede o reload padrão e decide, com base em
// `idEmEdicao`, se deve criar uma tarefa nova ou atualizar uma existente.
elementoFormulario.addEventListener("submit", (evento) => {
    evento.preventDefault();

    const dadosFormulario = {
        titulo: elementoCampoTitulo.value.trim(),
        descricao: elementoCampoDescricao.value.trim(),
        prioridade: elementoCampoPrioridade.value,
        data: elementoCampoData.value,
    };

    if (idEmEdicao === null) {
        tarefas.push(criarTarefa(dadosFormulario));
    } else {
        tarefas = tarefas.map((tarefa) =>
            tarefa.id === idEmEdicao ? atualizarTarefa(tarefa, dadosFormulario) : tarefa
        );
    }

    renderizarTarefas();
    sairDoModoEdicao();
});

elementoBotaoCancelar.addEventListener("click", () => {
    sairDoModoEdicao();
});

// Alterna o status concluída/pendente de uma tarefa, sem mutar o objeto original.
function alternarConclusao(id) {
    tarefas = tarefas.map((tarefa) =>
        tarefa.id === id ? { ...tarefa, concluida: !tarefa.concluida } : tarefa
    );
    renderizarTarefas();
}

// Remove uma tarefa do array pelo id. Se a tarefa excluída era a que estava
// sendo editada, sai do modo edição para não deixar o formulário "preso".
function excluirTarefa(id) {
    tarefas = tarefas.filter((tarefa) => tarefa.id !== id);
    if (idEmEdicao === id) sairDoModoEdicao();
    renderizarTarefas();
}

// Delegação de eventos: um único listener no container cuida de todos os
// botões de ação, inclusive os que ainda serão recriados em futuras renderizações.
elementoLista.addEventListener("click", (evento) => {
    const botaoConcluir = evento.target.closest(".botao-concluir");
    if (botaoConcluir) {
        alternarConclusao(botaoConcluir.dataset.id);
        return;
    }

    const botaoExcluir = evento.target.closest(".botao-excluir");
    if (botaoExcluir) {
        const confirmou = window.confirm("Excluir esta tarefa?");
        if (confirmou) excluirTarefa(botaoExcluir.dataset.id);
        return;
    }

    const botaoEditar = evento.target.closest(".botao-editar");
    if (botaoEditar) {
        const tarefa = tarefas.find((tarefa) => tarefa.id === botaoEditar.dataset.id);
        if (tarefa) preencherFormulario(tarefa);
        return;
    }
});

// Primeira renderização: desenha o que foi carregado do localStorage
// (pode já vir com tarefas de uma visita anterior, ou vazio na primeira vez).
renderizarTarefas();
