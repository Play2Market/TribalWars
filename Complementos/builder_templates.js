// ==UserScript==
// @name         Projeto Kitsune | Módulo - Modelos de Construtor
// @version      1.0
// @description  Módulo para gerenciar modelos de construção para o Projeto Kitsune.
// @author       Triky, GPT & Cia
// ==/UserScript==

(function() {
    'use strict';

    // =========================================================================================
    // --- CONFIGURAÇÕES E CONSTANTES ---
    // =========================================================================================
    const STORAGE_KEY = 'kitsune_builder_templates';
    const BUILDINGS = {
        main: 'Edifício Principal',
        barracks: 'Quartel',
        stable: 'Estábulo',
        garage: 'Oficina',
        watchtower: 'Torre de vigia',
        smith: 'Ferreiro',
        market: 'Mercado',
        wood: 'Bosque',
        stone: 'Poço de argila',
        iron: 'Mina de ferro',
        farm: 'Fazenda',
        storage: 'Armazém',
        wall: 'Muralha'
    };

    // =========================================================================================
    // --- LÓGICA PRINCIPAL DO MÓDULO ---
    // =========================================================================================
    const KitsuneBuilderModal = {
        modalElement: null,
        templates: [],
        currentTemplateId: null,

        // --- MÉTODOS DE INICIALIZAÇÃO ---
        init() {
            this.injectCSS();
            this.createModalHTML();
            this.attachEventListeners();
            this.loadTemplates();
            console.log("Kitsune: Módulo de Modelos de Construtor inicializado.");
        },

        open(templateId = null) {
            this.currentTemplateId = templateId;
            this.loadTemplates();
            this.render();
            this.modalElement.style.display = 'flex';
        },

        close() {
            this.modalElement.style.display = 'none';
        },

        // --- GERENCIAMENTO DE DADOS (localStorage) ---
        loadTemplates() {
            const data = localStorage.getItem(STORAGE_KEY);
            this.templates = data ? JSON.parse(data) : [];
        },

        saveTemplates() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.templates));
            document.dispatchEvent(new CustomEvent('kitsuneTemplatesUpdated'));
        },

        // --- RENDERIZAÇÃO E UI ---
        render() {
            this.renderTemplateList();
            this.renderEditor();
        },

        renderTemplateList() {
            const listContainer = this.modalElement.querySelector('.kbm-list');
            listContainer.innerHTML = '';
            this.templates.forEach(template => {
                const item = document.createElement('div');
                item.className = 'kbm-list-item';
                item.dataset.id = template.id;
                if (template.id === this.currentTemplateId) {
                    item.classList.add('active');
                }
                item.innerHTML = `
                    <span>${template.name}</span>
                    <div class="kbm-item-actions">
                        <button class="kbm-delete-btn" title="Excluir Modelo">&times;</button>
                    </div>
                `;
                listContainer.appendChild(item);
            });
        },

        renderEditor() {
            const editorContainer = this.modalElement.querySelector('.kbm-editor');
            const template = this.templates.find(t => t.id === this.currentTemplateId);

            const nameInput = editorContainer.querySelector('#kbm-template-name');
            const queueContainer = editorContainer.querySelector('.kbm-queue-list');

            if (template) {
                nameInput.value = template.name;
                queueContainer.innerHTML = template.queue.map((item, index) => this.createQueueRowHTML(item.building, item.level, index)).join('');
            } else {
                nameInput.value = '';
                queueContainer.innerHTML = '';
            }
        },

        createQueueRowHTML(building = 'main', level = 1, index) {
             const options = Object.keys(BUILDINGS).map(key =>
                `<option value="${key}" ${key === building ? 'selected' : ''}>${BUILDINGS[key]}</option>`
            ).join('');

            return `
                <div class="kbm-queue-item" data-index="${index}">
                    <select class="kbm-building-select">${options}</select>
                    <input class="kbm-level-input" type="number" min="1" max="30" value="${level}">
                    <div class="kbm-queue-actions">
                        <button class="kbm-move-up-btn" ${index === 0 ? 'disabled' : ''}>▲</button>
                        <button class="kbm-move-down-btn">▼</button>
                        <button class="kbm-remove-row-btn">&times;</button>
                    </div>
                </div>
            `;
        },

        // --- MANIPULADORES DE EVENTOS ---
        handleSave() {
            const name = this.modalElement.querySelector('#kbm-template-name').value.trim();
            if (!name) {
                alert('Por favor, dê um nome ao modelo.');
                return;
            }

            const queue = [];
            this.modalElement.querySelectorAll('.kbm-queue-item').forEach(row => {
                const building = row.querySelector('.kbm-building-select').value;
                const level = parseInt(row.querySelector('.kbm-level-input').value, 10);
                queue.push({ building, level });
            });

            if (this.currentTemplateId) {
                // Editando um existente
                const index = this.templates.findIndex(t => t.id === this.currentTemplateId);
                this.templates[index].name = name;
                this.templates[index].queue = queue;
            } else {
                // Criando um novo
                this.templates.push({
                    id: Date.now(),
                    name: name,
                    queue: queue
                });
            }

            this.saveTemplates();
            this.close();
        },

        attachEventListeners() {
            this.modalElement.addEventListener('click', e => {
                // Botões principais
                if (e.target.closest('.kbm-save-btn')) this.handleSave();
                if (e.target.closest('.kbm-cancel-btn')) this.close();
                if (e.target.closest('.kbm-new-btn')) {
                    this.currentTemplateId = null;
                    this.render();
                }

                // Lista de modelos
                const listItem = e.target.closest('.kbm-list-item');
                if (listItem) {
                    const templateId = parseInt(listItem.dataset.id, 10);
                    if (e.target.classList.contains('kbm-delete-btn')) {
                        if (confirm(`Tem certeza que deseja excluir o modelo "${listItem.querySelector('span').textContent}"?`)) {
                            this.templates = this.templates.filter(t => t.id !== templateId);
                            this.saveTemplates();
                            if (this.currentTemplateId === templateId) this.currentTemplateId = null;
                            this.render();
                        }
                    } else {
                        this.open(templateId);
                    }
                }

                // Editor da fila
                if (e.target.closest('.kbm-add-row-btn')) {
                    const queueContainer = this.modalElement.querySelector('.kbm-queue-list');
                    const newIndex = queueContainer.children.length;
                    queueContainer.insertAdjacentHTML('beforeend', this.createQueueRowHTML('main', 1, newIndex));
                }
                const queueItem = e.target.closest('.kbm-queue-item');
                if (queueItem) {
                    if (e.target.classList.contains('kbm-remove-row-btn')) {
                        queueItem.remove();
                    }
                    // Lógica para mover para cima/baixo pode ser adicionada aqui se necessário
                }
            });
        },


        // --- HTML & CSS ---
        createModalHTML() {
            const modal = document.createElement('div');
            modal.id = 'kitsune-builder-modal';
            modal.className = 'kbm-overlay';
            modal.style.display = 'none';
            modal.innerHTML = `
                <div class="kbm-container">
                    <div class="kbm-header">
                        <h2>Modelos de Construção</h2>
                        <button class="kbm-cancel-btn">&times;</button>
                    </div>
                    <div class="kbm-body">
                        <div class="kbm-sidebar">
                            <button class="kbm-new-btn">Criar Novo Modelo</button>
                            <div class="kbm-list"></div>
                        </div>
                        <div class="kbm-editor">
                            <div class="kbm-form-group">
                                <label for="kbm-template-name">Nome do Modelo</label>
                                <input type="text" id="kbm-template-name" placeholder="Ex: Aldeia de Defesa">
                            </div>
                            <hr>
                            <div class="kbm-queue-header">
                                <h3>Fila de Construção</h3>
                                <button class="kbm-add-row-btn">+ Adicionar Edifício</button>
                            </div>
                            <div class="kbm-queue-list"></div>
                        </div>
                    </div>
                    <div class="kbm-footer">
                        <button class="kbm-btn kbm-save-btn">Salvar Modelo</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            this.modalElement = modal;
        },

        injectCSS() {
            const css = `
                :root { --kbm-bg: #282c34; --kbm-bg-light: #3a404a; --kbm-bg-darker: #21252b; --kbm-border: #4a515e; --kbm-text: #dcdfe4; --kbm-accent: #e06c75; --kbm-accent-alt: #98c379; }
                .kbm-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); z-index: 20000; display: flex; align-items: center; justify-content: center; font-family: Verdana, sans-serif; }
                .kbm-container { width: 800px; max-width: 90vw; background-color: var(--kbm-bg); border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.5); display: flex; flex-direction: column; }
                .kbm-header { padding: 15px 20px; border-bottom: 1px solid var(--kbm-border); display: flex; justify-content: space-between; align-items: center; }
                .kbm-header h2 { margin: 0; color: var(--kbm-accent); font-size: 1.4em; }
                .kbm-body { display: flex; height: 50vh; }
                .kbm-sidebar { width: 200px; border-right: 1px solid var(--kbm-border); padding: 10px; display: flex; flex-direction: column; }
                .kbm-editor { flex-grow: 1; padding: 20px; display: flex; flex-direction: column; overflow-y: auto; }
                .kbm-footer { padding: 15px 20px; border-top: 1px solid var(--kbm-border); text-align: right; }
                .kbm-btn, .kbm-new-btn { background-color: var(--kbm-accent); border: none; color: white; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: background-color 0.2s; }
                .kbm-btn:hover, .kbm-new-btn:hover { background-color: #c05c65; }
                .kbm-new-btn { width: 100%; margin-bottom: 15px; background-color: var(--kbm-accent-alt); }
                .kbm-new-btn:hover { background-color: #82a864; }
                .kbm-cancel-btn { background: none; border: none; font-size: 2em; color: var(--kbm-text); cursor: pointer; line-height: 1; padding: 0 5px; }
                .kbm-list { overflow-y: auto; }
                .kbm-list-item { padding: 10px; margin-bottom: 5px; border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
                .kbm-list-item:hover { background-color: var(--kbm-bg-light); }
                .kbm-list-item.active { background-color: var(--kbm-accent); color: white; }
                .kbm-delete-btn { background: none; border: none; color: inherit; font-size: 1.2em; cursor: pointer; opacity: 0.5; }
                .kbm-delete-btn:hover { opacity: 1; }
                .kbm-form-group { margin-bottom: 15px; }
                .kbm-form-group label { display: block; margin-bottom: 5px; font-weight: bold; color: var(--kbm-text); }
                .kbm-form-group input { width: 100%; padding: 8px; background-color: var(--kbm-bg-darker); border: 1px solid var(--kbm-border); color: var(--kbm-text); border-radius: 4px; box-sizing: border-box; }
                .kbm-queue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                .kbm-queue-header h3 { margin: 0; color: var(--kbm-accent-alt); }
                .kbm-add-row-btn { background: none; border: 1px solid var(--kbm-accent-alt); color: var(--kbm-accent-alt); padding: 5px 10px; border-radius: 4px; cursor: pointer; }
                .kbm-queue-item { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 4px; background-color: var(--kbm-bg-light); margin-bottom: 8px; }
                .kbm-building-select { flex-grow: 1; }
                .kbm-level-input { width: 60px; text-align: center; }
                .kbm-queue-item select, .kbm-queue-item input { background-color: var(--kbm-bg-darker); color: var(--kbm-text); border: 1px solid var(--kbm-border); border-radius: 4px; padding: 5px; }
                .kbm-remove-row-btn { background: none; border: none; color: var(--kbm-accent); font-size: 1.4em; cursor: pointer; }
            `;
            const style = document.createElement('style');
            style.textContent = css;
            document.head.appendChild(style);
        }
    };

    window.KitsuneBuilderModal = KitsuneBuilderModal;
})();