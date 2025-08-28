// ==UserScript==
// @name         Kitsune - Módulo de Grupos Personalizados
// @namespace    https://github.com/Play2Market/TribalWars
// @version      2.2-Integrated-Village-Resolution
// @description  Módulo para gerenciar grupos personalizados, agora integrado com o Coletor de Aldeias.
// @author       Triky, Gemini & Cia
// ==/UserScript==

(function () {
    'use strict';

    const CUSTOM_GROUPS_KEY = `kitsune_groups_${game_data.world}`;
    const PREMIUM_CACHE_KEY = `kitsune_premium_groups_cache_${game_data.world}`;
    const CACHE_DURATION_MS = 60 * 60 * 1000;

    function addModalStyles() {
        GM_addStyle(`
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

    function getCustomGroups() { return JSON.parse(localStorage.getItem(CUSTOM_GROUPS_KEY) || '[]'); }
    function saveCustomGroups(groups) { localStorage.setItem(CUSTOM_GROUPS_KEY, JSON.stringify(groups)); }

    // --- LÓGICA DO MODAL (Não precisa de alterações) ---
    function manageCustomGroupsModal() {
        // ... (código do modal inalterado) ...
        const MODAL_ID = 'kitsune-custom-groups-modal';
        const MAX_GROUPS = 3;
        let modal;
        let currentGroups = [];
        let editingGroupId = null;
        let confirmingDeleteId = null;
        function createModal(){if(document.getElementById(MODAL_ID)){modal=document.getElementById(MODAL_ID);return}const e=document.createElement("div");e.id=MODAL_ID;e.className="kitsune-modal-overlay";e.innerHTML=`
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
                </div>`;document.body.appendChild(e);modal=e;bindUIEvents()}function renderGroupsList(){const e=modal.querySelector("#kitsune-custom-groups-list"),t=modal.querySelector("#kitsune-btn-new-group");e.innerHTML="";if(currentGroups.length===0){e.innerHTML='<p class="kitsune-no-groups-message">Nenhum grupo personalizado criado.</p>'}else{currentGroups.forEach(t=>{const o=document.createElement("div");o.className="kitsune-custom-group-item";o.dataset.id=t.id;let n;if(confirmingDeleteId===t.id){n=`
                            <span>Tem certeza?</span>
                            <button class="kitsune-button kitsune-button-small kitsune-button-secondary action-confirm-no">Não</button>
                            <button class="kitsune-button kitsune-button-small kitsune-button-success action-confirm-yes">Sim</button>
                        `}else{n=`
                            <button class="kitsune-button kitsune-button-small kitsune-button-secondary action-edit">Editar</button>
                            <button class="kitsune-button kitsune-button-small kitsune-button-danger action-delete">Excluir</button>
                        `}o.innerHTML=`
                        <span>${t.name}</span>
                        <div class="kitsune-group-actions">${n}</div>
                    `;e.appendChild(o)})}t.disabled=currentGroups.length>=MAX_GROUPS}function bindUIEvents(){const e=modal.querySelector("#kitsune-groups-list-view"),t=modal.querySelector("#kitsune-groups-form-view"),o=modal.querySelector("#kitsune-form-title"),n=modal.querySelector("#kitsune-group-name"),i=modal.querySelector("#kitsune-group-coords");modal.querySelector("#kitsune-btn-new-group").addEventListener("click",()=>{editingGroupId=null;confirmingDeleteId=null;o.textContent="Criar Novo Grupo";n.value="";i.value="";e.style.display="none";t.style.display="block"});modal.querySelector("#kitsune-btn-cancel-edit").addEventListener("click",()=>{t.style.display="none";e.style.display="block"});modal.querySelector("#kitsune-btn-save-group").addEventListener("click",()=>{const o=n.value.trim(),l=i.value.trim().split("\n").filter(e=>e.match(/\d+\|\d+/));if(!o){alert("O nome do grupo não pode estar vazio.");return}if(editingGroupId){const e=currentGroups.find(e=>e.id===editingGroupId);if(e){e.name=o;e.coords=l}}else{currentGroups.push({id:Date.now(),name:o,coords:l})}saveCustomGroups(currentGroups);renderGroupsList();t.style.display="none";e.style.display="block"});modal.querySelector("#kitsune-custom-groups-list").addEventListener("click",e=>{const t=e.target,l=t.closest(".kitsune-custom-group-item");if(!l)return;const r=parseInt(l.dataset.id);if(t.classList.contains("action-edit")){confirmingDeleteId=null;const e=currentGroups.find(e=>e.id===r);if(e){editingGroupId=r;o.textContent=`Editar Grupo "${e.name}"`;n.value=e.name;i.value=e.coords.join("\n");listView.style.display="none";formView.style.display="block"}}else if(t.classList.contains("action-delete")){confirmingDeleteId=r;renderGroupsList()}else if(t.classList.contains("action-confirm-yes")){currentGroups=currentGroups.filter(e=>e.id!==r);saveCustomGroups(currentGroups);confirmingDeleteId=null;renderGroupsList()}else if(t.classList.contains("action-confirm-no")){confirmingDeleteId=null;renderGroupsList()}});modal.querySelector(".kitsune-modal-close").addEventListener("click",hide);modal.addEventListener("click",e=>{if(e.target===modal)hide()})}function show(){createModal();currentGroups=getCustomGroups();confirmingDeleteId=null;renderGroupsList();modal.querySelector("#kitsune-groups-form-view").style.display="none";modal.querySelector("#kitsune-groups-list-view").style.display="block";modal.classList.add("show")}function hide(){if(modal)modal.classList.remove("show")}return{open:show}
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

    async function getCombinedGroups() {
        const officialGroups = await getOfficialGroups();
        const customGroups = getCustomGroups().map(g => ({
            id: `custom_${g.id}`,
            nome: `[P] ${g.name}`
        }));
        return [...officialGroups, ...customGroups];
    }

    // --- FUNÇÃO CORRIGIDA ---
    function getVillagesFromGroup(groupId) {
        if (typeof groupId === 'string' && groupId.startsWith('custom_')) {
            const customId = parseInt(groupId.replace('custom_', ''));
            const customGroups = getCustomGroups();
            const group = customGroups.find(g => g.id === customId);
            
            if (!group || !window.KitsuneVillageManager) {
                return [];
            }

            // Pega o mapa completo de aldeias do coletor: { id: {name, coords} }
            const villageMap = window.KitsuneVillageManager.getMap();
            // Pega as coordenadas alvo do grupo personalizado
            const targetCoords = new Set(group.coords);
            
            const matchingVillages = [];
            // Itera sobre o mapa de aldeias para encontrar correspondências
            for (const villageId in villageMap) {
                const village = villageMap[villageId];
                if (targetCoords.has(village.coords)) {
                    matchingVillages.push({
                        id: villageId,
                        name: village.name,
                        coords: village.coords
                    });
                }
            }
            return matchingVillages;

        } else {
            // Lógica para grupos premium (inalterada, presume que funciona se o cache existir)
            const cache = JSON.parse(localStorage.getItem(PREMIUM_CACHE_KEY) || '{}');
            const groupData = cache[groupId];
            if (groupData && (Date.now() - groupData.timestamp < CACHE_DURATION_MS)) {
                return groupData.villages;
            }
            console.warn(`Kitsune Grupos: Dados para o grupo premium ${groupId} estão desatualizados ou não existem. Sincronize os grupos.`);
            return [];
        }
    }


    addModalStyles();

    window.kitsuneModalManager = {
        modal: manageCustomGroupsModal(),
        getCombinedGroups: getCombinedGroups,
        getVillagesFromGroup: getVillagesFromGroup,
        // A função de sincronização de grupos premium não foi incluída pois não foi fornecida,
        // mas a estrutura para usá-la permanece.
    };
})();
