import vehiclesData from "../../../services/storage/vehicles.js";

export function mount(rootElement) {
    const urlParams = new URLSearchParams(window.location.search);
    const vehicleId = urlParams.get("id");

    if (!vehicleId) {
        showError(rootElement, "No vehicle ID provided.");
        return;
    }

    const vehicle = vehiclesData.find(v => v.id === vehicleId);

    if (!vehicle) {
        showError(rootElement, "Vehicle not found.");
        return;
    }

    populateDetails(vehicle);
}

function populateDetails(vehicle) {
    document.getElementById("vehicle-title").textContent = vehicle.licensePlate;
    
    // Header Badges
    const typeBadge = document.getElementById("info-type-badge");
    const statusBadge = document.getElementById("info-status-badge");
    
    if (typeBadge) typeBadge.textContent = vehicle.type;
    if (statusBadge) {
        statusBadge.textContent = vehicle.status;
        statusBadge.className = 'badge-chip'; // Reset
        const status = vehicle.status.toLowerCase();
        if (status.includes('available')) {
            statusBadge.classList.add('success');
        } else if (status.includes('maintenance')) {
            statusBadge.classList.add('maintenance');
        } else if (status.includes('inactive')) {
            statusBadge.classList.add('danger');
        } else if (status.includes('service')) {
            statusBadge.classList.add('warning');
        } else {
            statusBadge.classList.add('secondary');
        }
    }

    // Header Meta
    const infoMake = document.getElementById("info-make");
    const infoValue = document.getElementById("info-value");
    if (infoMake) infoMake.textContent = vehicle.makeAndModel;
    if (infoValue) infoValue.textContent = vehicle.marketValue;

    // Stat Boxes
    const setSafeText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setSafeText("info-plate", vehicle.licensePlate);
    setSafeText("info-type", vehicle.type);
    setSafeText("info-odometer", vehicle.odometer);
    setSafeText("info-last-service", vehicle.lastService);
    setSafeText("info-next-service", vehicle.nextService);
    setSafeText("info-insurance", vehicle.insuranceExpiry);
    setSafeText("info-ctv", vehicle.ctv);
    setSafeText("info-repair-cost", vehicle.repairCost);
    setSafeText("info-capacity", vehicle.maxCapacity || "N/A");
    setSafeText("info-volume", vehicle.volume || "N/A");
    setSafeText("info-details", vehicle.details || "No additional details available.");

    updateProgressBar("health-oil", vehicle.engineOil || 0);
    updateProgressBar("health-brakes", vehicle.brakePads || 0);
    updateProgressBar("health-battery", vehicle.battery || 0);
    updateCTVAnalysis(vehicle.ctv || "0%");
    populateMaintenanceHistory(vehicle.maintenanceHistory || []);

    // Populate Recent Fuel Logs
    const fuelLogsContainer = document.getElementById("fuel-logs-container");
    if (fuelLogsContainer) {
        if (vehicle.fuelLogs && vehicle.fuelLogs.length > 0) {
            fuelLogsContainer.innerHTML = vehicle.fuelLogs.map(log => `
                <div class="fuel-log-card">
                    <div class="fuel-log-row">
                        <span class="fuel-log-date">${log.date}</span>
                        <span class="fuel-log-cost">${log.cost}</span>
                    </div>
                    <div class="fuel-log-row">
                        <span class="fuel-log-volume">${log.volume}</span>
                        <span class="fuel-log-odometer">${log.odometer}</span>
                    </div>
                    <div class="fuel-log-row">
                        <span class="fuel-log-location">${log.location}</span>
                    </div>
                </div>
            `).join("");
        } else {
            fuelLogsContainer.innerHTML = `<p class="text-muted">No recent fuel logs.</p>`;
        }
    }
}

function showError(rootElement, message) {
    const content = rootElement.querySelector("#vehicle-details-content");
    if (content) {
        content.innerHTML = `<div class="error-message">${message}</div>`;
    }
}

function updateProgressBar(prefix, value) {
    const textEl = document.getElementById(`${prefix}-text`);
    const barEl = document.getElementById(`${prefix}-bar`);
    
    if (textEl) textEl.textContent = `${value}%`;
    if (barEl) {
        barEl.style.width = `${value}%`;
        
        // Determine color based on value
        if (value < 80) {
            barEl.style.backgroundColor = "var(--color-success, #22c55e)";
        } else if (value <= 60) {
            barEl.style.backgroundColor = "var(--color-warning, #f59e0b)";
        } else {
            barEl.style.backgroundColor = "var(--color-error, #ef4444)";
        }
    }
}

function updateCTVAnalysis(ctvString) {
    const ratioValueEl = document.getElementById("ctv-ratio-value");
    const statusTextEl = document.getElementById("ctv-status-text");
    const progressBarEl = document.getElementById("ctv-progress-bar");
    
    if (!ratioValueEl || !statusTextEl || !progressBarEl) return;

    // Parse percentage
    const percentage = parseFloat(ctvString.replace('%', '')) || 0;
    
    ratioValueEl.textContent = ctvString;
    progressBarEl.style.width = `${percentage}%`;
    
    const threshold = 50;
    
    if (percentage >= threshold) {
        statusTextEl.innerHTML = `<i data-lucide="alert-triangle"></i> High Cost`;
        statusTextEl.className = "ctv-status danger";
        ratioValueEl.className = "ctv-value danger";
        progressBarEl.style.backgroundColor = "#ef4444";
    } else {
        statusTextEl.innerHTML = `<i data-lucide="check"></i> Safe`;
        statusTextEl.className = "ctv-status";
        ratioValueEl.className = "ctv-value";
        progressBarEl.style.backgroundColor = "#10b981";
    }
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function populateMaintenanceHistory(history) {
    const tbody = document.getElementById("maintenance-history-tbody");
    if (!tbody) return;

    if (!history || history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #6b7280;">No maintenance history available.</td></tr>`;
        return;
    }

    tbody.innerHTML = history.map(item => `
        <tr class="clickable-row" data-wo-id="${item.id}">
            <td class="wo-id">${item.id}</td>
            <td><span class="badge-chip ${item.type.toLowerCase().replace(' ', '-')}">${item.type}</span></td>
            <td>${item.mechanic}</td>
            <td><span class="badge-chip ${item.status.toLowerCase().replace(' ', '-')}">${item.status}</span></td>
            <td>${item.repairCost}</td>
            <td>${item.opened}</td>
            <td>${item.closed}</td>
        </tr>
    `).join("");

    // Add click event for navigation
    tbody.querySelectorAll(".clickable-row").forEach(row => {
        row.addEventListener("click", () => {
            const woId = row.getAttribute("data-wo-id");
            // Use the data-link navigation approach
            const path = `/work-orders/details?id=${woId}`;
            window.history.pushState({}, "", path);
            window.dispatchEvent(new PopStateEvent('popstate'));
        });
    });
}

export function unmount() {
    // Cleanup
}
