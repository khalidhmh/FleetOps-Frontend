import api from "/shared/api-handler.js";
import {routes} from "../storage/routes.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────
  
api.setBaseURL("http://localhost:3000");

// ─── API Methods ─────────────────────────────────────────────────────────────

function getDriverRoutes(driver_id) {
  return routes.filter((r) => r.driver_id === driver_id);
};

function getRouteDetails(route_id) {
  const route = routes.find((r) => r.route_id === route_id);
  if (route) {
    return route;
  }
  throw new Error("Route not found");
};

function getStopDetails(stop_id) {
  for (const route of routes) {
    const stop = route.stops.find((s) => s.stop_id === stop_id);
    if (stop) return stop;
  }
  throw new Error("Stop not found");
};


// ────────────────────────────────────────────────────────────────

const RoutesStorage = {
    getDriverRoutes,
    getRouteDetails,
    getStopDetails,
};

export { routes };
export default RoutesStorage;
