import { getUsers, updateUsers, createUser } from "/src/services/api/users.js";
import { createIcons, icons } from '/node_modules/lucide/dist/esm/lucide.mjs';

let _users = [];
let _filter = "all";
let _editingId = null;
let _handlers = {};

async function loadUsers() {
    _users = await getUsers();
    updateCountLabel();
    applyFilter();
}

function getInitials(name = "") {
    return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function roleBadge(role = "") {
    const known = ["customer", "driver", "dispatcher", "mechanic", "fleetmanager"];
    const cls = known.includes(role?.toLowerCase()) ? role.toLowerCase() : "default";
    const label = role ? (role.charAt(0).toUpperCase() + role.slice(1)) : 'Unknown';
    return `<span class="role-badge role-badge--${cls}">${label}</span>`;
}

function statusBadge(status = "") {
    const cls = ["active", "inactive", "suspended"].includes(status) ? status : "inactive";
    const label = status ? (status.charAt(0).toUpperCase() + status.slice(1)) : 'Inactive';
    return `<span class="status-badge status-badge--${cls}">${label}</span>`;
}

function renderRows(users) {
    const tbody = document.getElementById("users-table-body");
    if (!tbody) return;

    if (!users.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="users-table__empty">No users found.</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map((u) => `
        <tr>
            <td><span class="emp-id">${u.id ?? "—"}</span></td>
            <td>
                <div class="user-name-cell">
                    <div class="user-avatar">${getInitials(u.fullName)}</div>
                    <span>${u.fullName ?? "—"}</span>
                </div>
            </td>
            <td>${roleBadge(u.role)}</td>
            <td>${u.email ?? "—"}</td>
            <td>${u.phone ?? "—"}</td>
            <td>${statusBadge(u.status)}</td>
            <td>
                <div class="row-actions">
                    <button class="row-action-btn" data-action="edit" data-id="${u.id}" title="Edit" type="button">
                        <i data-lucide="square-pen"></i>
                    </button>
                    <button class="row-action-btn danger" data-action="toggle" data-id="${u.id}" title="Toggle status" type="button">
                        <i data-lucide="power-off"></i>
                    </button>
                </div>
            </td>
        </tr>`).join("");

    createIcons({ icons });
}

function applyFilter() {
    const search = document.getElementById("users-search-input")?.value.toLowerCase() ?? "";
    const filtered = _users.filter((u) => {
        const matchRole = _filter === "all" || u.role?.toLowerCase() === _filter;
        const matchSearch =
            !search ||
            u.fullName?.toLowerCase().includes(search) ||
            u.email?.toLowerCase().includes(search) ||
            String(u.id).toLowerCase().includes(search);
        return matchRole && matchSearch;
    });
    renderRows(filtered);
}

function updateCountLabel() {
    const el = document.getElementById("users-count-label");
    if (el) el.textContent = `${_users.length} member${_users.length !== 1 ? "s" : ""}`;
}

function openModal(user = null) {
    _editingId = user?.id ?? null;
    const modal = document.getElementById("users-modal");
    if (!modal) return;

    document.getElementById("modal-name").value = user?.fullName ?? "";
    document.getElementById("modal-email").value = user?.email ?? "";
    document.getElementById("modal-phone").value = user?.phone ?? "";
    
    const roleSelect = document.getElementById("modal-role");
    if (roleSelect) {
        let roleVal = user?.role || "";
        if (roleVal.toLowerCase() === "fleetmanager") roleVal = "FleetManager";
        else roleVal = roleVal.toLowerCase();
        roleSelect.value = roleVal;
    }

    document.getElementById("modal-status").value = user?.status ?? "active";
    document.getElementById("modal-title").textContent = user ? "Edit User" : "Add User";

    modal.classList.add("is-open");
}

function closeModal() {
    const modal = document.getElementById("users-modal");
    if (!modal) return;
    modal.classList.remove("is-open");
    _editingId = null;
}

const roleMap = {
    'customer': 'Customer',
    'dispatcher': 'Dispatcher',
    'fleetmanager': 'FleetManager',
    'driver': 'Driver',
    'mechanic': 'Mechanic'
};

async function saveModal() {
    const rawRole = document.getElementById("modal-role")?.value?.toLowerCase();
    
    const payload = {
        name: document.getElementById("modal-name")?.value.trim(),
        email: document.getElementById("modal-email")?.value.trim(),
        phone: document.getElementById("modal-phone")?.value.trim(),
        role: roleMap[rawRole] || 'Customer',
        status: document.getElementById("modal-status")?.value,
    };

    if (!_editingId) {
        payload.password = "password123";
        payload.password_confirmation = "password123";
    }

    if (!payload.name || !payload.email || !payload.role) {
        alert("Please fill required fields.");
        return;
    }

    const submitBtn = document.getElementById("modal-save-btn");
    if (submitBtn) submitBtn.innerHTML = 'Saving...';

    let result;
    if (_editingId) {
        result = await updateUsers(_editingId, payload);
    } else {
        result = await createUser(payload);
    }

    if (submitBtn) submitBtn.innerHTML = 'Save User';

    if (result && result.success !== false) {
        await loadUsers();
        closeModal();
    } else {
        alert("Error: " + (result?.message || "Failed to save user."));
    }
}

async function toggleUserStatus(id) {
    const user = _users.find((u) => String(u.id) === String(id));
    if (!user) return;
    
    const newStatus = user.status === "active" ? "inactive" : "active";
    
    const payload = {
        name: user.fullName,
        email: user.email,
        phone: user.phone === '--' ? '' : user.phone,
        role: user.role, 
        status: newStatus
    };

    let result = await updateUsers(id, payload);
    if (result && result.success !== false) {
        await loadUsers();
    } else {
        alert("Error toggling status: " + (result?.message || ""));
    }
}

export function mount(rootElement) {
    createIcons({ icons });
    loadUsers();

    const filterTabs = rootElement.querySelector("#users-filter-tabs");
    _handlers.filterClick = (e) => {
        const tab = e.target.closest(".filter-tab");
        if (!tab) return;
        filterTabs.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("is-active"));
        tab.classList.add("is-active");
        _filter = tab.dataset.filter.toLowerCase();
        applyFilter();
    };
    filterTabs?.addEventListener("click", _handlers.filterClick);

    _handlers.searchInput = () => applyFilter();
    rootElement.querySelector("#users-search-input")?.addEventListener("input", _handlers.searchInput);

    _handlers.addClick = () => openModal(null);
    rootElement.querySelector("#users-add-btn")?.addEventListener("click", _handlers.addClick);

    _handlers.tableClick = (e) => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const { action, id } = btn.dataset;
        if (action === "edit") {
            const user = _users.find((u) => String(u.id) === String(id));
            if (user) openModal(user);
        } else if (action === "toggle") {
            toggleUserStatus(id);
        }
    };
    rootElement.querySelector("#users-table-body")?.addEventListener("click", _handlers.tableClick);

    _handlers.modalClose = closeModal;
    _handlers.modalSave = saveModal;

    rootElement.querySelector("#modal-close-btn")?.addEventListener("click", _handlers.modalClose);
    rootElement.querySelector("#modal-cancel-btn")?.addEventListener("click", _handlers.modalClose);
    rootElement.querySelector("#modal-save-btn")?.addEventListener("click", _handlers.modalSave);
}

export function unmount(rootElement) {
    _users = [];
    _handlers = {};
}