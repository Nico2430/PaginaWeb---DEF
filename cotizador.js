(function () {
    const PRICE_LIST = {
        '1002': { widths: { '0.80': 520100, '0.90': 587900, '1.00': 686600 }, porton: 1533100 },
        '1002-moldura': { widths: { '0.80': 515100, '0.90': 577800, '1.00': 668400 } },
        '1004': { widths: { '0.80': 323800, '0.90': 366000, '1.00': 433400 }, porton: 943100 },
        '1006': { widths: { '0.80': 344400, '0.90': 389000, '1.00': 454600 }, porton: 1005800 },
        '1006-vr': { widths: { '0.80': 379200, '0.90': 418700, '1.00': 503700 }, porton: 1077400 },
        '1006-rayo': { widths: { '0.80': 483200, '0.90': 523800, '1.00': 601000 }, porton: 1166100 },
        '1006-sol': { widths: { '0.80': 358700, '0.90': 405400, '1.00': 473500 }, porton: 1048900 },
        '1008': { widths: { '0.80': 367900, '0.90': 402800, '1.00': 468300 }, porton: 1019500 },
        '2000': { widths: { '0.80': 215300, '0.90': 243100, '1.00': 284100 }, porton: 618200 },
        '2001': { widths: { '0.80': 228900, '0.90': 258500, '1.00': 302100 }, porton: 659200 },
        '2002': { widths: { '0.80': 250400, '0.90': 283000, '1.00': 330500 }, porton: 723900 },
        '3001': { widths: { '0.80': 312800, '0.90': 353300, '1.00': 412800 }, porton: 909300 },
        '3002': { widths: { '0.80': 312800, '0.90': 353300, '1.00': 412800 }, porton: 909300 }
    };

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
        if (text.includes('machimbrad')) return '3002';
        if (productType === 'porton' && text.includes('10 tableros')) return '1008';
        return '';
    }

    function hasVerticalMachimbradaExtra(model, src, productType) {
        if (productType !== 'puerta') return false;
        const text = normalize(`${model} ${src}`);
        return text.includes('machimbrad') && (text.includes('vertical') || text.includes('cruz'));
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

    function calculate(basePrices, widthCm, heightCm, productType, hasExtra) {
        const normalizedHeight = Math.min(Math.max(heightCm, 200), 250);
        const quoteWidth = productType === 'porton'
            ? Math.min(Math.max(widthCm, 240), 290) / 3
            : Math.min(Math.max(widthCm, 80), 130);
        const widthBase = getWidthBase(quoteWidth);
        const base = productType === 'porton'
            ? basePrices.widths[widthBase.key] * 3
            : basePrices.widths[widthBase.key];
        const heightSteps = getHeightSteps(normalizedHeight);
        const modelExtra = hasExtra ? 0.10 : 0;
        const multiplier = 1 + modelExtra + (widthBase.extraSteps * 0.10) + (heightSteps * 0.05);

        return {
            price: Math.round(base * multiplier),
            widthLabel: productType === 'porton' ? `3 hojas x ${widthBase.label}` : widthBase.label,
            widthExtra: widthBase.extraSteps * 10,
            heightExtra: heightSteps * 5,
            modelExtra: modelExtra * 100
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
            <div class="cotizador-resultado"></div>
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
        let currentHasExtra = false;

        if (productType === 'porton') {
            widthInput.min = '240';
            widthInput.max = '300';
            widthInput.step = '10';
            widthInput.value = '240';
        }

        function setConsult(message) {
            fields.hidden = true;
            result.hidden = true;
            detail.hidden = true;
            consult.hidden = false;
            consult.textContent = message;
        }

        function setInlineConsult(message) {
            fields.hidden = false;
            result.hidden = true;
            detail.hidden = true;
            consult.hidden = false;
            consult.textContent = message;
        }

        function render() {
            if (!currentBase) {
                setConsult('Este modelo necesita cotizacion personalizada. Consultanos para calcularlo con la medida exacta.');
                return;
            }

            fields.hidden = false;
            result.hidden = false;
            detail.hidden = false;
            consult.hidden = true;

            const width = parseFloat(widthInput.value.replace(',', '.')) || (productType === 'porton' ? 240 : 80);
            const height = parseFloat(heightInput.value.replace(',', '.')) || 200;

            if (productType === 'porton' && width > 290) {
                setInlineConsult('Para portones de 300 cm o más de ancho, la cotización se realiza de manera personalizada.');
                return;
            }

            if (productType === 'puerta' && (width > 130 || height > 250)) {
                setInlineConsult('Para puertas de más de 130 cm de ancho o más de 250 cm de alto, la cotización se realiza de manera personalizada.');
                return;
            }

            const quote = calculate(currentBase, width, height, productType, currentHasExtra);
            result.textContent = money.format(quote.price);
            detail.textContent = `Base ${quote.widthLabel} x 200 cm. Adicional modelo: ${quote.modelExtra}%. Adicional ancho: ${quote.widthExtra}%. Adicional alto: ${quote.heightExtra}%.`;
        }

        function refreshCurrentBase() {
            currentBase = currentKey ? PRICE_LIST[currentKey] : null;
            render();
        }

        widthInput.addEventListener('input', render);
        heightInput.addEventListener('input', render);

        return {
            update(model, src) {
                currentKey = resolvePriceKey(model, src, productType);
                currentHasExtra = hasVerticalMachimbradaExtra(model, src, productType);
                refreshCurrentBase();
            }
        };
    }

    window.DEFCotizador = { init };
})();
