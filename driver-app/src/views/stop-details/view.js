import OrdersAPI from "../../services/api/orders.js";

/**
 * Stop Details View Module
 * Senior Frontend Implementation
 * 
 * Fetches and filters route orders to find the matching stop details.
 */
export async function mount(rootElement) {
    if (!rootElement) return;

    // 1. State Retrieval: Support URL params, snake_case (app default) and camelCase (prompt requirement)
    const urlParams = new URLSearchParams(window.location.search);
    const routeId = urlParams.get("routeId") || localStorage.getItem("route_id") || localStorage.getItem("routeId") || "4";
    const currentStopId = urlParams.get("stopId") || localStorage.getItem("current_stop_id") || localStorage.getItem("currentStopId") || "20005";

    try {
        // 2. Data Extraction: Fetch route orders using the service
        const response = await OrdersAPI.getRouteOrders(routeId);
        
        // Ensure we access the array correctly (response.data.data per JSON structure)
        const orders = response?.data?.data || [];

        // 3. Filtering: Find the exact order matching the current stop
        const order = orders.find(o => 
            o?.route_stops?.some(rs => String(rs.stop_id) === String(currentStopId))
        );

        if (!order) {
            console.error(`ERROR: Order for stop ID ${currentStopId} not found in route ${routeId}`);
            return;
        }

        // Find the specific route_stop object to get the stop_no
        const matchingStop = order?.route_stops?.find(rs => String(rs.stop_id) === String(currentStopId));

        // 4. DOM Mapping (CASE-SENSITIVE) with safety checks and optional chaining
        const safeSetText = (selector, text) => {
            const el = rootElement.querySelector(selector);
            if (el) el.textContent = text || 'N/A';
        };

        // Stop Number: Render "STOP #{stop_no}"
        safeSetText(".data-stop-number", matchingStop?.stop_no ? `STOP #${matchingStop.stop_no}` : "STOP #N/A");

        // Name: order?.customer?.user?.name || 'N/A'
        safeSetText(".data-customer-name", order?.customer?.user?.name || 'N/A');

        // Address: order?.Area || 'N/A'
        safeSetText(".data-address", order?.Area || 'N/A');

        // Helper to format time strings (e.g., "3.00" -> "3:00")
        const formatTime = (timeStr) => {
            if (!timeStr || typeof timeStr !== 'string') return timeStr;
            return timeStr.replace('.', ':');
        };

        // Time: Map ETA and format .data-time-window
        const rawEta = order?.ETA || 'N/A';
        const formattedEta = formatTime(rawEta);
        
        safeSetText(".data-eta", order?.ETA ? `ETA: ${formattedEta}` : 'N/A');
        
        const windowEl = rootElement.querySelector(".data-time-window");
        if (windowEl) {
            const rawWindow = order?.DeliveryTimeWindow || 'TBD';
            const formattedWindow = formatTime(rawWindow);
            windowEl.innerHTML = `${formattedEta} —<br>${formattedWindow}`;
        }

        // Price: order?.Price
        safeSetText(".data-payment-amount", order?.Price ? `EGP ${order.Price}` : 'N/A');

        // Phone: order?.customer?.phone_no (with fallback for common alternative paths)
        safeSetText(".data-phone-number", order?.customer?.phone_no || order?.customer?.user?.phone_no || 'N/A');

        // Instructions: order?.SpecialInstructions
        safeSetText(".data-special-instructions", order?.SpecialInstructions || 'N/A');

        // 5. COD Logic Bug-Fix
        const paymentStatusEl = rootElement.querySelector(".data-payment-status");
        if (paymentStatusEl) {
            const paymentMethod = order?.Payment_method?.toUpperCase() || "";
            if (paymentMethod.includes("COD")) {
                paymentStatusEl.textContent = "COD REQUIRED";
                // Apply red/danger CSS class
                paymentStatusEl.className = "label text-danger m-0 data-payment-status";
            } else {
                paymentStatusEl.textContent = "PAID";
                // Apply success CSS class
                paymentStatusEl.className = "label text-success m-0 data-payment-status";
            }
        }

        // 6. Navigation
        const scanBtn = rootElement.querySelector(".scan-parcel-btn") || rootElement.querySelector(".scan-btn");
        if (scanBtn) {
            scanBtn.addEventListener("click", (e) => {
                e.preventDefault();
                
                const orderId = order?.OrderID;
                if (orderId) {
                    // Save OrderID as expected_order_id for scanning validation
                    localStorage.setItem("expected_order_id", orderId);
                    
                    // SPA Navigation to /scan-qr with query param
                    const path = `/scan-qr?orderId=${orderId}`;
                    window.history.pushState({}, "", path);
                    window.dispatchEvent(new Event("popstate"));
                } else {
                    console.error("Cannot navigate: OrderID is missing from the data.");
                }
            });
        }

    } catch (error) {
        console.error("Critical error in Stop Details View:", error);
    }
}

/**
 * Cleanup logic when navigating away
 */
export function unmount() {
    // Shared router handles clearing innerHTML; no custom cleanup required here.
}
