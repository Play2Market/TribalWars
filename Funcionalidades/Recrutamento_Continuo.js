// ==UserScript==
// @name         Recrutamento Automático
// @version      1.1
// @description  Recruta unidades e alterna aldeias a cada X/Y minutos.
// @author       De Jesus + Victor Garé + Triky + Adaptado
// @match        https://*.tribalwars.com.br/*
// @require      https://code.jquery.com/jquery-2.2.4.min.js
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  /***************
   * 1. Configurações de recrutamento
   ***************/
  // Ative (true) ou desative (false) cada tipo de unidade
  var lanca = true;             // Lanceiros
  var espada = true;            // Espadachins
  var barbaro = true;           // Bárbaros
  var arqueiro = true;          // Arqueiros
  var explorador = true;        // Exploradores (espiões)
  var cavalariaLeve = true;     // Cavalaria leve
  var cavalariaArqueiro = true; // Cavalaria arqueira
  var cavalariaPesada = true;   // Cavalaria pesada
  var catapulta = true;         // Catapultas
  var ariete = true;            // Arietes

  // Classe CSS para identificar se unidades já estão em treinamento
  var classEnum = Object.freeze({
    lanca: ".unit_sprite_smaller.spear",
    espada: ".unit_sprite_smaller.sword",
    barbaro: ".unit_sprite_smaller.axe",
    arqueiro: ".unit_sprite_smaller.archer",
    explorador: ".unit_sprite_smaller.spy",
    cavalariaLeve: ".unit_sprite_smaller.light",
    cavalariaArqueiro: ".unit_sprite_smaller.marcher",
    cavalariaPesada: ".unit_sprite_smaller.heavy",
    ariete: ".unit_sprite_smaller.ram",
    catapulta: ".unit_sprite_smaller.catapult",
  });

  // Quantidade total desejada para cada unidade
  const limiteTropas = {
    spear:     5000,  // Lanceiros
    sword:     3000,  // Espadachins
    axe:        100,  // Bárbaros
    archer:    5000,  // Arqueiros
    spy:        500,  // Exploradores
    light:        0,  // Cavalaria leve (0 = desativado)
    marcher:      0,  // Cavalaria arqueira
    heavy:      500,  // Cavalaria pesada
    ram:         50,  // Arietes
    catapult:    50   // Catapultas
  };

  // Quantas unidades recrutar por vez (máximo por lote)
  const loteRecrutamento = 1;

  // Vetor auxiliar que será preenchido no GerarObjeto()
  var objetoTropas = [];

  /***************
   * 2. Funções de cache para alternância de aldeias
   ***************/
  const CACHE_KEY = 'aldeiasCache';           // Chave no localStorage
  const CACHE_TIME_MS = 60 * 60 * 1000;       // Validade do cache (1 hora)

  // Armazena no localStorage a lista de aldeias + timestamp
  function salvarCache(ids) {
    const data = { timestamp: Date.now(), aldeias: ids };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }

  // Lê e faz parse do cache; retorna null se inexistente ou inválido
  function lerCache() {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch { return null; }
  }

  // Verifica se o cache ainda está dentro do prazo de validade
  function cacheValido(cache) {
    return cache && (Date.now() - cache.timestamp < CACHE_TIME_MS);
  }

  // Extrai IDs de aldeias da página de overview e salva no cache
  function coletarAldeiasDoDOM(doc) {
    const links = doc.querySelectorAll('a[href*="screen=overview"]');
    const ids = [];
    links.forEach(link => {
      const match = link.href.match(/village=(\d+)/);
      if (match && !ids.includes(match[1])) ids.push(match[1]);
    });
    if (ids.length) {
      salvarCache(ids);
      console.log('✅ Aldeias coletadas:', ids);
      return ids;
    }
    console.log('⚠️ Nenhuma aldeia encontrada.');
    return [];
  }

  // Se não houver cache ou estiver expirado, tenta coletar em um iframe invisível
  function tentarColetaViaIframe(callback) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = '/game.php?screen=overview_villages';
    iframe.onload = () => {
      try {
        const aldeias = coletarAldeiasDoDOM(iframe.contentDocument);
        iframe.remove();
        callback(aldeias);
      } catch (e) {
        console.warn('⚠️ Falha ao coletar via iframe:', e);
        iframe.remove();
        callback([]);
      }
    };
    document.body.appendChild(iframe);
  }

  /***************
   * 3. Controle de índice para alternância
   ***************/
  const INDEX_KEY = 'aldeiaAtualIndex';  // Índice da aldeia atual no cache

  // Retorna o índice salvo ou 0 se inválido/fora do array
  function pegarIndiceAtual(aldeias) {
    let index = parseInt(localStorage.getItem(INDEX_KEY), 10);
    if (isNaN(index) || index >= aldeias.length) index = 0;
    return index;
  }

  // Salva o próximo índice no localStorage
  function salvarIndice(index) {
    localStorage.setItem(INDEX_KEY, index.toString());
  }

  // Navega para a URL de treino da aldeia no índice informado
  function irParaAldeia(aldeias, index) {
    const url = new URL(window.location.href);
    url.searchParams.set('village', aldeias[index]);
    url.searchParams.set('screen', 'train');
    if (window.location.href !== url.toString()) {
      window.location.href = url.toString();
      return true;
    }
    return false;
  }

  /***************
   * 4. Geração e validação das unidades a recrutar
   ***************/
  // Monta o array objetoTropas com base nas configs booleans e seletores CSS
  function GerarObjeto() {
    objetoTropas = [
      { nomeUnidade: "spear",   recrutar: lanca,             cssClassSelector: classEnum.lanca    },
      { nomeUnidade: "sword",   recrutar: espada,            cssClassSelector: classEnum.espada   },
      { nomeUnidade: "axe",     recrutar: barbaro,           cssClassSelector: classEnum.barbaro  },
      { nomeUnidade: "archer",  recrutar: arqueiro,          cssClassSelector: classEnum.arqueiro },
      { nomeUnidade: "spy",     recrutar: explorador,        cssClassSelector: classEnum.explorador },
      { nomeUnidade: "light",   recrutar: cavalariaLeve,     cssClassSelector: classEnum.cavalariaLeve },
      { nomeUnidade: "marcher", recrutar: cavalariaArqueiro, cssClassSelector: classEnum.cavalariaArqueiro },
      { nomeUnidade: "heavy",   recrutar: cavalariaPesada,   cssClassSelector: classEnum.cavalariaPesada },
      { nomeUnidade: "ram",     recrutar: ariete,            cssClassSelector: classEnum.ariete   },
      { nomeUnidade: "catapult",recrutar: catapulta,         cssClassSelector: classEnum.catapult }
    ];
  }

  // Verifica cada tipo de unidade:
  // 1. Está ativado?
  // 2. O campo de input existe e está visível?
  // 3. Já não existe treinamento em curso (verifica CSS)?
  // 4. Ainda não atingiu o limite total?
  // 5. Preenche o input com a quantidade mínima necessária
  function validarPreencher(singleObject) {
    if (!singleObject.recrutar) return false;

    const input = $("input[name=" + singleObject.nomeUnidade + "]");
    if (input.length === 0 || input.parent().is(":hidden")) return false;

    if ($(singleObject.cssClassSelector).length > 0) return false;

    const tr = input.closest("tr");
    const tdQuantidade = tr.find("td").eq(2);
    const textoQtd = tdQuantidade.text().trim();
    if (!textoQtd.includes("/")) return false;

    const partes = textoQtd.split("/");
    const qtdTotal = parseInt(partes[1].replace(/\D/g, "")) || 0;
    const limite = limiteTropas[singleObject.nomeUnidade];

    if (!limite || qtdTotal >= limite) {
      input.val("");
      return false;
    }

    const faltam = limite - qtdTotal;
    const qtdParaRecrutar = Math.min(faltam, loteRecrutamento);
    input.val(qtdParaRecrutar);

    return true;
  }

  /***************
   * 5. Fluxo principal de recrutamento
   ***************/
  function iniciarRecrutamento() {
    GerarObjeto();

    // Tenta preencher todos os inputs; se qualquer um foi preenchido, clica em “Recrutar”
    let houvePreenchimento = false;
    objetoTropas.forEach(el => {
      const res = validarPreencher(el);
      if (res) houvePreenchimento = true;
    });

    if (houvePreenchimento) {
      $(".btn-recruit").click();  // Inicia o recrutamento na aldeia atual
    }

    // Define um tempo aleatório de espera entre 2 e 4 minutos
    const tempoMin = 2 * 60 * 1000;
    const tempoMax = 4 * 60 * 1000;
    const tempoAleatorio = Math.floor(Math.random() * (tempoMax - tempoMin + 1)) + tempoMin;

    console.log(`⏳ Aguardando ${Math.round(tempoAleatorio / 60000)} min antes da próxima aldeia.`);

    setTimeout(() => {
      // Ao final do timer, carrega ou recolhe o cache de aldeias
      const cache = lerCache();
      if (!cache || !cache.aldeias || cache.aldeias.length === 0) {
        // Se não tiver cache, coleta via iframe
        tentarColetaViaIframe((aldeias) => {
          if (aldeias.length === 0) {
            console.warn('⚠️ Não foi possível coletar aldeias. Recarregando.');
            location.reload(true);
            return;
          }
          let idx = pegarIndiceAtual(aldeias);
          idx = (idx + 1) % aldeias.length;
          salvarIndice(idx);
          irParaAldeia(aldeias, idx);
        });
      } else {
        // Usa o cache existente para alternar
        let idx = pegarIndiceAtual(cache.aldeias);
        idx = (idx + 1) % cache.aldeias.length;
        salvarIndice(idx);
        irParaAldeia(cache.aldeias, idx);
      }
    }, tempoAleatorio);
  }

  /***************
   * 6. Inicialização do script
   ***************/
  const url = window.location.href;

  if (url.includes('screen=overview_villages')) {
    // Se estivermos na tela de overview de aldeias, apenas coleto e salvo o cache
    coletarAldeiasDoDOM(document);
  } else {
    // Caso contrário, estamos na aba de treinamento; inicia o ciclo
    iniciarRecrutamento();
  }

})();
