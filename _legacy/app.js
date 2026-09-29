/**
 * AURA D'OR - Interactive Perfume Landing Page
 * Cinematic automatic rotation, watermark removal crop, scroll reveal observer,
 * and state-managed cart & order history slide-over panel.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Configurações do Canvas 3D
    const TOTAL_FRAMES = 40;
    const canvas = document.getElementById('perfume-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    
    const loader = document.getElementById('loader');
    const loaderBar = document.getElementById('loader-bar');
    const loaderPercentage = document.getElementById('loader-percentage');
    
    // Cache de frames
    const images = [];
    let loadedCount = 0;
    
    // Estado da animação do perfume (rotação automática constante)
    let currentFrame = 0;
    
    // -------------------------------------------------------------
    // ESTADO DO E-COMMERCE (SACOLA E PEDIDOS)
    // -------------------------------------------------------------
    
    // Produtos cadastrados no site para referência de adição 
    // Foi adicionada a propriedade "category" para as regras de frete e atacado.
    const PRODUCTS_DATA = {
        'aura noire': { name: 'Aura Noire', desc: 'Eau de Parfum Intense - 50ml', price: 890, img: 'imagem perfume/perfume-men-1.jpg', category: 'varejo' },
        'aura boisée': { name: 'Aura Boisée', desc: 'Cítrico Amadeirado - 50ml', price: 790, img: 'imagem perfume/perfume-men-1.jpg', filterClass: 'card-img-variant-blue', category: 'varejo' },
        'aura cuir': { name: 'Aura Cuir', desc: 'Couro Intenso - 50ml', price: 950, img: 'imagem perfume/perfume-men-1.jpg', filterClass: 'card-img-variant-amber', category: 'varejo' },
        'aura rosé': { name: 'Aura Rosé', desc: 'Eau de Parfum - 50ml', price: 850, img: 'imagem perfume/perfume-women-1.jpg', category: 'varejo' },
        'aura blanc': { name: 'Aura Blanc', desc: 'Floral Branco - 50ml', price: 810, img: 'imagem perfume/perfume-women-1.jpg', filterClass: 'card-img-variant-silver', category: 'varejo' },
        'aura éclat': { name: 'Aura Éclat', desc: 'Frutal Oriental - 50ml', price: 920, img: 'imagem perfume/perfume-women-1.jpg', filterClass: 'card-img-variant-gold', category: 'varejo' },
        // Item fictício para testar a regra do ATACADO (Você pode editar depois)
        'aura atacado cx': { name: 'Caixa Aura Atacado', desc: 'Atacado Exclusivo - 50ml', price: 450, img: 'imagem perfume/perfume-men-1.jpg', category: 'atacado' }
    };

    // Sacola inicial carregada do localStorage para persistir entre páginas
    let cart = [];
    try {
        const savedCart = localStorage.getItem('aura_cart');
        cart = savedCart ? JSON.parse(savedCart) : [
            { id: 'item-' + Date.now(), productKey: 'aura noire', quantity: 1 }
        ];
    } catch (e) {
        console.warn("Erro ao ler carrinho do localStorage:", e);
        cart = [{ id: 'item-' + Date.now(), productKey: 'aura noire', quantity: 1 }];
    }
    
    // Histórico de pedidos realizado do localStorage
    let orders = [];
    try {
        const savedOrders = localStorage.getItem('aura_orders');
        orders = savedOrders ? JSON.parse(savedOrders) : [];
    } catch (e) {
        console.warn("Erro ao ler pedidos do localStorage:", e);
        orders = [];
    }

    // Funções auxiliares para salvar estado
    function saveCartToStorage() {
        try {
            localStorage.setItem('aura_cart', JSON.stringify(cart));
        } catch (e) {
            console.error("Erro ao salvar carrinho:", e);
        }
    }

    // Gravar pedidos no storage
    function saveOrdersToStorage() {
        try {
            localStorage.setItem('aura_orders', JSON.stringify(orders));
        } catch (e) {
            console.error("Erro ao salvar pedidos:", e);
        }
    }

    // 1. Pré-carregar e decodificar todas as imagens na GPU
    function preloadImages() {
        for (let i = 1; i <= TOTAL_FRAMES; i++) {
            const img = new Image();
            const frameNum = String(i).padStart(3, '0');
            
            img.onload = () => {
                img.decode()
                    .then(() => {
                        loadedCount++;
                        updateLoaderProgress();
                    })
                    .catch((err) => {
                        console.error("Falha ao decodificar frame:", err);
                        loadedCount++;
                        updateLoaderProgress();
                    });
            };
            
            img.onerror = () => {
                console.error(`Erro ao carregar a imagem: ${img.src}`);
                loadedCount++; 
                updateLoaderProgress();
            };
            
            img.src = `imagem perfume/ezgif-frame-${frameNum}.png`;
            images.push(img);
        }
    }
    
    // Atualizar loader
    function updateLoaderProgress() {
        const percentage = Math.round((loadedCount / TOTAL_FRAMES) * 100);
        loaderBar.style.width = `${percentage}%`;
        
        loaderPercentage.textContent = `${percentage}%`;
        
        if (loadedCount === TOTAL_FRAMES) {
            setTimeout(revealSite, 600); 
        }
    }
    
    // Revelar site e iniciar sistemas
    function revealSite() {
        loader.classList.add('loader-hidden');
        document.body.classList.add('loaded');
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        
        resizeCanvas();
        
        startTime = performance.now();
        requestAnimationFrame(animationLoop);
        
        initScrollReveal();
        initCartSystem();
    }
    
    // 2. Canvas High-DPI (Limitado a 2x para performance 144Hz+)
    let dpr = 1;
    function resizeCanvas() {
        dpr = Math.min(window.devicePixelRatio || 1, 2); 
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        ctx.scale(dpr, dpr);
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        
        drawCurrentFrame();
    }
    
    // 3. Desenho de frames com Interpolação (Cross-fade) e remoção de marca-d'água
    function drawCurrentFrame() {
        const floorFrame = Math.floor(currentFrame);
        const activeIndex1 = floorFrame % TOTAL_FRAMES;
        const activeIndex2 = (floorFrame + 1) % TOTAL_FRAMES;
        const fraction = currentFrame - floorFrame;
        
        const img1 = images[activeIndex1];
        const img2 = images[activeIndex2];
        
        if (!img1 || !img1.complete || !img2 || !img2.complete) return;
        
        const canvasWidth = canvas.width / dpr;
        const canvasHeight = canvas.height / dpr;
        
        // Corte inteligente: exclui a base (marca-d'água)
        const sourceX = 0;
        const sourceY = 0;
        const sourceWidth = img1.width;
        const sourceHeight = img1.height * 0.92; 
        
        const imgRatio = sourceWidth / sourceHeight;
        const canvasRatio = canvasWidth / canvasHeight;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgRatio > canvasRatio) {
            drawHeight = canvasHeight;
            drawWidth = canvasHeight * imgRatio;
            drawY = 0;
            drawX = (canvasWidth - drawWidth) / 2;
        } else {
            drawWidth = canvasWidth;
            drawHeight = canvasWidth / imgRatio;
            drawX = 0;
            drawY = (canvasHeight - drawHeight) / 2;
        }
        
        // Escala e Ajuste de Layout
        let scale = 0.88;
        let finalX = drawX;
        let finalY = drawY;
        
        if (window.innerWidth > 768) {
            scale = 0.85;
        }
        
        const newWidth = drawWidth * scale;
        const newHeight = drawHeight * scale;
        finalX = drawX + (drawWidth - newWidth) / 2;
        finalY = drawY + (drawHeight - newHeight) / 2;
        
        // CORREÇÃO TEMA CLARO: Limpa o frame com transparência
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        ctx.globalAlpha = 1.0;
        ctx.drawImage(img1, sourceX, sourceY, sourceWidth, sourceHeight, finalX, finalY, newWidth, newHeight);
        
        ctx.globalAlpha = fraction;
        ctx.drawImage(img2, sourceX, sourceY, sourceWidth, sourceHeight, finalX, finalY, newWidth, newHeight);
        
        ctx.globalAlpha = 1.0;
    }
    
    // Rotação contínua baseada em tempo absoluto
    let startTime = 0;
    const rotationSpeedPerSecond = 10.0; 
    
    function animationLoop(timestamp) {
        requestAnimationFrame(animationLoop);
        
        const elapsedSeconds = (timestamp - startTime) / 1000;
        currentFrame = (elapsedSeconds * rotationSpeedPerSecond) % TOTAL_FRAMES;
        
        drawCurrentFrame();
    }
    
    // 4. Scroll Reveal
    function initScrollReveal() {
        const revealElements = document.querySelectorAll('.animate-reveal');
        
        const observerOptions = {
            root: null,
            threshold: 0.05,
            rootMargin: "0px 0px -40px 0px"
        };
        
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        revealElements.forEach(el => revealObserver.observe(el));
    }
    
    // -------------------------------------------------------------
    // SISTEMA DE INTERAÇÃO DA SACOLA, FRETE E PEDIDOS
    // -------------------------------------------------------------
    
    function initCartSystem() {
        const cartDrawer = document.getElementById('cart-drawer');
        const cartBtn = document.getElementById('cart-btn');
        const closeDrawerBtn = document.getElementById('close-drawer-btn');
        const drawerOverlay = document.getElementById('drawer-overlay');
        
        const tabCartBtn = document.getElementById('tab-cart-btn');
        const tabOrdersBtn = document.getElementById('tab-orders-btn');
        const tabCartContent = document.getElementById('tab-cart-content');
        const tabOrdersContent = document.getElementById('tab-orders-content');
        
        const cartItemsList = document.getElementById('cart-items');
        const cartCountBadge = document.getElementById('cart-count');
        const ordersCountBadge = document.getElementById('orders-count');
        
        const cartSubtotalEl = document.getElementById('cart-subtotal');
        const cartTotalEl = document.getElementById('cart-total');
        const checkoutBtn = document.getElementById('checkout-btn');
        const ordersListEl = document.getElementById('orders-list');

        let selectedFreight = 0; 
        const cepInput = document.getElementById('cep-input');
        const calcFreightBtn = document.getElementById('calc-freight-btn');
        const freightOptions = document.getElementById('freight-options');
        const freightLine = document.getElementById('freight-line');
        const cartFreightValue = document.getElementById('cart-freight-value');
        
        // Abertura / Fechamento do Painel
        function openDrawer() {
            cartDrawer.classList.add('open');
            document.body.style.overflow = 'hidden'; 
        }
        
        function closeDrawer() {
            cartDrawer.classList.remove('open');
            document.body.style.overflow = '';
        }
        
        cartBtn.addEventListener('click', openDrawer);
        closeDrawerBtn.addEventListener('click', closeDrawer);
        drawerOverlay.addEventListener('click', closeDrawer);
        
        // Alternância de Abas
        tabCartBtn.addEventListener('click', () => {
            tabCartBtn.classList.add('active');
            tabOrdersBtn.classList.remove('active');
            tabCartContent.classList.add('active');
            tabOrdersContent.classList.remove('active');
        });
        
        tabOrdersBtn.addEventListener('click', () => {
            tabOrdersBtn.classList.add('active');
            tabCartBtn.classList.remove('active');
            tabOrdersContent.classList.add('active');
            tabCartContent.classList.remove('active');
        });

        // Evento de Cálculo de Frete
        if(calcFreightBtn) {
            calcFreightBtn.addEventListener('click', () => {
                if(cepInput.value.length >= 8 && cart.length > 0) {
                    freightOptions.style.display = 'flex';
                    freightOptions.innerHTML = `
                        <label style="font-size: 0.75rem; color: var(--color-text-secondary); cursor: pointer; display: flex; justify-content: space-between;">
                            <span><input type="radio" name="freight" value="25.50" onchange="window.updateFreight(25.50)"> PAC (5 a 7 dias)</span>
                            <strong>R$ 25,50</strong>
                        </label>
                        <label style="font-size: 0.75rem; color: var(--color-text-secondary); cursor: pointer; display: flex; justify-content: space-between;">
                            <span><input type="radio" name="freight" value="48.90" onchange="window.updateFreight(48.90)"> Sedex Expresso (2 dias)</span>
                            <strong>R$ 48,90</strong>
                        </label>
                    `;
                } else if (cart.length === 0) {
                    alert("Adicione itens à sacola antes de calcular o frete.");
                }
            });
        }

        window.updateFreight = (value) => {
            selectedFreight = parseFloat(value);
            updateCartUI();
        };
        
        // Adicionar itens da página ao carrinho
        const cardAddButtons = document.querySelectorAll('.btn-card');
        cardAddButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const card = btn.closest('.perfume-card');
                const perfumeName = card.querySelector('.perfume-name').textContent.trim().toLowerCase();
                
                if (PRODUCTS_DATA[perfumeName]) {
                    const existingItem = cart.find(item => item.productKey === perfumeName);
                    if (existingItem) {
                        existingItem.quantity += 1;
                    } else {
                        cart.push({
                            id: 'item-' + Date.now(),
                            productKey: perfumeName,
                            quantity: 1
                        });
                    }
                    saveCartToStorage();
                    updateCartUI();
                    openDrawer();
                    tabCartBtn.click();
                }
            });
        });
        
        // Atualizar interface gráfica da sacola
        function updateCartUI() {
            if(!cartItemsList) return;
            cartItemsList.innerHTML = '';
            let subtotal = 0;
            let totalItemsCount = 0;
            
            if (cart.length === 0) {
                cartItemsList.innerHTML = `
                    <div class="no-orders">
                        <p>Sua sacola está vazia.</p>
                    </div>
                `;
                checkoutBtn.disabled = true;
                checkoutBtn.style.opacity = 0.5;
                selectedFreight = 0;
                if(freightOptions) freightOptions.style.display = 'none';
                if(cepInput) cepInput.value = '';
            } else {
                checkoutBtn.disabled = false;
                checkoutBtn.style.opacity = 1;
                
                cart.forEach(item => {
                    const product = PRODUCTS_DATA[item.productKey];
                    if(!product) return;
                    
                    subtotal += product.price * item.quantity;
                    totalItemsCount += item.quantity;
                    
                    const itemEl = document.createElement('div');
                    itemEl.classList.add('cart-item');
                    itemEl.innerHTML = `
                        <img src="${product.img}" alt="${product.name}" class="cart-item-img ${product.filterClass || ''}">
                        <div class="cart-item-info">
                            <h4 class="cart-item-name">${product.name}</h4>
                            <span class="cart-item-desc">${product.desc}</span>
                            <div class="cart-item-quantity-price">
                                <span class="cart-item-qty">Qtd: ${item.quantity}</span>
                                <span class="cart-item-price">R$ ${(product.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        <button class="remove-item-btn" data-id="${item.id}" aria-label="Remover item">&times;</button>
                    `;
                    
                    itemEl.querySelector('.remove-item-btn').addEventListener('click', (e) => {
                        const itemId = e.target.getAttribute('data-id');
                        cart = cart.filter(cartItem => cartItem.id !== itemId);
                        saveCartToStorage();
                        updateCartUI();
                    });
                    
                    cartItemsList.appendChild(itemEl);
                });
            }
            
            const finalTotal = subtotal + selectedFreight;
            
            if(cartSubtotalEl) cartSubtotalEl.textContent = 'R$ ' + subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            if(cartTotalEl) cartTotalEl.textContent = 'R$ ' + finalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            if(cartCountBadge) cartCountBadge.textContent = totalItemsCount;

            if (selectedFreight > 0 && freightLine) {
                freightLine.style.display = 'flex';
                cartFreightValue.textContent = 'R$ ' + selectedFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
            } else if (freightLine) {
                freightLine.style.display = 'none';
            }
        }
        
        // Finalizar Compra e Criar Pedido
        if(checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                if (cart.length === 0) return;

                // --- REGRA DO ATACADO ---
                const wholesaleItems = cart.filter(item => PRODUCTS_DATA[item.productKey]?.category === 'atacado');
                const wholesaleQty = wholesaleItems.reduce((sum, item) => sum + item.quantity, 0);

                if (wholesaleItems.length > 0 && wholesaleQty < 6) {
                    alert('Atenção: O pedido mínimo para itens da categoria Atacado é de 6 unidades.');
                    return; 
                }
                // ------------------------

                if (selectedFreight === 0) {
                    alert('Por favor, calcule e selecione o frete antes de finalizar a compra.');
                    return;
                }
                
                let orderSubtotal = 0;
                const orderItems = cart.map(item => {
                    const product = PRODUCTS_DATA[item.productKey];
                    orderSubtotal += product.price * item.quantity;
                    return {
                        name: product.name,
                        qty: item.quantity,
                        price: product.price * item.quantity
                    };
                });

                orderItems.push({
                    name: 'Frete Selecionado',
                    qty: 1,
                    price: selectedFreight
                });
                
                const newOrder = {
                    id: 'AUR-' + Math.floor(100000 + Math.random() * 900000),
                    date: new Date().toLocaleDateString('pt-BR'),
                    items: orderItems,
                    total: orderSubtotal + selectedFreight,
                    status: 'preparo' 
                };
                
                orders.unshift(newOrder);
                cart = [];
                selectedFreight = 0;
                cepInput.value = '';
                freightOptions.style.display = 'none';
                
                saveCartToStorage();
                saveOrdersToStorage();
                updateCartUI();
                updateOrdersUI();
                tabOrdersBtn.click();
                
                simulateOrderStatusCycle(newOrder.id);
            });
        }
        
        // Atualizar interface gráfica de pedidos
        function updateOrdersUI() {
            if(!ordersListEl) return;
            ordersListEl.innerHTML = '';
            if(ordersCountBadge) ordersCountBadge.textContent = orders.length;
            
            if (orders.length === 0) {
                ordersListEl.innerHTML = `
                    <div class="no-orders" id="no-orders-msg">
                        <p>Nenhum pedido realizado ainda.</p>
                    </div>
                `;
            } else {
                orders.forEach(order => {
                    const orderCard = document.createElement('div');
                    orderCard.classList.add('order-card');
                    
                    let statusClass = 'status-confirmado';
                    let statusLabel = 'Confirmado';
                    
                    if (order.status === 'preparo') {
                        statusClass = 'status-preparo';
                        statusLabel = 'Em Preparação';
                    } else if (order.status === 'transito') {
                        statusClass = 'status-transito';
                        statusLabel = 'Em Trânsito';
                    } else if (order.status === 'entregue') {
                        statusClass = 'status-entregue';
                        statusLabel = 'Entregue';
                    }
                    
                    const itemsSummaryHtml = order.items.map(item => 
                        `<div>${item.qty}x ${item.name} <span style="float: right; color: var(--color-text-muted);">R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>`
                    ).join('');
                    
                    orderCard.innerHTML = `
                        <div class="order-header">
                            <span class="order-id">${order.id}</span>
                            <span class="order-date">${order.date}</span>
                        </div>
                        <div class="order-items-summary">
                            ${itemsSummaryHtml}
                        </div>
                        <div class="order-status-container">
                            <span class="order-status-badge ${statusClass}">${statusLabel}</span>
                        </div>
                        <div class="order-total-highlight">
                            <span>Valor Total Pago</span>
                            <span class="order-total-price">R$ ${order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    `;
                    
                    ordersListEl.appendChild(orderCard);
                });
            }
        }
        
        // Simular ciclo de status de pedidos
        function simulateOrderStatusCycle(orderId) {
            setTimeout(() => {
                const targetOrder = orders.find(o => o.id === orderId);
                if (targetOrder) {
                    targetOrder.status = 'transito';
                    saveOrdersToStorage();
                    updateOrdersUI();
                }
            }, 5000);
            
            setTimeout(() => {
                const targetOrder = orders.find(o => o.id === orderId);
                if (targetOrder) {
                    targetOrder.status = 'entregue';
                    saveOrdersToStorage();
                    updateOrdersUI();
                }
            }, 15000);
        }
        
        updateCartUI();
        updateOrdersUI();
    }
    
    // Inicialização condicional baseada na presença do Canvas 3D
    if (canvas) {
        preloadImages();
    } else {
        if (loader) {
            loader.classList.add('loader-hidden');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 800);
        }
        document.body.classList.add('loaded');
        initScrollReveal();
        initCartSystem();
    }
});