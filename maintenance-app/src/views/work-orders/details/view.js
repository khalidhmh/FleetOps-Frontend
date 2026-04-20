import WorkOrdersApi from "../../../services/api/work-orders.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function queryParams() {
    return new URLSearchParams(window.location.search);
}

function getVehicleByPlate(plate) {
    const vehicles = WorkOrdersApi.getVehicles();
    return vehicles.find(v => v.plate === plate) || null;
}

// Map status to progress index
const STATUS_INDEX = {
    "Open": 0,
    "Assigned": 1,
    "In Progress": 2,
    "Resolved": 3,
    "Closed": 4
};

// ─── State ───────────────────────────────────────────────────────────────────
let currentOrder = null;
let cleanupFns = [];
let attachmentsCleanup = [];

// ─── Rendering ───────────────────────────────────────────────────────────────

function renderPage(order) {
    // Header
    document.getElementById("wod-title-id").textContent = order.id;
    document.getElementById("wod-subtitle-dates").textContent = `Opened ${order.opened} · Last updated ${order.updated}`;
    
    // Pills
    const mapType = { Routine: "routine", Breakdown: "breakdown", Emergency: "emergency" };
    const mapStatus = { "Open": "open", "Closed": "closed", "Assigned": "assigned", "In Progress": "inprogress", "Resolved": "resolved" };
    const priorityClass = order.priority === "Urgent" ? "urgent" : "normal";
    
    document.getElementById("wod-header-pills").innerHTML = `
        <span class="wo-pill wo-pill--${mapStatus[order.status] ?? 'open'}">${order.status}</span>
        <span class="wo-pill wo-pill--${mapType[order.type] ?? 'routine'}">${order.type}</span>
        <span class="wo-pill wo-pill--${priorityClass}">${order.priority}</span>
    `;

    // Vehicle
    const vehicle = getVehicleByPlate(order.vehicle);
    document.getElementById("wod-veh-plate").textContent = order.vehicle;
    if (vehicle) {
        document.getElementById("wod-veh-type").textContent = vehicle.category;
        document.getElementById("wod-veh-model").textContent = vehicle.model;
        
        let vStatusClass = "wo-pill--open"; 
        if(vehicle.status === "out_of_service") vStatusClass = "wo-pill--emergency";
        if(vehicle.status === "available") vStatusClass = "wo-pill--routine";
        
        const displayStatus = vehicle.status.split("_")
                                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                            .join(" ");
        
        document.getElementById("wod-veh-status").innerHTML = `<span class="wo-pill ${vStatusClass}">${displayStatus}</span>`;
    }

    // Work Desc
    document.getElementById("wod-description").textContent = order.description || "No description provided.";
    
    // Costs
    renderCostSummary(order);

    // Attachments
    renderAttachments(order.files || []);

    // Timeline
    renderTimeline(order);

    // Assignment Box
    renderAssignmentBox(order);

    // Logs & Parts
    renderRepairLog(order);
    renderPartsUsed(order);

    // Close Button Visibility
    const closeBtn = document.getElementById("wod-close-btn");
    if (closeBtn) {
        closeBtn.style.display = order.status === "Resolved" ? "block" : "none";
    }
}

function renderAttachments(files) {
    const card = document.getElementById("wod-attachments-card");
    const grid = document.getElementById("wod-attachments-grid");
    
    if (!files || files.length === 0) {
        card.style.display = "none";
        return;
    }
    
    card.style.display = "block";
    grid.innerHTML = files.map((file, idx) => {
        const isImage = file.toLowerCase().match(/\.(jpg|jpeg|png)$/i);
        const icon = isImage ? `📸` : `📄`;
        return `
            <div class="wod-attachment-item" data-idx="${idx}" data-file="${file}" data-is-image="${isImage ? 'true' : 'false'}" style="cursor: pointer; transition: border-color 0.15s ease;">
                <div class="wod-attachment-preview">
                    <span class="wod-attachment-icon">${icon}</span>
                </div>
                <div class="wod-attachment-info">
                    <div class="wod-attachment-name" title="${file}">${file}</div>
                </div>
            </div>
        `;
    }).join("");

    attachmentsCleanup.forEach(fn => fn());
    attachmentsCleanup = [];

    // Setup interactive clicks
    const items = grid.querySelectorAll(".wod-attachment-item");
    items.forEach(item => {
        const onEnter = () => item.style.borderColor = "var(--color-primary)";
        const onLeave = () => item.style.borderColor = "var(--color-border)";
        const onClick = () => {
            const fileName = item.getAttribute("data-file");
            const isImage = item.getAttribute("data-is-image") === "true";
            openLightbox(fileName, isImage);
        };
        item.addEventListener("mouseenter", onEnter);
        item.addEventListener("mouseleave", onLeave);
        item.addEventListener("click", onClick);
        attachmentsCleanup.push(() => {
            item.removeEventListener("mouseenter", onEnter);
            item.removeEventListener("mouseleave", onLeave);
            item.removeEventListener("click", onClick);
        });
    });
}

function openLightbox(fileName, isImage) {
    let lightbox = document.getElementById("wod-lightbox");
    if (!lightbox) {
        lightbox = document.createElement("div");
        lightbox.id = "wod-lightbox";
        lightbox.className = "wod-lightbox";
        lightbox.innerHTML = `
            <div class="wod-lightbox-overlay"></div>
            <div class="wod-lightbox-content">
                <button class="wod-lightbox-close" title="Close">✕</button>
                <div class="wod-lightbox-body" id="wod-lightbox-body"></div>
                <div class="wod-lightbox-footer" id="wod-lightbox-footer"></div>
            </div>
        `;
        document.body.appendChild(lightbox);
        
        const removeLightbox = () => {
            lightbox.classList.remove("wod-lightbox--open");
        };
        const overlay = lightbox.querySelector(".wod-lightbox-overlay");
        const closeBtn = lightbox.querySelector(".wod-lightbox-close");
        
        overlay.addEventListener("click", removeLightbox);
        closeBtn.addEventListener("click", removeLightbox);
        
        cleanupFns.push(() => {
            overlay.removeEventListener("click", removeLightbox);
            closeBtn.removeEventListener("click", removeLightbox);
            if (document.body.contains(lightbox)) {
                document.body.removeChild(lightbox);
            }
        });
    }
    
    const body = document.getElementById("wod-lightbox-body");
    const footer = document.getElementById("wod-lightbox-footer");
    
    if (isImage) {
        // Show an image preview mock (using placeholder.com)
        body.innerHTML = `<img src="https://via.placeholder.com/800x600/f8fafc/9aa3b2.png?text=${encodeURIComponent(fileName)}" alt="${fileName}" />`;
    } else {
        body.innerHTML = `<div class="wod-lightbox-doc" style="font-size: 48px; text-align: center; color: var(--color-text-muted);">📄<div style="font-size: 14px; margin-top: 16px; color: var(--color-text-title); font-weight: 600;">Preview not available</div><div style="font-size: 12px; margin-top: 4px;">Usually this would download the file.</div></div>`;
    }
    
    footer.innerHTML = `
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fileName}</span>
        <a href="#" class="wod-btn wod-btn--primary" onclick="event.preventDefault(); alert('Downloading ' + '${fileName}');"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line></svg>Download</a>
    `;
    
    lightbox.classList.add("wod-lightbox--open");
}

function renderTimeline(order) {
    const currentIndex = STATUS_INDEX[order.status] ?? 0;
    const steps = [
        document.getElementById("wod-step-created"),
        document.getElementById("wod-step-assigned"),
        document.getElementById("wod-step-inprogress"),
        document.getElementById("wod-step-resolved"),
        document.getElementById("wod-step-closed")
    ];

    steps.forEach((step, index) => {
        if (!step) return;
        step.classList.remove("wod-step--done", "wod-step--active");
        
        if (index < currentIndex) {
            step.classList.add("wod-step--done");
        } else if (index === currentIndex) {
            step.classList.add("wod-step--active");
        }
    });

    if (document.getElementById("wod-time-created")) {
        document.getElementById("wod-time-created").textContent = order.opened;
    }
}

function renderRepairLog(order) {
    const container = document.getElementById("wod-repair-log-container");
    const title = document.getElementById("wod-repair-log-title");
    if (!container || !title) return;

    const logs = order.logs || [];
    title.textContent = `Repair Log (${logs.length})`;

    if (logs.length === 0) {
        container.innerHTML = `<p style="color:var(--color-text-muted); font-size:14px; padding: 20px 0;">No repair logs recorded for this order yet.</p>`;
        return;
    }

    container.innerHTML = logs.map((log, idx) => `
        <div class="wod-log-item">
            <div class="wod-log-indicator ${idx === logs.length - 1 ? 'wod-log-indicator--orange' : ''}">${idx + 1}</div>
            <div class="wod-log-content">
                <div class="wod-log-header">
                    <h3>${log.title}</h3>
                    <span>${log.duration}</span>
                </div>
                <p>${log.description}</p>
                <small class="wod-log-meta">${log.mechanic} · ${log.date}</small>
            </div>
        </div>
    `).join("");
}

function renderPartsUsed(order) {
    const tbody = document.getElementById("wod-parts-tbody");
    const title = document.getElementById("wod-parts-title");
    const footer = document.getElementById("wod-parts-footer");
    if (!tbody || !title || !footer) return;

    const parts = order.parts || [];
    title.textContent = `Parts Used (${parts.length})`;

    if (parts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 30px; color:var(--color-text-muted);">No parts recorded.</td></tr>`;
        footer.textContent = `Total Parts: EGP 0`;
        return;
    }

    tbody.innerHTML = parts.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.qty}</td>
            <td>EGP ${p.price.toLocaleString()}</td>
            <td class="wod-align-right wod-font-bold">EGP ${(p.price * p.qty).toLocaleString()}</td>
        </tr>
    `).join("");

    footer.textContent = `Total Parts: EGP ${(order.partsCost || 0).toLocaleString()}`;
}

function renderCostSummary(order) {
    const partsEl = document.getElementById("wod-summary-parts");
    const laborEl = document.getElementById("wod-summary-labor");
    const totalEl = document.getElementById("wod-total-cost");
    const ratioEl = document.getElementById("wod-summary-ratio");
    
    if (!partsEl || !laborEl || !totalEl || !ratioEl) return;

    const partsCost = order.partsCost || 0;
    const laborCost = order.laborCost || 0;
    const totalCost = partsCost + laborCost;
    const marketValue = 850000; // Mock value for consistency
    const ratio = (totalCost / marketValue) * 100;

    partsEl.textContent = `EGP ${partsCost.toLocaleString()}`;
    laborEl.textContent = `EGP ${laborCost.toLocaleString()}`;
    totalEl.textContent = `EGP ${totalCost.toLocaleString()}`;
    ratioEl.textContent = `${ratio.toFixed(1)}%`;
    
    // Alert logic if ratio is high
    ratioEl.style.color = ratio > 5 ? "var(--color-danger)" : "#10b981";
}

function renderAssignmentBox(order) {
    const displayBox = document.getElementById("wod-assignment-display");
    const mechanic = order.mechanic;

    if (!mechanic || mechanic.name === "Unassigned") {
        displayBox.innerHTML = `
            <div class="wod-assignee-flex" style="opacity:0.6">
                <div class="wod-avatar wod-avatar--un">UN</div>
                <div class="wod-assignee-details">
                    <h3>Unassigned</h3>
                    <span>Pending assignment</span>
                </div>
            </div>
        `;
    } else {
        displayBox.innerHTML = `
            <div class="wod-assignee-flex">
                <div class="wod-avatar ${mechanic.avatarClass || ''}">${mechanic.initials}</div>
                <div class="wod-assignee-details">
                    <h3>${mechanic.name}</h3>
                    <span>Mechanic</span>
                </div>
            </div>
            <div class="wod-assigned-by">
                <p>Assigned by System</p>
                <p>${order.updated}</p>
            </div>
        `;
    }
}

function initAssignmentEdit() {
    const editBtn = document.getElementById("wod-reassign-btn");
    const displayBox = document.getElementById("wod-assignment-display");
    const editBox = document.getElementById("wod-assignment-edit");
    const selectBox = document.getElementById("wod-mechanic-select");
    const saveBtn = document.getElementById("wod-save-assign");
    const cancelBtn = document.getElementById("wod-cancel-assign");

    if (!editBtn || !selectBox) return;

    // Populate mechanics
    const mechanics = WorkOrdersApi.getMechanics();
    selectBox.innerHTML = mechanics.map(m => 
        `<option value="${m.name === 'Unassigned' ? '' : m.name}">${m.name}</option>`
    ).join("");

    const onEdit = () => {
        displayBox.style.display = "none";
        editBox.style.display = "block";
        if (currentOrder && currentOrder.mechanic) {
            selectBox.value = currentOrder.mechanic.name === "Unassigned" ? "" : currentOrder.mechanic.name;
        }
    };
    editBtn.addEventListener("click", onEdit);
    cleanupFns.push(() => editBtn.removeEventListener("click", onEdit));

    const onCancel = () => {
        displayBox.style.display = "block";
        editBox.style.display = "none";
    };
    cancelBtn.addEventListener("click", onCancel);
    cleanupFns.push(() => cancelBtn.removeEventListener("click", onCancel));

    const onSave = () => {
        if (!currentOrder) return;
        const success = WorkOrdersApi.updateOrderMechanic(currentOrder.id, selectBox.value);
        
        if (success) {
            // Re-fetch to get updated state
            currentOrder = WorkOrdersApi.getOrderById(currentOrder.id);
            renderPage(currentOrder);
        } else {
            alert("Could not reassign work order. Please try again.");
        }

        displayBox.style.display = "block";
        editBox.style.display = "none";
    };
    saveBtn.addEventListener("click", onSave);
    cleanupFns.push(() => saveBtn.removeEventListener("click", onSave));
}

function initCloseOrder() {
    const closeBtn = document.getElementById("wod-close-btn");
    if (!closeBtn) return;

    const onClose = () => {
        if (!currentOrder) return;
        
        const success = WorkOrdersApi.updateOrderStatus(currentOrder.id, "Closed");
        if (success) {
            // Re-fetch to get updated state
            currentOrder = WorkOrdersApi.getOrderById(currentOrder.id);
            renderPage(currentOrder);
        } else {
            alert("Could not close work order. Please try again.");
        }
    };

    closeBtn.addEventListener("click", onClose);
    cleanupFns.push(() => closeBtn.removeEventListener("click", onClose));
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export function mount(container) {
    cleanupFns = [];
    attachmentsCleanup = [];
    
    const id = queryParams().get("id");
    
    if (!id) {
        container.innerHTML = `<div style="padding: 40px; text-align: center;"><h2>No Order ID provided</h2><a href="/work-orders" data-link>Back to List</a></div>`;
        return;
    }

    currentOrder = WorkOrdersApi.getOrderById(id);
    
    if (!currentOrder) {
        container.innerHTML = `<div style="padding: 40px; text-align: center;"><h2>Order <span style="color:var(--color-primary)">${id}</span> not found</h2><p>It may have been deleted or does not exist.</p><a href="/work-orders" data-link>Back to List</a></div>`;
        return;
    }

    renderPage(currentOrder);
    initAssignmentEdit();
    initCloseOrder();
}

export function unmount() {
    cleanupFns.forEach(fn => fn && fn());
    cleanupFns = [];
    
    attachmentsCleanup.forEach(fn => fn && fn());
    attachmentsCleanup = [];

    currentOrder = null;
}
