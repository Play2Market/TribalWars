// ==UserScript==
// @name         Kitsune - Módulo de Grupos Personalizados
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.1
// @description  Módulo para gerenciar grupos personalizados no Assistente Kitsune.
// @author       Triky, GPT & Cia
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = `kitsune_groups_${game_data.world}`;
    const MAX_GROUPS = 3;

    // Adiciona os estilos CSS necessários para o modal
    function addModalStyles() {
        GM_addStyle(`
            /* --- Estilos do Modal --- */
            .kitsune-modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); z-index: 15000; justify-content: center; align-items: center; }
            .kitsune-modal-overlay.show { display: flex; }
            .kitsune-modal { background-color: #282c34; border: 1px solid #4a515e; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); width: 600px; max-width: 90%; display: flex; flex-direction: column; }
            .kitsune-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid #4a515e; background-color: #21252b; border-top-left-radius: 8px; border-top-right-radius: 8px; }
            .kitsune-modal-header h3 { margin: 0; color: #98c379; font-size: 1.1em; }
            .kitsune-modal-close { font-size: 1.5em; font-weight: bold; color: #8a919e; cursor: pointer; border: none; background: none; }
            .kitsune-modal-close:hover { color: #dcdfe4; }
            .kitsune-modal-body { padding: 20px; line-height: 1.5; max-height: 60vh; overflow-y: auto;}
            #kitsune-custom-groups-list { border: 1px solid #4a515e; border-radius: 5px; padding: 10px; margin-bottom: 20px; min-height: 120px; background-color: #21252b; }
            .kitsune-custom-group-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #4a515e; }
            .kitsune-custom-group-item:last-child { border-bottom: none; }
            .kitsune-custom-group-item span { font-weight: bold; color: #98c379; }
            .kitsune-group-actions button { margin-left: 10px; }
            .kitsune-button { display: inline-block; margin-top: 10px; padding: 8px 20px; background-color: #e06c75; border: 1px solid #e06c75; color: #fff; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background-color 0.2s; text-align: center;}
            .kitsune-button:hover { background-color: #c05c65; }
            .kitsune-button:disabled { background-color: #4a515e; border-color: #4a515e; cursor: not-allowed; }
            .kitsune-button-small { padding: 4px 10px; font-size: 0.9em; }
            .kitsune-button-secondary { background-color: #3a404a; border-color: #4a515e; }
            .kitsune-button-secondary:hover { background-color: #4a515e; }
            .kitsune-button-danger { background-color: #a43a42; border-color: #a43a42; }
            .kitsune-button-danger:hover { background-color: #8b3138; }
            #kitsune-btn-new-group { display: block; width: 100%; margin-top:0; }
            .kitsune-form-row-vertical { display: flex; flex-direction: column; margin-bottom: 15px; }
            .kitsune-form-row-vertical label { margin-bottom: 5px; font-weight: bold; color: #8a919e; }
            .kitsune-form-row-vertical input, .kitsune-form-row-vertical textarea { width: 100%; box-sizing: border-box; background-color: #21252b; color: #dcdfe4; border: 1px solid #4a515e; border-radius: 4px; padding: 5px; }
            .kitsune-form-actions { text-align: right; margin-top: 20px; }
            .kitsune-form-actions button { margin-left: 10px; }
            .kitsune-no-groups-message { text-align: center; color: var(--kitsune-text-dark); padding: 20px; }
        `);
    }

    // --- Funções de Dados (CRUD) ---
    function getCustomGroups() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    }

    function saveCustomGroups(groups) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    }

    // --- Função principal que gerencia o Modal ---
    function manageCustomGroupsModal() {
        const MODAL_ID = 'kitsune-custom-groups-modal';
        let currentGroups = [];
        let editingGroupId = null;

        function createModal() {
            if (document.getElementById(MODAL_ID)) return;

            const modalOverlay = document.createElement('div');
            modalOverlay.id = MODAL_ID;
            modalOverlay.className = 'kitsune-modal-overlay';
            modalOverlay.innerHTML = `
                <div class="kitsune-modal">
                    <div class="kitsune-modal-header">
                        <h3>Gerenciar Grupos Personalizados</h3>
                        <button class="kitsune-modal-close">&times;</button>
                    </div>
                    <div class="kitsune-modal-body">
                        <div id="kitsune-groups-list-view">
                            <div id="kitsune-custom-groups-list"></div>
                            <button id="kitsune-btn-new-group" class="kitsune-button">Criar Novo Grupo</button>
                        </div>
                        <div id="kitsune-groups-form-view" style="display: none;">
                            <h4 id="kitsune-form-title"></h4>
                            <div class="kitsune-form-row-vertical">
                                <label for="kitsune-group-name">Nome do Grupo (máx. 8 caracteres):</label>
                                <input type="text" id="kitsune-group-name" maxlength="8">
                            </div>
                            <div class="kitsune-form-row-vertical">
                                <label for="kitsune-group-coords">Coordenadas (uma por linha):</label>
                                <textarea id="kitsune-group-coords" rows="8" placeholder="555|444\n555|445"></textarea>
                            </div>
                            <div class="kitsune-form-actions">
                                <button id="kitsune-btn-cancel-edit" class="kitsune-button kitsune-button-secondary">Cancelar</button>
                                <button id="kitsune-btn-save-group" class="kitsune-button">Salvar</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            document.body.appendChild(modalOverlay);
            bindUIEvents(modalOverlay);
        }

        function renderGroupsList() {
            const listContainer = document.querySelector(`#${MODAL_ID} #kitsune-custom-groups-list`);
            const btnNewGroup = document.querySelector(`#${MODAL_ID} #kitsune-btn-new-group`);
            listContainer.innerHTML = '';

            if (currentGroups.length === 0) {
                listContainer.innerHTML = '<p class="kitsune-no-groups-message">Nenhum grupo personalizado criado.</p>';
            } else {
                currentGroups.forEach(group => {
                    const groupEl = document.createElement('div');
                    groupEl.className = 'kitsune-custom-group-item';
                    groupEl.innerHTML = `
                        <span>${group.name}</span>
                        <div class="kitsune-group-actions">
                            <button class="kitsune-button kitsune-button-small kitsune-button-secondary" data-id="${group.id}">Editar</button>
                            <button class="kitsune-button kitsune-button-small kitsune-button-danger" data-id="${group.id}">Excluir</button>
                        </div>
                    `;
                    listContainer.appendChild(groupEl);
                });
            }

            btnNewGroup.disabled = currentGroups.length >= MAX_GROUPS;
        }

        function bindUIEvents(modal) {
            const listView = modal.querySelector('#kitsune-groups-list-view');
            const formView = modal.querySelector('#kitsune-groups-form-view');
            const formTitle = modal.querySelector('#kitsune-form-title');
            const groupNameInput = modal.querySelector('#kitsune-group-name');
            const groupCoordsInput = modal.querySelector('#kitsune-group-coords');

            // Botão para mostrar formulário de novo grupo
            modal.querySelector('#kitsune-btn-new-group').addEventListener('click', () => {
                editingGroupId = null;
                formTitle.textContent = 'Criar Novo Grupo';
                groupNameInput.value = '';
                groupCoordsInput.value = '';
                listView.style.display = 'none';
                formView.style.display = 'block';
            });

            // Botão para cancelar edição/criação
            modal.querySelector('#kitsune-btn-cancel-edit').addEventListener('click', () => {
                formView.style.display = 'none';
                listView.style.display = 'block';
            });

            // Botão para salvar
            modal.querySelector('#kitsune-btn-save-group').addEventListener('click', () => {
                const name = groupNameInput.value.trim();
                const coords = groupCoordsInput.value.trim().split('\n').filter(c => c.match(/\d+\|\d+/));

                if (!name) { alert('O nome do grupo não pode estar vazio.'); return; }

                if (editingGroupId) { // Editando
                    const group = currentGroups.find(g => g.id === editingGroupId);
                    group.name = name;
                    group.coords = coords;
                } else { // Criando
                    currentGroups.push({ id: Date.now(), name, coords });
                }

                saveCustomGroups(currentGroups);
                renderGroupsList();
                formView.style.display = 'none';
                listView.style.display = 'block';
            });

            // Listeners para botões de editar e excluir na lista
            modal.querySelector('#kitsune-custom-groups-list').addEventListener('click', (e) => {
                const target = e.target;
                const groupId = parseInt(target.getAttribute('data-id'));

                if (target.textContent === 'Editar') {
                    const group = currentGroups.find(g => g.id === groupId);
                    editingGroupId = groupId;
                    formTitle.textContent = `Editar Grupo "${group.name}"`;
                    groupNameInput.value = group.name;
                    groupCoordsInput.value = group.coords.join('\n');
                    listView.style.display = 'none';
                    formView.style.display = 'block';
                }

                if (target.textContent === 'Excluir') {
                    if (confirm(`Tem certeza que deseja excluir o grupo "${currentGroups.find(g => g.id === groupId).name}"?`)) {
                        currentGroups = currentGroups.filter(g => g.id !== groupId);
                        saveCustomGroups(currentGroups);
                        renderGroupsList();
                    }
                }
            });

            modal.querySelector('.kitsune-modal-close').addEventListener('click', hide);
            modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
        }

        function show() {
            createModal();
            currentGroups = getCustomGroups();
            renderGroupsList();
            document.querySelector('#kitsune-groups-form-view').style.display = 'none';
            document.querySelector('#kitsune-groups-list-view').style.display = 'block';
            document.getElementById(MODAL_ID).classList.add('show');
        }

        function hide() {
            const modal = document.getElementById(MODAL_ID);
            if (modal) modal.classList.remove('show');
        }

        return { open: show };
    }

    // --- Funções de Integração ---
    async function getOfficialGroups() {
        const groups = [];
        try {
            if (typeof villageDock !== 'undefined' && villageDock.loadLink) {
                let finalUrl = villageDock.loadLink;
                if (typeof game_data !== 'undefined' && game_data.csrf) { finalUrl = `${finalUrl}&h=${game_data.csrf}`; }
                const response = await fetch(finalUrl);
                if (!response.ok) return [];
                const data = await response.json();
                if (data && Array.isArray(data.result)) {
                    data.result.forEach(groupInfo => {
                        if (groupInfo.group_id && groupInfo.group_id !== '0' && groupInfo.name) {
                            groups.push({ id: groupInfo.group_id, nome: groupInfo.name });
                        }
                    });
                }
            }
        } catch (e) { console.error("Kitsune: Erro ao buscar grupos oficiais.", e); }
        return groups;
    }

    async function getCombinedGroups() {
        const officialGroups = await getOfficialGroups();
        const customGroups = getCustomGroups().map(g => ({
            id: `custom_${g.id}`, // Prefixo para evitar conflito de IDs
            nome: `[P] ${g.name}` // Prefixo para indicar que é um grupo pessoal
        }));
        return [...officialGroups, ...customGroups];
    }

    // Adiciona estilos e "exporta" as funcionalidades para o script principal
    addModalStyles();
    window.kitsuneModalManager = {
        modal: manageCustomGroupsModal(),
        getCombinedGroups: getCombinedGroups
    };

})();
