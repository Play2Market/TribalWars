// ==UserScript==
// @name         Kitsune - Módulo de Grupos Personalizados
// @namespace    https://github.com/Play2Market/TribalWars
// @version      2.1
// @description  Módulo para gerenciar grupos personalizados e sincronizar grupos premium no Assistente Kitsune.
// @author       Triky, GPT & Cia (Correção por Gemini)
// ==/UserScript==

(function () {
    'use strict';

    // --- CHAVES DE ARMAZENAMENTO ---
    const CUSTOM_GROUPS_KEY = `kitsune_groups_${game_data.world}`;
    const PREMIUM_CACHE_KEY = `kitsune_premium_groups_cache_${game_data.world}`;
    const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hora

    // --- ESTILOS ---
    function addModalStyles() {
        GM_addStyle(`
            /* --- Estilos do Modal (sem alterações) --- */
            .kitsune-modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.7); z-index: 15000; justify-content: center; align-items: center; }
            .kitsune-modal-overlay.show { display: flex; }
            .kitsune-modal { background-color: #282c34; border: 1px solid #4a515e; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); width: 600px; max-width: 90%; display: flex; flex-direction: column; }
            .kitsune-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-bottom: 1px solid #4a515e; background-color: #21252b; border-top-left-radius: 8px; border-top-right-radius: 8px; }
            .kitsune-modal-header h3 { margin: 0; color: #98c379; font-size: 1.3em; flex-grow: 1; text-align: center; }
            .kitsune-modal-close { font-size: 1.5em; font-weight: bold; color: #8a919e; cursor: pointer; border: none; background: none; z-index: 1; margin-left: -20px; }
            .kitsune-modal-close:hover { color: #dcdfe4; }
            .kitsune-modal-body { padding: 20px; line-height: 1.5; max-height: 60vh; overflow-y: auto;}
            #kitsune-custom-groups-list { border: 1px solid #4a515e; border-radius: 5px; padding: 10px; margin-bottom: 20px; min-height: 120px; background-color: #21252b; }
            .kitsune-custom-group-item { display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #4a515e; }
            .kitsune-custom-group-item:last-child { border-bottom: none; }
            .kitsune-custom-group-item span { font-weight: bold; color: #98c379; }
            .kitsune-group-actions { text-align: right; }
            .kitsune-group-actions span { margin-right: 10px; color: var(--kitsune-text-dark); }
            .kitsune-group-actions button { margin-left: 10px; }
            .kitsune-button { display: inline-block; margin-top: 10px; padding: 8px 20px; background-color: #e06c75; border: 1px solid #e06c75; color: #fff; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background-color 0.2s; text-align: center;}
            .kitsune-button:hover { background-color: #c05c65; }
            .kitsune-button:disabled { background-color: #4a515e; border-color: #4a515e; cursor: not-allowed; }
            .kitsune-button-small { padding: 4px 10px; font-size: 0.9em; }
            .kitsune-button-secondary { background-color: #3a404a; border-color: #4a515e; }
            .kitsune-button-secondary:hover { background-color: #4a515e; }
            .kitsune-button-danger { background-color: #a43a42; border-color: #a43a42; }
            .kitsune-button-danger:hover { background-color: #8b3138; }
            .kitsune-button-success { background-color: #7b9e61; border-color: #7b9e61; }
            .kitsune-button-success:hover { background-color: #6a8a52; }
            #kitsune-btn-new-group { display: block; width: 100%; margin-top:0; }
            .kitsune-form-row-vertical { display: flex; flex-direction: column; margin-bottom: 15px; }
            .kitsune-form-row-vertical label { margin-bottom: 5px; font-weight: bold; color: #8a919e; }
            .kitsune-form-row-vertical input, .kitsune-form-row-vertical textarea { width: 100%; box-sizing: border-box; background-color: #21252b; color: #dcdfe4; border: 1px solid #4a515e; border-radius: 4px; padding: 5px; }
            .kitsune-form-actions { text-align: right; margin-top: 20px; }
            .kitsune-form-actions button { margin-left: 10px; }
            .kitsune-no-groups-message { text-align: center; color: var(--kitsune-text-dark); padding: 20px; }
        `);
    }

    // --- FUNÇÕES DE DADOS (GRUPOS PERSONALIZADOS) ---
    function getCustomGroups() { return JSON.parse(localStorage.getItem(CUSTOM_GROUPS_KEY) || '[]'); }
    function saveCustomGroups(groups) { localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(groups)); }

    // --- LÓGICA DO MODAL DE GRUPOS PERSONALIZADOS ---
    function manageCustomGroupsModal() {
        const MODAL_ID = 'kitsune-custom-groups-modal';
        const MAX_GROUPS = 3;
        
        // [CORREÇÃO] A variável 'modal' é declarada aqui para ser acessível por todas as funções aninhadas.
        let modal; 
        let currentGroups = [];
        let editingGroupId = null;
        let confirmingDeleteId = null;

        function createModal() {
            if (document.getElementById(MODAL_ID)) {
                modal = document.getElementById(MODAL_ID); // [CORREÇÃO] Se o modal já existe, apenas o referencia.
                return;
            }
            
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
            
            // [CORREÇÃO] Atribui o elemento criado à variável de escopo superior.
            modal = modalOverlay; 
            bindUIEvents();
        }

        function renderGroupsList() {
            // [CORREÇÃO] Usa a variável 'modal' do escopo superior, que agora está sempre definida.
            const listContainer = modal.querySelector('#kitsune-custom-groups-list');
            const btnNewGroup = modal.querySelector('#kitsune-btn-new-group');
            listContainer.innerHTML = '';

            if (currentGroups.length === 0) {
                listContainer.innerHTML = '<p class="kitsune-no-groups-message">Nenhum grupo personalizado criado.</p>';
            } else {
                currentGroups.forEach(group => {
                    const groupEl = document.createElement('div');
                    groupEl.className = 'kitsune-custom-group-item';
                    groupEl.dataset.id = group.id;

                    let actionsHtml;
                    if (confirmingDeleteId === group.id) {
                        actionsHtml = `
                            <span>Tem certeza?</span>
                            <button class="kitsune-button kitsune-button-small kitsune-button-secondary action-confirm-no">Não</button>
                            <button class="kitsune-button kitsune-button-small kitsune-button-success action-confirm-yes">Sim</button>
                        `;
                    } else {
                        actionsHtml = `
                            <button class="kitsune-button kitsune-button-small kitsune-button-secondary action-edit">Editar</button>
                            <button class="kitsune-button kitsune-button-small kitsune-button-danger action-delete">Excluir</button>
                        `;
                    }

                    groupEl.innerHTML = `
                        <span>${group.name}</span>
                        <div class="kitsune-group-actions">${actionsHtml}</div>
                    `;
                    listContainer.appendChild(groupEl);
                });
            }
            btnNewGroup.disabled = currentGroups.length >= MAX_GROUPS;
        }

        function bindUIEvents() {
            // [CORREÇÃO] Usa a variável 'modal' do escopo superior.
            const listView = modal.querySelector('#kitsune-groups-list-view');
            const formView = modal.querySelector('#kitsune-groups-form-view');
            const formTitle = modal.querySelector('#kitsune-form-title');
            const groupNameInput = modal.querySelector('#kitsune-group-name');
            const groupCoordsInput = modal.querySelector('#kitsune-group-coords');

            modal.querySelector('#kitsune-btn-new-group').addEventListener('click', () => {
                editingGroupId = null;
                confirmingDeleteId = null;
                formTitle.textContent = 'Criar Novo Grupo';
                groupNameInput.value = '';
                groupCoordsInput.value = '';
                listView.style.display = 'none';
                formView.style.display = 'block';
            });

            modal.querySelector('#kitsune-btn-cancel-edit').addEventListener('click', () => {
                formView.style.display = 'none';
                listView.style.display = 'block';
            });

            modal.querySelector('#kitsune-btn-save-group').addEventListener('click', () => {
                const name = groupNameInput.value.trim();
                const coords = groupCoordsInput.value.trim().split('\n').filter(c => c.match(/\d+\|\d+/));
                if (!name) { alert('O nome do grupo não pode estar vazio.'); return; }
                if (editingGroupId) {
                    const group = currentGroups.find(g => g.id === editingGroupId);
                    if (group) {
                        group.name = name;
                        group.coords = coords;
                    }
                } else {
                    currentGroups.push({ id: Date.now(), name, coords });
                }
                saveCustomGroups(currentGroups);
                renderGroupsList();
                formView.style.display = 'none';
                listView.style.display = 'block';
            });

            modal.querySelector('#kitsune-custom-groups-list').addEventListener('click', (e) => {
                const target = e.target;
                const groupItem = target.closest('.kitsune-custom-group-item');
                if (!groupItem) return;
                const groupId = parseInt(groupItem.dataset.id);

                if (target.classList.contains('action-edit')) {
                    confirmingDeleteId = null;
                    const group = currentGroups.find(g => g.id === groupId);
                    if (group) {
                        editingGroupId = groupId;
                        formTitle.textContent = `Editar Grupo "${group.name}"`;
                        groupNameInput.value = group.name;
                        groupCoordsInput.value = group.coords.join('\n');
                        listView.style.display = 'none';
                        formView.style.display = 'block';
                    }
                } else if (target.classList.contains('action-delete')) {
                    confirmingDeleteId = groupId;
                    renderGroupsList();
                } else if (target.classList.contains('action-confirm-yes')) {
                    currentGroups = currentGroups.filter(g => g.id !== groupId);
                    saveCustomGroups(currentGroups);
                    confirmingDeleteId = null;
                    renderGroupsList();
                } else if (target.classList.contains('action-confirm-no')) {
                    confirmingDeleteId = null;
                    renderGroupsList();
                }
            });

            modal.querySelector('.kitsune-modal-close').addEventListener('click', hide);
            modal.addEventListener('click', (e) => { if (e.target === modal) hide(); });
        }

        function show() {
            createModal(); // Garante que o modal exista e a variável 'modal' esteja definida
            currentGroups = getCustomGroups();
            confirmingDeleteId = null;
            renderGroupsList();
            modal.querySelector('#kitsune-groups-form-view').style.display = 'none';
            modal.querySelector('#kitsune-groups-list-view').style.display = 'block';
            modal.classList.add('show');
        }

        function hide() {
            if (modal) modal.classList.remove('show');
        }
        
        return { open: show };
    }

    // --- FUNÇÕES DE DADOS (GRUPOS PREMIUM E COMBINADOS) ---
    // (Esta seção permanece sem alterações)

    function getPremiumGroupsCache() {
        try {
            return JSON.parse(localStorage.getItem(PREMIUM_CACHE_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function savePremiumGroupsCache(cache) {
        localStorage.setItem(PREMIUM_CACHE_KEY, JSON.stringify(cache));
    }

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

    function internalGetVillagesViaIframe(groupId) {
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            
            const groupUrl = TribalWars.buildURL('', 'overview_villages', { mode: 'groups', type: 'dynamic', group: groupId });
            iframe.src = groupUrl;

            iframe.onload = () => {
                try {
                    const doc = iframe.contentDocument;
                    if (!doc) {
                        reject(new Error("Não foi possível acessar o conteúdo do iframe."));
                        return;
                    }
                    
                    const villages = [];
                    const villageElements = doc.querySelectorAll('#results_preview .quickedit-vn');
                    
                    villageElements.forEach(el => {
                        const id = el.dataset.id;
                        const label = el.querySelector('.quickedit-label').textContent.trim();
                        const coordMatch = label.match(/(\d+\|\d+)/);
                        const coords = coordMatch ? coordMatch[1] : null;

                        if (id && coords) {
                            villages.push({ id, coords });
                        }
                    });
                    resolve(villages);
                } catch (e) {
                    reject(e);
                } finally {
                    iframe.remove();
                }
            };

            iframe.onerror = () => {
                reject(new Error("Erro ao carregar o iframe."));
                iframe.remove();
            };
            document.body.appendChild(iframe);
        });
    }

    async function syncPremiumGroups(statusCallback = () => {}) {
        console.log("Kitsune: Iniciando sincronização de grupos premium...");
        statusCallback("Sincronizando...");
        const officialGroups = await getOfficialGroups();
        const cache = getPremiumGroupsCache();

        for (const group of officialGroups) {
            try {
                console.log(`Buscando aldeias do grupo: ${group.nome} (${group.id})`);
                statusCallback(`Sincronizando: ${group.nome}...`);
                const villages = await internalGetVillagesViaIframe(group.id);
                cache[group.id] = {
                    timestamp: Date.now(),
                    villages: villages
                };
                console.log(`Grupo ${group.nome} sincronizado com ${villages.length} aldeias.`);
            } catch (error) {
                console.error(`Falha ao sincronizar o grupo ${group.nome}:`, error);
            }
        }

        savePremiumGroupsCache(cache);
        statusCallback("Sincronização concluída!");
        console.log("Kitsune: Sincronização de grupos premium concluída.");
        setTimeout(() => statusCallback(""), 2000);
    }

    // --- FUNÇÕES PÚBLICAS DO MÓDULO ---

    async function getCombinedGroups() {
        const officialGroups = await getOfficialGroups();
        const customGroups = getCustomGroups().map(g => ({
            id: `custom_${g.id}`,
            nome: `[P] ${g.name}`
        }));
        return [...officialGroups, ...customGroups];
    }
    
    function getVillagesFromGroup(groupId) {
        if (typeof groupId === 'string' && groupId.startsWith('custom_')) {
            const customId = parseInt(groupId.replace('custom_', ''));
            const customGroups = getCustomGroups();
            const group = customGroups.find(g => g.id === customId);
            return group ? group.coords.map(coord => ({ id: null, coords: coord })) : [];
        } else {
            const cache = getPremiumGroupsCache();
            const groupData = cache[groupId];
            if (groupData && (Date.now() - groupData.timestamp < CACHE_DURATION_MS)) {
                return groupData.villages;
            }
            return [];
        }
    }

    // --- INICIALIZAÇÃO E EXPOSIÇÃO DO MÓDULO ---
    addModalStyles();
    
    window.kitsuneModalManager = {
        modal: manageCustomGroupsModal(),
        getCombinedGroups: getCombinedGroups,
        getVillagesFromGroup: getVillagesFromGroup,
        syncPremiumGroups: syncPremiumGroups
    };

})();
