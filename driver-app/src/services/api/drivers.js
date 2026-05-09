import api from "/shared/api-handler.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("http://localhost:8000");

// ─── API Methods ─────────────────────────────────────────────────────────────

async function login(email, password) {
  const response = await api.post("/api/v1/auth/login", { email, password });
  return response.data;
}

/**
 * Fetches a driver/user profile from the backend.
 *
 * @param {string|number} id - The user ID.
 * @returns {Promise<Object>} The user data object.
 */
async function getDriverProfile(id) {
  const response = await api.get(`/api/v1/users/${id}`);
  return response.data.data;
}

// ────────────────────────────────────────────────────────────────
const DriverStorage = {
  login,
  getDriverProfile,
};

export default DriverStorage;
