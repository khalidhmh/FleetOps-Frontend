import api from "/shared/api-handler.js";
// تم عمل كومنت لاستدعاء الداتا الوهمية
// import { drivers } from "../storage/drivers.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

// تعديل البورت لـ 8000 عشان يكلم لارفيل
api.setBaseURL("http://localhost:8000/api");
// ─── API Methods ─────────────────────────────────────────────────────────────

/* // تم عمل كومنت للـ login والـ profile الوهمي مؤقتاً
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
*/

// ⬇️ ===== الجزء الجديد اللي تم إضافته لجلب الداتا من الـ API ===== ⬇️

/* // الـ mapping القديم البسيط — تم تعويضه بالـ mapping الكامل أدناه
async function getDrivers_OLD_SHALLOW() {
  try {
    const response = await api.get('/v1/users/drivers/Available');
    if (response.ok && response.data?.success) {
      return response.data.data.map(d => ({
        id: d.driver_id || d.id,
        name: d.user?.name || "Unknown Driver",
        license: d.license_no || "N/A",
        status: d.status || "Available",
        score: d.score || 0,
        phone: "N/A",
        vehicle: "Unassigned",
      }));
    }
    return [];
  } catch (error) {
    console.error("API Error:", error);
    return [];
  }
}
*/

/**
 * Fetches available drivers from the backend and maps each record to the
 * full nested structure expected by the Drivers view UI.
 *
 * Backend shape: { driver_id, license_no, status, safety_score, contact_number, average_rating, etc. }
 * UI shape:      { id, name, status, rating, contact, performance, vehicle, license }
 * 
 * @param {object} [options] - Optional settings, e.g. { signal } for AbortController.
 */
async function getDrivers(options = {}) {
  try {
    const response = await api.get(
      'http://localhost:8000/api/v1/users/drivers/Available',
      { signal: options.signal }
    );
    if (response.ok && response.data?.success) {
      // Return raw backend data directly as requested
      return response.data.data;
    }
    return [];
  } catch (error) {
    if (error?.name === 'AbortError') {
      console.debug('[DriverStorage] getDrivers() aborted.');
      throw error;
    }
    console.error('[DriverStorage] API Error in getDrivers():', error);
    return [];
  }
}
// ⬆️ ============================================================== ⬆️

/*
// تم عمل كومنت لدالة جلب الداتا الوهمية
async function getDriversMock() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...drivers]);
    }, 200);
  });
}
*/

// ────────────────────────────────────────────────────────────────
const DriverStorage = {
  // login,
  // getDriverProfile,
  getDrivers,
};

// export { drivers };
export default DriverStorage;
