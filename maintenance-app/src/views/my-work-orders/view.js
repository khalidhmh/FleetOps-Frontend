import MyWorkOrdersApi from "../../services/api/my-work-orders.js";

const FILTERS = {
    active: (order) => !["Resolved", "Closed"].includes(order.status),
    resolved: (order) => ["Resolved", "Closed"].includes(order.status),
    all: () => true,
};

let currentFilter = "active";
let orderCards = [];
let rootElement = null;
let clickHandler = null;
let mountToken = 0;

function formatDateLabel(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).replace(",", "");
}

function getStatusClass(status) {
    if (status === "In Progress") return "mwo-badge--inprogress";
    if (status === "Resolved") return "mwo-badge--resolved";
    if (status === "Closed") return "mwo-badge--closed";
    return "mwo-badge--inprogress";
}

function buildCard(order) {
    const statusClass = getStatusClass(order.status);
    const panelClass = order.status === "Resolved" ? "mwo-card--resolved" : order.status === "Closed" ? "mwo-card--closed" : "";

    return `
        <article class="mwo-card ${panelClass}">
            <div class="mwo-card__header">
                <div class="mwo-card__meta">
                    <p class="mwo-card__id">${order.id}</p>
                    <p class="mwo-card__vehicle">${order.vehicle} · ${order.category}</p>
                </div>
                <span class="mwo-badge ${statusClass}">${order.status}</span>
            </div>

            <div class="mwo-pill">
                <span class="mwo-pill__item mwo-pill__item--type">${order.type}</span>
                <span class="mwo-pill__item ${order.priority === "Urgent" ? "mwo-pill__item--urgent" : "mwo-pill__item--normal"}">${order.priority}</span>
            </div>

            <p class="mwo-card__description">${order.description}</p>

            <div class="mwo-card__footer">
                <span class="mwo-card__opened">
                    <span class="mwo-card__opened-icon">⏱</span>
                    Opened ${order.opened}
                </span>
                <a class="mwo-card__link" href="/work-orders/details?id=${order.id}&from=my-work-orders" data-link>
                    View Details →
                </a>
            </div>
        </article>
    `;
}

function renderTabs() {
    const activeBtn = rootElement.querySelector(".mwo-tab--active");
    const tabButtons = Array.from(rootElement.querySelectorAll(".mwo-tab"));

    tabButtons.forEach((button) => {
        const isActive = button.dataset.tab === currentFilter;
        button.classList.toggle("mwo-tab--active", isActive);
    });
}

function renderCounts() {
    const activeOrders = orderCards.filter(FILTERS.active);
    const resolvedOrders = orderCards.filter(FILTERS.resolved);
    const allOrders = orderCards;

    rootElement.querySelector("#mwo-count-open").textContent = activeOrders.filter((order) => order.status === "Open").length;
    rootElement.querySelector("#mwo-count-inprogress").textContent = activeOrders.filter((order) => order.status === "In Progress").length;
    rootElement.querySelector("#mwo-count-resolved").textContent = resolvedOrders.filter((order) => order.status === "Resolved").length;
    rootElement.querySelector("#mwo-tab-active").textContent = activeOrders.length;
    rootElement.querySelector("#mwo-tab-resolved").textContent = resolvedOrders.length;
    rootElement.querySelector("#mwo-tab-all").textContent = allOrders.length;
}

function renderCards() {
    const container = rootElement.querySelector("#mwo-cards");
    const filtered = orderCards.filter(FILTERS[currentFilter]);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="mwo-card">
                <p>No work orders found for this filter.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(buildCard).join("");
}

function renderMessage(message) {
    const container = rootElement?.querySelector("#mwo-cards");
    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="mwo-card">
            <p>${message}</p>
        </div>
    `;
}

function handlePageClick(event) {
    const tabButton = event.target.closest(".mwo-tab");
    if (tabButton && tabButton.dataset.tab) {
        currentFilter = tabButton.dataset.tab;
        renderTabs();
        renderCards();
        return;
    }

    const detailsLink = event.target.closest("[data-action='view-details']");
    if (detailsLink) {
        event.preventDefault();
        const orderId = detailsLink.dataset.orderId;
        const detailsPage = document.querySelector("a[data-route='/work-orders/details']");
        if (detailsPage) {
            window.history.pushState({}, "", `/work-orders/details?id=${orderId}`);
            window.dispatchEvent(new PopStateEvent("popstate"));
            return;
        }
        alert(`View details for ${orderId}`);
    }
}

export async function mount(outlet) {
    const token = ++mountToken;
    rootElement = outlet.querySelector(".mwo-page");
    if (!rootElement) {
        return;
    }

    rootElement.querySelector("#mwo-date").textContent = new Date().toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    renderMessage("Loading your work orders...");

    try {
        orderCards = await MyWorkOrdersApi.getAllWorkOrders();
    } catch (error) {
        if (token !== mountToken) {
            return;
        }

        console.error("[MyWorkOrders] Failed to load work orders:", error);
        orderCards = [];
        renderCounts();
        renderMessage("Could not load your work orders. Please try again.");
        return;
    }

    if (token !== mountToken) {
        return;
    }

    renderTabs();
    renderCounts();
    renderCards();

    clickHandler = handlePageClick;
    rootElement.addEventListener("click", clickHandler);
}

export function unmount(outlet) {
    mountToken += 1;
    if (rootElement && clickHandler) {
        rootElement.removeEventListener("click", clickHandler);
    }
    rootElement = null;
    clickHandler = null;
}
