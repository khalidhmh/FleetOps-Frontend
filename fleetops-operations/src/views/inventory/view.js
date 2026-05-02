import { getInventory, updateInventory } from '../../services/api/inventory.js';
import { getSettings } from '../../services/api/settings.js';
import { logAuditAction } from '../../services/api/auditLogger.js';
import { createIcons, icons } from '/node_modules/lucide/dist/esm/lucide.mjs';

let root = null;
let state = [];
let globalSettings = null;

// Format currency based on global settings
const formatCurrency = (value) => {
    const currency = globalSettings ? globalSettings.general.currency : 'EGP';
    const locale = currency === 'EGP' ? 'ar-EG' : (currency === 'USD' ? 'en-US' : 'en-SA');
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

// Stock status logic using GLOBAL settings threshold
const getStockStatus = (qty, itemMinThreshold) => {
    // Override item specific threshold with global if applicable, but usually items have their own. 
    // The prompt requested linking the system, so we'll use the global threshold as a base modifier or direct override.
    const threshold = globalSettings ? globalSettings.fleetPolicies.lowStockThreshold : itemMinThreshold;
    
    if (qty === 0) return { label: 'Out of Stock', class: 'status-out-stock', fillClass: 'red' };
    if (qty <= threshold) return { label: 'Low Stock', class: 'status-low-stock', fillClass: 'orange' };
    return { label: 'In Stock', class: 'status-in-stock', fillClass: 'green' };
};

// Compute analytics
const computeAnalytics = (data) => {
    let totalItems = 0;
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    data.forEach(item => {
        totalItems += item.quantity;
        totalValue += (item.quantity * item.unitPrice);
        
        const status = getStockStatus(item.quantity, item.minThreshold).label;
        if (status === 'Out of Stock') {
            outOfStockCount++;
        } else if (status === 'Low Stock') {
            lowStockCount++;
        }
    });

    return { totalItems, totalValue, lowStockCount, outOfStockCount };
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
    if (countEl) countEl.textContent = `${state.length} parts tracked`;

    const elTotalItems = root.querySelector('#stat-total-items');
    if (elTotalItems) elTotalItems.textContent = analytics.totalItems.toLocaleString();

    const elTotalValue = root.querySelector('#stat-total-value');
    if (elTotalValue) elTotalValue.textContent = formatCurrency(analytics.totalValue);

    const elLowStock = root.querySelector('#stat-low-stock');
    if (elLowStock) elLowStock.textContent = analytics.lowStockCount;

    const elOutStock = root.querySelector('#stat-out-stock');
    if (elOutStock) elOutStock.textContent = analytics.outOfStockCount;

    // Banner logic
    const banner = root.querySelector('#attention-banner');
    if (banner) {
        const needsAttention = analytics.lowStockCount + analytics.outOfStockCount;
        if (needsAttention > 0) {
            banner.style.display = 'flex';
            root.querySelector('#banner-attention-count').textContent = needsAttention;
            root.querySelector('#banner-out-count').textContent = analytics.outOfStockCount;
            root.querySelector('#banner-low-count').textContent = analytics.lowStockCount;
        } else {
            banner.style.display = 'none';
        }
    }

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
                    <td><span title="Global Setting Overlay Active">${currentThreshold}</span></td>
                    <td><span class="status-badge ${status.class}">${status.label}</span></td>
                    <td>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill ${status.fillClass}" style="width: ${progressPct}%"></div>
                            </div>
                            <span class="progress-text">${progressPct}%</span>
                        </div>
                    </td>
                    <td>${formatCurrency(item.unitPrice)}</td>
                    <td><strong>${formatCurrency(item.quantity * item.unitPrice)}</strong></td>
                    <td>${item.location}</td>
                    <td>${item.supplier}</td>
                    <td>${new Date(item.lastRestocked).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</td>
                    <td>
                        <button class="action-btn view-details-btn" data-id="${item.id}" title="View Details">
                            <i data-lucide="eye"></i>
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
    if (e.target.id === 'inventory-search') {
        render();
    }
};

const handleChange = (e) => {
    if (e.target.id === 'category-filter') {
        render();
    }
};

const handleClick = async (e) => {
    // Status Pills
    if (e.target.classList.contains('pill') && e.target.closest('#status-filters')) {
        const pills = root.querySelectorAll('#status-filters .pill');
        pills.forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        render();
        return;
    }

    // View Details
    const viewBtn = e.target.closest('.view-details-btn');
    if (viewBtn) {
        const id = viewBtn.dataset.id;
        openDetailsModal(id);
        return;
    }

    // Add Part
    const addBtn = e.target.closest('#add-part-btn');
    if (addBtn) {
        openFormModal();
        return;
    }

    // Close Modals
    const closeBtn = e.target.closest('.close-modal-btn');
    if (closeBtn) {
        closeAllModals();
        return;
    }
    
    // Modal background click
    if (e.target.classList.contains('modal-overlay') && !e.target.closest('.modal-content')) {
        closeAllModals();
        return;
    }

    // Edit Part (from Details modal)
    const editBtn = e.target.closest('#edit-part-btn');
    if (editBtn) {
        const id = editBtn.dataset.id;
        closeAllModals();
        openFormModal(id);
        return;
    }
    
    // Quick Restock (+10) simulation using POST API
    const restockBtn = e.target.closest('#restock-btn');
    if (restockBtn) {
        const id = restockBtn.dataset.id;
        const itemIndex = state.findIndex(i => i.id === id);
        if (itemIndex !== -1) {
            restockBtn.innerHTML = '<i data-lucide="loader-circle"></i> Restocking...';
            createIcons({ icons });
            restockBtn.disabled = true;
            
            const oldQty = state[itemIndex].quantity;
            state[itemIndex].quantity += 10;
            state[itemIndex].lastRestocked = new Date().toISOString().split('T')[0];
            
            // Sync with backend API
            await updateInventory(state);
            
            // Log to Audit Trail
            await logAuditAction("ADM-001", "Admin", "Updated", "SparePart", id, { quantity: oldQty }, { quantity: state[itemIndex].quantity });
            
            render();
            openDetailsModal(id);
        }
        return;
    }
};

const handleSubmit = async (e) => {
    if (e.target.id === 'part-form') {
        e.preventDefault();
        
        const id = root.querySelector('#form-id').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<i data-lucide="loader-circle"></i> Saving...';
        createIcons({ icons });
        submitBtn.disabled = true;

        const formItem = {
            name: root.querySelector('#form-name').value,
            sku: root.querySelector('#form-sku').value,
            category: root.querySelector('#form-category').value,
            quantity: parseInt(root.querySelector('#form-qty').value, 10),
            minThreshold: parseInt(root.querySelector('#form-min').value, 10),
            maxLevel: parseInt(root.querySelector('#form-max').value, 10),
            unitPrice: parseFloat(root.querySelector('#form-price').value),
            location: root.querySelector('#form-location').value,
            supplier: root.querySelector('#form-supplier').value,
            lastRestocked: new Date().toISOString().split('T')[0],
            monthlyUsage: [0, 0, 0, 0, 0, 0] // Mock default
        };

        if (id) {
            // Edit
            const index = state.findIndex(i => i.id === id);
            if (index !== -1) {
                const oldItem = { ...state[index] };
                state[index] = { ...state[index], ...formItem, monthlyUsage: state[index].monthlyUsage };
                await logAuditAction("ADM-001", "Admin", "Updated", "SparePart", id, oldItem, state[index]);
            }
        } else {
            // Add
            formItem.id = 'PRT-' + (1000 + state.length + 1);
            state.push(formItem);
            await logAuditAction("ADM-001", "Admin", "Created", "SparePart", formItem.id, null, formItem);
        }

        // Post to storage API
        await updateInventory(state);

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
        m.style.display = 'none';
    });
};

const openFormModal = (id = null) => {
    const modal = root.querySelector('#form-modal');
    const form = root.querySelector('#part-form');
    const title = root.querySelector('#form-modal-title');
    
    form.reset();
    
    if (id) {
        title.textContent = 'Edit Part';
        const item = state.find(i => i.id === id);
        if (item) {
            root.querySelector('#form-id').value = item.id;
            root.querySelector('#form-name').value = item.name;
            root.querySelector('#form-sku').value = item.sku;
            root.querySelector('#form-category').value = item.category;
            root.querySelector('#form-qty').value = item.quantity;
            root.querySelector('#form-min').value = item.minThreshold;
            root.querySelector('#form-max').value = item.maxLevel;
            root.querySelector('#form-price').value = item.unitPrice;
            root.querySelector('#form-location').value = item.location;
            root.querySelector('#form-supplier').value = item.supplier;
        }
    } else {
        title.textContent = 'Add Part';
        root.querySelector('#form-id').value = '';
    }

    modal.style.display = 'grid';
    modal.classList.add('active');
};

const openDetailsModal = (id) => {
    const item = state.find(i => i.id === id);
    if (!item) return;

    const modal = root.querySelector('#item-modal');
    const content = root.querySelector('#item-modal-content');
    
    const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
    let chartHtml = '';
    if (item.monthlyUsage && item.monthlyUsage.length === 6) {
        const maxVal = Math.max(...item.monthlyUsage, 1);
        chartHtml = item.monthlyUsage.map((val, idx) => {
            const hPct = Math.round((val / maxVal) * 100);
            return `
                <div class="chart-col">
                    <div class="chart-bar-bg">
                        <div class="chart-bar-fill" style="height: ${hPct}%"></div>
                    </div>
                    <span class="chart-label">${months[idx]}</span>
                    <span class="chart-val">${val}</span>
                </div>
            `;
        }).join('');
    }

    const currentThreshold = globalSettings ? globalSettings.fleetPolicies.lowStockThreshold : item.minThreshold;

    content.innerHTML = `
        <button class="modal-close-icon close-modal-btn"><i data-lucide="x"></i></button>
        <div class="modal-header-info">
            <div class="modal-header-icon"><i data-lucide="box"></i></div>
            <div class="modal-header-text">
                <h3>${item.name}</h3>
                <span>${item.id} • ${item.sku}</span>
            </div>
        </div>
        
        <div class="modal-stats">
            <div class="m-stat" style="background: #fffdf5; border-color: #fef08a;">
                <div class="m-stat-val">${item.quantity}</div>
                <div class="m-stat-label">In Stock</div>
            </div>
            <div class="m-stat" style="background: var(--color-surface-low);">
                <div class="m-stat-val">${currentThreshold}</div>
                <div class="m-stat-label">System Min Level</div>
            </div>
            <div class="m-stat" style="background: var(--color-surface-low);">
                <div class="m-stat-val">${item.maxLevel}</div>
                <div class="m-stat-label">Max Level</div>
            </div>
        </div>

        <div class="modal-details-grid">
            <div class="detail-row"><span class="detail-label">Category</span><span class="detail-value">${item.category}</span></div>
            <div class="detail-row"><span class="detail-label">Unit Price</span><span class="detail-value">${formatCurrency(item.unitPrice)}</span></div>
            <div class="detail-row"><span class="detail-label">Total Value</span><span class="detail-value">${formatCurrency(item.quantity * item.unitPrice)}</span></div>
            <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${item.location}</span></div>
            <div class="detail-row"><span class="detail-label">Supplier</span><span class="detail-value">${item.supplier}</span></div>
            <div class="detail-row"><span class="detail-label">Last Restocked</span><span class="detail-value">${new Date(item.lastRestocked).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span></div>
        </div>

        <div class="modal-chart-area">
            <h4>Monthly Usage</h4>
            <div class="mock-chart">
                ${chartHtml}
            </div>
        </div>

        <div class="modal-actions">
            <button class="button primary" id="restock-btn" data-id="${item.id}">Restock / Add Quantity</button>
            <button class="button outlined" id="edit-part-btn" data-id="${item.id}">Edit Part</button>
        </div>
    `;

    createIcons({ icons });

    modal.style.display = 'grid';
    modal.classList.add('active');
};

// Lifecycle Methods
export async function mount(rootElement) {
    root = rootElement;
    createIcons({ icons });
    
    // Disable interactions or show a loading state on the table
    const tableBody = root.querySelector('#inventory-table-body');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="14" style="text-align:center;"><i data-lucide="loader-circle"></i> Loading Data...</td></tr>';
    createIcons({ icons });
    
    try {
        const [invData, setObj] = await Promise.all([
            getInventory(),
            getSettings()
        ]);
        
        state = invData;
        globalSettings = setObj;

        render();

        // Attach event listeners
        root.addEventListener('input', handleInput);
        root.addEventListener('change', handleChange);
        root.addEventListener('click', handleClick);
        root.addEventListener('submit', handleSubmit);
    } catch (err) {
        console.error("Failed to load data", err);
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="14" style="text-align:center; color: red;">Failed to load data.</td></tr>';
    }
}
