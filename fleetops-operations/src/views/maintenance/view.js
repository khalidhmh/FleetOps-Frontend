import MaintenanceApi from "../../services/api/maintenance.js";

let cleanupFns = [];

export function mount() {
    cleanupFns = [];
    renderVehicles();
    renderWorkOrders();
    renderAlerts();
    renderInventory();

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

export function unmount() {
    cleanupFns.forEach(fn => fn && fn());
    cleanupFns = [];
}

function renderVehicles() {
    const grid = document.getElementById('vehicle-grid');
    if (!grid) return;

    grid.innerHTML = MaintenanceApi.getVehicles().map(v => {
        const healthClass = v.state === 'critical' ? 'critical' : v.state === 'warning' ? 'warning' : 'healthy';
        return `
            <div class="health-card ${healthClass}">
                <div class="health-card__header">
                    <div class="health-card__identity">
                        <i data-lucide="truck"></i>
                        <h3 class="health-card__id">${v.id}<span class="health-card__type">${v.type}</span></h3>
                    </div>
                    <div class="health-dot ${healthClass}"></div>
                </div>
                <div class="health-card__meta">
                    <p>Odometer: <span>${v.odometer}</span></p>
                    <p>Last Service: <span>${v.lastService}</span></p>
                    <p>Next Due: <strong>${v.nextDue}</strong></p>
                </div>
            </div>
        `;
    }).join('');
}

function renderWorkOrders() {
    const tbody = document.getElementById('work-orders-tbody');
    if (!tbody) return;

    tbody.innerHTML = MaintenanceApi.getWorkOrders().map(order => {
        const issueKey   = order.issue.toLowerCase();
        const issueBadge = `<span class="pill ${issueKey}">${order.issue}</span>`;

        const statusKey   = order.status.toLowerCase().replace(' ', '-');
        const statusBadge = `<span class="pill rounded ${statusKey}">${order.status}</span>`;

        return `
            <tr>
                <td>${order.id}</td>
                <td>${order.vehicle}</td>
                <td>${issueBadge}</td>
                <td>${order.mechanic}</td>
                <td>${statusBadge}</td>
                <td>${order.opened}</td>
            </tr>
        `;
    }).join('');
}

function renderAlerts() {
    const list = document.getElementById('alerts-list');
    if (!list) return;

    list.innerHTML = MaintenanceApi.getAlerts().map(alert => `
        <div class="alert-row">
            <i data-lucide="${alert.icon}"></i>
            <div class="alert-row__body">
                <span class="alert-row__title">${alert.vehicle} &mdash; ${alert.title}</span>
                <span class="alert-row__desc">${alert.desc}</span>
            </div>
        </div>
    `).join('');
}

function renderInventory() {
    const list = document.getElementById('stock-list');
    if (!list) return;

    const stockWarnings = MaintenanceApi.getStockWarnings();

    // update badge count
    const countBadge = document.getElementById('stock-count-badge');
    if (countBadge) countBadge.textContent = `${stockWarnings.length} items`;

    list.innerHTML = stockWarnings.map(item => `
        <div class="stock-row">
            <div class="stock-row__info">
                <span class="stock-row__name">${item.item}</span>
                <span class="stock-row__category">${item.category}</span>
            </div>
            <div class="stock-row__qty-block">
                <span class="stock-qty">${item.qty} <span>/ ${item.capacity} ${item.unit}</span></span>
                <span class="stock-reorder">Reorder: ${item.reorder}</span>
            </div>
        </div>
    `).join('');
}
