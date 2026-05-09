import OrdersAPI from "../../services/api/orders.js";

let stream = null;
let isScanning = true;

// --- Icons ---
const ICONS = {
    barcode: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14"></path><path d="M8 5v14"></path><path d="M12 5v14"></path><path d="M17 5v14"></path><path d="M21 5v14"></path></svg>`,
    checkmark: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
};

/**
 * QR/Barcode Scan View Module
 * Senior Frontend Implementation with dynamic Manifest Card.
 */
export async function mount(rootElement) {
    if (!rootElement) return;

    // 1. State Retrieval
    const routeId = localStorage.getItem("route_id") || localStorage.getItem("routeId") || "4";
    const expectedOrderId = localStorage.getItem("expected_order_id") || "1006";

    // UI Element Selectors
    const parcelIdEl = rootElement.querySelector(".data-stop-number");
    const customerNameEl = rootElement.querySelector(".data-customer-name");
    const areaEl = rootElement.querySelector(".industrial-chip"); 
    const verificationTextEl = rootElement.querySelector(".data-verification-text");
    const proceedBtn = rootElement.querySelector(".proceed-btn");
    const video = rootElement.querySelector(".qr-video");
    const scannerContainer = rootElement.querySelector(".scanner-container");
    const cardContainer = rootElement.querySelector(".order-card-container");

    let currentOrder = null;

    /**
     * Renders the dynamic package card based on current scan state.
     * @param {Object} orderData 
     * @param {string} state - 'pending' or 'scanned'
     */
    function renderOrderCard(orderData, state = 'pending') {
        if (!cardContainer) return;
        
        const isScanned = state === 'scanned';
        const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        cardContainer.innerHTML = `
            <div class="card row parcel-card ${isScanned ? 'scanned' : 'not-scanned'}">
                <div class="status-icon-box">
                    ${isScanned ? ICONS.checkmark : ICONS.barcode}
                </div>
                <div class="stack parcel-details">
                    <span class="status-text">${isScanned ? 'SCANNED' : 'PENDING SCAN'}</span>
                    <h4 class="package-id">Package ID: ${orderData?.OrderID || expectedOrderId}</h4>
                    <p class="package-meta">${orderData?.Type || 'Standard'} • ${orderData?.Weight || 0}kg</p>
                </div>
                ${isScanned ? `<div class="parcel-time">${currentTime}</div>` : ''}
            </div>
        `;
    }

    try {
        // 2. Fetch Data
        const response = await OrdersAPI.getOrdersByRoute(routeId);
        const orders = response?.data?.data || [];
        currentOrder = orders.find(o => String(o?.OrderID) === String(expectedOrderId));

        // 3. Populate Initial View
        if (parcelIdEl) parcelIdEl.textContent = `Order #${currentOrder?.OrderID || expectedOrderId}`;
        if (customerNameEl) customerNameEl.textContent = `Recipient: ${currentOrder?.customer?.user?.name || 'N/A'}`;
        if (areaEl) areaEl.textContent = currentOrder?.Area || 'N/A';
        
        // Render Initial Unscanned Card
        renderOrderCard(currentOrder, 'pending');

    } catch (error) {
        console.error("Failed to load order data:", error);
    }

    /**
     * Handles Scan Validation and DOM Updates
     */
    function handleScan(scannedCode) {
        if (!isScanning) return;

        const isMatch = String(scannedCode) === String(expectedOrderId);

        if (isMatch) {
            // SUCCESS: Update DOM and Enable Proceed
            renderOrderCard(currentOrder, 'scanned');
            
            if (verificationTextEl) {
                verificationTextEl.textContent = "✅ PARCEL MATCHED SUCCESSFULLY";
                verificationTextEl.style.color = "var(--color-success, #4caf50)";
            }
            
            if (proceedBtn) {
                proceedBtn.disabled = false;
                proceedBtn.classList.remove("secondary");
                proceedBtn.classList.add("primary");
                proceedBtn.textContent = "CONFIRM DELIVERY ✓";
            }

            // Play Success Sound
            try {
                const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3");
                audio.play();
            } catch (e) { /* silent fail */ }

            isScanning = false; 
        } else {
            // ERROR: Show mismatch alert
            if (verificationTextEl) {
                verificationTextEl.innerHTML = `
                    <span style="color: var(--color-danger, #f44336); font-weight: bold;">❌ WRONG PARCEL!</span><br>
                    <small>Scanned: ${scannedCode} | Expected: ${expectedOrderId}</small>
                `;
            }
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }
    }

    // Simulation/Testing support
    if (scannerContainer) {
        scannerContainer.addEventListener("click", () => handleScan(expectedOrderId));
    }

    // Camera Init
    async function initCamera() {
        if (!video) return;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            video.srcObject = stream;
            video.setAttribute("playsinline", true);
            await video.play();
        } catch (err) {
            console.error("Camera access denied:", err);
            if (verificationTextEl) verificationTextEl.textContent = "CAMERA ERROR: ACCESS DENIED";
        }
    }

    // Footer Navigation
    if (proceedBtn) {
        proceedBtn.addEventListener("click", () => {
            window.history.pushState({}, "", "/digital-signature-page");
            window.dispatchEvent(new Event("popstate"));
        });
    }

    initCamera();
}

export function unmount() {
    isScanning = false;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}
