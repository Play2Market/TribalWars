// ==UserScript==
// @name         Projeto Kitsune | Módulo de Modelos de Tropas
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.3
// @description  Módulo para gerenciar modelos de tropas para o Assistente Kitsune, com UI aprimorada.
// @author       Triky, GPT & Cia
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================================================
    // --- CONFIGURAÇÕES E CONSTANTES ---
    // =========================================================================================
    const STORAGE_KEY = 'kitsune_troop_templates';
    const MODAL_ID = 'kitsune-template-modal';
    const unitConfig = [
        { id: 'spear', name: 'Lanceiro', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_spear.webp' },
        { id: 'sword', name: 'Espadachim', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_sword.webp' },
        { id: 'axe', name: 'Bárbaro', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_axe.webp' },
        { id: 'archer', name: 'Arqueiro', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_archer.webp' },
        { id: 'spy', name: 'Explorador', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_spy.webp' },
        { id: 'light', name: 'Cavalaria Leve', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_light.webp' },
        { id: 'marcher', name: 'Arq. a Cavalo', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_marcher.webp' },
        { id: 'heavy', name: 'Cavalaria Pesada', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/unit_heavy.webp' },
        { id: 'ram', name: 'Aríete', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/recruit/grey/ram.webp' },
        { id: 'catapult', name: 'Catapulta', icon: 'https://dsbr.innogamescdn.com/asset/636f8dd3/graphic/unit/recruit/grey/catapult.webp' }
    ];

    // --- LISTA DE MODELOS PADRÃO ---
    const defaultTemplates = [
        { name: 'Ataque: Padrão', troops: { axe: 7000, light: 3000, ram: 300 } },
        { name: 'Ataque: Aríetes Pesado', troops: { axe: 6650, light: 2900, ram: 450 } },
        { name: 'Defesa: Padrão', troops: { spear: 10250, sword: 10250 } },
        { name: 'Defesa: Com CP', troops: { spear: 7250, sword: 7250, heavy: 1000 } },
        { name: 'Defesa: Arqueiros', troops: { spear: 6000, sword: 6000, archer: 6000, heavy: 415 } },
    ];


    // =========================================================================================
    // --- ESTILOS (CSS) ---
    // =========================================================================================
    function getModalStyles() {
        return `
            #${MODAL_ID} {
                display: none; position: fixed; z-index: 15000; left: 0; top: 0; width: 100%; height: 100%;
                overflow: auto; background-color: rgba(0,0,0,0.6); justify-content: center; align-items: center;
                font-family: Verdana, sans-serif; font-size: 12px;
            }
            .ktm-modal-content {
                background-color: var(--kitsune-bg, #282c34); color: var(--kitsune-text, #dcdfe4);
                width: 90%; max-width: 750px; border-radius: 10px; border: 1px solid var(--kitsune-border, #4a515e);
                box-shadow: 0 5px 15px rgba(0,0,0,0.5); display: flex; flex-direction: column; max-height: 80vh;
            }
            .ktm-modal-header {
                padding: 12px 20px; background-color: var(--kitsune-bg-darker, #21252b);
                border-bottom: 1px solid var(--kitsune-border, #4a515e); border-top-left-radius: 10px; border-top-right-radius: 10px;
                display: flex; justify-content: center; align-items: center; position: relative; /* <-- ALTERADO */
            }
            .ktm-modal-header h2 { margin: 0; color: var(--kitsune-accent, #e06c75); font-size: 1.4em; }
            .ktm-close-button {
                color: var(--kitsune-text-dark, #8a919e); font-size: 28px; font-weight: bold; cursor: pointer;
                position: absolute; right: 15px; top: 50%; transform: translateY(-50%); /* <-- ALTERADO */
            }
            .ktm-close-button:hover, .ktm-close-button:focus { color: #fff; }
            .ktm-modal-body { display: flex; padding: 20px; overflow: hidden; gap: 20px; }
            .ktm-template-list, .ktm-template-form { flex: 1; display: flex; flex-direction: column; }
            .ktm-template-list { min-width: 200px; }
            .ktm-scroll-container { overflow-y: auto; padding-right: 10px; border: 1px solid var(--kitsune-border, #4a515e); border-radius: 5px; background-color: var(--kitsune-bg-darker, #21252b); padding: 10px; flex-grow: 1;}
            .ktm-list-item { display: block; padding: 8px; border-radius: 4px; margin-bottom: 5px; background-color: var(--kitsune-bg-light, #3a404a); }
            .ktm-list-item-header { display: flex; justify-content: space-between; align-items: center; }
            .ktm-list-item-header span { font-weight: bold; }
            .ktm-troop-preview { display: flex; gap: 12px; margin-top: 8px; padding-top: 6px; border-top: 1px solid var(--kitsune-bg, #282c34); }
            .ktm-troop-item { display: flex; align-items: center; gap: 4px; font-size: 0.9em; color: var(--kitsune-text-dark, #8a919e); }
            .ktm-troop-item img { width: 16px; height: 16px; }
            .ktm-button-group button { background: none; border: 1px solid var(--kitsune-border, #4a515e); color: var(--kitsune-text, #dcdfe4); cursor: pointer; padding: 4px 8px; border-radius: 3px; margin-left: 5px; }
            .ktm-button-group button:hover { background-color: var(--kitsune-border, #4a515e); }
            .ktm-form-title { font-size: 1.2em; color: var(--kitsune-accent-alt, #98c379); margin-top: 0; margin-bottom: 15px; text-align: center; }
            .ktm-form-grid {
                display: grid; grid-template-columns: repeat(2, 1fr);
                gap: 15px 20px; /* <-- ALTERADO (aumentado espaço vertical) */
                margin-top: 20px; /* <-- NOVO (adicionado espaço acima da grade) */
            }
            .ktm-form-group { display: flex; flex-direction: column; }
            .ktm-form-group.full-width { grid-column: 1 / -1; }
            .ktm-form-group label { margin-bottom: 5px; font-weight: bold; display: flex; align-items: center; gap: 5px;}
            .ktm-form-group img { width: 18px; height: 18px; }
            .ktm-form-group input { width: 100%; box-sizing: border-box; background-color: var(--kitsune-bg-darker, #21252b); color: var(--kitsune-text, #dcdfe4); border: 1px solid var(--kitsune-border, #4a515e); border-radius: 4px; padding: 6px; }
            .ktm-modal-footer { padding: 10px 20px; border-top: 1px solid var(--kitsune-border, #4a515e); text-align: right; background-color: var(--kitsune-bg-darker, #21252b); border-bottom-left-radius: 10px; border-bottom-right-radius: 10px; }
            .ktm-button { padding: 8px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; border: 1px solid; }
            .ktm-button-primary { background-color: var(--kitsune-accent, #e06c75); color: #fff; border-color: var(--kitsune-accent, #e06c75); }
            .ktm-button-primary:hover { background-color: #c05c65; }
            .ktm-button-secondary { background-color: transparent; color: var(--kitsune-accent-alt, #98c379); border-color: var(--kitsune-accent-alt, #98c379); margin-right: 10px; }
            .ktm-button-secondary:hover { background-color: rgba(152, 195, 121, 0.2); }
        `;
    }

    // =========================================================================================
    // --- LÓGICA DO MÓDULO (Inalterada) ---
    // =========================================================================================
    const manager = {
        isEditing: null,

        // --- Funções de Armazenamento ---
        loadTemplates: function() {
            try {
                const templates = localStorage.getItem(STORAGE_KEY);
                return templates ? JSON.parse(templates) : [];
            } catch (e) {
                console.error("Kitsune Error: Failed to load templates.", e);
                return [];
            }
        },

        saveTemplates: function(templates) {
            try {
                const normalizedTemplates = templates.map(template => {
                    const normalizedTroops = {};
                    unitConfig.forEach(unit => {
                        normalizedTroops[unit.id] = template.troops[unit.id] || 0;
                    });
                    return { ...template, troops: normalizedTroops };
                });
                localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedTemplates));
            } catch (e) {
                console.error("Kitsune Error: Failed to save templates.", e);
            }
        },

        // --- Renderização e UI ---
        renderList: function() {
            const templates = this.loadTemplates();
            const listContainer = document.querySelector(`#${MODAL_ID} .ktm-scroll-container`);
            listContainer.innerHTML = '';

            templates.forEach(template => {
                const item = document.createElement('div');
                item.className = 'ktm-list-item';

                const topTroopsHtml = Object.entries(template.troops)
                    .filter(([, count]) => count > 0)
                    .sort(([, countA], [, countB]) => countB - countA)
                    .slice(0, 4)
                    .map(([unitId, count]) => {
                        const unit = unitConfig.find(u => u.id === unitId);
                        if (!unit) return '';
                        return `<div class="ktm-troop-item" title="${count} ${unit.name}">
                                    <img src="${unit.icon}">
                                    <span>${count > 1000 ? (count/1000).toFixed(1) + 'k' : count}</span>
                                </div>`;
                    })
                    .join('');

                item.innerHTML = `
                    <div class="ktm-list-item-header">
                        <span>${template.name}</span>
                        <div class="ktm-button-group">
                            <button class="ktm-edit-btn" data-name="${template.name}">Editar</button>
                            <button class="ktm-delete-btn" data-name="${template.name}">Excluir</button>
                        </div>
                    </div>
                    ${topTroopsHtml ? `<div class="ktm-troop-preview">${topTroopsHtml}</div>` : ''}
                `;
                listContainer.appendChild(item);
            });
        },

        clearForm: function() {
            document.querySelector('#ktm-template-name').value = '';
            unitConfig.forEach(unit => {
                document.querySelector(`#ktm-unit-${unit.id}`).value = '0';
            });
            document.querySelector('#ktm-form-title').textContent = 'Criar Novo Modelo';
            this.isEditing = null;
        },

        populateForm: function(templateName) {
            const templates = this.loadTemplates();
            const template = templates.find(t => t.name === templateName);
            if (!template) return;

            document.querySelector('#ktm-form-title').textContent = `Editando: ${template.name}`;
            document.querySelector('#ktm-template-name').value = template.name;
            unitConfig.forEach(unit => {
                document.querySelector(`#ktm-unit-${unit.id}`).value = template.troops[unit.id] || '0';
            });
            this.isEditing = templateName;
        },

        // --- Manipuladores de Eventos ---
        handleSave: function() {
            const newName = document.querySelector('#ktm-template-name').value.trim();
            if (!newName) {
                alert('Kitsune: O nome do modelo não pode estar vazio.');
                return;
            }

            let templates = this.loadTemplates();

            if (this.isEditing && this.isEditing !== newName) { // Renaming
                if (templates.some(t => t.name === newName)) {
                    alert('Kitsune: Já existe um modelo com este nome.');
                    return;
                }
            } else if (!this.isEditing) { // Creating new
                 if (templates.some(t => t.name === newName)) {
                    alert('Kitsune: Já existe um modelo com este nome.');
                    return;
                }
            }

            const newTroops = {};
            unitConfig.forEach(unit => {
                const value = parseInt(document.querySelector(`#ktm-unit-${unit.id}`).value, 10) || 0;
                newTroops[unit.id] = value;
            });

            const newTemplate = { name: newName, troops: newTroops };

            if (this.isEditing) {
                templates = templates.map(t => t.name === this.isEditing ? newTemplate : t);
            } else {
                templates.push(newTemplate);
            }

            this.saveTemplates(templates);
            this.renderList();
            this.clearForm();
        },

        handleDelete: function(templateName) {
            if (!confirm(`Tem certeza que deseja excluir o modelo "${templateName}"?`)) return;

            let templates = this.loadTemplates();
            templates = templates.filter(t => t.name !== templateName);
            this.saveTemplates(templates);
            this.renderList();
            if (this.isEditing === templateName) {
                this.clearForm();
            }
        },

        // --- Inicialização ---
        init: function() {
            // Verifica se já existem modelos; se não, carrega os padrões.
            const existingTemplates = this.loadTemplates();
            if (existingTemplates.length === 0) {
                console.log('Kitsune: Nenhum modelo encontrado. Carregando modelos padrão.');
                this.saveTemplates(defaultTemplates);
            }

            // Injetar CSS
            const style = document.createElement('style');
            style.textContent = getModalStyles();
            document.head.appendChild(style);

            // Injetar HTML do Modal
            const modalContainer = document.createElement('div');
            modalContainer.id = MODAL_ID;
            modalContainer.innerHTML = this.getModalHtml();
            document.body.appendChild(modalContainer);

            // Adicionar Event Listeners
            modalContainer.addEventListener('click', (e) => {
                // Fechar modal
                if (e.target.id === MODAL_ID || e.target.classList.contains('ktm-close-button')) {
                    this.close();
                }
                // Botões de ação da lista
                if (e.target.classList.contains('ktm-edit-btn')) {
                    this.populateForm(e.target.dataset.name);
                }
                if (e.target.classList.contains('ktm-delete-btn')) {
                    this.handleDelete(e.target.dataset.name);
                }
            });

            document.querySelector('#ktm-save-btn').addEventListener('click', () => this.handleSave());
            document.querySelector('#ktm-new-btn').addEventListener('click', () => this.clearForm());
        },

        open: function() {
            this.renderList();
            document.getElementById(MODAL_ID).style.display = 'flex';
        },
        close: function() {
            this.clearForm();
            document.getElementById(MODAL_ID).style.display = 'none';
        },

        getModalHtml: function() {
            const unitInputs = unitConfig.map(unit => `
                <div class="ktm-form-group">
                    <label for="ktm-unit-${unit.id}"><img src="${unit.icon}" title="${unit.name}">${unit.name}</label>
                    <input type="number" id="ktm-unit-${unit.id}" min="0" value="0">
                </div>
            `).join('');

            return `
                <div class="ktm-modal-content">
                    <div class="ktm-modal-header">
                        <h2>Gerenciador de Modelos</h2>
                        <span class="ktm-close-button">&times;</span>
                    </div>
                    <div class="ktm-modal-body">
                        <div class="ktm-template-list">
                            <h3 class="ktm-form-title">Modelos Salvos</h3>
                            <div class="ktm-scroll-container"></div>
                        </div>
                        <div class="ktm-template-form">
                            <h3 id="ktm-form-title" class="ktm-form-title">Criar Novo Modelo</h3>
                            <div class="ktm-form-group full-width">
                                <label for="ktm-template-name">Nome do Modelo</label>
                                <input type="text" id="ktm-template-name" placeholder="Ex: Full Ataque CL">
                            </div>
                            <div class="ktm-form-grid">${unitInputs}</div>
                        </div>
                    </div>
                    <div class="ktm-modal-footer">
                         <button id="ktm-new-btn" class="ktm-button ktm-button-secondary">Criar Novo</button>
                         <button id="ktm-save-btn" class="ktm-button ktm-button-primary">Salvar</button>
                    </div>
                </div>
            `;
        }
    };

    // =========================================================================================
    // --- EXPOSIÇÃO DO MÓDULO E INICIALIZAÇÃO ---
    // =========================================================================================
    window.kitsuneTemplateManager = {
        modal: {
            open: () => manager.open()
        },
        getTemplates: () => manager.loadTemplates()
    };

    window.addEventListener('load', () => manager.init());

})();

