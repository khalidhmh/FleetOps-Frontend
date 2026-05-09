import api from "/shared/api-handler.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("http://localhost:8000");

// ─── API Methods ─────────────────────────────────────────────────────────────

/**
 * Submits a pre-trip inspection record to the backend.
 *
 * @param {Object} payload - The inspection data matching the backend contract.
 * @returns {Promise<Object>} The API response data.
 */
async function submitInspection(payload) {
  const response = await api.post("/api/v1/orders/inspections", payload);
  return response.data;
}

// ────────────────────────────────────────────────────────────────
const InspectionsAPI = {
  submitInspection,
};

export default InspectionsAPI;