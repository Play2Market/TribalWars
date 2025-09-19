// =========================================================================================
// --- INÍCIO: Módulo de Tooltips (KitsuneTooltipManager.js) ---
// =========================================================================================
(function() {
    if (window.KitsuneTooltipManager) return;

    const KitsuneTooltipManager = {
        init() {
            this.injectCSS();
            const observer = new MutationObserver(() => {
                this.processContainers(document.querySelectorAll('.kitsune-tooltip-container:not([data-tooltip-initialized])'));
            });
            observer.observe(document.body, { childList: true, subtree: true });
            this.processContainers(document.querySelectorAll('.kitsune-tooltip-container:not([data-tooltip-initialized])'));
        },

        processContainers(containers) {
            containers.forEach(container => {
                container.setAttribute('data-tooltip-initialized', 'true');
                const tooltipText = container.dataset.tooltip;
                if (!tooltipText) return;

                const tooltipContent = document.createElement('div');
                tooltipContent.className = 'kitsune-tooltip-content';
                tooltipContent.innerHTML = `<p>${tooltipText}</p>`;

                container.appendChild(tooltipContent);
                container.addEventListener('mouseenter', () => this.updatePosition(container));
            });
        },

        updatePosition(container) {
            const rect = container.getBoundingClientRect();
            const isRightHalf = (rect.left + rect.width / 2) > (window.innerWidth / 2);

            if (isRightHalf) {
                container.setAttribute('data-tooltip-align', 'left');
            } else {
                container.setAttribute('data-tooltip-align', 'right');
            }
        },

        injectCSS() {
            GM_addStyle(`
                .kitsune-tooltip-container {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    cursor: help;
                }
                .kitsune-tooltip-content {
                    --background: var(--kitsune-bg-darker, #21252b);
                    width: 250px;
                    position: absolute;
                    z-index: 10005;
                    padding: 15px;
                    background-color: var(--background);
                    border: 1px solid var(--kitsune-border, #4a515e);
                    border-radius: 6px;
                    opacity: 0;
                    visibility: hidden;
                    pointer-events: none;
                    transition: all 0.2s ease-in-out;
                    text-align: left;
                    bottom: 140%;
                }
                .kitsune-tooltip-container:hover .kitsune-tooltip-content {
                    opacity: 1;
                    visibility: visible;
                    pointer-events: auto;
                }
                .kitsune-tooltip-content p {
                    margin: 0;
                    line-height: 1.4;
                }
                .kitsune-tooltip-content p b {
                    display: block;
                    color: var(--kitsune-accent-alt);
                    margin-bottom: 5px;
                }
                .kitsune-tooltip-content::before {
                    content: "";
                    position: absolute;
                    height: 0.8em;
                    width: 0.8em;
                    background: var(--background);
                    border-bottom: 1px solid var(--kitsune-border, #4a515e);
                    border-right: 1px solid var(--kitsune-border, #4a515e);
                    bottom: -0.45em;
                    transform: rotate(45deg);
                }
                .kitsune-tooltip-container[data-tooltip-align="right"] .kitsune-tooltip-content {
                    left: 50%;
                    transform: translateX(-50%);
                }
                .kitsune-tooltip-container[data-tooltip-align="right"] .kitsune-tooltip-content::before {
                    left: 50%;
                    transform: translateX(-50%) rotate(45deg);
                }
                .kitsune-tooltip-container[data-tooltip-align="left"] .kitsune-tooltip-content {
                    left: auto;
                    right: calc(100% + 10px);
                    transform: none;
                }
                .kitsune-tooltip-container[data-tooltip-align="left"] .kitsune-tooltip-content::before {
                    left: auto;
                    right: 1em;
                    transform: rotate(45deg);
                }
            `);
        }
    };

    window.addEventListener('load', () => KitsuneTooltipManager.init());
})();