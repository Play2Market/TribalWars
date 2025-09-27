// ==UserScript==
// @name         m_construtor | Kitsune (multi-ald + ordem crescente)
// @namespace    https://github.com/Play2Market/TribalWars
// @version      260920252355
// @description  Construtor multi-aldeias, seguindo 1 modelo ativo em ordem crescente por aldeia (Projeto Kitsune), com completar grátis (<3min) sempre ativo.
// @author       Kitsune
// @match        *://*.tribalwars.com.br/game.php*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("🔨 Kitsune | Construtor (ordem crescente por aldeia) carregado.");

    const DEFAULT_MIN = 800;
    const DEFAULT_MAX = 1200;

    window.runBuilderModule = async function() {
        try {
            const settings = window.KitsuneSettingsManager?.get();
            if (!settings?.construtor?.autoStart) {
                console.log("🔨 Construtor: AutoStart desativado.");
                return;
            }

            const aldeias = window.KitsuneVillageManager?.getAllVillages?.() || [];
            if (!aldeias.length) {
                console.log("📭 Nenhuma aldeia encontrada.");
                return;
            }

            console.log(`🔨 Construtor: processando ${aldeias.length} aldeias.`);

            for (let [index, v] of aldeias.entries()) {
                const url = `${game_data.link_base_pure}main&village=${v.id}`;
                await abrirIframe(url, v.id, settings, index);
            }

        } catch (e) {
            console.error("🔥 Erro no Construtor:", e);
        }
    };

    async function abrirIframe(url, vid, settings, idx) {
        return new Promise(resolve => {
            const delay = randomDelay(settings.construtorConfig) + (idx * 2000);
            console.log(`⏳ Aldeia ${vid}: carregando em ${delay}ms...`);

            setTimeout(() => {
                const frame = document.createElement("iframe");
                frame.style.display = "none";
                frame.src = url;
                document.body.appendChild(frame);

                frame.onload = () => {
                    try {
                        executarConstrutor(frame.contentDocument, settings, vid);
                    } catch (e) {
                        console.warn(`⚠️ Erro ao processar vila ${vid}:`, e);
                    } finally {
                        frame.remove();
                        resolve();
                    }
                };
            }, delay);
        });
    }

    function executarConstrutor(doc, settings, vid) {
        console.log(`🏰 Vila ${vid}: executando construtor.`);

        // Completar grátis (sempre ativo)
        tryCompletarGratis(doc);

        // Respeita limite da fila
        const filaAtual = doc.querySelectorAll('#buildqueue tr').length - 1;
        const limiteFila = settings?.construtor?.filaMax || 2;

        if (filaAtual >= limiteFila) {
            console.log(`🚫 Vila ${vid}: fila cheia (${filaAtual}/${limiteFila}).`);
            return;
        }

        // Preencher até o limite
        const faltam = limiteFila - filaAtual;
        const proxIds = getProximosEmOrdem(doc, settings, faltam);

        if (!proxIds.length) {
            console.log(`📭 Vila ${vid}: nenhum edifício disponível no modelo.`);
            return;
        }

        proxIds.forEach((proxId, idx) => {
            setTimeout(() => {
                const el = doc.querySelector(`#${proxId}`);
                if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
                    console.log(`🏗️ Vila ${vid}: construindo → ${proxId}`);
                    el.click();
                } else {
                    console.log(`⚠️ Vila ${vid}: botão ${proxId} não disponível.`);
                }
            }, idx * 1000); // delay entre cliques
        });
    }

    function getProximosEmOrdem(doc, settings, quantidade) {
        try {
            const modelos = JSON.parse(localStorage.getItem("kitsune_builder_templates") || "[]");
            const ativo = settings?.construtor?.modelo;
            const modelo = modelos.find(m => m.name === ativo);

            if (!modelo || !modelo.queue) return [];

            let fila = modelo.queue.map(item => `main_buildlink_${item.building}_${item.level}`);

            // filtra apenas os que ainda estão disponíveis para a aldeia
            fila = fila.filter(id => {
                const el = doc.querySelector(`#${id}`);
                return el && el.offsetWidth > 0 && el.offsetHeight > 0;
            });

            return fila.slice(0, quantidade);
        } catch (e) {
            console.warn("⚠️ Construtor: erro ao carregar modelo.", e);
            return [];
        }
    }

    function tryCompletarGratis(doc) {
        const tr = doc.querySelector('#buildqueue tr:nth-child(2)');
        if (!tr) return;

        const timeText = tr.querySelector('td:nth-child(2) span')?.textContent?.trim() || "";
        if (!timeText.includes(":")) return;

        const [h, m, s] = timeText.split(':').map(Number);
        const total = h * 3600 + m * 60 + s;

        if (total < 180) {
            const btn = tr.querySelector('td:nth-child(3) a:last-child');
            if (btn) {
                console.log("⚡ Vila: completar grátis!");
                btn.click();
            }
        }
    }

    function randomDelay(cfg) {
        const min = toMs(cfg?.tempoMin) || DEFAULT_MIN;
        const max = toMs(cfg?.tempoMax) || DEFAULT_MAX;
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function toMs(timeStr) {
        if (!timeStr) return null;
        const [h, m, s] = timeStr.split(':').map(Number);
        return ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;
    }

})();
