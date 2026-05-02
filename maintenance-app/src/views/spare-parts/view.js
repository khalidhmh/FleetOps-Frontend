import { getInventory, updateInventory } from '../../services/api/inventory.js';
import { getSettings } from '../../services/api/settings.js';
import { logAuditAction } from '../../services/api/auditLogger.js';
import { createIcons, icons } from '../../../../node_modules/lucide/dist/esm/lucide.mjs';

let root = null;
let state = [];
let globalSettings = null;

// Stock status logic
const getStockStatus = (qty, itemMinThreshold) => {
    const threshold = globalSettings ? globalSettings.fleetPolicies.lowStockThreshold : itemMinThreshold;
    if (qty === 0) return { label: 'Out of Stock', class: 'status-out-stock', fillClass: 'red' };
    if (qty <= threshold) return { label: 'Low Stock', class: 'status-low-stock', fillClass: 'orange' };
    return { label: 'In Stock', class: 'status-in-stock', fillClass: 'green' };
};

// Compute analytics
const computeAnalytics = (data) => {
    let lowStockCount = 0;
    let outOfStockCount = 0;

    data.forEach(item => {
        const status = getStockStatus(item.quantity, item.minThreshold).label;
        if (status === 'Out of Stock') outOfStockCount++;
        else if (status === 'Low Stock') lowStockCount++;
    });

    return { totalItems: data.length, lowStockCount, outOfStockCount };
};

// Central Render Function
const render = () => {
    if (!root) return;

    // Apply active filters
    const searchInput = root.querySelector('#inventory-search');
    const categoryFilter = root.querySelector('#category-filter');
    const activeStatusPill = root.querySelector('#status-filters .pill.active');
    
    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
    const categoryVal = categoryFilter ? categoryFilter.value : 'All';
    const statusVal = activeStatusPill ? activeStatusPill.dataset.status : 'All';

    let filteredData = state.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchVal) || 
                              item.sku.toLowerCase().includes(searchVal) || 
                              item.id.toLowerCase().includes(searchVal);
        const matchesCat = categoryVal === 'All' || item.category === categoryVal;
        const itemStatus = getStockStatus(item.quantity, item.minThreshold).label;
        const matchesStatus = statusVal === 'All' || itemStatus === statusVal;

        return matchesSearch && matchesCat && matchesStatus;
    });

    // Render Analytics
    const analytics = computeAnalytics(state);
    const countEl = root.querySelector('#tracked-parts-count');
    if (countEl) countEl.textContent = `${filteredData.length} parts found`;

    const elTotalItems = root.querySelector('#stat-total-items');
    if (elTotalItems) elTotalItems.textContent = analytics.totalItems.toLocaleString();

    const elLowStock = root.querySelector('#stat-low-stock');
    if (elLowStock) elLowStock.textContent = analytics.lowStockCount;

    const elOutStock = root.querySelector('#stat-out-stock');
    if (elOutStock) elOutStock.textContent = analytics.outOfStockCount;

    // Render Table
    const tbody = root.querySelector('#inventory-table-body');
    const emptyState = root.querySelector('#inventory-empty-state');
    const table = root.querySelector('.inventory-table');

    if (tbody) {
        tbody.innerHTML = '';
        if (filteredData.length === 0) {
            emptyState.style.display = 'block';
            table.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            table.style.display = 'table';

            filteredData.forEach(item => {
                const tr = document.createElement('tr');
                const status = getStockStatus(item.quantity, item.minThreshold);
                const progressPct = Math.min(100, Math.round((item.quantity / item.maxLevel) * 100));
                const currentThreshold = globalSettings ? globalSettings.fleetPolicies.lowStockThreshold : item.minThreshold;
                
                tr.innerHTML = `
                    <td class="part-id">${item.id}</td>
                    <td class="part-name">${item.name}</td>
                    <td class="part-sku">${item.sku}</td>
                    <td>${item.category}</td>
                    <td><strong>${item.quantity}</strong></td>
                    <td>${currentThreshold}</td>
                    <td><span class="status-badge ${status.class}">${status.label}</span></td>
                    <td>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill ${status.fillClass}" style="width: ${progressPct}%"></div>
                            </div>
                            <span class="progress-text">${progressPct}%</span>
                        </div>
                    </td>
                    <td class="text-center">
                        <button class="action-btn request-btn" data-id="${item.id}" ${item.quantity === 0 ? 'disabled' : ''}>
                            <i data-lucide="hand-helping"></i> Use
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    createIcons({ icons });
};

// Event Handlers
const handleInput = (e) => {
    if (e.target.id === 'inventory-search') render();
};

const handleChange = (e) => {
    if (e.target.id === 'category-filter') render();
};

const handleClick = (e) => {
    // Status Pills
    if (e.target.classList.contains('pill') && e.target.closest('#status-filters')) {
        const pills = root.querySelectorAll('#status-filters .pill');
        pills.forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        render();
        return;
    }

    // Open Request Modal
    const requestBtn = e.target.closest('.request-btn');
    if (requestBtn) {
        const id = requestBtn.dataset.id;
        openRequestModal(id);
        return;
    }

    // Close Modals
    const closeBtn = e.target.closest('.close-modal-btn');
    if (closeBtn) {
        closeAllModals();
        return;
    }
    
    if (e.target.classList.contains('modal-overlay') && !e.target.closest('.modal-content')) {
        closeAllModals();
        return;
    }
};

const handleSubmit = async (e) => {
    if (e.target.id === 'request-form') {
        e.preventDefault();
        
        const id = root.querySelector('#req-part-id').value;
        const reqQty = parseInt(root.querySelector('#req-qty').value, 10);
        const vehicleId = root.querySelector('#req-vehicle-id').value;
        const notes = root.querySelector('#req-notes').value;
        
        const itemIndex = state.findIndex(i => i.id === id);
        if (itemIndex === -1) return;
        
        if (reqQty > state[itemIndex].quantity) {
            alert('Cannot request more parts than are available in stock!');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i data-lucide="loader-circle"></i> Processing...';
        createIcons({ icons });
        submitBtn.disabled = true;

        const oldQty = state[itemIndex].quantity;
        state[itemIndex].quantity -= reqQty;
        
        // Sync with API
        await updateInventory(state);
        
        // Audit Log
        await logAuditAction(
            "MEC-001", 
            "Mechanic",
            "Consumed", 
            "SparePart",
            state[itemIndex].id, 
            { quantity: oldQty }, 
            { quantity: state[itemIndex].quantity, vehicle: vehicleId }
        );

        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        closeAllModals();
        render();
    }
};

// Modal Logic
const closeAllModals = () => {
    root.querySelectorAll('.modal-overlay').forEach(m => {
        m.classList.remove('active');
        setTimeout(() => m.style.display = 'none', 200);
    });
};

const openRequestModal = (id) => {
    const item = state.find(i => i.id === id);
    if (!item) return;

    const modal = root.querySelector('#request-modal');
    
    root.querySelector('#req-part-id').value = item.id;
    root.querySelector('#request-part-name').textContent = `${item.name} (${item.id})`;
    root.querySelector('#req-max-qty').value = item.quantity;
    root.querySelector('#req-max-label').textContent = `/ ${item.quantity} available`;
    
    const qtyInput = root.querySelector('#req-qty');
    qtyInput.max = item.quantity;
    qtyInput.value = 1;
    
    root.querySelector('#req-vehicle-id').value = '';
    root.querySelector('#req-notes').value = '';

    modal.style.display = 'grid';
    // Small delay to allow display: grid to apply before adding opacity class
    setTimeout(() => modal.classList.add('active'), 10);
};

// Lifecycle Methods
export async function mount(rootElement) {
    root = rootElement;
    
    const tableBody = root.querySelector('#inventory-table-body');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;"><i data-lucide="loader-circle"></i> Loading Data...</td></tr>';
    createIcons({ icons });
    
    try {
        const [invData, setObj] = await Promise.all([
            getInventory(),
            getSettings()
        ]);
        
        state = invData;
        globalSettings = setObj;

        render();

        root.addEventListener('input', handleInput);
        root.addEventListener('change', handleChange);
        root.addEventListener('click', handleClick);
        root.addEventListener('submit', handleSubmit);
    } catch (err) {
        console.error("Failed to load data", err);
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: red;">Failed to load data.</td></tr>';
    }
}

export function unmount(rootElement) {
    if (!root) return;
    
    root.removeEventListener('input', handleInput);
    root.removeEventListener('change', handleChange);
    root.removeEventListener('click', handleClick);
    root.removeEventListener('submit', handleSubmit);
    
    root = null;
    state = [];
    globalSettings = null;
}
