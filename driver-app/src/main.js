import { initRouter } from "./router/router.js";
import { updateLayout } from "./utils/utils.js";

// App Entry Point & Authentication Guard
const initialPath = window.location.pathname;
const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

if (!isAuthenticated && (initialPath === "/" || initialPath === "/stats-page" || initialPath === "/alerts-page")) {
    window.history.replaceState({}, "", "/login-page");
} else if (isAuthenticated && initialPath === "/") {
    window.history.replaceState({}, "", "/alerts-page");
}

const router = initRouter({ outletId: "app-content" });

// Global Auth Guard for link clicks
document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-link]");
    if (!link) return;
    
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http")) return;

    const isAuth = localStorage.getItem("isAuthenticated") === "true";
    if (!isAuth && (href === "/stats-page" || href === "/alerts-page")) {
        event.preventDefault();
        event.stopPropagation();
        router.navigateTo("/login-page");
    }
}, true);

function initBottomNav() {
    const navItems = document.querySelectorAll(".bottom-nav .nav-item");

    // Mapping tabs to their respective routes
    const tabRoutes = {
        route: "/active-route-page",
        alerts: "/alerts-page",
        stats: "/stats-page",
        profile: "/profile-page",
    };

    function updateActiveState(path) {
        navItems.forEach((item) => {
            const tabName = item.getAttribute("data-tab");
            const targetRoute = tabRoutes[tabName];
            
            // Check if current path matches the target route or if it's the home page mapped to route
            if (path === targetRoute || (path === "/" && tabName === "route")) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });
    }

    navItems.forEach((item) => {
        item.addEventListener("click", (event) => {
            event.preventDefault();
            
            // 1. Snappy UI: Update active state immediately
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");
            
            const tabName = item.getAttribute("data-tab");
            const targetRoute = tabRoutes[tabName];
            
            // 2. Auth Guard Check
            const isAuth = localStorage.getItem("isAuthenticated") === "true";
            if (!isAuth && (targetRoute === "/stats-page" || targetRoute === "/alerts-page")) {
                router.navigateTo("/login-page");
                return;
            }
            
            // 3. Perform Navigation
            if (targetRoute) {
                router.navigateTo(targetRoute);
            }
        });
    });

    // Sync with URL on initial load
    updateActiveState(window.location.pathname);

    // Sync with URL on route change (e.g. from browser back/forward buttons)
    window.addEventListener("route:changed", (event) => {
        updateActiveState(event.detail.path);
    });
}

// Initialize the bottom navigation logic
initBottomNav();

updateLayout(window.location.pathname);

window.addEventListener("route:changed", (event) => {
    const newPath = event.detail.path;
    
    // Fallback Auth Guard for route changes (e.g. popstate)
    const isAuth = localStorage.getItem("isAuthenticated") === "true";
    if (!isAuth && (newPath === "/stats-page" || newPath === "/alerts-page")) {
        router.navigateTo("/login-page");
        return;
    }
    
    updateLayout(newPath);
});
