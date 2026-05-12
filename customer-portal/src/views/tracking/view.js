// ════════════════════════════════════════════════════════════════════════
// src/views/tracking/view.js — Tracking Orchestrator
//
// HOW IT WORKS:
//   This module is the single entry point for the /track route. It:
//     1. Shows a loading spinner while the API call is in flight.
//     2. Calls fetchTrackingByCode(trackingCode) — ONE network request.
//     3. Stores the result in TrackingStore (shared singleton) so sub-views
//        can read data without issuing duplicate requests.
//     4. Evaluates the order status and dynamically imports the correct
//        sub-view module.
//     5. Renders the sub-view's HTML into the router outlet directly,
//        then calls subView.init(outlet, data) passing the pre-fetched data.
//
// SUB-VIEW CONTRACT:
//   Each status sub-view MUST export:
//     export async function init(root, data) { … }
//     export function destroy(root) { … }
//
//   The `data` argument is the full tracking payload from the API.
//   Sub-views should use it directly and only fall back to their own
//   fetch if `data` is null.
//
// STATUS → SUB-VIEW MAPPING:
//   'Confirmed' | 'Processing' | 'Preparing'  →  order-confirmed
//   'Dispatched' | 'InTransit' | 'PickedUp'   →  in-transit
//   'Arriving'  | 'Nearby'                    →  arriving-alerts
//   'Delivered'                                →  delivered
//   'AttemptFailed' | 'Failed'                →  delivery-failed
//   403 / 404 / is_expired                    →  link-expired
//
// ════════════════════════════════════════════════════════════════════════

import { getTrackingToken, fetchTrackingByCode } from '../../services/api/customer-portal.js';
import TrackingStore from '../../services/tracking-store.js';

// ── Module-level state ───────────────────────────────────────────────────

/** Cleanup fns registered during init — removed in destroy(). */
const _cleanups = [];

/** Reference to the active sub-view module so destroy() can call its hook. */
let _activeSubView = null;

// ── Status → sub-view path map ───────────────────────────────────────────

/**
 * Maps normalised backend `status` strings to their sub-view asset paths.
 * Keys are always lowercase with underscores.
 *
 * @type {Record<string, { html: string, css: string, js: string }>}
 */
const STATUS_VIEW_MAP = {
    // ── Order placed & being prepared ──────────────────────────────────
    confirmed:            viewPaths('order-confirmed'),
    processing:           viewPaths('order-confirmed'),
    preparing:            viewPaths('order-confirmed'),
    order_confirmed:      viewPaths('order-confirmed'),

    // ── Driver en route ─────────────────────────────────────────────────
    dispatched:           viewPaths('in-transit'),
    in_transit:           viewPaths('in-transit'),
    intransit:            viewPaths('in-transit'),
    picked_up:            viewPaths('in-transit'),

    // ── Driver very close ────────────────────────────────────────────────
    arriving:             viewPaths('arriving-alerts'),
    nearby:               viewPaths('arriving-alerts'),
    out_for_delivery:     viewPaths('arriving-alerts'),
    almost_there:         viewPaths('arriving-alerts'),

    // ── Successfully delivered ───────────────────────────────────────────
    delivered:            viewPaths('delivered'),

    // ── Delivery attempt failed ──────────────────────────────────────────
    attemptfailed:        viewPaths('delivery-failed'),
    attempt_failed:       viewPaths('delivery-failed'),
    delivery_failed:      viewPaths('delivery-failed'),
    failed:               viewPaths('delivery-failed'),
    attempt_unsuccessful: viewPaths('delivery-failed'),
};

const FALLBACK_VIEW = viewPaths('order-confirmed');
const EXPIRED_VIEW  = viewPaths('link-expired');

/** Builds a view asset path triple from a view folder name. */
function viewPaths(folder) {
    return {
        html: `src/views/${folder}/view.html`,
        css:  `src/views/${folder}/view.css`,
        js:   `src/views/${folder}/view.js`,
    };
}

// ── Loading / Error HTML ─────────────────────────────────────────────────

const LOADING_HTML = `
<div class="ctv-shell" id="ctv-shell">
  <div class="ctv-state ctv-state--loading" id="ctv-loading" aria-live="polite">
    <div class="ctv-spinner" aria-hidden="true"></div>
    <p class="ctv-loading-text">Loading your order…</p>
  </div>
</div>`;

function errorHTML(message) {
    return `
<div class="ctv-shell" id="ctv-shell">
  <div class="ctv-state ctv-state--error" id="ctv-error">
    <div class="ctv-error-icon" aria-hidden="true">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.8"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <h2 class="ctv-error-title">Something went wrong</h2>
    <p class="ctv-error-body">${message}</p>
    <button class="ctv-retry-btn" id="ctv-retry-btn">Try Again</button>
  </div>
</div>`;
}

// ── Core orchestrator ────────────────────────────────────────────────────

/**
 * initCustomerTracking(trackingCode, outlet)
 *
 * Fetches the tracking payload, selects the correct sub-view based on
 * the order status, injects it into the outlet, and calls its init()
 * hook with the pre-fetched data.
 *
 * @param {string}  trackingCode  UUID from the magic link.
 * @param {Element} outlet        Router outlet DOM element.
 */
async function initCustomerTracking(trackingCode, outlet) {
    // ── 1. Show loading spinner ───────────────────────────────────────────
    outlet.innerHTML = LOADING_HTML;

    // ── 2. Fetch ONE time from the backend ────────────────────────────────
    let data = null;
    let isExpired = false;

    try {
        data = await fetchTrackingByCode(trackingCode);

        // Some backends embed expiry inside a 200 payload
        if (data?.is_expired === true || data?.error === 'link_expired') {
            isExpired = true;
            data = null;
        }

    } catch (err) {
        const statusCode = err?.message?.match(/\d{3}/)?.[0];

        if (statusCode === '403' || statusCode === '404') {
            // Treat as expired / unknown link
            isExpired = true;

        } else if (err instanceof TypeError) {
            // Network / CORS failure
            outlet.innerHTML = errorHTML(
                'Could not reach the server. ' +
                'Please check your internet connection and try again.'
            );
            wireRetryButton(outlet, trackingCode);
            return;

        } else {
            // Any other HTTP error (500, etc.)
            outlet.innerHTML = errorHTML(
                err?.message
                    ? `Request failed: ${err.message}`
                    : 'An unexpected error occurred. Please try again.'
            );
            wireRetryButton(outlet, trackingCode);
            return;
        }
    }

    // ── 3. Resolve the correct sub-view paths ─────────────────────────────
    let paths;

    if (isExpired) {
        paths = EXPIRED_VIEW;
    } else {
        // Normalise: lowercase, spaces → underscores
        const normalised = (data?.status ?? '')
            .toLowerCase()
            .replace(/\s+/g, '_');
        paths = STATUS_VIEW_MAP[normalised] ?? FALLBACK_VIEW;
        console.log(`[Orchestrator] status="${data?.status}" → ${paths.html}`);
    }

    // ── 4. Write data to the shared store ─────────────────────────────────
    //    Sub-views imported below call TrackingStore.get() instead of
    //    making their own HTTP request.
    TrackingStore.set(data);

    // ── 5. Fetch & inject the sub-view HTML ───────────────────────────────
    const ts = Date.now();
    let subHtml;

    try {
        const htmlRes = await fetch(`/${paths.html}?t=${ts}`, { cache: 'no-store' });
        if (!htmlRes.ok) throw new Error(`HTTP ${htmlRes.status}`);
        subHtml = await htmlRes.text();
    } catch (err) {
        outlet.innerHTML = errorHTML(`Could not load view: ${err.message}`);
        return;
    }

    outlet.innerHTML = subHtml;

    // ── 6. Inject the sub-view CSS ────────────────────────────────────────
    const oldStyle = document.head.querySelector('link[data-orchestrator-style]');
    if (oldStyle) oldStyle.remove();

    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = `/${paths.css}?t=${ts}`;
    styleLink.dataset.orchestratorStyle = paths.css;
    document.head.appendChild(styleLink);

    // ── 7. Import & run the sub-view JS module ────────────────────────────
    const rawModule = await import(/* @vite-ignore */ `/${paths.js}?t=${ts}`);

    // Normalise named-export vs default-export module shapes
    const mod = (typeof rawModule?.init === 'function')
        ? rawModule
        : (rawModule?.default ?? {});

    _activeSubView = mod;

    if (typeof mod.init === 'function') {
        // Pass (root, data) — sub-views that only accept (root) also work
        // because extra arguments are safely ignored in JS.
        await mod.init(outlet, data);
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Wires the "Try Again" button that appears inside an error state.
 * Re-runs initCustomerTracking on click.
 */
function wireRetryButton(outlet, trackingCode) {
    const btn = outlet.querySelector('#ctv-retry-btn');
    if (!btn) return;

    const handler = () => initCustomerTracking(trackingCode, outlet);
    btn.addEventListener('click', handler);
    _cleanups.push(() => btn.removeEventListener('click', handler));
}

// ── SPA Lifecycle Hooks ──────────────────────────────────────────────────

/**
 * init(root)
 * Called by the router when the /track route becomes active.
 *
 * @param {Element} root  The router outlet element.
 */
export async function init(root) {
    // Reset module state for SPA re-entry
    _cleanups.forEach(fn => fn());
    _cleanups.length = 0;
    _activeSubView = null;
    TrackingStore.clear();

    // Resolve token from ?token= URL param, falling back to sessionStorage
    const trackingCode = getTrackingToken();

    if (!trackingCode) {
        root.innerHTML = errorHTML(
            'No tracking code found in your link. ' +
            'Please use the link from your SMS or email notification.'
        );
        return;
    }

    await initCustomerTracking(trackingCode, root);
}

/**
 * destroy(root)
 * Called by the router before navigating away from /track.
 *
 * @param {Element} root
 */
export function destroy(root) {
    // Tear down the active sub-view (removes its own listeners / Leaflet map)
    if (_activeSubView?.destroy) {
        _activeSubView.destroy(root);
    }
    _activeSubView = null;

    // Remove orchestrator-level cleanup handlers
    _cleanups.forEach(fn => fn());
    _cleanups.length = 0;

    // Remove the dynamically-injected sub-view stylesheet
    document.head
        .querySelector('link[data-orchestrator-style]')
        ?.remove();

    // Clear shared data so stale data can't bleed into the next session
    TrackingStore.clear();

    root.innerHTML = '';
}
