// ==UserScript==
// @name         Kitsune - Módulo de Grupos Personalizados
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.0
// @description  Módulo para gerenciar grupos personalizados no Assistente Kitsune.
// @author       Triky, GPT & Cia
// ==/UserScript==

(function () {
    'use strict';

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
        `);
    }

    // Função que gerencia todo o estado e comportamento do modal
    function manageCustomGroupsModal() {
        const MODAL_ID = 'kitsune-custom-groups-modal';

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
                            <div id="kitsune-custom-groups-list">
                                <div class="kitsune-custom-group-item">
                                    <span>Grupo de Ataque</span>
                                    <div class="kitsune-group-actions">
                                        <button class="kitsune-button kitsune-button-small kitsune-button-secondary">Editar</button>
                                        <button class="kitsune-button kitsune-button-small kitsune-button-danger">Excluir</button>
                                    </div>
                                </div>
                                <div class="kitsune-custom-group-item">
                                    <span>Grupo de Defesa</span>
                                    <div class="kitsune-group-actions">
                                        <button class="kitsune-button kitsune-button-small kitsune-button-secondary">Editar</button>
                                        <button class="kitsune-button kitsune-button-small kitsune-button-danger">Excluir</button>
                                    </div>
                                </div>
                            </div>
                            <button id="kitsune-btn-new-group" class="kitsune-button">Criar Novo Grupo</button>
                        </div>
                        <div id="kitsune-groups-form-view" style="display: none;">
                            <h4 id="kitsune-form-title">Criar Novo Grupo</h4>
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
                </div>
            `;
            document.body.appendChild(modalOverlay);

            // Lógica de UI do Modal
            const listView = modalOverlay.querySelector('#kitsune-groups-list-view');
            const formView = modalOverlay.querySelector('#kitsune-groups-form-view');
            const btnNewGroup = modalOverlay.querySelector('#kitsune-btn-new-group');
            const btnCancel = modalOverlay.querySelector('#kitsune-btn-cancel-edit');
            const formTitle = modalOverlay.querySelector('#kitsune-form-title');

            btnNewGroup.addEventListener('click', () => {
                formTitle.textContent = 'Criar Novo Grupo';
                listView.style.display = 'none';
                formView.style.display = 'block';
            });

            btnCancel.addEventListener('click', () => {
                listView.style.display = 'block';
                formView.style.display = 'none';
            });

            modalOverlay.querySelector('.kitsune-modal-close').addEventListener('click', hide);
            modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) hide(); });
        }

        function show() {
            createModal();
            document.getElementById(MODAL_ID).classList.add('show');
        }

        function hide() {
            const modal = document.getElementById(MODAL_ID);
            if (modal) modal.classList.remove('show');
        }

        return { open: show };
    }

    // Adiciona os estilos assim que o script é carregado
    addModalStyles();

    // "Exporta" o gerenciador do modal para o escopo global (window)
    // para que o script principal possa acessá-lo.
    window.kitsuneCustomGroupsModal = manageCustomGroupsModal();

})();