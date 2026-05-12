import api from "/shared/api-handler.js";

const API_BASE = "http://localhost:8000/api/v1";
const IMPORT_NOTE =
    "CSV and XML files are supported. Imported rows are validated before they are added to orders.";
const IMPORT_FORMATS = {
    csv: "csv",
    txt: "csv",
    xml: "xml",
};
const ORDER_PAYMENT_OPTIONS = ["Prepaid", "Cash", "COD", "Card"];
const ORDER_PRIORITY_OPTIONS = ["Low", "Normal", "High", "Urgent"];
const ORDER_STATUS_OPTIONS = [
    "All",
    "Pending",
    "Assigned",
    "Out for Delivery",
    "Delivered",
    "Failed",
    "Returned",
];

async function getOrders() {
    try {
        const response = await api.get(`${API_BASE}/orders?per_page=100`);
        const dbOrders = response.data?.data?.data || [];
        return dbOrders.map(mapBackendOrderToFrontend);
    } catch (error) {
        console.error("Failed to fetch orders:", error);
        return [];
    }
}

async function getOrderById(orderId) {
    try {
        const id = orderId.replace("ORD-", "");
        const response = await api.get(`${API_BASE}/orders/${id}`);
        if (response.data && response.data.success && response.data.data) {
            const raw = response.data.data;

            // ── Diagnostic: log the raw tracking fields the backend returned
            console.debug(
                `[Orders] Raw API response for ${orderId}:`,
                '\n  tracking_url     =>', raw.tracking_url,
                '\n  LiveTrackingLink =>', raw.LiveTrackingLink,
            );

            return mapBackendOrderToFrontend(raw);
        }
        return null;
    } catch (error) {
        console.error(`Failed to fetch order ${orderId}:`, error);
        return null;
    }
}

function getStatusOptions() {
    return [...ORDER_STATUS_OPTIONS];
}

function getPriorityOptions() {
    return [...ORDER_PRIORITY_OPTIONS];
}

function getPaymentOptions() {
    return [...ORDER_PAYMENT_OPTIONS];
}

function getImportNote() {
    return IMPORT_NOTE;
}

async function createOrder(payload) {
    try {
        const paymentType = payload.paymentType === "COD" ? "COD" : "prepaid";
        const backendPayload = {
            customer_name: payload.customerName?.trim(),
            customer_phone: payload.customerPhone?.trim(),
            customer_email: payload.customerEmail?.trim() || null,
            delivery_address: payload.address?.trim(),
            lat: Number(payload.latitude),
            lng: Number(payload.longitude),
            weight_kg: Number(payload.weightKg) || 0,
            volume_m3: Number(payload.volumeM3) || 0,
            payment_type: paymentType,
            cod_amount: paymentType === "COD" ? Number(payload.codAmount) || 0 : null,
            priority: payload.priority === "High" || payload.priority === "Urgent" ? "express" : "normal",
            delivery_preference: payload.paymentWindow?.trim() || null,
            notes: payload.notes?.trim() || null,
        };
        const response = await api.post(`${API_BASE}/orders`, backendPayload);
        if (response.data && response.data.success) {
            return mapBackendOrderToFrontend(response.data.data);
        }
        return null;
    } catch (error) {
        console.error("Failed to create order:", error);
        return null;
    }
}

async function importOrders(file) {
    try {
        if (!file) {
            throw new Error("Please select a CSV or XML file first.");
        }

        const formData = new FormData();
        const extension = file.name.split(".").pop().toLowerCase();
        const format = IMPORT_FORMATS[extension];

        if (!format) {
            throw new Error("Only CSV and XML order imports are supported.");
        }
        
        formData.append("file", file);
        formData.append("format", format);

        const response = await api.post(`${API_BASE}/orders/import`, formData);

        if (response.data && response.data.success) {
            return {
                imported: Number(response.data.data?.imported) || 0,
                errors: response.data.data?.errors || [],
                batchId: response.data.data?.batch_id || null,
            };
        }
        throw new Error(response.data?.message || "Import failed");
    } catch (error) {
        console.error("Failed to import orders:", error);
        throw new Error(error.data?.message || error.message || "Import failed");
    }
}

function mapBackendOrderToFrontend(dbOrder) {
    const createdAt = dbOrder.Created_at || dbOrder.created_at;
    const dateStr = createdAt ? new Date(createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'}) : "Unknown Date";
    
    // We map backend priority values (e.g. integer 64 to strings) if needed, but if it's already a string, keep it.
    let priorityStr = "Normal";
    if (typeof dbOrder.Priority === 'string') {
        priorityStr = dbOrder.Priority;
    } else if (dbOrder.Priority > 50) {
        priorityStr = "High";
    }

    return {
        id: `ORD-${dbOrder.OrderID || dbOrder.id}`,
        customerName: dbOrder.customer?.user?.name || "Unknown Customer",
        customerPhone: dbOrder.customer?.user?.phone_no || "--",
        customerEmail: dbOrder.customer?.user?.email || "--",
        address: dbOrder.Area || dbOrder.DeliveryAddress || "--",
        weightKg: Number(dbOrder.Weight) || 0,
        volumeM3: Number(dbOrder.Volume) || 0,
        paymentType: dbOrder.Payment_method || "Prepaid",
        paymentWindow: dbOrder.DeliveryTimeWindow || "09:00-12:00",
        priority: priorityStr,
        status: dbOrder.Status || "Pending",
        // tracking_url: use the backend-provided link exclusively.
        // Prefer the snake_case `tracking_url` field (new API), then
        // the PascalCase `LiveTrackingLink` (legacy field).
        // If neither is present, set null — the view renders a disabled
        // "No Token" chip instead of a broken or fabricated link.
        tracking_url: dbOrder.tracking_url || dbOrder.LiveTrackingLink || null,
        driver: dbOrder.driver ? {
            name: dbOrder.driver.user?.name || "Unknown",
            initials: (dbOrder.driver.user?.name || "U").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase(),
            code: dbOrder.driver.DriverLicenseNumber || `--`
        } : null,
        vehicleId: dbOrder.vehicle?.VehicleLicense || null,
        createdAt: dateStr,
        liveTrackingMessage: "Order tracking activated.",
        liveTrackingHint: "Customer can view status changes.",
        notificationsSummary: { sent: 1, total: 1, failed: 0 },
        notifications: [
            {
                channel: "System",
                icon: "bell",
                sentAt: dateStr,
                content: `Order imported into system`,
                status: "Sent",
            }
        ],
        timeline: [
            {
                title: "Order Created",
                description: "Order added to the system.",
                at: dateStr,
                notified: false,
            },
        ],
    };
}

const OrdersApi = {
    createOrder,
    getImportNote,
    getOrderById,
    getOrders,
    getPaymentOptions,
    getPriorityOptions,
    getStatusOptions,
    importOrders,
};

export default OrdersApi;
