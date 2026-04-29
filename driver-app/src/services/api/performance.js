import api from "/shared/api-handler.js";
import {performanceData} from "../storage/performance.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("http://localhost:3000");

// ─── API Methods ─────────────────────────────────────────────────────────────

function getAllPerformances() {
  return performanceData;
};

function getDriverPerformance(driver_id) {
  const perf = performanceData.find((p) => p.driver_id === driver_id);
  if (perf) return perf;
  throw new Error("Performance data not found");
};

// ────────────────────────────────────────────────────────────────


const PerformanceStorage = {
    getDriverPerformance,
    getAllPerformances,
};

export { performanceData };
export default PerformanceStorage;
