import OrdersAPI from "../../services/api/orders.js";
import api from "/shared/api-handler.js";

/**
 * Failed Delivery / Package Exception View Logic
 */

export async function mount(rootElement) {
    const { getOrdersByRoute } = OrdersAPI;

    // 1. Retrieve state from localStorage
    const active_stop_id = localStorage.getItem('active_stop_id');
    const expected_order_id = localStorage.getItem('expected_order_id');
    const routeId = localStorage.getItem('routeId');

    // 2. Data Extraction & DOM Mapping
    if (routeId && expected_order_id) {
        try {
            const { data: orders } = await getOrdersByRoute(routeId);
            const currentOrder = orders?.find(o => String(o.OrderID) === String(expected_order_id));

            // Locate the header element that displays the Order ID
            const orderIdHeader = rootElement.querySelector('.stack .helper-text');
            if (orderIdHeader) {
                orderIdHeader.textContent = `Order ID: #${currentOrder?.OrderID || 'UNKNOWN'} | RTB Protocol Triggered`;
            }
        } catch (error) {
            console.error("Failed to fetch route orders:", error);
        }
    }

    // 3. Form Handling & Submission
    const confirmBtn = rootElement.querySelector('.confirm-btn');
    const notesField = rootElement.querySelector('textarea');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const selectedReasonEl = rootElement.querySelector('input[name="reason"]:checked');
            const selectedReason = selectedReasonEl?.value;
            const notesValue = notesField?.value || '';

            // Validation: Ensure a reason is selected
            if (!selectedReason) {
                alert("Please select a reason for the failed delivery.");
                return;
            }

            // UI State: Loading
            const originalBtnContent = confirmBtn.innerHTML;
            confirmBtn.disabled = true;
            confirmBtn.textContent = "Processing...";

            try {
                // PATCH request to update stop status
                const payload = {
                    status: "failed",
                    exception_reason: selectedReason,
                    notes: notesValue
                };

                const { status } = await api.patch(`/api/v1/dispatch/stops/${active_stop_id}/status`, payload);

                // Success Navigation
                if (status === 200 || status === 204) {
                    window.location.href = '/active-route';
                } else {
                    throw new Error(`Unexpected status code: ${status}`);
                }
            } catch (error) {
                console.error("Status update failed:", error);
                alert("Failed to confirm delivery failure. Please check your connection and try again.");
                
                // Revert button state
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = originalBtnContent;
            }
        });
    }
}

export function unmount() {
    // Cleanup if necessary
}
