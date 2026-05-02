import { getAuditLogs } from '../../services/api/auditLogger.js';
import { createIcons, icons } from '/node_modules/lucide/dist/esm/lucide.mjs';

let root = null;
let currentLogs = [];

// دالة لتنسيق التاريخ
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

// 🌟 الدالة الجديدة: ملء القوائم المنسدلة بناءً على البيانات الحقيقية
function populateDropdowns(data) {
    if (!root) return;

    const userSelect = root.querySelector('#filter-user');
    const entitySelect = root.querySelector('#filter-entity');
    const actionSelect = root.querySelector('#filter-action');

    // استخراج القيم الفريدة من البيانات
    if (userSelect) {
        const users = [...new Set(data.map(log => log.userId))].filter(Boolean);
        userSelect.innerHTML = '<option value="">All Users</option>' +
            users.map(u => `<option value="${u}">${u}</option>`).join('');
    }

    if (entitySelect) {
        const entities = [...new Set(data.map(log => log.entity))].filter(Boolean);
        entitySelect.innerHTML = '<option value="">All Entities</option>' +
            entities.map(e => `<option value="${e}">${e}</option>`).join('');
    }

    if (actionSelect) {
        const actions = [...new Set(data.map(log => log.action))].filter(Boolean);
        actionSelect.innerHTML = '<option value="">All Actions</option>' +
            actions.map(a => `<option value="${a}">${a}</option>`).join('');
    }
}

// دالة رسم الجدول
function renderTable(data) {
    if (!root) return;

    const tbody = root.querySelector('#audit-table-body');
    const emptyState = root.querySelector('#audit-empty-state');
    const table = root.querySelector('.audit-table');

    if (!tbody || !emptyState || !table) return;

    tbody.innerHTML = '';

    if (data.length === 0) {
        emptyState.style.display = 'block';
        table.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    table.style.display = 'table';

    data.forEach(log => {
        const tr = document.createElement('tr');

        // تحديد لون الشارة (Badge)
        let actionBadgeClass = '';
        const actionStr = log.action ? log.action.toLowerCase() : '';

        if (actionStr === 'created' || actionStr === 'post') actionBadgeClass = 'badge-created';
        else if (actionStr === 'updated' || actionStr === 'put' || actionStr === 'patch') actionBadgeClass = 'badge-updated';
        else if (actionStr === 'deleted' || actionStr === 'delete') actionBadgeClass = 'badge-deleted';

        // بناء مستعرض التغييرات (JSON)
        let changesHtml = '';
        if (log.oldValue || log.newValue) {
            changesHtml = `<div class="changes-viewer">`;
            if (log.oldValue) {
                changesHtml += `
                    <div class="changes-box old">
                        <span class="changes-label">Old Value</span>
                        <pre>${JSON.stringify(log.oldValue, null, 2)}</pre>
                    </div>`;
            }
            if (log.newValue) {
                changesHtml += `
                    <div class="changes-box new">
                        <span class="changes-label">New Value</span>
                        <pre>${JSON.stringify(log.newValue, null, 2)}</pre>
                    </div>`;
            }
            changesHtml += `</div>`;
        }

        tr.innerHTML = `
            <td><span class="log-id">${log.id}</span></td>
            <td>${formatDate(log.timestamp)}</td>
            <td>${log.userId}</td>
            <td>${log.entity}</td>
            <td><span class="audit-badge ${actionBadgeClass}">${log.action}</span></td>
            <td>
                <div class="log-details-text">${log.details}</div>
                ${changesHtml}
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// 🌟 الدالة الجديدة: فلترة البيانات باحترافية
function getFilteredData() {
    const searchText = root.querySelector('#filter-search').value.toLowerCase();
    const dateFrom = root.querySelector('#filter-date-from').value;
    const dateTo = root.querySelector('#filter-date-to').value;
    const user = root.querySelector('#filter-user').value.toLowerCase();
    const entity = root.querySelector('#filter-entity').value.toLowerCase();
    const action = root.querySelector('#filter-action').value.toLowerCase();

    return currentLogs.filter(log => {
        // بحث نصي
        const detailsStr = log.details ? log.details.toLowerCase() : '';
        const idStr = String(log.id).toLowerCase();
        if (searchText && !detailsStr.includes(searchText) && !idStr.includes(searchText)) {
            return false;
        }

        // فلترة التاريخ
        const logDate = new Date(log.timestamp);
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (logDate < fromDate) return false;
        }
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (logDate > toDate) return false;
        }

        // فلترة القوائم (مقارنة دقيقة غير حساسة للأحرف)
        const logUser = log.userId ? log.userId.toLowerCase() : '';
        const logEntity = log.entity ? log.entity.toLowerCase() : '';
        const logAction = log.action ? log.action.toLowerCase() : '';

        if (user && logUser !== user) return false;
        if (entity && logEntity !== entity) return false;
        if (action && logAction !== action) return false;

        return true;
    });
}

function applyFilters() {
    if (!root) return;
    renderTable(getFilteredData()); // نمرر الداتا المفلترة للجدول
}

function exportToCSV() {
    const dataToExport = getFilteredData();
    const headers = ['Log ID', 'Date / Time', 'User', 'Entity', 'Action', 'Details', 'Old Value', 'New Value'];
    const rows = [headers.join(',')];

    dataToExport.forEach(log => {
        const row = [
            log.id,
            formatDate(log.timestamp),
            log.userId,
            log.entity,
            log.action,
            `"${(log.details || '').replace(/"/g, '""')}"`,
            log.oldValue ? `"${JSON.stringify(log.oldValue).replace(/"/g, '""')}"` : '""',
            log.newValue ? `"${JSON.stringify(log.newValue).replace(/"/g, '""')}"` : '""'
        ];
        rows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ─── Event Listeners ───
function handleInput(e) {
    if (e.target.id === 'filter-search') applyFilters();
}

function handleChange(e) {
    if (['filter-date-from', 'filter-date-to', 'filter-user', 'filter-entity', 'filter-action'].includes(e.target.id)) {
        applyFilters();
    }
}

function handleClick(e) {
    const exportBtn = e.target.closest('#export-csv-btn');
    if (exportBtn) exportToCSV();
}

// ─── Lifecycle ───
export async function mount(rootElement) {
    root = rootElement;

    const tbody = root.querySelector('#audit-table-body');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i data-lucide="loader-circle"></i> Loading Logs...</td></tr>';
    createIcons({ icons });

    try {
        currentLogs = await getAuditLogs();
        populateDropdowns(currentLogs); // ← بناء الفلاتر من الداتا الحقيقية
        renderTable(currentLogs);
    } catch (e) {
        console.error("Failed to load audit logs", e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Failed to load logs.</td></tr>';
    }

    root.addEventListener('input', handleInput);
    root.addEventListener('change', handleChange);
    root.addEventListener('click', handleClick);
}

export function unmount(rootElement) {
    if (!root) return;
    root.removeEventListener('input', handleInput);
    root.removeEventListener('change', handleChange);
    root.removeEventListener('click', handleClick);
    root = null;
}