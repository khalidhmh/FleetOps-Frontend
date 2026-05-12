// ════════════════════════════════════════════════════════════════════════
// src/services/api/customer-portal.js — FleetOps Customer Portal API
//
// Replaces the localStorage-based StorageService with real HTTP calls
// to the Laravel backend running at http://127.0.0.1:8000/api.
//
// ENDPOINTS (mirrors Laravel routes):
//   GET  /customer-portal/support
//   POST /customer-portal/validate-token
//   GET  /customer-portal/orders/{token}
//   GET  /customer-portal/orders/{token}/tracking
//   POST /customer-portal/orders/{token}/preferences
//   POST /customer-portal/orders/{token}/feedback
//   POST /customer-portal/orders/{token}/ready
// ════════════════════════════════════════════════════════════════════════

const BASE_URL = "http://127.0.0.1:8000/api";

const api = {
    async get(endpoint) {
        const res = await fetch(BASE_URL + endpoint, {
            headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return { data: await res.json() };
    },
    async post(endpoint, bodyData) {
        const res = await fetch(BASE_URL + endpoint, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData || {})
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return { data: await res.json() };
    },
    async put(endpoint, bodyData) {
        const res = await fetch(BASE_URL + endpoint, {
            method: 'PUT',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData || {})
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return { data: await res.json() };
    }
};

// ─── Token helpers ────────────────────────────────────────────────────────────

/**
 * getTrackingToken()
 *
 * Resolves the customer's tracking token with the following priority:
 *   1. URL query string  ?token=   (canonical magic-link format)
 *   2. URL query string  ?tracking_code=  (alternate backend format)
 *   3. URL query string  ?code=    (short alias)
 *   4. URL hash fragment  #token=  (some email clients strip query strings)
 *   5. sessionStorage    cp_token  (persisted from a previous step)
 *
 * Any token found via 1-4 is immediately persisted to sessionStorage so
 * subsequent views on the same session can resolve it without the URL.
 *
 * @returns {string|null}
 */
function getTrackingToken() {
    // ── 1-3. Standard query-string params ──────────────────────────────────
    const params = new URLSearchParams(window.location.search);
    const tokenFromURL =
        params.get('token') ??
        params.get('tracking_code') ??
        params.get('code');

    if (tokenFromURL) {
        sessionStorage.setItem('cp_token', tokenFromURL);
        return tokenFromURL;
    }

    // ── 4. URL hash  (#token=...) ─────────────────────────────────────────
    if (window.location.hash) {
        const hashParams = new URLSearchParams(
            window.location.hash.replace(/^#/, '')
        );
        const tokenFromHash =
            hashParams.get('token') ??
            hashParams.get('tracking_code') ??
            hashParams.get('code');

        if (tokenFromHash) {
            sessionStorage.setItem('cp_token', tokenFromHash);
            return tokenFromHash;
        }
    }

    // ── 5. sessionStorage fallback ────────────────────────────────────────
    return sessionStorage.getItem('cp_token');
}

/**
 * clearTrackingToken()
 *
 * Removes the persisted token from sessionStorage.
 * Call this in destroy() hooks when the session ends (e.g. after
 * delivery confirmed or link-expired view is shown).
 */
function clearTrackingToken() {
    sessionStorage.removeItem('cp_token');
}

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * fetchSupportInfo()
 * GET /customer-portal/support
 *
 * Returns support contact details (phone, email, hours) shown on
 * the link-expired and delivery-failed views.
 *
 * @returns {Promise<object>}  { phone, email, workingHours, ... }
 */
async function fetchSupportInfo() {
    const { data } = await api.get('/customer-portal/support');
    return data;
}

/**
 * validateToken(token)
 * POST /customer-portal/validate-token
 *
 * Validates the tracking token from the magic link.
 * Called on entry before rendering any view.
 *
 * @param {string} token  The UUID token from the magic link.
 * @returns {Promise<{ valid: boolean, orderId?: string, status?: string }>}
 */
async function validateToken(token) {
    const { data } = await api.post('/customer-portal/validate-token', { token });
    return data;
}

/**
 * fetchOrder(token?)
 * GET /customer-portal/orders/{token}
 *
 * Fetches the full order object for this customer's tracking session.
 * Response shape mirrors the SEED_ORDER schema used by all views.
 *
 * @param {string} [token]  Tracking token (auto-resolved if omitted).
 * @returns {Promise<object|null>}  Order object, or null on failure.
 */
async function fetchOrder(token) {
    const t = token ?? getTrackingToken();
    if (!t) {
        // Expected when the view is loaded without going through /track first.
        console.warn('[CustomerPortalAPI] fetchOrder: no tracking token — returning null.');
        return null;
    }
    const { data } = await api.get(`/customer-portal/orders/${t}`);
    return data;
}

/**
 * fetchTracking(token?)
 * GET /customer-portal/orders/{token}/tracking
 *
 * Returns live tracking data: driver location, ETA, stop count, status.
 * Consumed by the in-transit and arriving-alerts views.
 *
 * @param {string} [token]  Tracking token (auto-resolved if omitted).
 * @returns {Promise<object|null>}  Tracking payload, or null on failure.
 */
async function fetchTracking(token) {
    const t = token ?? getTrackingToken();
    if (!t) {
        // Expected when the view is loaded without going through /track first.
        console.warn('[CustomerPortalAPI] fetchTracking: no tracking token — returning null.');
        return null;
    }
    const { data } = await api.get(`/customer-portal/orders/${t}/tracking`);
    return data;
}

/**
 * fetchTrackingByCode(trackingCode)
 * GET /api/v1/customer/tracking/{tracking_code}
 *
 * Entry-point fetch used by the /track dispatcher view.
 * Uses the v1 route format where the code is part of the path (not a
 * token embedded in the order URL).
 *
 * Response shape (expected):
 *   { status, orderId, driver, eta, timeline, preferences, ... }
 *
 * @param {string} trackingCode  The UUID / code from the magic link.
 * @returns {Promise<object>}    Tracking payload.
 * @throws  {Error}              On any non-2xx HTTP response.
 */
async function fetchTrackingByCode(trackingCode) {
    const { data } = await api.get(`/v1/customer/tracking/${trackingCode}`);
    return data;
}

/**
 * savePreferences(preferences, token?)
 * POST /customer-portal/orders/{token}/preferences
 *
 * Persists the customer's delivery preferences (door/lobby/etc + notes).
 * Called from the deliver-preferences view on save.
 *
 * @param {{ option: string, label: string, notes: string }} preferences
 * @param {string} [token]  Tracking token (auto-resolved if omitted).
 * @returns {Promise<object>}  Server confirmation payload.
 */
async function savePreferences(preferences, token) {
    const t = token ?? getTrackingToken();
    const { data } = await api.post(
        `/customer-portal/orders/${t}/preferences`,
        { ...preferences, savedAt: new Date().toISOString() },
    );
    return data;
}

/**
 * submitFeedback(feedback, token?)
 * POST /customer-portal/orders/{token}/feedback
 *
 * Submits the post-delivery rating + condition + comments from the
 * delivered view.
 *
 * @param {{ rating: number, condition: string|null, comments: string }} feedback
 * @param {string} [token]  Tracking token (auto-resolved if omitted).
 * @returns {Promise<object>}  Server confirmation payload.
 */
async function submitFeedback(feedback, token) {
    const t = token ?? getTrackingToken();
    const { data } = await api.post(
        `/customer-portal/orders/${t}/feedback`,
        { ...feedback, submittedAt: new Date().toISOString() },
    );
    return data;
}

/**
 * notifyDriverReady(token?)
 * POST /customer-portal/orders/{token}/ready
 *
 * Tells the backend (and driver) that the customer is ready to receive.
 * Triggered by the "I'm Ready" button in the arriving-alerts view.
 *
 * @param {string} [token]  Tracking token (auto-resolved if omitted).
 * @returns {Promise<object>}  Server acknowledgement payload.
 */
async function notifyDriverReady(token) {
    const t = token ?? getTrackingToken();
    const { data } = await api.post(`/customer-portal/orders/${t}/ready`, {});
    return data;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

const CustomerPortalAPI = {
    getTrackingToken,
    clearTrackingToken,
    fetchSupportInfo,
    validateToken,
    fetchOrder,
    fetchTracking,
    fetchTrackingByCode,
    savePreferences,
    submitFeedback,
    notifyDriverReady,
};

export {
    getTrackingToken,
    clearTrackingToken,
    fetchSupportInfo,
    validateToken,
    fetchOrder,
    fetchTracking,
    fetchTrackingByCode,
    savePreferences,
    submitFeedback,
    notifyDriverReady,
};

export default CustomerPortalAPI;
