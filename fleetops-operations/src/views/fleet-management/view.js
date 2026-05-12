/* ════════════════════════════════════════════════
   Fleet Management — view.js
   FleetOps Operations · Vanilla JS Logic (SPA-ready)
════════════════════════════════════════════════ */

import { showNotificationPanel, showToast } from '../../utils/notification-ui.js';
import api from '/shared/api-handler.js'; // ← Real API handler (absolute path served by dev server)

// تعديل البورت لـ 8000 عشان يكلم لارفيل
api.setBaseURL('http://localhost:8000');


// ─── 1. Data ──────────────────────────────────────────────────────────────

let _docListeners = [];

/* // ── Hardcoded mock data — commented out; replaced by fetchFleetData() below ──
const FLEET_DATA_MOCK = [
  {
    id: 'V-001', plate: 'TRK-042', type: 'Heavy',
    maxWeight: '500 kg', maxVolume: '12 m³', odometer: '124,500 km',
    status: 'In Service', mechanic: null,
    marketValue: 'SAR 85,000', lastService: '2026-03-20',
    damageReport: null,
    insurance: 'Sep 10, 2026', inspection: 'Jun 30, 2026',
  },
  {
    id: 'V-002', plate: 'TRK-015', type: 'Light',
    maxWeight: '200 kg', maxVolume: '6 m³', odometer: '89,200 km',
    status: 'Available', mechanic: null,
    marketValue: 'SAR 42,000', lastService: '2026-04-01',
    damageReport: null,
    insurance: 'Dec 01, 2026', inspection: 'Aug 15, 2026',
  },
  {
    id: 'V-003', plate: 'TRK-023', type: 'Heavy',
    maxWeight: '500 kg', maxVolume: '12 m³', odometer: '210,300 km',
    status: 'Available', mechanic: null,
    marketValue: 'SAR 65,000', lastService: '2026-03-15',
    damageReport: null,
    insurance: 'Oct 20, 2026', inspection: 'Jul 01, 2026',
  },
  {
    id: 'V-004', plate: 'TRK-007', type: 'Refrigerated',
    maxWeight: '350 kg', maxVolume: '8 m³', odometer: '156,800 km',
    status: 'Damaged', mechanic: null,
    marketValue: 'SAR 95,000', lastService: '2026-02-28',
    damageReport: 'Engine overheating — coolant leak detected',
    insurance: 'Nov 05, 2026', inspection: 'Apr 30, 2026',
  },
  {
    id: 'V-005', plate: 'TRK-031', type: 'Light',
    maxWeight: '200 kg', maxVolume: '6 m³', odometer: '67,400 km',
    status: 'Available', mechanic: null,
    marketValue: 'SAR 48,000', lastService: '2026-04-05',
    damageReport: null,
    insurance: 'Jan 12, 2027', inspection: 'Sep 01, 2026',
  },
  {
    id: 'V-006', plate: 'TRK-019', type: 'Heavy',
    maxWeight: '500 kg', maxVolume: '12 m³', odometer: '185,000 km',
    status: 'In Service', mechanic: null,
    marketValue: 'SAR 72,000', lastService: '2026-03-10',
    damageReport: null,
    insurance: 'Aug 22, 2026', inspection: 'May 20, 2026',
  },
  {
    id: 'V-007', plate: 'TRK-050', type: 'Refrigerated',
    maxWeight: '350 kg', maxVolume: '8 m³', odometer: '45,000 km',
    status: 'Damaged', mechanic: null,
    marketValue: 'SAR 110,000', lastService: '2026-03-25',
    damageReport: 'Electrical system failure — AC unit and refrigeration not working',
    insurance: 'Jul 15, 2026', inspection: 'May 01, 2026',
  },
  {
    id: 'V-008', plate: 'TRK-028', type: 'Light',
    maxWeight: '200 kg', maxVolume: '6 m³', odometer: '132,000 km',
    status: 'In Maintenance', mechanic: 'Ali Mechanic',
    marketValue: 'SAR 38,000', lastService: '2026-04-10',
    damageReport: null,
    insurance: 'Jul 15, 2026', inspection: 'May 01, 2026',
  },
];
*/

// ── Live data array — populated asynchronously by fetchFleetData() ──
let FLEET_DATA = [];

/**
 * _mounted
 *
 * True while this view is the active SPA route, false after destroy().
 * All async callbacks that modify FLEET_DATA or the DOM must guard on
 * this flag before doing any work — equivalent to React's isMounted
 * pattern or checking if an AbortController signal was aborted.
 *
 * @type {boolean}
 */
let _mounted = false;

/**
 * _fetchAbortController
 *
 * An AbortController whose signal is passed to fetch calls inside
 * fetchFleetData(). abort() is called inside unmount() so any in-flight
 * GET /fleet/vehicles request is cancelled immediately when the user
 * navigates away, preventing the response callback from touching the DOM.
 *
 * A new controller is created on every mount so re-entering the view
 * works correctly.
 *
 * @type {AbortController|null}
 */
let _fetchAbortController = null;

/**
 * Fetches vehicles from the backend API and maps the response to the
 * UI-expected shape, then updates the module-level FLEET_DATA array.
 *
 * Actual backend shape (snake_case):
 *   { id, plate, type, max_weight, max_volume, odometer, status,
 *     mechanic, market_value, last_service, ... }
 *
 * UI shape (camelCase):
 *   { id, plate, type, maxWeight, maxVolume, odometer (formatted),
 *     status, mechanic, marketValue (formatted), lastService, ... }
 */
/**
 * Fetches vehicles from the backend API and maps the response to the
 * UI-expected shape, then updates the module-level FLEET_DATA array.
 *
 * Abort-safe: passes the current _fetchAbortController.signal so the
 * in-flight request is cancelled if the user navigates away mid-fetch.
 * After any await, checks _mounted before modifying module state.
 *
 * Actual backend shape (snake_case):
 *   { id, plate, vehicle_model, type, max_weight, max_volume, odometer,
 *     status, mechanic, market_value, last_service, ... }
 *
 * UI shape (camelCase):
 *   { id, plate, vehicleModel, type, maxWeight, maxVolume,
 *     odometer (formatted), status, mechanic, marketValue (formatted),
 *     lastService, ... }
 */
async function fetchFleetData() {
  // Snapshot the controller at call-time; abort() may replace it while we await.
  const signal = _fetchAbortController?.signal;

  try {
    const response = await api.get(
      'http://localhost:8000/api/v1/dispatch/fleet/vehicles',
      { signal }            // api-handler must forward this to fetch()
    );

    // If the view was unmounted while the request was in-flight, discard
    // the result silently rather than writing to stale module state.
    if (!_mounted) return;

    if (response.ok && response.data?.success) {
      FLEET_DATA = response.data.data.map(v => ({
        // ── Identity & Classification ────────────────────────────────────
        id:           v.id    ?? 'N/A',
        plate:        v.plate ?? 'N/A',
        vehicleModel: v.vehicle_model ?? 'N/A',
        type:         v.type  ? (v.type.charAt(0).toUpperCase() + v.type.slice(1)) : 'N/A',

        // ── Capacity ──────────────────────────────────────────────────────
        maxWeight: v.max_weight != null ? `${v.max_weight} kg` : 'N/A',
        maxVolume: v.max_volume != null ? `${v.max_volume} m³` : 'N/A',

        // ── Operational ──────────────────────────────────────────────────
        odometer: v.odometer != null
          ? `${Number(v.odometer).toLocaleString()} km`
          : 'N/A',
        status:      v.status   ?? 'Unknown',
        mechanic:    (v.mechanic && v.mechanic.trim() !== '') ? v.mechanic : null,
        damageReport: v.damage_report ?? null,

        // ── Financial & Compliance ────────────────────────────────────────
        marketValue: v.market_value != null
          ? `SAR ${Number(v.market_value).toLocaleString()}`
          : 'N/A',
        lastService: (v.last_service && v.last_service.trim() !== '')
          ? v.last_service
          : (v.updated_at?.split('T')[0] ?? 'N/A'),

        // ── Documents (not yet provided by backend — graceful fallback) ───
        insurance:  v.insurance_expiry  ?? 'N/A',
        inspection: v.inspection_expiry ?? 'N/A',
      }));
    } else {
      if (_mounted) console.warn('[FleetOps] fetchFleetData: API returned non-success response.');
    }
  } catch (error) {
    // AbortError is expected on navigation — don't log it as an error.
    if (error?.name === 'AbortError') {
      console.debug('[FleetOps] fetchFleetData: request aborted (navigation).');
      return;
    }
    if (_mounted) console.error('[FleetOps] fetchFleetData error:', error);
  }
}

const MECHANICS = [
  { id: 'M-01', name: 'Ali Mechanic', specialty: 'Engine & Transmission', jobs: '1 active job(s)', available: true },
  { id: 'M-02', name: 'Yousef Tech', specialty: 'Electrical & Electronics', jobs: '0 active job(s)', available: true },
  { id: 'M-03', name: 'Faisal Heavy', specialty: 'Heavy Vehicle Specialist', jobs: '3 active job(s)', available: false },
  { id: 'M-04', name: 'Saeed Body', specialty: 'Body & Paint', jobs: '2 active job(s)', available: true },
  { id: 'M-05', name: 'Nasser General', specialty: 'General Maintenance', jobs: '1 active job(s)', available: true },
];

// ── Module State ──────────────────────────────────────────────────────────
let currentFilter = 'All';
let selectedMechanic = null;
let currentVehicleId = null;
let editingVehicleId = null;
// ─── Charts Logic ───
let odoChartInstance = null;
let fuelChartInstance = null;

function renderVehicleCharts() {
  const odoCtx = document.getElementById('odoChart'); //
  const fuelCtx = document.getElementById('fuelChart'); //

  if (!odoCtx || !fuelCtx) return;

  // تدمير الرسومات القديمة لمنع التداخل
  if (odoChartInstance) odoChartInstance.destroy();
  if (fuelChartInstance) fuelChartInstance.destroy();

  // 1. رسمة عداد الكيلومترات (Line Chart)
  odoChartInstance = new Chart(odoCtx.getContext('2d'), {
    type: 'line',
    data: {
      labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
      datasets: [{
        label: 'Odometer (km)',
        data: [120000, 125000, 128000, 130000, 131500, 132000],
        borderColor: '#0d9488',
        backgroundColor: 'rgba(13, 148, 136, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // بيخلي الرسمة تملى الكونتينر
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: false } }
    }
  });

  // 2. رسمة استهلاك الوقود (Bar Chart)
  fuelChartInstance = new Chart(fuelCtx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
      datasets: [{
        label: 'km/L',
        data: [8.5, 7.8, 8.2, 9.1, 8.0, 8.8],
        backgroundColor: '#0d9488',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}
// ─── 2. SVG Icons ─────────────────────────────────────────────────────────
const ICONS = {
  edit: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  eye: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  wrench: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  user: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

// ─── 3. Helpers ───────────────────────────────────────────────────────────
function getStatusBadge(status) {
  const cls = `status-${status.toLowerCase().replace(/ /g, '-')}`;
  return `<span class="status-badge ${cls}">${status}</span>`;
}

function getMechanicCell(vehicle) {
  if (vehicle.status === 'Damaged') {
    return `<button class="assign-btn" data-id="${vehicle.id}">${ICONS.wrench} Assign Mechanic</button>`;
  }
  if (vehicle.mechanic) {
    return `<span class="mechanic-pill">${ICONS.user} ${vehicle.mechanic}</span>`;
  }
  return `<span class="cell-dash">—</span>`;
}

// ─── 4. Table Rendering ───────────────────────────────────────────────────
function renderTable(data = FLEET_DATA) {
  const tbody = document.getElementById('fleetTableBody');
  if (!tbody) return;

  const filtered = currentFilter === 'All'
    ? data
    : data.filter(v => v.status === currentFilter);

  tbody.innerHTML = filtered.map(v => `
    <tr data-id="${v.id}">
      <td class="cell-id">${v.id}</td>
      <td class="cell-plate">${v.plate}</td>
      <td>${v.type}</td>
      <td>${v.maxWeight}</td>
      <td>${v.maxVolume}</td>
      <td>${v.odometer}</td>
      <td>${getStatusBadge(v.status)}</td>
      <td>${getMechanicCell(v)}</td>
      <td class="cell-value">${v.marketValue}</td>
      <td class="cell-date">${v.lastService}</td>
      <td>
        <div class="actions-cell">
          <button class="icon-btn btn-edit" data-id="${v.id}" title="Edit">${ICONS.edit}</button>
          <button class="icon-btn btn-view" data-id="${v.id}" title="View details">${ICONS.eye}</button>
          ${v.status === 'Damaged'
      ? `<button class="icon-btn danger assign-btn" data-id="${v.id}" title="Repair">${ICONS.wrench}</button>`
      : ''}
        </div>
      </td>
    </tr>
  `).join('');

  updatePageStats();
}

// ─── 5. Stats & Filters ───────────────────────────────────────────────────
function updatePageStats() {
  const damaged = FLEET_DATA.filter(v => v.status === 'Damaged').length;
  const inMaint = FLEET_DATA.filter(v => v.status === 'In Maintenance').length;

  const el = id => document.getElementById(id);
  if (el('vehicleCount')) el('vehicleCount').textContent = `${FLEET_DATA.length} vehicles in fleet`;
  if (el('alertTitle')) el('alertTitle').textContent = `${damaged} vehicle(s) damaged — needs mechanic assignment`;
  if (el('alertTag')) el('alertTag').textContent = `${inMaint} in maintenance`;
  if (el('damagedCount')) el('damagedCount').textContent = damaged;
}

function initFilters() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = (e) => {
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      e.currentTarget.classList.add('active');
      e.currentTarget.setAttribute('aria-selected', 'true');
      currentFilter = e.currentTarget.dataset.tab;
      renderTable();
    };
  });
}

// ─── 6. Plate Search ─────────────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById('plateSearch');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    renderTable(q ? FLEET_DATA.filter(v => v.plate.toLowerCase().includes(q)) : FLEET_DATA);
  });
}

// ─── 7. Add Vehicle Modal ─────────────────────────────────────────────────

/**
 * Form state — collected from the modal fields on each submission.
 * @type {{ plate:string, vehicleModel:string, type:string, maxWeight:string, maxVolume:string, odometer:string, marketValue:string }}
 */
let _addVehicleState = {};

/**
 * showFieldError(fieldId, message)
 *
 * Injects (or updates) an inline error message beneath a form field.
 * Clears it if message is falsy.
 *
 * @param {string} fieldId
 * @param {string|null} message
 */
function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  if (!input) return;

  // Find or create the error element
  const errorId = `${fieldId}-error`;
  let errorEl = document.getElementById(errorId);

  if (!message) {
    input.classList.remove('form-input--error');
    errorEl?.remove();
    return;
  }

  if (!errorEl) {
    errorEl = document.createElement('p');
    errorEl.id = errorId;
    errorEl.className = 'form-field-error';
    input.parentNode.appendChild(errorEl);
  }

  input.classList.add('form-input--error');
  errorEl.textContent = message;
}

/**
 * clearAllErrors(modal)
 *
 * Removes all inline validation errors and the modal-level error banner.
 */
function clearAllErrors(modal) {
  modal.querySelectorAll('.form-input--error').forEach(el => el.classList.remove('form-input--error'));
  modal.querySelectorAll('.form-field-error').forEach(el => el.remove());
  const banner = modal.querySelector('#modalErrorBanner');
  if (banner) banner.setAttribute('hidden', '');
}

/**
 * handleAddVehicle(close)
 *
 * Async submit handler wired to the "Save Vehicle" button.
 *
 * Flow:
 *   1. Read & validate form inputs → show inline errors on failure.
 *   2. Build snake_case payload matching the backend's expected shape.
 *   3. POST to /api/v1/dispatch/fleet/vehicles via the api-handler.
 *   4a. On success → show success toast, close modal, re-fetch fleet list.
 *   4b. On error  → show per-field errors (if 422) or a banner message.
 *
 * Backend payload shape (snake_case):
 *   { plate, type, max_weight, max_volume, odometer, market_value }
 *
 * @param {Function} close  — Modal close callback.
 * @param {Element}  modal  — Modal DOM element (for error display).
 * @param {Element}  saveBtn — Save button (for loading state management).
 */
async function handleAddVehicle(close, modal, saveBtn) {
  clearAllErrors(modal);

  // ── 1. Collect state from form inputs ──────────────────────────────
  _addVehicleState = {
    plate:        document.getElementById('fieldPlate')?.value?.trim()        ?? '',
    vehicleModel: document.getElementById('fieldVehicleModel')?.value?.trim() ?? '',
    type:         document.getElementById('fieldType')?.value                 ?? 'light',
    maxWeight:    document.getElementById('fieldMaxWeight')?.value?.trim()    ?? '',
    maxVolume:    document.getElementById('fieldMaxVolume')?.value?.trim()    ?? '',
    odometer:     document.getElementById('fieldOdometer')?.value?.trim()     ?? '',
    marketValue:  document.getElementById('fieldMarketValue')?.value?.trim()  ?? '',
  };

  const { plate, vehicleModel, type, maxWeight, maxVolume, odometer, marketValue } = _addVehicleState;

  // ── 2. Client-side validation ────────────────────────────────────────
  let hasErrors = false;

  if (!plate) {
    showFieldError('fieldPlate', 'Plate number is required.');
    hasErrors = true;
  }
  if (!vehicleModel) {
    showFieldError('fieldVehicleModel', 'Vehicle model is required.');
    hasErrors = true;
  }
  if (!maxWeight || isNaN(Number(maxWeight)) || Number(maxWeight) <= 0) {
    showFieldError('fieldMaxWeight', 'Enter a valid max weight (kg).');
    hasErrors = true;
  }
  if (!maxVolume || isNaN(Number(maxVolume)) || Number(maxVolume) <= 0) {
    showFieldError('fieldMaxVolume', 'Enter a valid max volume (m³).');
    hasErrors = true;
  }

  if (hasErrors) return;

  // ── 3. Map to backend snake_case payload ─────────────────────────────
  //    Frontend camelCase   →  Backend snake_case
  //    vehicleModel         →  vehicle_model  (string, NOT NULL in DB)
  //    maxWeight            →  max_weight     (number)
  //    maxVolume            →  max_volume     (number)
  //    marketValue          →  market_value   (number, optional)
  //    odometer             →  odometer       (number, optional)
  //    type                 →  type           (lowercase string)
  const payload = {
    plate,
    vehicle_model: vehicleModel,
    type:          type.toLowerCase(),
    max_weight:    Number(maxWeight),
    max_volume:    Number(maxVolume),
    odometer:      odometer    ? Number(odometer)    : 0,
    market_value:  marketValue ? Number(marketValue) : null,
  };

  // ── 4. PUT BUTTON INTO LOADING STATE ────────────────────────────────
  const originalLabel = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  saveBtn.classList.add('btn-save--loading');

  // ── 5. POST/PUT to the backend ──────────────────────────────────────
  try {
    const isEdit = !!editingVehicleId;
    const url = isEdit 
      ? `http://localhost:8000/api/v1/dispatch/fleet/vehicles/${editingVehicleId}` 
      : 'http://localhost:8000/api/v1/dispatch/fleet/vehicles';

    const response = isEdit 
      ? await api.put(url, payload) 
      : await api.post(url, payload);

    if (response.ok && response.data?.success) {
      // ── 5a. SUCCESS ────────────────────────────────────────────────
      close();
      showToast(isEdit ? 'Vehicle updated successfully!' : 'Vehicle added successfully!', 'success');

      // Re-fetch the full fleet list so the table reflects the real DB state.
      // Guard with _mounted so a rapid navigation away won't call renderTable()
      // on a detached DOM.
      await fetchFleetData();
      if (_mounted) renderTable();

    } else {
      // ── 5b. Non-success 2xx ────────────────────────────────────────
      const msg = response.data?.message ?? 'The server rejected the request.';
      _showModalErrorBanner(modal, msg);
    }

  } catch (err) {
    // ── 5c. HTTP 422 Validation errors ─────────────────────────────────
    if (err?.status === 422 || err?.message?.includes('422')) {
      const errors = err?.data?.errors ?? {};

      // Map Laravel field names → our HTML field IDs
      const FIELD_MAP = {
        plate:         'fieldPlate',
        vehicle_model: 'fieldVehicleModel',
        type:          'fieldType',
        max_weight:    'fieldMaxWeight',
        max_volume:    'fieldMaxVolume',
        odometer:      'fieldOdometer',
        market_value:  'fieldMarketValue',
      };

      let hasFieldErrors = false;
      for (const [apiField, fieldId] of Object.entries(FIELD_MAP)) {
        if (errors[apiField]) {
          showFieldError(fieldId, errors[apiField][0]);
          hasFieldErrors = true;
        }
      }

      if (!hasFieldErrors) {
        _showModalErrorBanner(modal, 'Validation failed. Please check all fields.');
      }

    } else if (err instanceof TypeError) {
      // Network / CORS failure
      _showModalErrorBanner(
        modal,
        'Could not reach the server. Check your connection and try again.'
      );
    } else {
      // Other HTTP error (500, 403, etc.)
      const msg = err?.data?.message ?? err?.message ?? 'An unexpected error occurred.';
      _showModalErrorBanner(modal, msg);
    }

  } finally {
    // ── 6. RESTORE BUTTON STATE ─────────────────────────────────────────
    saveBtn.disabled = false;
    saveBtn.textContent = originalLabel;
    saveBtn.classList.remove('btn-save--loading');
  }
}

/** Shows the modal-level error banner with a given message. */
function _showModalErrorBanner(modal, message) {
  let banner = modal.querySelector('#modalErrorBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'modalErrorBanner';
    banner.className = 'modal-error-banner';
    // Insert before the footer
    const footer = modal.querySelector('.modal-footer');
    footer ? modal.querySelector('.modal-card').insertBefore(banner, footer) : modal.querySelector('.modal-card').appendChild(banner);
  }
  banner.textContent = message;
  banner.removeAttribute('hidden');
}

export function openEditVehicleModal(id) {
  const modal = document.getElementById('modalOverlay');
  if (!modal) return;
  
  const vehicle = FLEET_DATA.find(v => v.id == id);
  if (!vehicle) return;

  editingVehicleId = id;
  
  // Update modal title explicitly within this modal's DOM tree
  const title = modal.querySelector('.modal-title');
  if (title) title.textContent = 'Edit Vehicle';
  
  // Populate fields
  const plate = modal.querySelector('#fieldPlate');
  if (plate) plate.value = vehicle.plate || '';
  
  const vModel = modal.querySelector('#fieldVehicleModel');
  if (vModel) vModel.value = vehicle.vehicleModel || '';
  
  const type = modal.querySelector('#fieldType');
  if (type) type.value = vehicle.type ? vehicle.type.toLowerCase() : 'light';
  
  const weight = modal.querySelector('#fieldMaxWeight');
  if (weight) weight.value = vehicle.maxWeight ? vehicle.maxWeight.replace(' kg', '') : '';
  
  const volume = modal.querySelector('#fieldMaxVolume');
  if (volume) volume.value = vehicle.maxVolume ? vehicle.maxVolume.replace(' m³', '') : '';
  
  const odo = modal.querySelector('#fieldOdometer');
  if (odo) odo.value = vehicle.odometer ? vehicle.odometer.replace(/,/g, '').replace(' km', '') : '';
  
  const market = modal.querySelector('#fieldMarketValue');
  if (market) market.value = vehicle.marketValue ? vehicle.marketValue.replace('SAR ', '').replace(/,/g, '') : '';
  
  clearAllErrors(modal);
  
  // Show modal
  modal.removeAttribute('hidden');
  requestAnimationFrame(() => modal.classList.add('is-open'));
}

function initAddVehicleModal() {
  const modal     = document.getElementById('modalOverlay');
  const openBtn   = document.getElementById('openModalBtn');
  const closeBtn  = document.getElementById('closeModalBtn');
  const cancelBtn = document.getElementById('cancelModalBtn');
  const saveBtn   = document.getElementById('saveVehicleBtn');
  if (!modal || !openBtn) return;

  const clearForm = () => {
    modal.querySelectorAll('.form-input, .form-select').forEach(i => (i.value = ''));
    const typeSelect = document.getElementById('fieldType');
    if (typeSelect) typeSelect.selectedIndex = 0;
    clearAllErrors(modal);
  };

  const open  = () => { modal.removeAttribute('hidden'); requestAnimationFrame(() => modal.classList.add('is-open')); };
  const close = () => {
    modal.classList.remove('is-open');
    setTimeout(() => { modal.setAttribute('hidden', ''); clearForm(); }, 200);
  };

  openBtn.onclick = () => {
    editingVehicleId = null;
    const title = modal.querySelector('.modal-title');
    if (title) title.textContent = 'Add New Vehicle';
    clearForm();
    open();
  };
  if (closeBtn)  closeBtn.onclick  = close;
  if (cancelBtn) cancelBtn.onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  if (saveBtn) {
    // Replace onclick with the async API handler
    saveBtn.onclick = () => handleAddVehicle(close, modal, saveBtn);
  }
}

// ─── 8. Assign Mechanic Modal ─────────────────────────────────────────────
function renderMechanicList() {
  const list = document.getElementById('mechanicList');
  if (!list) return;

  list.innerHTML = MECHANICS.map(m => `
    <div class="mechanic-item ${m.available ? '' : 'busy'}"
         data-mechanic-id="${m.id}"
         role="button" tabindex="${m.available ? '0' : '-1'}"
         aria-disabled="${!m.available}">
      <div class="custom-radio"><div class="custom-radio-dot"></div></div>
      <div class="mechanic-icon-box">🔧</div>
      <div class="mechanic-info">
        <div class="mechanic-name">
          ${m.name}
          ${!m.available ? '<span class="busy-tag">BUSY</span>' : ''}
        </div>
        <div class="mechanic-sub">${m.specialty} · ${m.jobs}</div>
      </div>
      <span class="mechanic-status-badge ${m.available ? 'status-avail' : 'status-busy'}">
        ${m.available ? 'Available' : 'Unavailable'}
      </span>
    </div>
  `).join('');

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.mechanic-item');
    if (!item || item.classList.contains('busy')) return;
    list.querySelectorAll('.mechanic-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');
    selectedMechanic = item.dataset.mechanicId;
  });

  list.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const item = e.target.closest('.mechanic-item');
    if (item && !item.classList.contains('busy')) item.click();
  });
}

function initAssignMechanicModal() {
  const modal = document.getElementById('assignMechanicModal');
  const closeBtn = document.getElementById('closeAssignModal');
  const cancelBtn = document.getElementById('cancelAssignModal');
  const confirmBtn = document.getElementById('confirmAssignBtn');
  if (!modal) return null;

  renderMechanicList();

  const close = () => {
    modal.classList.remove('is-open');
    setTimeout(() => modal.setAttribute('hidden', ''), 200);
    selectedMechanic = null;
    currentVehicleId = null;
  };

  const open = (vehicleId) => {
    const vehicle = FLEET_DATA.find(v => v.id === vehicleId);
    if (!vehicle) return;
    currentVehicleId = vehicleId;
    selectedMechanic = null;

    const info = document.getElementById('assignVehicleInfo');
    const reportText = document.getElementById('damageReportText');
    if (info) info.textContent = `${vehicle.plate} — ${vehicle.type}`;
    if (reportText) reportText.textContent = vehicle.damageReport || 'No damage details provided.';

    modal.querySelectorAll('.mechanic-item').forEach(el => el.classList.remove('selected'));
    const notes = document.getElementById('repairNotes');
    const date = document.getElementById('completionDate');
    if (notes) notes.value = '';
    if (date) date.value = '';

    modal.removeAttribute('hidden');
    requestAnimationFrame(() => modal.classList.add('is-open'));
  };

  if (closeBtn) closeBtn.onclick = close;
  if (cancelBtn) cancelBtn.onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (!selectedMechanic) { alert('Please select a mechanic before assigning.'); return; }
      const mechanic = MECHANICS.find(m => m.id === selectedMechanic);
      const vehicle = FLEET_DATA.find(v => v.id === currentVehicleId);
      if (vehicle && mechanic) {
        vehicle.status = 'In Maintenance';
        vehicle.mechanic = mechanic.name;
        renderTable();
      }
      close();
    };
  }

  return open;
}

// ─── 9. Vehicle Details Modal ─────────────────────────────────────────────

/**
 * Fetches the rich vehicle detail from the backend detail endpoint.
 * Returns the API data object on success, or null on failure.
 *
 * Backend: GET /api/v1/dispatch/fleet/vehicles/{id}
 * Requires auth:sanctum — passes existing session token via api handler.
 *
 * @param {string} vehicleId  — the vehicle id from FLEET_DATA (e.g. "3")
 * @returns {Promise<object|null>}
 */
async function fetchVehicleDetail(vehicleId) {
  const signal = _fetchAbortController?.signal;
  try {
    const response = await api.get(
      `http://localhost:8000/api/v1/dispatch/fleet/vehicles/${vehicleId}`,
      { signal }
    );
    if (response.ok && response.data?.success) {
      return response.data.data;
    }
    console.warn('[FleetOps] fetchVehicleDetail: non-success response', response.data);
    return null;
  } catch (err) {
    if (err?.name === 'AbortError') return null;
    console.error('[FleetOps] fetchVehicleDetail error:', err);
    return null;
  }
}

/**
 * Fallback: Generates plausible 6-month odometer readings from the display string.
 * Used only when the detail API call fails.
 */
function buildOdometerHistory(odoStr) {
  const current = parseInt(odoStr.replace(/[^0-9]/g, ''), 10) || 100000;
  const monthlyGain = Math.round(current * 0.04);
  return Array.from({ length: 6 }, (_, i) => current - (5 - i) * monthlyGain);
}

/**
 * Fallback: Generates plausible fuel efficiency values.
 * Used only when the detail API call fails.
 */
function buildFuelHistory(type) {
  const base = type === 'Heavy' ? 7.5 : type === 'Refrigerated' ? 8.2 : 9.8;
  return Array.from({ length: 6 }, () => +(base + (Math.random() * 1.6 - 0.8)).toFixed(1));
}

const CHART_MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const CHART_DEFAULTS = {
  teal: '#0d9488',
  tealLight: 'rgba(13,148,136,.12)',
  gridColor: 'rgba(0,0,0,.06)',
  font: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  tickColor: '#94a3b8',
};

/**
 * Dynamically loads Chart.js once from the CDN and fires `callback` when ready.
 * Safe to call multiple times — subsequent calls reuse the already-loaded library.
 */
function loadChartJS(callback) {
  if (typeof Chart !== 'undefined') {
    // Already available — fire immediately.
    callback();
    return;
  }

  // Check if a pending script tag already exists (avoids double-injection).
  if (document.querySelector('script[data-chartjs-loader]')) {
    // Piggy-back onto the existing load event via a one-time listener.
    const existing = document.querySelector('script[data-chartjs-loader]');
    existing.addEventListener('load', callback, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
  script.setAttribute('data-chartjs-loader', '');
  script.onload = callback;
  script.onerror = () => console.error('[FleetOps] Failed to load Chart.js from CDN.');
  document.head.appendChild(script);
}
function destroyCharts() {
  if (odoChartInstance) { odoChartInstance.destroy(); odoChartInstance = null; }
  if (fuelChartInstance) { fuelChartInstance.destroy(); fuelChartInstance = null; }
}
/**
 * Render both charts.
 *
 * @param {object} vehicle  – local FLEET_DATA item (may be enriched by fetchVehicleDetail)
 *
 * Priority for chart data:
 *   1. vehicle.odometerHistory  / vehicle.fuelHistory   ← from API detail endpoint
 *   2. Fallback helpers buildOdometerHistory / buildFuelHistory
 *
 * Priority for x-axis labels:
 *   1. vehicle.chartMonths  ← from API (last 6 real calendar months)
 *   2. CHART_MONTHS constant  ← static fallback
 */
function buildCharts(vehicle) {
  destroyCharts();

  const commonScales = {
    x: {
      grid: { color: CHART_DEFAULTS.gridColor, drawBorder: false },
      ticks: { color: CHART_DEFAULTS.tickColor, font: { size: 11, family: CHART_DEFAULTS.font } },
    },
    y: {
      grid: { color: CHART_DEFAULTS.gridColor, drawBorder: false },
      ticks: { color: CHART_DEFAULTS.tickColor, font: { size: 11, family: CHART_DEFAULTS.font } },
    },
  };

  const commonPlugins = {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { size: 12, family: CHART_DEFAULTS.font },
      bodyFont: { size: 12, family: CHART_DEFAULTS.font },
      padding: 10, cornerRadius: 8,
    },
  };

  // Use API-provided month labels if available, otherwise fall back to constant
  const months = (vehicle.chartMonths?.length === 6) ? vehicle.chartMonths : CHART_MONTHS;

  // ── Odometer Line Chart ──────────────────────────────────────────────────
  const odoCtx = document.getElementById('odoChart');
  if (odoCtx) {
    // Prefer real API history; fall back to the generator
    const odoData = (vehicle.odometerHistory?.length === 6)
      ? vehicle.odometerHistory
      : buildOdometerHistory(vehicle.odometer);

    odoChartInstance = new Chart(odoCtx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          data: odoData,
          borderColor: CHART_DEFAULTS.teal,
          backgroundColor: CHART_DEFAULTS.tealLight,
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: CHART_DEFAULTS.teal,
          tension: 0.35,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: commonPlugins,
        scales: {
          ...commonScales,
          y: {
            ...commonScales.y,
            ticks: {
              ...commonScales.y.ticks,
              callback: v => v.toLocaleString(),
            },
          },
        },
      },
    });
  }

  // ── Fuel Efficiency Bar Chart ────────────────────────────────────────────
  const fuelCtx = document.getElementById('fuelChart');
  if (fuelCtx) {
    // Prefer real API history; fall back to the generator
    const fuelData = (vehicle.fuelHistory?.length === 6)
      ? vehicle.fuelHistory
      : buildFuelHistory(vehicle.type);

    fuelChartInstance = new Chart(fuelCtx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          data: fuelData,
          backgroundColor: CHART_DEFAULTS.teal,
          borderRadius: 5,
          borderSkipped: false,
          barPercentage: 0.6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: commonPlugins,
        scales: {
          ...commonScales,
          y: {
            ...commonScales.y,
            min: 0,
            max: 13,
            ticks: {
              ...commonScales.y.ticks,
              stepSize: 3,
            },
          },
        },
      },
    });
  }
}

/** Maps a status string to a CSS modifier class for the header badge. */
function statusToBadgeClass(status) {
  return `ds-${status.toLowerCase().replace(/ /g, '-')}`;
}

function initVehicleDetailsModal(openAssignModalFn) {
  const modal = document.getElementById('vehicleDetailsModal');
  const closeBtn = document.getElementById('closeDetailsModal');
  if (!modal) return null;

  const close = () => {
    modal.classList.remove('is-open');
    setTimeout(() => {
      modal.setAttribute('hidden', '');
      destroyCharts();
    }, 200);
  };

  // Wire the "Assign Mechanic Now" button inside the details modal
  const assignNowBtn = document.getElementById('detailsAssignNowBtn');
  if (assignNowBtn) {
    assignNowBtn.onclick = () => {
      const vehicleId = assignNowBtn.dataset.vehicleId;
      close();
      // Short delay so the details modal finishes closing before the assign modal opens
      setTimeout(() => openAssignModalFn?.(vehicleId), 220);
    };
  }

  /**
   * Open the detail modal for the given vehicle ID.
   * Fetches the rich detail payload from the backend (charts, docs) then renders.
   * Falls back gracefully to FLEET_DATA values if the detail fetch fails.
   */
  const open = async (vehicleId) => {
    const v = FLEET_DATA.find(x => x.id === vehicleId);
    if (!v) return;

    // ── Populate header immediately (data already in FLEET_DATA) ──────────
    const plateEl    = document.getElementById('detailsPlate');
    const badgeEl    = document.getElementById('detailsStatusBadge');
    const subtitleEl = document.getElementById('detailsSubtitle');
    if (plateEl) plateEl.textContent = v.plate;
    if (badgeEl) {
      badgeEl.textContent = v.status;
      badgeEl.className   = `details-status-badge ${statusToBadgeClass(v.status)}`;
    }
    if (subtitleEl) subtitleEl.textContent = `${v.type} · ${v.id}`;

    // ── Damage Report Banner ───────────────────────────────────────────────
    const banner    = document.getElementById('detailsDamageBanner');
    const damageText = document.getElementById('detailsDamageText');
    if (banner) {
      if (v.status === 'Damaged' && v.damageReport) {
        if (damageText) damageText.textContent = v.damageReport;
        if (assignNowBtn) assignNowBtn.dataset.vehicleId = v.id;
        banner.removeAttribute('hidden');
      } else {
        banner.setAttribute('hidden', '');
      }
    }

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    // ── Populate stats with FLEET_DATA values (instant, no flicker) ───────
    setText('detailsStatStatus',   v.status);
    setText('detailsStatOdometer', v.odometer);
    setText('detailsStatValue',    v.marketValue);
    setText('detailsStatService',  v.lastService !== 'N/A' ? v.lastService : '—');
    setText('detailsInsurance',    v.insurance  || 'Loading…');
    setText('detailsInspection',   v.inspection || 'Loading…');

    // ── Fetch detail from API (chart data + document dates) ───────────────
    const detail = await fetchVehicleDetail(v.id);

    if (detail) {
      // Enrich the vehicle object in-place so buildCharts() can read the arrays
      v.odometerHistory = detail.odometer_history   ?? null;
      v.fuelHistory     = detail.fuel_efficiency_history ?? null;
      v.chartMonths     = detail.chart_months        ?? null;

      // Overwrite docs with the real computed dates from the API
      const insurance  = detail.insurance_expiry  ?? v.insurance  ?? 'N/A';
      const inspection = detail.inspection_expiry ?? v.inspection ?? 'N/A';
      v.insurance  = insurance;
      v.inspection = inspection;

      // last_service is guaranteed non-null by VehicleDetailResource
      if (detail.last_service) v.lastService = detail.last_service;

      // Re-populate the stats & documents cells with enriched values
      setText('detailsStatService', v.lastService);
      setText('detailsInsurance',   insurance);
      setText('detailsInspection',  inspection);
    } else {
      // API failed — show whatever we have (may be 'N/A')
      setText('detailsInsurance',  v.insurance  || 'N/A');
      setText('detailsInspection', v.inspection || 'N/A');
    }

    // ── Open modal, then render charts after layout is ready ─────────────
    modal.removeAttribute('hidden');
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      setTimeout(() => loadChartJS(() => buildCharts(v)), 80);
    });
  };

  if (closeBtn) closeBtn.onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };

  const escapeHandler = (e) => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) close();
  };
  document.addEventListener('keydown', escapeHandler);
  _docListeners.push({ type: 'keydown', fn: escapeHandler });

  return open;
}

// ─── 10. Global Table Delegation ──────────────────────────────────────────
function initTableDelegation(openDetailsModal, openAssignModal) {
  const tbody = document.getElementById('fleetTableBody');
  if (!tbody) return;

  tbody.addEventListener('click', (e) => {
    // Eye (view) button — highest priority
    const viewBtn = e.target.closest('.btn-view');
    if (viewBtn) {
      e.stopPropagation();
      openDetailsModal?.(viewBtn.dataset.id);
      return;
    }

    // Assign mechanic button — don't open details
    if (e.target.closest('.assign-btn')) return;

    // Edit button
    const editBtn = e.target.closest('.btn-edit');
    if (editBtn) {
      e.stopPropagation();
      openEditVehicleModal(editBtn.dataset.id);
      return;
    }

    // Click anywhere else on the row → open details
    const row = e.target.closest('tr[data-id]');
    if (row) openDetailsModal?.(row.dataset.id);
  });
}

// ─── 11. Notification Bell ────────────────────────────────────────────────
function handleGlobalClicks(e) {
  const bell = e.target.closest('.notif-bell-btn, button[aria-label="Notifications"], .bell-btn, #bellBtn');
  if (bell) { e.preventDefault(); showNotificationPanel(); }
}

// ─── 12. Entry Point ─────────────────────────────────────────────────────

/**
 * Main initialiser — async so it can await the fleet data fetch
 * before rendering the table.
 *
 * Mount/unmount safety:
 *   _mounted is set to true here and false in unmount().
 *   _fetchAbortController is created fresh on every mount so its signal
 *   is clean. The previous controller (if any) is aborted first to cancel
 *   any lingering in-flight request from a previous mount cycle.
 */
export async function mount() {
  console.log('[FleetOps] Mounting Fleet Management module…');

  // ── Mount guard setup ────────────────────────────────────────────────
  // Cancel any request that might still be running from a previous mount.
  _fetchAbortController?.abort();
  _fetchAbortController = new AbortController();
  _mounted = true;

  document.removeEventListener('click', handleGlobalClicks);
  document.addEventListener('click', handleGlobalClicks);
  _docListeners.push({ type: 'click', fn: handleGlobalClicks });

  // ── Fetch real data from the API before first render ──────────────────
  await fetchFleetData();

  // Guard: user may have navigated away while fetchFleetData() was awaited.
  if (!_mounted) return;

  renderTable();
  initFilters();
  initSearch();
  initAddVehicleModal();

  const openAssignModal  = initAssignMechanicModal();
  const openDetailsModal = initVehicleDetailsModal(openAssignModal);

  initTableDelegation(openDetailsModal, openAssignModal);

  // Assign-btn delegation for table rows (wrench icon / "Assign Mechanic" buttons)
  const assignBtnHandler = (e) => {
    const btn = e.target.closest('.assign-btn');
    if (btn && btn.dataset.id) openAssignModal?.(btn.dataset.id);
  };
  document.addEventListener('click', assignBtnHandler);
  _docListeners.push({ type: 'click', fn: assignBtnHandler });
}


export function unmount() {
  // ── 1. Signal "component is gone" to all pending async callbacks ──────
  //    Any fetchFleetData() / fetchVehicleDetail() awaits that complete
  //    after this point will see _mounted === false and return early
  //    without touching the DOM or module state.
  _mounted = false;

  // ── 2. Cancel the in-flight GET /fleet/vehicles request (if any) ──────
  //    This triggers an AbortError inside fetchFleetData(), which is
  //    caught and logged as a debug message rather than an error.
  _fetchAbortController?.abort();
  _fetchAbortController = null;

  // ── 3. Remove document-level event listeners added during mount ────────
  _docListeners.forEach(({ type, fn, opts }) => {
    document.removeEventListener(type, fn, opts);
  });
  _docListeners.length = 0;

  // ── 4. Destroy Chart.js instances to release canvas memory ────────────
  destroyCharts();

  // ── 5. Clear Module State ──────────────────────────────────────────────
  FLEET_DATA = [];
  currentFilter = 'All';
  _addVehicleState = {};
}