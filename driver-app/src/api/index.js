import { drivers } from "../storage/drivers.js";
import { routes } from "../storage/routes.js";
import { vehicles } from "../storage/vehicles.js";
import { performanceData } from "../storage/performance.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function login(email, password) {
  await delay(500);
  const driver = drivers.find(
    (d) => d.email === email && d.password === password,
  );
  if (driver) {
    return driver;
  }
  throw new Error("Invalid email or password");
};

export async function getDriverProfile(id) {
  await delay(300);
  const driver = drivers.find((d) => d.id === id);
  if (driver) {
    return driver;
  }
  throw new Error("Driver not found");
};

export async function getDriverRoutes(driver_id) {
  await delay(400);
  return routes.filter((r) => r.driver_id === driver_id);
};

export async function getDriverPerformance(driver_id) {
  await delay(200);
  const perf = performanceData.find((p) => p.driver_id === driver_id);
  if (perf) return perf;
  throw new Error("Performance data not found");
};

export async function getAllPerformances() {
  await delay(300);
  return performanceData;
};

export async function getVehicleById(vehicle_id) {
  await delay(200);
  const vehicle = vehicles.find((v) => v.vehicle_id === vehicle_id);
  if (vehicle) {
    return vehicle;
  }
  throw new Error("Vehicle not found");
};

export async function getRouteDetails(route_id) {
  await delay(300);
  const route = routes.find((r) => r.route_id === route_id);
  if (route) {
    return route;
  }
  throw new Error("Route not found");
};

export async function getStopDetails(stop_id) {
  await delay(200);
  for (const route of routes) {
    const stop = route.stops.find((s) => s.stop_id === stop_id);
    if (stop) return stop;
  }
  throw new Error("Stop not found");
};

// Also we might need functions to update state
export async function markStopDelivered(
  route_id,
  stop_id,
  deliveryProof = null,
) {
  await delay(200);
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
};
