(function () {
    const PDF_URL = 'lista-precios.pdf';
    const PDF_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const ROW_KEYS = [
        '2000',
        '2001',
        '2002',
        '1004',
        '1006',
        '1008',
        '1006-vr',
        '1006-rayo',
        '1006-sol',
        '1002',
        '1002-moldura',
        '3001'
    ];

    let priceListPromise = null;
    let priceList = null;

    const money = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0
    });

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function parsePrice(value) {
        if (value === '-') return null;
        return Number(value.replace(/\./g, ''));
    }

    function parseDoorRows(text) {
        const rowPattern = /(\d{3}(?:\.\d{3})?)\s+(\d{3}(?:\.\d{3})?)\s+(\d{3}(?:\.\d{3})?)\s+(\d{3}(?:\.\d{3})?|1\.\d{3}\.\d{3}|-)/g;
        const rows = [];
        let match;

        while ((match = rowPattern.exec(text)) !== null) {
            rows.push({
                widths: {
                    '0.80': parsePrice(match[1]),
                    '0.90': parsePrice(match[2]),
                    '1.00': parsePrice(match[3])
                },
                porton: parsePrice(match[4])
            });
        }

        return rows;
    }

    async function loadPriceList() {
        if (priceList) return priceList;
        if (priceListPromise) return priceListPromise;

        priceListPromise = (async () => {
            if (!window.pdfjsLib) {
                throw new Error('No se pudo cargar PDF.js.');
            }

            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
            const pdf = await window.pdfjsLib.getDocument(PDF_URL).promise;
            const page = await pdf.getPage(2);
            const content = await page.getTextContent();
            const text = content.items.map(item => item.str).join(' ');
            const rows = parseDoorRows(text);

            if (rows.length < 11) {
                throw new Error('No se pudo leer la tabla de puertas del PDF.');
            }

            const parsed = {};
            ROW_KEYS.forEach((key, index) => {
                if (rows[index]) parsed[key] = rows[index];
            });

            if (!parsed['3002'] && parsed['3001']) {
                parsed['3002'] = parsed['3001'];
            }

            priceList = parsed;
            return priceList;
        })();

        return priceListPromise;
    }

    function resolvePriceKey(model, src, productType) {
        if (productType === 'ventana') return '';
        const text = normalize(`${model} ${src}`);
        if (text.includes('1002') && text.includes('moldura')) return '1002-moldura';
        if (text.includes('1002') || text.includes('clasica')) return '1002';
        if (text.includes('1004') || text.includes('4 tableros')) return '1004';
        if (text.includes('1008') || text.includes('8 tableros')) return '1008';
        if (text.includes('1006') && (text.includes('rayo') || text.includes('1-4') || text.includes('1/4'))) return '1006-rayo';
        if (text.includes('1006') && text.includes('sol')) return '1006-sol';
        if ((text.includes('1006') || text.includes('6 tableros')) && text.includes('v')) return '1006-vr';
        if (text.includes('1006') || text.includes('6 tableros')) return '1006';
        if (text.includes('2000')) return '2000';
        if (text.includes('2001')) return '2001';
        if (text.includes('2002')) return '2002';
        if (text.includes('machimbrad') && (text.includes('2p') || text.includes('2 pulg') || text.includes('2pulgada'))) return '3002';
        if (text.includes('machimbrad')) return '3001';
        if (productType === 'porton' && text.includes('10 tableros')) return '1008';
        return '';
    }

    function getWidthBase(widthCm) {
        if (widthCm <= 84) return { key: '0.80', label: '80', extraSteps: 0 };
        if (widthCm <= 94) return { key: '0.90', label: '90', extraSteps: 0 };
        if (widthCm <= 104) return { key: '1.00', label: '100', extraSteps: 0 };
        return { key: '1.00', label: '100', extraSteps: Math.min(3, Math.ceil((widthCm - 104) / 10)) };
    }

    function getHeightSteps(heightCm) {
        if (heightCm <= 204) return 0;
        return Math.min(5, Math.floor((heightCm - 205) / 10) + 1);
    }

    function calculate(basePrices, widthCm, heightCm, productType) {
        const normalizedWidth = Math.min(Math.max(widthCm, 80), 130);
        const normalizedHeight = Math.min(Math.max(heightCm, 200), 250);
        const widthBase = getWidthBase(normalizedWidth);
        const base = productType === 'porton' && basePrices.porton
            ? basePrices.porton
            : basePrices.widths[widthBase.key];
        const heightSteps = getHeightSteps(normalizedHeight);
        const multiplier = 1 + (widthBase.extraSteps * 0.10) + (heightSteps * 0.05);

        return {
            price: Math.round(base * multiplier),
            widthLabel: productType === 'porton' && basePrices.porton ? 'porton 240' : widthBase.label,
            widthExtra: widthBase.extraSteps * 10,
            heightExtra: heightSteps * 5
        };
    }

    function ensureLayout(modal) {
        let layout = modal.querySelector('.modal-cotizador-layout');
        if (layout) return layout;

        const media = document.createElement('div');
        media.className = 'modal-media-panel';
        const imageContainer = modal.querySelector('.modal-galeria-container');
        const caption = modal.querySelector('.modal-leyenda');
        if (imageContainer) media.appendChild(imageContainer);
        if (caption) media.appendChild(caption);

        layout = document.createElement('div');
        layout.className = 'modal-cotizador-layout';
        layout.appendChild(media);
        modal.appendChild(layout);
        return layout;
    }

    function ensureCotizador(modal) {
        let cotizador = modal.querySelector('.cotizador-modal');
        if (cotizador) return cotizador;
        const layout = ensureLayout(modal);
        cotizador = document.createElement('div');
        cotizador.className = 'cotizador-modal';
        cotizador.innerHTML = `
            <h3>Cotizar este modelo</h3>
            <div class="cotizador-campos">
                <div class="cotizador-campo">
                    <label for="cotizador-ancho">Ancho (cm)</label>
                    <input id="cotizador-ancho" type="number" min="80" max="130" step="1" value="80">
                </div>
                <div class="cotizador-campo">
                    <label for="cotizador-alto">Alto (cm)</label>
                    <input id="cotizador-alto" type="number" min="200" max="250" step="1" value="200">
                </div>
            </div>
            <div class="cotizador-resultado">Leyendo lista de precios...</div>
            <p class="cotizador-detalle"></p>
            <p class="cotizador-consultar" hidden>Este modelo necesita cotizacion personalizada. Consultanos para calcularlo con la medida exacta.</p>
            <p class="cotizador-disclaimer">Los precios son aproximados y pueden variar según medidas finales, materiales, herrajes, terminaciones y vigencia de lista.</p>
        `;
        layout.appendChild(cotizador);
        return cotizador;
    }

    function init(options) {
        const modal = options.modal;
        const productType = options.productType || 'puerta';
        const cotizador = ensureCotizador(modal);
        const widthInput = cotizador.querySelector('#cotizador-ancho');
        const heightInput = cotizador.querySelector('#cotizador-alto');
        const fields = cotizador.querySelector('.cotizador-campos');
        const result = cotizador.querySelector('.cotizador-resultado');
        const detail = cotizador.querySelector('.cotizador-detalle');
        const consult = cotizador.querySelector('.cotizador-consultar');
        let currentBase = null;
        let currentKey = '';
        let currentState = 'loading';

        function setConsult(message) {
            fields.hidden = true;
            result.hidden = true;
            detail.hidden = true;
            consult.hidden = false;
            consult.textContent = message;
        }

        function render() {
            if (currentState === 'loading') {
                fields.hidden = true;
                result.hidden = false;
                detail.hidden = true;
                consult.hidden = true;
                result.textContent = 'Leyendo lista de precios...';
                return;
            }

            if (currentState === 'error') {
                setConsult('No se pudo leer la lista de precios. Revisá que lista-precios.pdf esté cargado en el sitio.');
                return;
            }

            if (!currentBase) {
                setConsult('Este modelo necesita cotizacion personalizada. Consultanos para calcularlo con la medida exacta.');
                return;
            }

            fields.hidden = false;
            result.hidden = false;
            detail.hidden = false;
            consult.hidden = true;

            const width = parseFloat(widthInput.value.replace(',', '.')) || 80;
            const height = parseFloat(heightInput.value.replace(',', '.')) || 200;
            const quote = calculate(currentBase, width, height, productType);
            result.textContent = money.format(quote.price);
            detail.textContent = `Base ${quote.widthLabel} x 200 cm. Adicional ancho: ${quote.widthExtra}%. Adicional alto: ${quote.heightExtra}%.`;
        }

        function refreshCurrentBase() {
            currentBase = currentKey && priceList ? priceList[currentKey] : null;
            render();
        }

        widthInput.addEventListener('input', render);
        heightInput.addEventListener('input', render);

        loadPriceList()
            .then(() => {
                currentState = 'ready';
                refreshCurrentBase();
            })
            .catch(() => {
                currentState = 'error';
                render();
            });

        return {
            update(model, src) {
                currentKey = resolvePriceKey(model, src, productType);
                refreshCurrentBase();
            }
        };
    }

    window.DEFCotizador = { init };
})();
