import OrdersApi from "../../services/api/orders.js";
import {
    createIcons,
    icons,
} from "/node_modules/lucide/dist/esm/lucide.mjs";

let cleanupFns = [];
let state = null;

const PAGE_SIZE = 10;

export async function mount() {
    state = {
        activeStatus: "All",
        addForm: null,
        currentPage: 1,
        importFile: null,
        importFileName: "",
        modal: null,
        orders: [],
        searchTerm: "",
    };

    const tbody = document.getElementById("orders-table-body");
    if (tbody) tbody.innerHTML = `<tr><td colspan="12"><div style="text-align: center; padding: 2rem;">Loading orders from server...</div></td></tr>`;

    state.orders = await OrdersApi.getOrders();

    bindPageEvents();
    renderPage();
}

export function unmount() {
    cleanupFns.forEach((cleanup) => cleanup?.());
    cleanupFns = [];
    state = null;
}

function bindPageEvents() {
    cleanupFns = [];

    const searchInput = document.getElementById("orders-search-input");
    const filters = document.getElementById("orders-filters");
    const tbody = document.getElementById("orders-table-body");
    const pagination = document.getElementById("orders-pagination");
    const importButton = document.getElementById("import-orders-btn");
    const addButton = document.getElementById("add-order-btn");
    const exportButton = document.getElementById("export-orders-btn");
    const modalRoot = document.getElementById("orders-modal-root");

    searchInput?.addEventListener("input", handleSearchInput);
    filters?.addEventListener("click", handleFilterClick);
    tbody?.addEventListener("click", handleTableClick);
    pagination?.addEventListener("click", handlePaginationClick);
    importButton?.addEventListener("click", openImportModal);
    addButton?.addEventListener("click", openAddModal);
    exportButton?.addEventListener("click", handleExport);
    modalRoot?.addEventListener("click", handleModalClick);
    modalRoot?.addEventListener("change", handleModalChange);
    modalRoot?.addEventListener("submit", handleModalSubmit);

    const handleEscape = (event) => {
        if (event.key === "Escape" && state?.modal) {
            closeModal();
        }
    };

    document.addEventListener("keydown", handleEscape);

    cleanupFns.push(
        () => searchInput?.removeEventListener("input", handleSearchInput),
        () => filters?.removeEventListener("click", handleFilterClick),
        () => tbody?.removeEventListener("click", handleTableClick),
        () => pagination?.removeEventListener("click", handlePaginationClick),
        () => importButton?.removeEventListener("click", openImportModal),
        () => addButton?.removeEventListener("click", openAddModal),
        () => exportButton?.removeEventListener("click", handleExport),
        () => modalRoot?.removeEventListener("click", handleModalClick),
        () => modalRoot?.removeEventListener("change", handleModalChange),
        () => modalRoot?.removeEventListener("submit", handleModalSubmit),
        () => document.removeEventListener("keydown", handleEscape),
    );
}

function renderPage() {
    renderSummary();
    renderFilters();
    renderTable();
    renderModal();
    refreshIcons();
}

function renderSummary() {
    const summary = document.getElementById("orders-summary");
    if (!summary) {
        return;
    }

    const total = state.orders.length;
    const liveTrackingEnabled = state.orders.filter(
        (order) => order.notificationsSummary.sent > 0,
    ).length;

    summary.textContent = `${total} total orders - ${liveTrackingEnabled} with live tracking enabled`;
}

function renderFilters() {
    const filters = document.getElementById("orders-filters");
    if (!filters) {
        return;
    }

    const active = state.activeStatus;
    filters.innerHTML = OrdersApi.getStatusOptions()
        .map(
            (status) => `
                <button
                    class="orders-filter-chip ${active === status ? "is-active" : ""}"
                    type="button"
                    data-status-filter="${status}">
                    ${status}
                </button>
            `,
        )
        .join("");
}

function renderTable() {
    const tbody = document.getElementById("orders-table-body");
    const footer = document.getElementById("orders-table-footer");
    const pagination = document.getElementById("orders-pagination");

    if (!tbody || !footer || !pagination) {
        return;
    }

    const filteredOrders = getFilteredOrders();
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
    state.currentPage = Math.min(state.currentPage, totalPages);
    const pagedOrders = paginate(filteredOrders, state.currentPage, PAGE_SIZE);

    if (!filteredOrders.length) {
        tbody.innerHTML = `
            <tr class="is-empty-row">
                <td colspan="12">
                    <div class="orders-empty">
                        <div class="orders-empty__icon">
                            <i data-lucide="package-search"></i>
                        </div>
                        <strong>No orders match this filter.</strong>
                        <p>Try another status or search term.</p>
                    </div>
                </td>
            </tr>
        `;
        footer.textContent = "Showing 0 orders";
        pagination.innerHTML = "";
        return;
    }

    tbody.innerHTML = pagedOrders.map(renderOrderRow).join("");

    const start = (state.currentPage - 1) * PAGE_SIZE + 1;
    const end = Math.min(start + PAGE_SIZE - 1, filteredOrders.length);
    footer.textContent = `Showing ${start}-${end} of ${filteredOrders.length} orders`;
    pagination.innerHTML = renderPagination(totalPages);
}

function renderOrderRow(order) {
    return `
        <tr data-order-id="${order.id}">
            <td class="orders-table__check">
                <input type="checkbox" aria-label="Select ${order.id}" />
            </td>
            <td><span class="order-id">${order.id}</span></td>
            <td>
                <div class="order-cell-stack">
                    <strong>${order.customerName}</strong>
                    <span>${order.customerPhone}</span>
                </div>
            </td>
            <td><span class="order-cell-stack"><span>${order.address}</span></span></td>
            <td><strong>${formatWeight(order.weightKg)}</strong></td>
            <td><strong>${order.volumeM3} m3</strong></td>
            <td><strong>${order.paymentType}</strong></td>
            <td>${renderPriorityBadge(order.priority)}</td>
            <td><span>${order.paymentWindow}</span></td>
            <td>${renderStatusBadge(order.status)}</td>
            <td>${renderDriverCell(order)}</td>
            <td>
                <button class="tracking-link-chip" type="button" data-action="open-order" data-order-id="${order.id}">
                    <i data-lucide="square-arrow-out-up-right"></i>
                    <span>Link</span>
                </button>
            </td>
        </tr>
    `;
}

function renderDriverCell(order) {
    if (!order.driver) {
        return "<span>--</span>";
    }

    return `
        <span class="driver-pill">
            <span class="driver-pill__avatar">${order.driver.initials}</span>
            <span class="driver-pill__meta">
                <strong>${order.driver.name}</strong>
            </span>
        </span>
    `;
}

function renderPagination(totalPages) {
    const buttons = [];
    buttons.push(
        `<button class="page-btn" type="button" data-page-action="prev" ${state.currentPage === 1 ? "disabled" : ""}><i data-lucide="chevron-left"></i></button>`,
    );

    for (let page = 1; page <= totalPages; page += 1) {
        buttons.push(`
            <button
                class="page-btn ${page === state.currentPage ? "is-active" : ""}"
                type="button"
                data-page="${page}">
                ${page}
            </button>
        `);
    }

    buttons.push(
        `<button class="page-btn" type="button" data-page-action="next" ${state.currentPage === totalPages ? "disabled" : ""}><i data-lucide="chevron-right"></i></button>`,
    );

    return buttons.join("");
}

function renderModal() {
    const modalRoot = document.getElementById("orders-modal-root");
    if (!modalRoot) {
        return;
    }

    if (!state.modal) {
        modalRoot.innerHTML = "";
        return;
    }

    if (state.modal.type === "details" && state.modal.orderData) {
        modalRoot.innerHTML = renderDetailsModal(state.modal.orderData);
        return;
    }

    if (state.modal.type === "import") {
        modalRoot.innerHTML = renderImportModal();
        return;
    }

    if (state.modal.type === "add") {
        modalRoot.innerHTML = renderAddModal();
    }
}

function renderDetailsModal(order) {
    if (!order) {
        return "";
    }

    const timelineContent = renderOrderTimeline(order);

    return `
        <div class="modal-overlay" data-modal-close="overlay">
            <section class="modal-panel" role="dialog" aria-modal="true" aria-label="Order details">
                <header class="modal-header">
                    <div class="modal-order-head">
                        <div class="modal-order-icon">
                            <i data-lucide="package"></i>
                        </div>
                        <div class="modal-order-meta">
                            <div class="modal-order-title-row">
                                <strong class="modal-order-id">${order.id}</strong>
                                <div class="modal-tags">
                                    ${renderStatusBadge(order.status)}
                                    <span class="modal-tag modal-tag--priority">${order.priority}</span>
                                </div>
                            </div>
                            <span class="modal-subtitle">${order.customerName} - ${order.address}</span>
                        </div>
                    </div>
                    <button class="modal-close" type="button" data-modal-close="button" aria-label="Close">
                        <i data-lucide="x"></i>
                    </button>
                </header>
                <div class="modal-body">
                    <section class="order-info-grid">
                        ${renderInfoCard("user-round", "Customer", order.customerName, order.customerPhone)}
                        ${renderInfoCard("send", "Driver", order.driver?.name ?? "Unassigned", order.driver?.code ?? "--")}
                        ${renderInfoCard("truck", "Vehicle", order.vehicleId ?? "--", order.vehicleId ? "Assigned vehicle" : "--")}
                        ${renderInfoCard("package", "Payment", order.paymentType, order.paymentWindow)}
                        ${renderInfoCard("map-pin", "Weight / Volume", `${formatWeight(order.weightKg)} / ${order.volumeM3} m3`, order.createdAt)}
                    </section>

                    ${timelineContent}
                </div>
            </section>
        </div>
    `;
}

function renderInfoCard(icon, label, value, meta) {
    return `
        <article class="order-info-card">
            <span class="order-info-card__label">
                <i data-lucide="${icon}"></i>
                <span>${label}</span>
            </span>
            <strong class="order-info-card__value">${value}</strong>
            <span class="order-info-card__meta">${meta}</span>
        </article>
    `;
}

function renderOrderTimeline(order) {
    return `
        <section class="tab-panel">
            <div class="timeline-list">
                ${order.timeline
                    .map(
                        (item) => `
                            <article class="timeline-card">
                                <div class="timeline-card__main">
                                    <span class="timeline-marker">
                                        <i data-lucide="clock-3"></i>
                                    </span>
                                    <div class="timeline-card__copy">
                                        <strong>${item.title}</strong>
                                        <span>${item.description}</span>
                                    </div>
                                </div>
                                <div class="timeline-card__meta">
                                    <span>${item.at}</span>
                                </div>
                            </article>
                        `,
                    )
                    .join("")}
            </div>
        </section>
    `;
}

function renderImportModal() {
    const note = OrdersApi.getImportNote();
    const isFilled = Boolean(state.importFileName);

    return `
        <div class="modal-overlay" data-modal-close="overlay">
            <section class="modal-panel modal-panel--compact" role="dialog" aria-modal="true" aria-label="Import orders">
                <header class="modal-header">
                    <div>
                        <h2 class="heading-md">Import Orders</h2>
                    </div>
                    <button class="modal-close" type="button" data-modal-close="button" aria-label="Close">
                        <i data-lucide="x"></i>
                    </button>
                </header>
                <div class="modal-body import-body">
                    <label class="upload-zone ${isFilled ? "is-filled" : ""}" for="orders-import-file">
                        <span class="upload-zone__icon"><i data-lucide="upload"></i></span>
                        <strong>${isFilled ? state.importFileName : "Drop CSV or XML file here"}</strong>
                        <span>${isFilled ? "File selected and ready to import" : "or click to browse files"}</span>
                    </label>
                    <input class="hidden-input" id="orders-import-file" type="file" accept=".csv,.txt,.xml" />
                    <div class="import-note">
                        <i data-lucide="info"></i>
                        <span>${note}</span>
                    </div>
                    <div class="import-footer">
                        <strong>${isFilled ? "Ready to import" : "Select a file to continue"}</strong>
                        <button class="button primary" type="button" data-action="confirm-import" ${isFilled ? "" : "disabled"}>
                            Confirm Import
                        </button>
                    </div>
                </div>
            </section>
        </div>
    `;
}

function renderAddModal() {
    const form = state.addForm ?? {
        address: "",
        customerEmail: "",
        customerName: "",
        customerPhone: "",
        paymentType: "Prepaid",
        paymentWindow: "09:00-12:00",
        priority: "Normal",
        volumeM3: "0.5",
        weightKg: "10",
        latitude: "",
        longitude: "",
        codAmount: "0",
        notes: "",
    };

    const priorityOptions = OrdersApi.getPriorityOptions()
        .map(
            (option) => `
                <option value="${option}" ${form.priority === option ? "selected" : ""}>${option}</option>
            `,
        )
        .join("");

    const paymentOptions = OrdersApi.getPaymentOptions()
        .map(
            (option) => `
                <option value="${option}" ${form.paymentType === option ? "selected" : ""}>${option}</option>
            `,
        )
        .join("");

    return `
        <div class="modal-overlay" data-modal-close="overlay">
            <section class="modal-panel modal-panel--compact" role="dialog" aria-modal="true" aria-label="Add order">
                <header class="modal-header">
                    <div>
                        <h2 class="heading-md">Add Order</h2>
                        <p class="muted-copy">Create a new order entry and auto-generate customer notifications.</p>
                    </div>
                    <button class="modal-close" type="button" data-modal-close="button" aria-label="Close">
                        <i data-lucide="x"></i>
                    </button>
                </header>
                <div class="modal-body">
                    <form class="add-order-form" id="add-order-form">
                        <div class="form-grid">
                            <label>
                                <span class="label">Customer Name</span>
                                <input name="customerName" value="${form.customerName}" required />
                            </label>
                            <label>
                                <span class="label">Phone Number</span>
                                <input name="customerPhone" value="${form.customerPhone}" required />
                            </label>
                            <label>
                                <span class="label">Email</span>
                                <input name="customerEmail" type="email" value="${form.customerEmail}" required />
                            </label>
                            <label>
                                <span class="label">Payment</span>
                                <select name="paymentType" required>${paymentOptions}</select>
                            </label>
                            <label class="full-span">
                                <span class="label">Address</span>
                                <input name="address" value="${form.address}" required />
                            </label>
                            <label>
                                <span class="label">Delivery Window</span>
                                <input name="paymentWindow" value="${form.paymentWindow}" required />
                            </label>
                            <label>
                                <span class="label">Priority</span>
                                <select name="priority">${priorityOptions}</select>
                            </label>
                            <label>
                                <span class="label">Weight (kg)</span>
                                <input name="weightKg" type="number" min="0" step="0.1" value="${form.weightKg}" required />
                            </label>
                            <label>
                                <span class="label">Volume (m3)</span>
                                <input name="volumeM3" type="number" min="0" step="0.1" value="${form.volumeM3}" required />
                            </label>
                            <label>
                                <span class="label">Latitude</span>
                                <input name="latitude" type="number" min="-90" max="90" step="0.000001" value="${form.latitude}" required />
                            </label>
                            <label>
                                <span class="label">Longitude</span>
                                <input name="longitude" type="number" min="-180" max="180" step="0.000001" value="${form.longitude}" required />
                            </label>
                            <label>
                                <span class="label">COD Amount</span>
                                <input name="codAmount" type="number" min="0" step="1" value="${form.codAmount}" />
                            </label>
                            <label class="full-span">
                                <span class="label">Notes</span>
                                <input name="notes" value="${form.notes}" />
                            </label>
                        </div>
                        <div class="modal-actions">
                            <button class="button secondary" type="button" data-modal-close="button">Cancel</button>
                            <button class="button primary" type="submit">Create Order</button>
                        </div>
                    </form>
                </div>
            </section>
        </div>
    `;
}

function handleSearchInput(event) {
    state.searchTerm = event.target.value.trim().toLowerCase();
    state.currentPage = 1;
    renderTable();
    refreshIcons();
}

function handleFilterClick(event) {
    const button = event.target.closest("[data-status-filter]");
    if (!button) {
        return;
    }

    state.activeStatus = button.dataset.statusFilter;
    state.currentPage = 1;
    renderFilters();
    renderTable();
    refreshIcons();
}

function handlePaginationClick(event) {
    const pageButton = event.target.closest("[data-page]");
    const actionButton = event.target.closest("[data-page-action]");

    const filteredOrders = getFilteredOrders();
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

    if (pageButton) {
        state.currentPage = Number(pageButton.dataset.page);
        renderTable();
        refreshIcons();
        return;
    }

    if (!actionButton) {
        return;
    }

    if (actionButton.dataset.pageAction === "prev") {
        state.currentPage = Math.max(1, state.currentPage - 1);
    }

    if (actionButton.dataset.pageAction === "next") {
        state.currentPage = Math.min(totalPages, state.currentPage + 1);
    }

    renderTable();
    refreshIcons();
}

async function handleTableClick(event) {
    if (event.target.closest('input[type="checkbox"]')) {
        event.stopPropagation();
        return;
    }

    const row = event.target.closest("[data-order-id]");
    const actionButton = event.target.closest("[data-action='open-order']");
    const orderId = actionButton?.dataset.orderId ?? row?.dataset.orderId;

    if (!orderId) {
        return;
    }

    await openDetailsModal(orderId);
}

function handleModalClick(event) {
    const overlay = event.target.closest("[data-modal-close='overlay']");
    const closeButton = event.target.closest("[data-modal-close='button']");
    const confirmImportButton = event.target.closest(
        "[data-action='confirm-import']",
    );
    if (event.target === overlay || closeButton) {
        closeModal();
        return;
    }

    if (confirmImportButton) {
        confirmImport();
    }
}

function handleModalChange(event) {
    if (event.target.id === "orders-import-file") {
        handleImportFileChange(event);
    }
}

function handleModalSubmit(event) {
    if (event.target.id === "add-order-form") {
        handleAddOrderSubmit(event);
    }
}

async function handleImportFileChange(event) {
    const file = event.target.files?.[0];
    state.importFile = file;
    state.importFileName = file?.name ?? "";

    if (file && isCsvFile(file)) {
        try {
            const csvText = await file.text();
            const csvList = parseCsvToList(csvText);
            console.log("Uploaded CSV data list:", csvList);
        } catch (error) {
            console.error("Failed to read CSV file:", error);
        }
    }

    renderModal();
    refreshIcons();
}

async function handleAddOrderSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    const submitBtn = event.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating...";
    }

    state.addForm = Object.fromEntries(formData.entries());
    await OrdersApi.createOrder(state.addForm);
    state.orders = await OrdersApi.getOrders();
    state.currentPage = 1;
    state.addForm = null;
    closeModal();
    renderPage();
}

async function openDetailsModal(orderId) {
    const orderData = await OrdersApi.getOrderById(orderId);
    state.modal = {
        orderId,
        orderData,
        type: "details",
    };
    renderModal();
    refreshIcons();
}

function openImportModal() {
    state.importFileName = "";
    state.modal = { type: "import" };
    renderModal();
    refreshIcons();
}

function openAddModal() {
    state.modal = { type: "add" };
    renderModal();
    refreshIcons();
}

function closeModal() {
    state.modal = null;
    state.importFileName = "";
    renderModal();
}

async function confirmImport() {
    if (!state.importFile) {
        return;
    }

    const confirmBtn = document.querySelector("[data-action='confirm-import']");
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = "Importing...";
    }

    try {
        const result = await OrdersApi.importOrders(state.importFile);
        
        if (result.errors && result.errors.length > 0) {
            alert(`Imported ${result.imported} orders with some errors:\n${result.errors.slice(0, 5).join('\n')}${result.errors.length > 5 ? '\n...' : ''}`);
        } else {
            alert(`Successfully imported ${result.imported} orders.`);
        }

        state.orders = await OrdersApi.getOrders();
        state.currentPage = 1;
        closeModal();
        renderPage();
    } catch (error) {
        alert("Import failed: " + error.message);
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = "Confirm Import";
        }
    }
}

function handleExport() {
    const rows = getFilteredOrders();
    const header = [
        "Order ID",
        "Customer",
        "Phone",
        "Address",
        "Weight",
        "Payment",
        "Priority",
        "Window",
        "Status",
    ];
    const csv = [
        header.join(","),
        ...rows.map((order) =>
            [
                order.id,
                order.customerName,
                order.customerPhone,
                order.address,
                order.weightKg,
                order.paymentType,
                order.priority,
                order.paymentWindow,
                order.status,
            ]
                .map((value) => `"${String(value).replaceAll('"', '""')}"`)
                .join(","),
        ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "orders-export.csv";
    link.click();
    URL.revokeObjectURL(url);
}

function isCsvFile(file) {
    return (
        file.type === "text/csv" ||
        file.name.toLowerCase().endsWith(".csv")
    );
}

function parseCsvToList(csvText) {
    const rows = parseCsvRows(csvText).filter((row) =>
        row.some((cell) => cell.trim() !== ""),
    );

    if (!rows.length) {
        return [];
    }

    const headers = rows[0].map((header, index) => {
        const trimmedHeader = header.trim();
        return trimmedHeader || `column_${index + 1}`;
    });

    return rows.slice(1).map((row) =>
        headers.reduce((record, header, index) => {
            record[header] = row[index] ?? "";
            return record;
        }, {}),
    );
}

function parseCsvRows(csvText) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let index = 0; index < csvText.length; index += 1) {
        const char = csvText[index];
        const nextChar = csvText[index + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            cell += '"';
            index += 1;
            continue;
        }

        if (char === '"') {
            inQuotes = !inQuotes;
            continue;
        }

        if (char === "," && !inQuotes) {
            row.push(cell);
            cell = "";
            continue;
        }

        if ((char === "\n" || char === "\r") && !inQuotes) {
            if (char === "\r" && nextChar === "\n") {
                index += 1;
            }

            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
            continue;
        }

        cell += char;
    }

    row.push(cell);
    rows.push(row);

    return rows;
}

function getFilteredOrders() {
    return state.orders.filter((order) => {
        const matchesStatus =
            state.activeStatus === "All" || order.status === state.activeStatus;
        const term = state.searchTerm;
        const matchesSearch =
            !term ||
            order.id.toLowerCase().includes(term) ||
            order.customerName.toLowerCase().includes(term) ||
            order.address.toLowerCase().includes(term);

        return matchesStatus && matchesSearch;
    });
}

function paginate(items, page, pageSize) {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
}

function renderPriorityBadge(priority) {
    const key = priority.toLowerCase();
    return `<span class="priority-badge priority-badge--${key}">${priority}</span>`;
}

function renderStatusBadge(status) {
    const key = toKebabCase(status);
    return `<span class="status-badge status-badge--${key}">${status}</span>`;
}

function formatWeight(weight) {
    return `${Number(weight).toFixed(weight % 1 === 0 ? 0 : 1)} kg`;
}

function toKebabCase(value) {
    return value.toLowerCase().replace(/\s+/g, "-");
}

function refreshIcons() {
    createIcons({ icons });
}
