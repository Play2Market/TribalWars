// ==UserScript==
// @name         Modal | Painel
// @namespace    https://tribalwars.com.br/
// @version      1.0
// @description  Cria o painel em um modal para ser integrado ao AutoFarm
// @author       Triky, GPT & Cia
// @include      http*://*.tribalwars.*/game.php?*&screen=storage*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const painelURL = "https://play2market.github.io/Amaterasu/painel.html";

  // Função global para abrir o modal
  window.openModal = function () {
    if (document.getElementById('custom_modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'custom_modal';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: 0, left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
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
    closeBtn.addEventListener('click', () => closeModal());

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
      if (e.target === overlay) closeModal();
    });

    // Animação de transição
    setTimeout(() => {
      overlay.style.opacity = '1';
    }, 10);
  };

  // Função global para fechar o modal
  window.closeModal = function () {
    const modal = document.getElementById('custom_modal');
    if (modal) {
      modal.style.opacity = '0';
      modal.addEventListener('transitionend', () => {
        modal.style.display = 'none';
      }, { once: true });
    }
  };
})();
