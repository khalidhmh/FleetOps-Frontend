import { initRouter } from "./router/router.js";
import {
    createIcons,
    icons,
} from "/node_modules/lucide/dist/esm/lucide.mjs";


// لو مفيش توكن، ابعته فوراً لصفحة اللوجين قبل ما يرسم أي حاجة
const token = localStorage.getItem('token');
const userRaw = localStorage.getItem('user');
const isLoginPage = window.location.pathname === '/login';
const shell = document.querySelector('[data-shell]');

if (!token && !isLoginPage) {
    window.location.href = '/login';
} else if (token && userRaw && !isLoginPage) {
    const user = JSON.parse(userRaw);
    
    // حماية الداشبورد: السماح فقط للمديرين والموزعين
    const allowedRoles = ['fleetmanager', 'dispatcher'];
    if (!allowedRoles.includes(user.role?.toLowerCase())) {
        alert("Access Denied: Only Fleet Managers and Dispatchers can access the Operations Dashboard.");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    } else {
        // إظهار اللوحة بالشكل العادي (Grid)
        if (shell) shell.style.display = 'grid';

        const nameEl = document.querySelector('.topbar-user__meta strong');
        const roleEl = document.querySelector('.topbar-user__meta span');
        const avatarEl = document.querySelector('.topbar-user__avatar');
        
        if (nameEl) nameEl.textContent = user.name || user.fullName || "User";
        if (roleEl) roleEl.textContent = user.role || "Admin";
        if (avatarEl && (user.name || user.fullName)) {
            avatarEl.innerHTML = (user.name || user.fullName).split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
        }

        initRouter({ outletId: "app-content" });
    }
} else {
    // لو إحنا في صفحة اللوجين
    if (shell) {
        // إخفاء القائمة الجانبية والشريط العلوي عشان صفحة اللوجين تاخد الشاشة كلها
        const sidebar = document.querySelector('.dashboard-sidebar');
        const topbar = document.querySelector('.dashboard-topbar');
        if (sidebar) sidebar.style.display = 'none';
        if (topbar) topbar.style.display = 'none';
        
        shell.style.display = 'block'; 
    }
}
initRouter({ outletId: "app-content" });
createIcons({ icons });

window.addEventListener("route:changed", () => {
    createIcons({ icons });
});

initDashboardShell();

function initDashboardShell() {
    const shell = document.querySelector("[data-shell]");
    const collapseBtn = document.getElementById("sidebar-collapse-btn");
    const mobileBtn = document.getElementById("sidebar-mobile-btn");
    const collapseStateKey = "fleetops-operations:sidebar-collapsed";

    if (!shell) {
        return;
    }

    const savedCollapsed = localStorage.getItem(collapseStateKey) === "true";

    if (savedCollapsed) {
        shell.classList.add("is-collapsed");
    }

    updateCollapseAria(collapseBtn, shell.classList.contains("is-collapsed"));

    collapseBtn?.addEventListener("click", () => {
        const collapsed = shell.classList.toggle("is-collapsed");
        localStorage.setItem(collapseStateKey, String(collapsed));
        updateCollapseAria(collapseBtn, collapsed);
    });

    mobileBtn?.addEventListener("click", () => {
        shell.classList.toggle("is-sidebar-open");
    });

    window.addEventListener("route:changed", () => {
        shell.classList.remove("is-sidebar-open");
    });
}

function updateCollapseAria(button, isCollapsed) {
    if (!button) {
        return;
    }

    button.setAttribute("aria-expanded", String(!isCollapsed));
}
// تشغيل زرار تسجيل الخروج
const signOutBtn = document.querySelector('.sidebar-signout');
if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    });
}