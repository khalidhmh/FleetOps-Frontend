import api from "/shared/api-handler.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("http://localhost:8000");

// ─── API Methods ─────────────────────────────────────────────────────────────

async function getReconciliationSummary(routeId) {
  const response = await api.get(`/api/v1/analytics/reconciliation/summary/${routeId}`);
  return response.data.data;
}

// ────────────────────────────────────────────────────────────────
const CodStorage = {
  getReconciliationSummary,
};

export default CodStorage;
