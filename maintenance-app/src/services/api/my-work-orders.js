import api from "/shared/api-handler.js";

const BASE_URL = "http://localhost:8000";

let cachedOrders = [];

function authHeaders() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
}

function getCurrentMechanicId() {
    const user = getCurrentUser();
    return user?.mechanic_id ?? user?.user_id ?? user?.id ?? null;
}

async function get(path) {
    const { data: res } = await api.get(path, {
        baseURL: BASE_URL,
        headers: authHeaders(),
    });

    if (!res?.success) {
        throw new Error(res?.message || "Failed to load work orders.");
    }

    return res.data ?? [];
}

function unwrapItems(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.data)) {
        return payload.data;
    }

    return [];
}

function formatDate(value) {
    if (!value) {
        return "--";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).replace(",", "");
}

function toTitle(value) {
    return String(value ?? "")
        .replace(/_/g, " ")
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeStatus(value) {
    const status = String(value ?? "open").toLowerCase();
    const map = {
        assigned: "Assigned",
        closed: "Closed",
        in_progress: "In Progress",
        open: "Open",
        resolved: "Resolved",
    };

    return map[status] ?? toTitle(status);
}

function normalizeType(value) {
    const type = String(value ?? "routine").toLowerCase();
    if (type.includes("emergency")) return "Emergency";
    if (type.includes("breakdown")) return "Breakdown";
    return "Routine";
}

function normalizePriority(value) {
    const priority = String(value ?? "medium").toLowerCase();
    return ["critical", "high", "urgent"].includes(priority) ? "Urgent" : "Normal";
}

function vehicleLabel(vehicle, vehicleId) {
    return (
        vehicle?.VehicleLicense ||
        vehicle?.plate ||
        vehicle?.license_plate ||
        vehicle?.VehicleModel ||
        (vehicleId ? `Vehicle #${vehicleId}` : "Unknown Vehicle")
    );
}

function vehicleCategory(vehicle) {
    return vehicle?.VehicleType || vehicle?.type || vehicle?.category || "Maintenance";
}

function normalizeWorkOrder(raw) {
    const backendId = raw.work_order_id ?? raw.id;
    const type = normalizeType(raw.type);

    return {
        backendId,
        id: `WO-${String(backendId ?? "0").padStart(4, "0")}`,
        vehicle: vehicleLabel(raw.vehicle, raw.vehicle_id),
        category: vehicleCategory(raw.vehicle),
        type,
        priority: normalizePriority(raw.priority),
        status: normalizeStatus(raw.status),
        description: raw.description || raw.notes || "No description provided.",
        opened: formatDate(raw.opened_at || raw.created_at),
        updated: formatDate(raw.updated_at || raw.started_at || raw.assigned_at || raw.opened_at),
        cost: raw.repair_cost == null ? "--" : `${Number(raw.repair_cost).toLocaleString()} EGP`,
        files: [],
        raw,
    };
}

async function getAllWorkOrders() {
    const mechanicId = getCurrentMechanicId();

    if (!mechanicId) {
        cachedOrders = [];
        return [];
    }

    const payload = await get(`/api/v1/maintenance/work-orders/mechanic/${mechanicId}`);
    cachedOrders = unwrapItems(payload).map(normalizeWorkOrder);
    return cachedOrders.map((order) => ({ ...order }));
}

function getOrderById(id) {
    const key = String(id);
    const order = cachedOrders.find((order) => (
        String(order.id) === key || String(order.backendId) === key
    ));

    return order ? { ...order } : null;
}

export default {
    getAllWorkOrders,
    getOrderById,
};
