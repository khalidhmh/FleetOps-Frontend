import api from "/shared/api-handler.js";
import { routes } from "../storage/routes.js"; // TODO: remove when mock methods are integrated

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("http://localhost:8000");

// ─── API Methods ─────────────────────────────────────────────────────────────

/**
 * Fetches all routes assigned to a driver from the backend.
 *
 * @param {string|number} driver_id - The driver's user ID.
 * @returns {Promise<Array>} Array of route objects.
 */
async function getDriverRoutes(driver_id) {
  const response = await api.get(`/api/v1/dispatch/routes/driver/${driver_id}`);
  return response.data.data;
}

/**
 * Notifies the backend that the driver has arrived at a stop.
 * Uses PATCH /api/v1/dispatch/stops/{stopId}/status
 *
 * @param {string|number} stopId - The stop ID.
 * @returns {Promise<Object>} The API response envelope ({ success, message }).
 */
async function markArrived(stopId) {
  const response = await api.patch(`/api/v1/dispatch/stops/${stopId}/status`, {
    status: "arrived",
  });
  return response.data;
}

// ─── Mock Methods (used by other views — to be integrated separately) ────────

function getRouteDetails(route_id) {
  const route = routes.find((r) => r.route_id === route_id);
  if (route) {
    return route;
  }
  throw new Error("Route not found");
}

function getStopDetails(stop_id) {
  for (const route of routes) {
    const stop = route.stops.find((s) => s.stop_id === stop_id);
    if (stop) return stop;
  }
  throw new Error("Stop not found");
}

function markStopDelivered(route_id, stop_id, deliveryProof = null) {
  const route = routes.find((r) => r.route_id === route_id);
  if (route) {
    const stop = route.stops.find((s) => s.stop_id === stop_id);
    if (stop) {
      stop.status = "delivered";
      if (deliveryProof) {
        stop.delivery_proof = deliveryProof;
      }
      return stop;
    }
  }
  throw new Error("Stop not found");
}

// ────────────────────────────────────────────────────────────────

const RoutesStorage = {
  getDriverRoutes,
  markArrived,
  getRouteDetails,
  getStopDetails,
  markStopDelivered,
};


export default RoutesStorage;
