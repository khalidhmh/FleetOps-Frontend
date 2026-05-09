import api from "/shared/api-handler.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────
api.setBaseURL("http://localhost:8000");

// ─── API Methods ─────────────────────────────────────────────────────────────

/**
 * Submit a new incident report
 * @param {Object} payload 
 * @returns {Promise<Object>}
 */
async function submitIncidentReport(payload) {
    const response = await api.post("/api/v1/analytics/reports/incidents-reports", payload);
    return response.data;
}

// ────────────────────────────────────────────────────────────────
const IncidentStorage = {
    submitIncidentReport,
};

export default IncidentStorage;
