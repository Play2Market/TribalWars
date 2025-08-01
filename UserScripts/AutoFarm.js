// ==UserScript==
// @name         Amaterasu
// @namespace    https://tribalwars.com.br/
// @version      1.1
// @description  Cria botão que abre o painel modal com transição e salva estado.
// @author       Triky, GPT & Cia
// @include      http*://*.tribalwars.*/game.php?*&screen=storage*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const gifURL = "https://cdn.pixabay.com/animation/2023/01/19/18/24/18-24-20-426_512.gif";
  // Corrigido para refletir o caminho correto no GitHub Pages
  const painelURL = "https://play2market.github.io/Amaterasu/painel.html";
  const STORAGE_KEY = 'amaterasu_modal_aberto';

  function createButton() {
    if (document.getElementById('custom_chama_btn')) return;

    const newQuest = document.querySelector('#new_quest');
    if (!newQuest) return;

    const btn = document.createElement('img');
    btn.id = 'custom_chama_btn';
    btn.src = gifURL;
    btn.title = "Abrir painel";

    Object.assign(btn.style, {
      width: "80px",
      height: "80px",
      position: "absolute",
      cursor: "pointer",
      zIndex: "999999"
    });

    document.body.appendChild(btn);

    const updatePosition = () => {
      const rect = newQuest.getBoundingClientRect();
      const x = rect.left + window.scrollX + (rect.width / 2) - (btn.offsetWidth / 2);
      const y = rect.bottom + 5 + window.scrollY;
      btn.style.left = `${x}px`;
      btn.style.top = `${y}px`;
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    btn.addEventListener('click', () => toggleModal());
  }

  function createModal() {
    if (document.getElementById('custom_modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'custom_modal';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'none',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999998,
      opacity: 0,
      transition: 'opacity 0.3s ease',
      flexDirection: 'column',
    });

    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'relative',
      width: '95vw',
      maxWidth: '1100px',
      height: '90vh',
      maxHeight: '650px',
      borderRadius: '8px',
      backgroundColor: 'transparent',
      boxShadow: '0 0 15px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '8px',
      right: '8px',
      width: '30px',
      height: '30px',
      backgroundColor: 'rgba(0,0,0,0.6)',
      border: 'none',
      borderRadius: '15px',
      color: '#eee',
      fontSize: '20px',
      cursor: 'pointer',
      zIndex: 1000000,
      lineHeight: '30px',
      textAlign: 'center',
      padding: 0,
      userSelect: 'none',
      transition: 'background-color 0.3s ease',
    });
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.backgroundColor = 'rgba(0,0,0,0.8)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.backgroundColor = 'rgba(0,0,0,0.6)';
    });
    closeBtn.addEventListener('click', () => toggleModal(false));

    const iframe = document.createElement('iframe');
    iframe.id = 'custom_iframe';
    iframe.title = 'Painel do Assistente';
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
      borderRadius: '8px',
      backgroundColor: 'transparent',
      overflow: 'auto',
      display: 'block',
      flexGrow: 1,
    });

    iframe.src = painelURL;

    container.appendChild(closeBtn);
    container.appendChild(iframe);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) toggleModal(false);
    });
  }

  function toggleModal(forceShow) {
    const modal = document.getElementById('custom_modal');
    if (!modal) return;

    if (typeof forceShow === 'boolean') {
      if (forceShow) {
        modal.style.display = 'flex';
        void modal.offsetWidth; // força reflow para ativar transição
        modal.style.opacity = '1';
        localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        modal.style.opacity = '0';
        modal.addEventListener('transitionend', () => {
          modal.style.display = 'none';
        }, { once: true });
        localStorage.setItem(STORAGE_KEY, 'false');
      }
    } else {
      if (modal.style.display === 'flex') {
        toggleModal(false);
      } else {
        toggleModal(true);
      }
    }
  }

  function init() {
    createButton();
    createModal();

    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      toggleModal(true);
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 0);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
