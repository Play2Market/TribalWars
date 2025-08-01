// ==UserScript==
// @name         AutoFarm Ícone
// @namespace    https://github.com/Play2Market/TribalWars
// @version      1.0
// @match        https://*.tribalwars.*/*screen=am_farm*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

;(function() {
  'use strict';

  // Aguarda até que o botão #new_quest exista
  function waitForElement(selector, cb, interval = 200, timeout = 10000) {
    const start = Date.now();
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        cb(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(timer);
        console.error('[AutoFarm Ícone] elemento não encontrado:', selector);
      }
    }, interval);
  }

  // Insere o ícone ao lado do #new_quest
  function initIcon(anchor) {
    const icon = document.createElement('div');
    icon.id    = 'autoFarm_icon_only';
    icon.title = 'AutoFarm Ícone';
    Object.assign(icon.style, {
      width:        '25px',
      height:       '25px',
      margin:       '10px',
      background:   "url('https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif') center/cover no-repeat #E9D0A9",
      border:       '1px solid #603000',
      borderRadius: '3px',
      boxShadow:    'rgba(60,30,0,0.7) 2px 2px 2px',
      cursor:       'pointer'
    });

    anchor.parentNode.insertBefore(icon, anchor.nextSibling);
  }

  // Inicializa quando #new_quest estiver disponível
  waitForElement('#new_quest', initIcon);
})();
