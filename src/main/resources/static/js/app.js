
// ==========================================
// 1. CONFIGURAÇÕES E DADOS
// ==========================================

const API = {
    chamados: "/chamados",
    clientes: "/clientes",
    tecnicos: "/tecnicos",
    categorias: "/categorias"
};

const state = {
    view: "dashboard",
    chamados: [],
    clientes: [],
    tecnicos: [],
    categorias: []
};

const labels = {
    dashboard: "Dashboard",
    chamados: "Chamados",
    clientes: "Clientes",
    tecnicos: "Técnicos",
    categorias: "Categorias"
};

const descriptions = {
    dashboard: "Acompanhe os chamados e a operação do sistema.",
    chamados: "Gerencie as solicitações e seus atendimentos.",
    clientes: "Gerencie os clientes cadastrados.",
    tecnicos: "Gerencie os técnicos responsáveis pelos atendimentos.",
    categorias: "Gerencie as categorias dos chamados."
};

let toastTimeout;


// ==========================================
// 2. COMUNICAÇÃO COM O BACK-END
// ==========================================

async function apiRequest(url, options = {}) {

    const response = await fetch(url, {
        ...options,
        headers: {
            ...(options.body ? {
                "Content-Type": "application/json"
            } : {}),
            ...options.headers
        }
    });

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
        ? await response.json()
        : null;

    if (!response.ok) {

        const details = data?.detalhes?.join(" | ");

        throw new Error(
            details ||
            data?.erro ||
            data?.message ||
            `Erro ${response.status}`
        );
    }

    return data;
}


// Busca todos os dados da aplicação

async function loadData() {

    try {

        const [chamados, clientes, tecnicos, categorias] =
            await Promise.all([

                apiRequest(API.chamados),
                apiRequest(API.clientes),
                apiRequest(API.tecnicos),
                apiRequest(API.categorias)

            ]);

        state.chamados = chamados;
        state.clientes = clientes;
        state.tecnicos = tecnicos;
        state.categorias = categorias;

        render();

    } catch (error) {

        console.error("Erro ao carregar dados:", error);

        showToast("Não foi possível carregar os dados. Verifique se o servidor está ativo.");
    }
}


// ==========================================
// 3. NAVEGAÇÃO
// ==========================================

function navigate(view) {

    if (!labels[view]) return;

    state.view = view;

    document.querySelectorAll(".nav-item").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.view === view
        );

    });

    document.getElementById("breadcrumb").textContent = labels[view];
    document.getElementById("page-title").textContent = labels[view];

    document.getElementById("page-description").textContent =
        descriptions[view];

    document.getElementById("dashboard-view").hidden =
        view !== "dashboard";

    document.getElementById("content-view").hidden =
        view === "dashboard";

    document.getElementById("new-button").textContent =
        view === "dashboard" || view === "chamados"
            ? "+ Novo chamado"
            : `+ Novo ${view === "tecnicos" ? "técnico" : view === "categorias" ? "categoria" : "cliente"}`;

    document.getElementById("new-button").hidden = false;

    document.getElementById("table-title").textContent = labels[view];

    document.getElementById("search-input").value = "";

    render();
}


// ==========================================
// 4. DASHBOARD
// ==========================================

function renderDashboard() {

    const chamados = state.chamados;

    document.getElementById("total-chamados").textContent =
        chamados.length;

    document.getElementById("total-abertos").textContent =
        chamados.filter(c => c.status === "ABERTO").length;

    document.getElementById("total-atendimento").textContent =
        chamados.filter(c => c.status === "EM_ATENDIMENTO").length;

    document.getElementById("total-fechados").textContent =
        chamados.filter(c => c.status === "FECHADO").length;

    const recentes = [...chamados]
        .sort((a, b) => new Date(b.dataAbertura) - new Date(a.dataAbertura))
        .slice(0, 5);

    document.getElementById("recent-table").innerHTML =
        renderChamadosTable(recentes);
}


// ==========================================
// 5. RENDERIZAÇÃO DAS TABELAS
// ==========================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}


function formatDate(value) {

    if (!value) return "-";

    return new Date(value).toLocaleDateString("pt-BR");
}


function formatStatus(status) {

    const names = {
        ABERTO: "Aberto",
        EM_ATENDIMENTO: "Em atendimento",
        AGUARDANDO_CLIENTE: "Aguardando cliente",
        FECHADO: "Fechado"
    };

    return names[status] || status;
}


function formatPriority(priority) {

    const names = {
        BAIXA: "Baixa",
        MEDIA: "Média",
        ALTA: "Alta",
        CRITICA: "Crítica"
    };

    return names[priority] || priority;
}


function statusBadge(status) {

    return `
        <span class="badge ${escapeHTML(status)}">
            ${escapeHTML(formatStatus(status))}
        </span>
    `;
}


function priorityBadge(priority) {

    return `
        <span class="badge ${escapeHTML(priority)}">
            ${escapeHTML(formatPriority(priority))}
        </span>
    `;
}


// Tabela de chamados

function renderChamadosTable(chamados) {

    if (!chamados.length) {
        return `<div class="empty-state">Nenhum chamado encontrado.</div>`;
    }

    return `
        <div class="table-wrapper">
        <table>

            <thead>
                <tr>
                    <th>ID</th>
                    <th>Chamado</th>
                    <th>Cliente</th>
                    <th>Técnico</th>
                    <th>Prioridade</th>
                    <th>Status</th>
                    <th>Abertura</th>
                    <th>Ações</th>
                </tr>
            </thead>

            <tbody>

                ${chamados.map(c => `

                    <tr>

                        <td>#${c.id}</td>

                        <td>${escapeHTML(c.titulo)}</td>

                        <td>${escapeHTML(c.clienteNome)}</td>

                        <td>${escapeHTML(c.tecnicoNome || "Não atribuído")}</td>

                        <td>${priorityBadge(c.prioridade)}</td>

                        <td>${statusBadge(c.status)}</td>

                        <td>${formatDate(c.dataAbertura)}</td>

                        <td>
                            <div class="actions">

                                <button class="btn-small"
                                    data-action="edit"
                                    data-id="${c.id}">
                                    Editar
                                </button>

                                ${c.status !== "FECHADO" ? `

                                    <button class="btn-small"
                                        data-action="assign"
                                        data-id="${c.id}">
                                        Técnico
                                    </button>

                                    <button class="btn-small"
                                        data-action="status"
                                        data-id="${c.id}">
                                        Status
                                    </button>

                                ` : ""}

                                <button class="btn-danger"
                                    data-action="delete"
                                    data-id="${c.id}">
                                    Excluir
                                </button>

                            </div>
                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>
        </div>
    `;
}


// Tabelas de clientes, técnicos e categorias

function renderSimpleTable(view, records) {

    if (!records.length) {
        return `<div class="empty-state">Nenhum registro encontrado.</div>`;
    }

    let headers = [];
    let rows = [];

    if (view === "clientes") {

        headers = ["ID", "Nome", "E-mail", "Telefone", "Ações"];

        rows = records.map(c => [
            c.id,
            c.nome,
            c.email,
            c.telefone || "-"
        ]);

    } else if (view === "tecnicos") {

        headers = ["ID", "Nome", "E-mail", "Perfil", "Ações"];

        rows = records.map(t => [
            t.id,
            t.nome,
            t.email,
            t.perfil
        ]);

    } else {

        headers = ["ID", "Nome", "Descrição", "Ações"];

        rows = records.map(c => [
            c.id,
            c.nome,
            c.descricao || "-"
        ]);
    }

    return `
        <div class="table-wrapper">
        <table>

            <thead>
                <tr>
                    ${headers.map(h => `<th>${h}</th>`).join("")}
                </tr>
            </thead>

            <tbody>

                ${records.map((record, index) => `

                    <tr>

                        ${rows[index].map(value => `
                            <td>${escapeHTML(value)}</td>
                        `).join("")}

                        <td>
                            <div class="actions">

                                <button class="btn-small"
                                    data-action="edit"
                                    data-id="${record.id}">
                                    Editar
                                </button>

                                <button class="btn-danger"
                                    data-action="delete"
                                    data-id="${record.id}">
                                    Excluir
                                </button>

                            </div>
                        </td>

                    </tr>

                `).join("")}

            </tbody>

        </table>
        </div>
    `;
}


// ==========================================
// 6. ATUALIZAR A INTERFACE
// ==========================================

function render() {

    if (state.view === "dashboard") {

        renderDashboard();
        return;
    }

    const records = state[state.view];

    document.getElementById("table-container").innerHTML =
        state.view === "chamados"
            ? renderChamadosTable(records)
            : renderSimpleTable(state.view, records);
}


// ==========================================
// 7. MODAIS E FORMULÁRIOS
// ==========================================

function openModal(title, html, onSubmit) {

    document.getElementById("modal-title").textContent = title;

    const content = document.getElementById("modal-content");

    content.innerHTML = html;

    document.getElementById("modal").hidden = false;

    content.querySelector("form").addEventListener("submit", async event => {

        event.preventDefault();

        const form = event.target;

        const button = form.querySelector('button[type="submit"]');

        button.disabled = true;

        try {

            await onSubmit(form);

            closeModal();

            await loadData();

            showToast("Operação realizada com sucesso!");

        } catch (error) {

            showToast(error.message);

            console.error(error);

        } finally {

            button.disabled = false;
        }
    });
}


function closeModal() {

    document.getElementById("modal").hidden = true;
    document.getElementById("modal-content").innerHTML = "";
}


function inputField(label, name, value = "", type = "text", required = true) {

    return `
        <div class="form-field">
            <label>${label}</label>

            <input
                type="${type}"
                name="${name}"
                value="${escapeHTML(value)}"
                ${required ? "required" : ""}
            >
        </div>
    `;
}


function textareaField(label, name, value = "") {

    return `
        <div class="form-field full">
            <label>${label}</label>

            <textarea name="${name}" required>${escapeHTML(value)}</textarea>
        </div>
    `;
}


function selectField(label, name, options, selected = "", disabled = false) {

    return `
        <div class="form-field">
            <label>${label}</label>

            <select name="${name}" ${disabled ? "disabled" : ""} required>

                <option value="">Selecione...</option>

                ${options.map(option => `

                    <option
                        value="${escapeHTML(option.value)}"
                        ${String(option.value) === String(selected) ? "selected" : ""}
                    >
                        ${escapeHTML(option.label)}
                    </option>

                `).join("")}

            </select>
        </div>
    `;
}


// Abre formulário de cadastro ou edição

function openEntityForm(kind, item = null) {

    const editing = item !== null;

    let fields = "";
    let title = `${editing ? "Editar" : "Novo"} registro`;

    if (kind === "clientes") {

        title = `${editing ? "Editar" : "Novo"} cliente`;

        fields = `
            ${inputField("Nome", "nome", item?.nome)}
            ${inputField("E-mail", "email", item?.email, "email")}
            ${inputField("Telefone", "telefone", item?.telefone, "tel", false)}
        `;

    } else if (kind === "tecnicos") {

        title = `${editing ? "Editar" : "Novo"} técnico`;

        fields = `
            ${inputField("Nome", "nome", item?.nome)}
            ${inputField("E-mail", "email", item?.email, "email")}

            ${selectField("Perfil", "perfil", [
                { value: "ADMIN", label: "Administrador" },
                { value: "TECNICO", label: "Técnico" }
            ], item?.perfil)}
        `;

    } else if (kind === "categorias") {

        title = `${editing ? "Editar" : "Nova"} categoria`;

        fields = `
            ${inputField("Nome", "nome", item?.nome)}
            ${inputField("Descrição", "descricao", item?.descricao, "text", false)}
        `;

    } else if (kind === "chamados") {

        title = `${editing ? "Editar" : "Novo"} chamado`;

        const clientes = state.clientes.map(c => ({
            value: c.id,
            label: c.nome
        }));

        const categorias = state.categorias.map(c => ({
            value: c.id,
            label: c.nome
        }));

        fields = `
            ${inputField("Título", "titulo", item?.titulo)}

            ${textareaField("Descrição", "descricao", item?.descricao || "")}

            <div class="form-grid">

                ${selectField("Prioridade", "prioridade", [
                    { value: "BAIXA", label: "Baixa" },
                    { value: "MEDIA", label: "Média" },
                    { value: "ALTA", label: "Alta" },
                    { value: "CRITICA", label: "Crítica" }
                ], item?.prioridade)}

                ${selectField("Categoria", "categoriaId", categorias, item?.categoriaId)}

                ${selectField(
                    "Cliente",
                    "clienteId",
                    clientes,
                    item?.clienteId,
                    editing
                )}

            </div>
        `;
    }

    openModal(title, `
        <form id="record-form">

            <div class="form-grid">
                ${fields}
            </div>

            <div class="form-actions">

                <button type="button" class="btn-outline" id="cancel-form">
                    Cancelar
                </button>

                <button type="submit" class="btn-primary">
                    ${editing ? "Salvar alterações" : "Cadastrar"}
                </button>

            </div>

        </form>
    `, async form => {

        const value = name => form.elements[name]?.value ?? "";

        let payload = {};

        if (kind === "clientes") {

            payload = {
                nome: value("nome"),
                email: value("email"),
                telefone: value("telefone")
            };

        } else if (kind === "tecnicos") {

            payload = {
                nome: value("nome"),
                email: value("email"),
                perfil: value("perfil")
            };

        } else if (kind === "categorias") {

            payload = {
                nome: value("nome"),
                descricao: value("descricao")
            };

        } else {

            payload = {
                titulo: value("titulo"),
                descricao: value("descricao"),
                prioridade: value("prioridade"),
                clienteId: Number(value("clienteId")),
                categoriaId: Number(value("categoriaId"))
            };
        }

        const url = editing
            ? `${API[kind]}/${item.id}`
            : API[kind];

        await apiRequest(url, {
            method: editing ? "PUT" : "POST",
            body: JSON.stringify(payload)
        });
    });

    document.getElementById("cancel-form").addEventListener("click", closeModal);
}


// ==========================================
// 8. ATRIBUIÇÃO DE TÉCNICO
// ==========================================

function openAssignForm(chamado) {

    const options = state.tecnicos.map(t => ({
        value: t.id,
        label: t.nome
    }));

    openModal("Atribuir técnico", `
        <form id="record-form">

            <p style="margin-bottom:20px;font-size:13px">
                Chamado #${chamado.id} — ${escapeHTML(chamado.titulo)}
            </p>

            ${selectField("Técnico responsável", "tecnicoId", options, chamado.tecnicoId)}

            <div class="form-actions">

                <button type="button" class="btn-outline" id="cancel-form">
                    Cancelar
                </button>

                <button type="submit" class="btn-primary">
                    Atribuir
                </button>

            </div>

        </form>
    `, async form => {

        const tecnicoId = Number(form.elements.tecnicoId.value);

        await apiRequest(`${API.chamados}/${chamado.id}/atribuir`, {

            method: "PATCH",

            body: JSON.stringify({ tecnicoId })
        });
    });

    document.getElementById("cancel-form").addEventListener("click", closeModal);
}


// ==========================================
// 9. ALTERAÇÃO DE STATUS
// ==========================================

function openStatusForm(chamado) {

    const statuses = [
        { value: "EM_ATENDIMENTO", label: "Em atendimento" },
        { value: "AGUARDANDO_CLIENTE", label: "Aguardando cliente" },
        { value: "FECHADO", label: "Fechado" }
    ].filter(s => s.value !== chamado.status);

    openModal("Alterar status", `
        <form id="record-form">

            <p style="margin-bottom:20px;font-size:13px">
                Chamado #${chamado.id} — ${escapeHTML(chamado.titulo)}
            </p>

            <div class="form-field">
                <label>Status atual</label>
                <input value="${escapeHTML(formatStatus(chamado.status))}" disabled>
            </div>

            ${selectField("Novo status", "status", statuses)}

            <div class="form-actions">

                <button type="button" class="btn-outline" id="cancel-form">
                    Cancelar
                </button>

                <button type="submit" class="btn-primary">
                    Atualizar status
                </button>

            </div>

        </form>
    `, async form => {

        const status = form.elements.status.value;

        await apiRequest(`${API.chamados}/${chamado.id}/status`, {

            method: "PATCH",

            body: JSON.stringify({ status })
        });
    });

    document.getElementById("cancel-form").addEventListener("click", closeModal);
}


// ==========================================
// 10. EXCLUSÃO DE REGISTROS
// ==========================================

async function deleteRecord(kind, id) {

    const confirmed = confirm(
        "Tem certeza de que deseja excluir este registro?"
    );

    if (!confirmed) return;

    try {

        await apiRequest(`${API[kind]}/${id}`, {
            method: "DELETE"
        });

        await loadData();

        showToast("Registro excluído com sucesso!");

    } catch (error) {

        showToast(error.message);

    }
}


// ==========================================
// 11. EVENTOS DA INTERFACE
// ==========================================

// Navegação lateral

document.querySelectorAll(".nav-item").forEach(button => {

    button.addEventListener("click", () => {
        navigate(button.dataset.view);
    });

});


// Botão de novo registro

document.getElementById("new-button").addEventListener("click", () => {

    const kind = state.view === "dashboard"
        ? "chamados"
        : state.view;

    if (
        kind === "chamados" &&
        (!state.clientes.length || !state.categorias.length)
    ) {

        showToast("Cadastre pelo menos um cliente e uma categoria primeiro.");
        return;
    }

    openEntityForm(kind);
});


// Botões de ações nas tabelas

document.addEventListener("click", event => {

    const button = event.target.closest("[data-action]");

    if (button) {

        const action = button.dataset.action;
        const id = Number(button.dataset.id);

        if (state.view === "chamados") {

            const chamado = state.chamados.find(c => c.id === id);

            if (!chamado) return;

            if (action === "edit") {
                if (chamado.status === "FECHADO") {
                    showToast("Chamados fechados não podem ser editados.");
                    return;
                }
                openEntityForm("chamados", chamado);
            }

            if (action === "assign") {
                if (!state.tecnicos.length) {
                    showToast("Cadastre um técnico primeiro.");
                    return;
                }
                openAssignForm(chamado);
            }

            if (action === "status") {
                openStatusForm(chamado);
            }

            if (action === "delete") {
                deleteRecord("chamados", id);
            }

        } else {

            if (action === "edit") {

                const record = state[state.view].find(r => r.id === id);

                openEntityForm(state.view, record);
            }

            if (action === "delete") {
                deleteRecord(state.view, id);
            }

        }

        return;
    }

    const navigationButton = event.target.closest("[data-go]");

    if (navigationButton) {
        navigate(navigationButton.dataset.go);
    }
});


// Busca e filtragem

document.getElementById("search-input").addEventListener("input", event => {

    const search = event.target.value.toLowerCase();

    const records = state[state.view];

    const filtered = records.filter(record => {

        const content = Object.values(record)
            .join(" ")
            .toLowerCase();

        return content.includes(search);
    });

    document.getElementById("table-container").innerHTML =
        state.view === "chamados"
            ? renderChamadosTable(filtered)
            : renderSimpleTable(state.view, filtered);

});


// Fechar modal

document.getElementById("close-modal").addEventListener("click", closeModal);

document.getElementById("modal").addEventListener("click", event => {

    if (event.target.id === "modal") {
        closeModal();
    }

});


// ==========================================
// 12. MENSAGENS
// ==========================================

function showToast(message) {

    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}


// ==========================================
// 13. INICIALIZAÇÃO
// ==========================================

navigate("dashboard");
loadData();
