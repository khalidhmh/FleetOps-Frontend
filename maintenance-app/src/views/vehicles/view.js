// ════════════════════════════════════════════════════════════════════════
// src/views/vehicles/view.js — Maintenance App · Vehicles List
//
// LIFECYCLE:
//   mount()   → abort any stale request, init AbortController, fetch data
//   unmount() → abort in-flight request, remove all event listeners
//
// DATA MAPPING:
//   Backend (snake_case)   →  UI field
//   ────────────────────────────────────────────────────────────────────
//   plate                  →  License Plate
//   type                   →  Type
//   vehicle_model          →  Make & Model
//   status                 →  Status
//   odometer               →  Odometer  (formatted as "X km")
//   last_service_date      →  Last Service
//   next_service_date      →  Next Service
//   insurance_expiry       →  Insurance Expiry
//   market_value           →  Market Value  (formatted as "SAR X")
//   cost_to_value_ratio    →  CTV
//   id                     →  used for View link
// ════════════════════════════════════════════════════════════════════════

import VehiclesApi from '../../services/api/vehicles.js';

// ── Module-level state ───────────────────────────────────────────────────

/** @type {boolean} Guards against state updates after unmount. */
let _mounted = false;

/** @type {AbortController|null} Cancelled when the view unmounts. */
let _fetchAbortController = null;

/** @type {{ type: string, fn: EventListener }[]} Tracked for cleanup. */
let _docListeners = [];

/** @type {Array} Raw vehicles from the last successful fetch. */
let _allVehicles = [];

// ── Data adapter ─────────────────────────────────────────────────────────

/**
 * mapVehicle(raw)
 *
 * Normalises a backend vehicle object to the shape the UI expects.
 * Handles both snake_case API responses and the legacy camelCase mock shape
 * so the view works regardless of which data source is active.
 *
 * @param {object} raw  Raw vehicle object from the API / mock store.
 * @returns {object}    Normalised vehicle object.
 */
function mapVehicle(raw) {
    // Odometer: backend returns a number (km), format with comma separator
    const odoRaw = raw.odometer ?? raw.odometer_km ?? 0;
    const odometer = odoRaw
        ? `${Number(odoRaw).toLocaleString()} km`
        : 'N/A';

    // Market value: backend may return a number or pre-formatted string
    const mvRaw = raw.market_value ?? raw.marketValue;
    const marketValue = mvRaw != null
        ? (typeof mvRaw === 'number'
            ? `SAR ${Number(mvRaw).toLocaleString()}`
            : mvRaw)
        : 'N/A';

    // CTV: cost-to-value ratio, may come as decimal (0.72) or percent string
    const ctvRaw = raw.cost_to_value_ratio ?? raw.ctv;
    const ctv = ctvRaw != null
        ? (typeof ctvRaw === 'number' && ctvRaw <= 1
            ? `${Math.round(ctvRaw * 100)}%`
            : String(ctvRaw))
        : 'N/A';

    return {
        id:             raw.id,
        licensePlate:   raw.plate            ?? raw.licensePlate    ?? 'N/A',
        type:           raw.type                                    ?? 'N/A',
        makeAndModel:   raw.vehicle_model    ?? raw.makeAndModel    ?? 'N/A',
        status:         raw.status                                  ?? 'Unknown',
        odometer,
        lastService:    raw.last_service_date  ?? raw.lastService   ?? 'N/A',
        nextService:    raw.next_service_date  ?? raw.nextService   ?? 'N/A',
        insuranceExpiry:raw.insurance_expiry   ?? raw.insuranceExpiry ?? 'N/A',
        marketValue,
        ctv,
    };
}

// ── Rendering ────────────────────────────────────────────────────────────

/**
 * renderTable(vehicles)
 * Populates #vehicle-table-body with one <tr> per mapped vehicle.
 *
 * @param {object[]} vehicles  Already-mapped vehicle objects.
 */
function renderTable(vehicles) {
    const tableBody = document.getElementById('vehicle-table-body');
    if (!tableBody) return;

    if (vehicles.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align:center;padding:20px;color:#6b7c96;">
                    No vehicles found matching your filters.
                </td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = vehicles.map(v => `
        <tr>
            <td>${v.licensePlate}</td>
            <td>${v.type}</td>
            <td>${v.makeAndModel}</td>
            <td>
                <span class="status-badge status-${v.status.toLowerCase()}">
                    ${v.status}
                </span>
            </td>
            <td>${v.odometer}</td>
            <td>${v.lastService}</td>
            <td>${v.nextService}</td>
            <td>${v.insuranceExpiry}</td>
            <td>${v.marketValue}</td>
            <td>${v.ctv}</td>
            <td>
                <a href="/vehicles/details?id=${v.id}" class="btn-view" data-link>View</a>
            </td>
        </tr>
    `).join('');
}

// ── Filter logic ──────────────────────────────────────────────────────────

/**
 * Reads the current filter/search inputs and re-renders the table.
 * Safe to call even if elements are missing (no-op).
 */
function applyFilters() {
    const searchInput  = document.getElementById('vehicle-page-filter-search');
    const statusFilter = document.getElementById('vehicle-page-filter-status');
    const typeFilter   = document.getElementById('vehicle-page-filter-type');

    const term   = (searchInput?.value  ?? '').toLowerCase();
    const status = statusFilter?.value  ?? '';
    const type   = typeFilter?.value    ?? '';

    const filtered = _allVehicles.filter(v => {
        const matchesSearch =
            !term ||
            v.licensePlate.toLowerCase().includes(term) ||
            v.makeAndModel.toLowerCase().includes(term);
        const matchesStatus = !status || v.status === status;
        const matchesType   = !type   || v.type   === type;
        return matchesSearch && matchesStatus && matchesType;
    });

    renderTable(filtered);
}

// ── SPA Lifecycle ─────────────────────────────────────────────────────────

/**
 * mount()
 * Called by the router when the /vehicles route becomes active.
 */
export async function mount() {
    // ── Lifecycle safety ─────────────────────────────────────────────────
    _fetchAbortController?.abort();
    _fetchAbortController = new AbortController();
    _mounted = true;
    _docListeners = [];
    _allVehicles  = [];

    // ── Show loading skeleton ────────────────────────────────────────────
    const tableBody = document.getElementById('vehicle-table-body');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align:center;padding:24px;color:#6b7c96;">
                    Loading vehicles…
                </td>
            </tr>`;
    }

    // ── Fetch data ───────────────────────────────────────────────────────
    let raw = [];
    try {
        raw = await VehiclesApi.getVehiclesData(_fetchAbortController.signal);
    } catch (err) {
        if (err?.name === 'AbortError') return; // User navigated away — silent exit

        console.error('[Vehicles] Fetch failed:', err);
        if (_mounted && tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align:center;padding:24px;color:#e53e3e;">
                        Failed to load vehicles. Please try again.
                    </td>
                </tr>`;
        }
        return;
    }

    // ── Guard: user may have navigated away during fetch ─────────────────
    if (!_mounted) return;

    // ── Map & store ──────────────────────────────────────────────────────
    _allVehicles = (raw ?? []).map(mapVehicle);
    renderTable(_allVehicles);

    // ── Bind filter / search events (delegated via named handlers) ───────
    const searchInput  = document.getElementById('vehicle-page-filter-search');
    const statusFilter = document.getElementById('vehicle-page-filter-status');
    const typeFilter   = document.getElementById('vehicle-page-filter-type');

    const addListener = (el, eventType, fn) => {
        if (!el) return;
        el.addEventListener(eventType, fn);
        _docListeners.push({ el, type: eventType, fn });
    };

    addListener(searchInput,  'input',  applyFilters);
    addListener(statusFilter, 'change', applyFilters);
    addListener(typeFilter,   'change', applyFilters);
}

/**
 * unmount()
 * Called by the router before navigating away from /vehicles.
 */
export function unmount() {
    // ── Stop any in-flight request ───────────────────────────────────────
    _mounted = false;
    _fetchAbortController?.abort();
    _fetchAbortController = null;

    // ── Remove all event listeners ───────────────────────────────────────
    _docListeners.forEach(({ el, type, fn }) => {
        el?.removeEventListener(type, fn);
    });
    _docListeners = [];

    // ── Clear cached data ────────────────────────────────────────────────
    _allVehicles = [];
}
