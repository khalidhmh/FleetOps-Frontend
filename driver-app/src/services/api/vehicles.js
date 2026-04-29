import api from "/shared/api-handler.js";
import {vehicles} from "../storage/vehicles.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("http://localhost:3000");

// ─── API Methods ─────────────────────────────────────────────────────────────

function getVehicleById(vehicle_id) {
  const vehicle = vehicles.find((v) => v.vehicle_id === vehicle_id);
  if (vehicle) {
    return vehicle;
  }
  throw new Error("Vehicle not found");
};

// ────────────────────────────────────────────────────────────────

const VehiclesStorage = {
    getVehicleById
};

export { vehicles };
export default VehiclesStorage;
