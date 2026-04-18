import api from "/shared/api-handler.js";
import {
    maintenanceVehiclesData,
    maintenanceWorkOrdersData,
    maintenanceAlertsData,
    stockWarningsData,
} from "../storage/maintenance.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("http://localhost:3000");

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * Returns the list of vehicles with health state info.
 */
function getVehicles() {
    return [...maintenanceVehiclesData];
}

/**
 * Returns the list of active/recent work orders.
 */
function getWorkOrders() {
    return [...maintenanceWorkOrdersData];
}

/**
 * Returns the list of maintenance alerts.
 */
function getAlerts() {
    return [...maintenanceAlertsData];
}

/**
 * Returns the list of low-stock inventory warnings.
 */
function getStockWarnings() {
    return [...stockWarningsData];
}

// ─── Export ───────────────────────────────────────────────────────────────────

const MaintenanceApi = {
    getVehicles,
    getWorkOrders,
    getAlerts,
    getStockWarnings,
};

export default MaintenanceApi;
