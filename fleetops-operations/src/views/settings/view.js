import { getSettings, updateSettings } from '/src/services/api/settings.js';
import { logAuditAction } from '../../services/api/auditLogger.js';
import { createIcons, icons } from '/node_modules/lucide/dist/esm/lucide.mjs';

let root = null;
let settingsState = null;

/**
 * Syncs the current settingsState object to the DOM inputs and elements
 */
function renderState() {
    if (!root || !settingsState) return;

    // --- GENERAL TAB ---
    const currencyEl = root.querySelector('#setting-currency');
    if (currencyEl) currencyEl.value = settingsState.general.currency;

    const tzEl = root.querySelector('#setting-timezone');
    if (tzEl) tzEl.value = settingsState.general.timezone;

    // --- KPI WEIGHTS TAB ---
    const deliverySlider = root.querySelector('#setting-kpi-delivery');
    const fuelSlider = root.querySelector('#setting-kpi-fuel');
    const customerSlider = root.querySelector('#setting-kpi-customer');

    const updateSliderUI = (slider) => {
        if (!slider) return;
        const val = slider.value;
        slider.style.background = `linear-gradient(to right, #3da69a ${val}%, #e2e8f0 ${val}%)`;
    };

    if (deliverySlider) {
        deliverySlider.value = settingsState.kpiWeights.deliverySpeed;
        root.querySelector('#val-deliverySpeed').textContent = `${settingsState.kpiWeights.deliverySpeed}%`;
        updateSliderUI(deliverySlider);
    }
    if (fuelSlider) {
        fuelSlider.value = settingsState.kpiWeights.fuelEfficiency;
        root.querySelector('#val-fuelEfficiency').textContent = `${settingsState.kpiWeights.fuelEfficiency}%`;
        updateSliderUI(fuelSlider);
    }
    if (customerSlider) {
        customerSlider.value = settingsState.kpiWeights.customerRating;
        root.querySelector('#val-customerRating').textContent = `${settingsState.kpiWeights.customerRating}%`;
        updateSliderUI(customerSlider);
    }

    updateKpiTotal();

    // --- FLEET POLICIES TAB (Alert Thresholds) ---
    const lowStockEl = root.querySelector('#setting-low-stock');
    if (lowStockEl) lowStockEl.value = settingsState.fleetPolicies.lowStockThreshold;

    const lifespanEl = root.querySelector('#setting-lifespan');
    if (lifespanEl) lifespanEl.value = settingsState.fleetPolicies.sparePartLifespanMonths;

    const deliveryEl = root.querySelector('#setting-delivery-trigger');
    if (deliveryEl) deliveryEl.value = settingsState.fleetPolicies.deliveryWindowTriggerMins;

    const fuelEl = root.querySelector('#setting-fuel-disc');
    if (fuelEl) fuelEl.value = settingsState.fleetPolicies.fuelDiscrepancyPct;

    // --- MAINTENANCE SCHEDULES TAB ---
    const inputs = root.querySelectorAll('input[data-group^="systemMaintenance.intervals"]');
    inputs.forEach(input => {
        const parts = input.dataset.group.split('.'); // ["systemMaintenance", "intervals", "oilChange"]
        const type = parts[2];
        const key = input.dataset.key; // "light", "heavy", etc.
        if (settingsState.systemMaintenance.intervals[type]) {
            input.value = settingsState.systemMaintenance.intervals[type][key];
        }
    });

    // --- NOTIFICATIONS TAB ---
    const checkboxes = root.querySelectorAll('.check-box');
    checkboxes.forEach(cb => {
        const groupParts = cb.dataset.group.split('.'); // ["notifications", "deliveryWindowViolation"]
        const type = groupParts[1];
        const key = cb.dataset.key; // "push", "sms", "email"
        if (settingsState.notifications[type]) {
            cb.checked = settingsState.notifications[type][key];
        }
    });

    // --- SYSTEM MAINTENANCE TAB (Database) ---
    const lastRunEl = root.querySelector('#db-last-run');
    const nextRunEl = root.querySelector('#db-next-run');
    const recordsEl = root.querySelector('#db-records-archived');

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (lastRunEl) lastRunEl.textContent = formatDate(settingsState.systemMaintenance.lastArchiveRun);
    if (nextRunEl) nextRunEl.textContent = formatDate(settingsState.systemMaintenance.nextScheduledRun);
    if (recordsEl) recordsEl.textContent = `${settingsState.systemMaintenance.recordsArchived.toLocaleString()} records archived`;

    const archivePeriodEl = root.querySelector('#setting-archive-period');
    if (archivePeriodEl) archivePeriodEl.value = settingsState.systemMaintenance.archivePeriodMonths;

    const backupScheduleEl = root.querySelector('#setting-backup-schedule');
    if (backupScheduleEl) backupScheduleEl.value = settingsState.systemMaintenance.backupSchedule;

    // --- SECURITY & ROLES TAB ---
    const rolesTbody = root.querySelector('#roles-tbody');
    if (rolesTbody) {
        rolesTbody.innerHTML = '';
        settingsState.security.roles.forEach(role => {
            const tr = document.createElement('tr');

            const getBadgeHtml = (access) => {
                if (access === 'Full Access') return `<span class="access-badge access-full">${access}</span>`;
                if (access === 'Read Only') return `<span class="access-badge access-read">${access}</span>`;
                return `<span class="access-badge access-none">${access}</span>`;
            };

            tr.innerHTML = `
                <td>${role.feature}</td>
                <td>${getBadgeHtml(role.fleetManager)}</td>
                <td>${getBadgeHtml(role.dispatcher)}</td>
                <td>${getBadgeHtml(role.driver)}</td>
            `;
            rolesTbody.appendChild(tr);
        });
    }

    createIcons({ icons });
}

/**
 * Handles input changes and updates local state dynamically
 */
function handleInputAndChange(e) {
    if (!root || !settingsState) return;

    const target = e.target;

    // Handle Checkboxes
    if (target.classList.contains('check-box')) {
        const parts = target.dataset.group.split('.'); // ["notifications", "event"]
        const key = target.dataset.key;
        if (parts[0] === 'notifications') {
            settingsState.notifications[parts[1]][key] = target.checked;
        }
        return;
    }

    // Handle Text/Number Inputs & Selects
    if (target.classList.contains('input-field') || target.classList.contains('range-slider')) {
        const group = target.dataset.group;
        const key = target.dataset.key;

        let val = target.value;
        if (target.type === 'number' || target.type === 'range') {
            val = parseFloat(val) || 0;
        }

        if (group.startsWith('systemMaintenance.intervals')) {
            const type = group.split('.')[2];
            settingsState.systemMaintenance.intervals[type][key] = val;
        } else if (group === 'kpiWeights') {
            settingsState.kpiWeights[key] = val;
            root.querySelector(`#val-${key}`).textContent = `${val}%`;
            target.style.background = `linear-gradient(to right, var(--color-primary) ${val}%, #e2e8f0 ${val}%)`;
            updateKpiTotal();
        } else if (settingsState[group] !== undefined) {
            settingsState[group][key] = val;
        }
    }
}

function updateKpiTotal() {
    if (!root || !settingsState) return;
    const total = settingsState.kpiWeights.deliverySpeed + settingsState.kpiWeights.fuelEfficiency + settingsState.kpiWeights.customerRating;
    const totalEl = root.querySelector('#kpi-total');
    if (totalEl) {
        totalEl.textContent = `${total}%`;
        if (total === 100) {
            totalEl.style.color = 'var(--color-chip-success-text)';
        } else {
            totalEl.style.color = 'var(--color-danger)';
        }
    }
}

/**
 * Handles all click events inside the settings view
 */
function handleClick(e) {
    if (!root) return;

    // Tab Switching
    const tabPill = e.target.closest('.tab-pill');
    if (tabPill) {
        const tabId = tabPill.dataset.tab;

        root.querySelectorAll('.tab-pill').forEach(el => el.classList.remove('active'));
        root.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));

        tabPill.classList.add('active');
        const panel = root.querySelector(`#tab-${tabId}`);
        if (panel) panel.classList.add('active');

        return;
    }

    // Archive Now functionality
    const archiveBtn = e.target.closest('#btn-archive-now');
    if (archiveBtn) {
        runArchiveSimulation(archiveBtn);
        return;
    }

    // Save Changes button
    const saveBtn = e.target.closest('#btn-save-settings');
    if (saveBtn) {
        // Validation check for KPI
        const kpiTotal = settingsState.kpiWeights.deliverySpeed + settingsState.kpiWeights.fuelEfficiency + settingsState.kpiWeights.customerRating;
        if (kpiTotal !== 100) {
            alert("KPI Weights must total exactly 100% before saving.");
            return;
        }

        const originalHtml = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i data-lucide="loader-circle"></i> Saving...';
        createIcons({ icons });
        saveBtn.disabled = true;

        // Execute real API storage update
        updateSettings(settingsState).then((res) => {
            console.log('--- SETTINGS SAVED SUCCESSFULLY TO LOCAL STORAGE API ---', res);

            // Log to Audit Trail
            logAuditAction("ADM-001", "Admin", "Updated", "SystemConfig", "Settings", null, settingsState);

            saveBtn.innerHTML = '<i data-lucide="check"></i> Saved';
            createIcons({ icons });
            saveBtn.style.backgroundColor = 'var(--color-chip-success-text)';

            setTimeout(() => {
                saveBtn.innerHTML = originalHtml;
                saveBtn.style.backgroundColor = '';
                saveBtn.disabled = false;
            }, 2000);
        });

        return;
    }
}

/**
 * Simulates a long-running database integrity/archive check
 */
function runArchiveSimulation(btn) {
    const container = root.querySelector('#archive-progress-container');
    const fill = root.querySelector('#archive-progress-fill');
    const text = root.querySelector('#archive-progress-text');

    if (!container || !fill || !text) return;

    btn.disabled = true;
    container.style.display = 'block';
    fill.style.width = '0%';
    text.textContent = '0%';

    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress > 100) progress = 100;

        fill.style.width = `${progress}%`;
        text.textContent = `${progress}%`;

        if (progress === 100) {
            clearInterval(interval);
            setTimeout(() => {
                container.style.display = 'none';
                fill.style.width = '0%';
                text.textContent = '0%';
                btn.disabled = false;

                settingsState.systemMaintenance.lastArchiveRun = new Date().toISOString();
                settingsState.systemMaintenance.recordsArchived += Math.floor(Math.random() * 50) + 10;

                // Save it immediately
                updateSettings(settingsState).then(() => {
                    renderState();
                });
            }, 1000);
        }
    }, 300);
}

// ---------------------------------------------------------
// DOM Lifecycle Methods
// ---------------------------------------------------------

export async function mount(rootElement) {
    root = rootElement;

    // Fetch state from mock API
    settingsState = await getSettings();

    // Inject data into UI
    renderState();
    createIcons({ icons });

    // Attach singular delegated listeners
    root.addEventListener('input', handleInputAndChange);
    root.addEventListener('change', handleInputAndChange);
    root.addEventListener('click', handleClick);
}

export function unmount(rootElement) {
    if (!root) return;

    root.removeEventListener('input', handleInputAndChange);
    root.removeEventListener('change', handleInputAndChange);
    root.removeEventListener('click', handleClick);

    root = null;
    settingsState = null;
}
