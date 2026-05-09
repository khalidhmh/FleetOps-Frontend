import api from "/shared/api-handler.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("http://localhost:8000");

// ─── API Methods ─────────────────────────────────────────────────────────────

/**
 * Fetches all stops for a given route from the backend.
 *
 * @param {string|number} routeId - The route ID.
 * @returns {Promise<Array>} Array of stop objects.
 */
async function getRouteStops(routeId) {
  const response = await api.get(`/api/v1/dispatch/routes/${routeId}/stops`);
  return response.data.data;
}

/**
 * Fetches details for a specific stop.
 *
 * @param {string|number} stopId - The stop ID.
 * @returns {Promise<Object>} Stop details object.
 */
async function getStopDetails(stopId) {
  const response = await api.get(`/api/v1/dispatch/stops/${stopId}`);
  return response.data.data;
}

// ────────────────────────────────────────────────────────────────

const RouteStopsAPI = {
  getRouteStops,
  getStopDetails,
};

export default RouteStopsAPI;
