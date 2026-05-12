// ════════════════════════════════════════════════════════════════════════
// src/services/tracking-store.js — In-Memory Tracking Data Bus
//
// PURPOSE:
//   Acts as a lightweight shared store that the tracking orchestrator
//   (tracking/view.js) writes to after a single API fetch, and that each
//   status sub-view reads from so they never issue duplicate network
//   requests for the same data.
//
//   Because ES modules are singletons for the lifetime of the browser tab,
//   this module's state is shared across all views without any global
//   variable pollution.
//
// USAGE:
//   Orchestrator (tracking/view.js):
//     TrackingStore.set(payload);
//
//   Sub-view (in-transit/view.js):
//     const data = TrackingStore.get();
//     if (!data) { /* fallback: fetch independently */ }
//
// ════════════════════════════════════════════════════════════════════════

/** @type {object|null} */
let _orderData = null;

const TrackingStore = {
    /**
     * Store the fetched tracking payload.
     * @param {object|null} data
     */
    set(data) {
        _orderData = data;
    },

    /**
     * Retrieve the stored tracking payload.
     * @returns {object|null}
     */
    get() {
        return _orderData;
    },

    /**
     * Clear the store (called in destroy hooks so stale data
     * from one session cannot bleed into the next).
     */
    clear() {
        _orderData = null;
    },
};

export default TrackingStore;
