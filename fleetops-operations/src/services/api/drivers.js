import api from "/shared/api-handler.js";
import { drivers } from "../storage/drivers.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("http://localhost:3000");

// ─── API Methods ─────────────────────────────────────────────────────────────

function login(email, password) {
  const driver = drivers.find(
    (d) => d.email === email && d.password === password,
  );
  if (driver) {
    return driver;
  }
  throw new Error("Invalid email or password");
}

function getDriverProfile(id) {
  const driver = drivers.find((d) => d.id === id);
  if (driver) {
    return driver;
  }
  throw new Error("Driver not found");
}

async function getDrivers() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...drivers]);
    }, 200);
  });
}

// ────────────────────────────────────────────────────────────────
const DriverStorage = {
  login,
  getDriverProfile,
  getDrivers,
};

export { drivers };
export default DriverStorage;
