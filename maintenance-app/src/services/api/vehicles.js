import api from '/shared/api-handler.js';
import vehiclesData from '../storage/vehicles.js';

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL('http://localhost:3000');

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * getVehiclesData(signal?)
 *
 * Returns the full vehicles list.
 * Attempts GET /api/maintenance/vehicles first; falls back to the local
 * mock store if the endpoint is unavailable (404 / network error).
 *
 * @param {AbortSignal} [signal]  From the view's AbortController.
 * @returns {Promise<object[]>}
 */
async function getVehiclesData(signal) {
    try {
        const res = await fetch('http://localhost:3000/api/maintenance/vehicles', {
            headers: { Accept: 'application/json' },
            signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        // Backend may wrap data in { data: [...] } or return the array directly
        return Array.isArray(json) ? json : (json.data ?? []);
    } catch (err) {
        if (err?.name === 'AbortError') throw err; // Re-throw so caller can detect abort

        // Log and fall back to mock data in dev/offline environments
        console.warn('[VehiclesApi] Live fetch failed — using mock data:', err.message);
        return new Promise((resolve) => {
            setTimeout(() => resolve([...vehiclesData]), 200);
        });
    }
}

/**
 * getVehicleById(id, signal?)
 *
 * Returns a single vehicle by id.
 *
 * @param {string|number} id
 * @param {AbortSignal}   [signal]
 * @returns {Promise<object|null>}
 */
async function getVehicleById(id, signal) {
    try {
        const res = await fetch(`http://localhost:3000/api/maintenance/vehicles/${id}`, {
            headers: { Accept: 'application/json' },
            signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json.data ?? json;
    } catch (err) {
        if (err?.name === 'AbortError') throw err;

        console.warn('[VehiclesApi] getVehicleById failed — using mock data:', err.message);
        return new Promise((resolve) => {
            setTimeout(() => resolve(vehiclesData.find(v => v.id === id) || null), 200);
        });
    }
}

const VehiclesApi = {
    getVehiclesData,
    getVehicleById,
};

export default VehiclesApi;
