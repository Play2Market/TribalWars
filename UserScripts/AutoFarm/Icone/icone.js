;(function(mod) {
  'use strict';

  // Ponto de inserção do ícone
  const anchor = document.querySelector('#new_quest');
  if (!anchor || typeof mod.createConsoleModal !== 'function') return;

  // Garante criação do modal antes de anexar o ícone
  mod.createConsoleModal();

  // Cria o ícone
  const icon = document.createElement('div');
  icon.id    = 'autoFarm_console_icon';
  icon.title = 'Abrir Console AutoFarm';
  Object.assign(icon.style, {
    width:        '25px',
    height:       '25px',
    margin:       '10px',
    background:   "#E9D0A9 url('https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif') center/cover no-repeat",
    border:       '1px solid #603000',
    borderRadius: '3px',
    boxShadow:    'rgba(60,30,0,0.7) 2px 2px 2px',
    cursor:       'pointer'
  });
  anchor.parentNode.insertBefore(icon, anchor.nextSibling);

  // Toggle de exibição do modal
  icon.addEventListener('click', () => {
    const modal = window._autoFarmConsoleModal;
    if (!modal) return;
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
  });

})(window.AutoFarmConsole);
