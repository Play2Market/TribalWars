// ==UserScript==
// @name         AutoFarm | Funcional (SIMPLES)
// @namespace    https://www.youtube.com/c/TW100TRIBALWARS
// @version      6.3
// @description  AutoFarm com modo alternável A/C, console visual e filtro de muralha. Sem reload após cada ataque.
// @include      http*://*.tribalwars.*/game.php?*&screen=am_farm*
// @author       Tiago, GPT, Tw100
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Configurações
  const tempoCliqueMin = 1000;
  const tempoCliqueMax = 2000;
  const atualizarMin = 5 * 60000;
  const atualizarMax = 12 * 60000;
  const maxMuralha = 0;

  // Inicializa modoFarm com valor salvo ou padrão
  let modoFarm = localStorage.getItem('modoFarm') || 'a';

  createConsoleModal();
  log(`Iniciando AutoFarm | Modo atual: ${modoFarm.toUpperCase()}`);

  executarAtaques();

  async function executarAtaques() {
    let ataquesEnviados = 0;

    const menu = $(`#am_widget_Farm a.farm_icon_${modoFarm}`).toArray();

    for (let i = 0; i < menu.length; i++) {
      const tr = $(menu[i]).closest('tr');

      if (tr.find('img.tooltip').length) {
        log(`Pulando aldeia #${i + 1} - Ataque ativo`);
        continue;
      }

      const nivelMuralha = getNivelMuralha(tr);
      if (nivelMuralha > maxMuralha) {
        log(`Pulando aldeia #${i + 1} - Muralha nível ${nivelMuralha} > ${maxMuralha}`);
        continue;
      }

      const botaoAtaque = tr.find(`a.farm_icon_${modoFarm}`);
      if (botaoAtaque.hasClass('farm_icon_disabled')) {
        log(`Pulando aldeia #${i + 1} - Botão de ataque desabilitado`);
        continue;
      }

      if (!temTropas()) {
        log('Sem tropas disponíveis. Finalizando ciclo.');
        break;
      }

      const delay = rand(tempoCliqueMin, tempoCliqueMax);
      log(`Enviando ataque da aldeia #${ataquesEnviados + 1} em ${delay}ms`);
      await sleep(delay);

      botaoAtaque.trigger('mouseover').click();
      ataquesEnviados++;
    }

    if (ataquesEnviados > 0) {
      const delayReload = rand(atualizarMin, atualizarMax);
      log(`Ataques enviados: ${ataquesEnviados}. Atualizando em ~${Math.round(delayReload / 60000)} min.`);
      await sleep(delayReload);
      location.reload();
    } else {
      log('Nenhum ataque enviado. Recarregando em 5 minutos.');
      await sleep(5 * 60000);
      location.reload();
    }
  }

  function getNivelMuralha(tr) {
    const tdMuralha = tr.find('td:nth-child(7)');
    let nivel = parseInt(tdMuralha.text().trim());
    return isNaN(nivel) ? 0 : nivel;
  }

  function temTropas() {
    let tem = false;
    $('#units_home td[data-unit-count]').each(function () {
      if (parseInt($(this).attr('data-unit-count')) > 0) {
        tem = true;
        return false;
      }
    });
    return tem;
  }

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function createConsoleModal() {
    const newQuest = document.querySelector('#new_quest');
    if (!newQuest) return;

    const icon = document.createElement('div');
    icon.id = 'autofarm_console_icon';
    icon.title = 'Abrir Console AutoFarm';
    icon.style.cssText = `
      font-size: 9pt;
      border-spacing: 0;
      width: 25px;
      height: 25px;
      border: 1px solid #603000;
      background-color: #E9D0A9;
      margin: 10px 10px 0 10px;
      background-position: center;
      background-repeat: no-repeat;
      cursor: pointer;
      position: relative;
      text-align: center;
      box-shadow: rgba(60, 30, 0, 0.7) 2px 2px 2px;
      border-radius: 3px;
      background-image: url('https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif');
    `;
    newQuest.parentNode.insertBefore(icon, newQuest.nextSibling);

    const modal = document.createElement('div');
    modal.id = 'autofarm_console_modal';
    modal.style.cssText = `
      display: none;
      position: fixed;
      top: 50%;
      left: 50%;
      width: 450px;
      max-height: 300px;
      transform: translate(-50%, -50%);
      background: #2e1f00;
      border: 2px solid #603000;
      border-radius: 6px;
      box-shadow: 0 0 10px #603000;
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      overflow-y: auto;
      z-index: 999999;
      padding: 10px;
    `;
    document.body.appendChild(modal);

    const btnClose = document.createElement('button');
    btnClose.textContent = 'Fechar';
    btnClose.style.cssText = `
      position: absolute;
      top: 6px;
      right: 6px;
      background: #603000;
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 11px;
    `;
    btnClose.onclick = () => { modal.style.display = 'none'; };
    modal.appendChild(btnClose);

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = `Trocar para FARM ${modoFarm === 'a' ? 'C' : 'A'}`;
    toggleBtn.style.cssText = `
      margin-top: 5px;
      background: #785000;
      border: none;
      color: #fff;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
    `;
    toggleBtn.onclick = () => {
      modoFarm = modoFarm === 'a' ? 'c' : 'a';
      localStorage.setItem('modoFarm', modoFarm);
      toggleBtn.textContent = `Trocar para FARM ${modoFarm === 'a' ? 'C' : 'A'}`;
      log(`Modo FARM alterado para: ${modoFarm.toUpperCase()}. Recarregue a página para aplicar.`);
    };
    modal.appendChild(toggleBtn);

    const logs = document.createElement('div');
    logs.id = 'autofarm_console_logs';
    logs.style.cssText = `
      margin-top: 10px;
      max-height: 230px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
    `;
    modal.appendChild(logs);

    icon.onclick = () => {
      modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    };

    window.log = function (msg) {
      const time = new Date().toLocaleTimeString();
      const entry = `[${time}] ${msg}\n`;
      logs.textContent += entry;
      logs.scrollTop = logs.scrollHeight;
      console.log(entry.trim());
    };
  }

})();
