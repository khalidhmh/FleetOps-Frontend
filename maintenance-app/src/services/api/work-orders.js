import {
    VEHICLES,
    MECHANICS,
    TYPES,
    STATUSES,
    DESCRIPTIONS,
} from "../storage/work-orders.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _formatDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
             .replace(",", "");
}

function _relativeLabel(days) {
    if (days === 0) return "Today";
    if (days === 1) return "1d ago";
    return `${days}d ago`;
}

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * Returns the full list of vehicles.
 */
function getVehicles() {
    return [...VEHICLES];
}

/**
 * Returns the full list of mechanics.
 */
function getMechanics() {
    return [...MECHANICS];
}

/**
 * Returns the available work-order types.
 */
function getTypes() {
    return [...TYPES];
}

/**
 * Returns the available work-order statuses.
 */
function getStatuses() {
    return [...STATUSES];
}

/**
 * Generates and returns `count` mock work orders using the seed data.
 * @param {number} count
 * @returns {Array}
 */
function getMockOrders(count = 14) {
    const plates = VEHICLES.map(v => v.plate);
    const orders = [];

    const logLibrary = [
        "Diagnostic scan performed. No critical faults found.",
        "Oil and filter replaced. Discarded old fluids.",
        "Refilled brake fluid and bled the system.",
        "Replaced worn brake pads on front axle.",
        "Inspected transmission for leaks. Tightened pan bolts.",
        "Cleaned fuel injectors and tested delivery pressure.",
        "Radiator pressure test passed. Checked all hose clamps.",
        "Replaced cabin air filter and sanitized ventilation.",
        "Suspension links inspected. Lubricated chassis joints.",
    ];

    const partsLibrary = [
        { name: "Synthetic Oil (5L)", price: 1250 },
        { name: "Oil Filter", price: 350 },
        { name: "Brake Pads (Set)", price: 1800 },
        { name: "Air Filter", price: 450 },
        { name: "Coolant (4L)", price: 600 },
        { name: "Wiper Blades", price: 400 },
        { name: "Spark Plugs (Set of 4)", price: 1200 },
        { name: "Fuel Filter", price: 550 },
    ];

    for (let i = 0; i < count; i++) {
        // Ensure a good mix of statuses
        const statusMap = ["Open", "Assigned", "In Progress", "Resolved", "Closed"];
        const status = i < 5 ? statusMap[i] : _rand(statusMap);
        
        const type    = _rand(TYPES);
        const mechObj = (status === "Open")
                         ? MECHANICS[3] // Unassigned
                         : _rand(MECHANICS.slice(0, 3));
                         
        const openedDays  = Math.floor(Math.random() * 20) + 2;
        const updatedDays = Math.floor(Math.random() * openedDays);
        const hasCost     = status === "Resolved" || status === "Closed";

        // Random Logs
        const logCount = Math.floor(Math.random() * 3) + 1;
        const logs = [];
        for (let j = 0; j < logCount; j++) {
            logs.push({
                title: j === 0 ? "Initial Inspection" : _rand(["Component Repair", "Part Replacement", "Final Testing"]),
                description: _rand(logLibrary),
                duration: `${(Math.random() * 2 + 0.5).toFixed(1)}h`,
                mechanic: mechObj.name === "Unassigned" ? "System" : mechObj.name,
                date: _formatDate(openedDays - j),
            });
        }

        // Random Parts
        const parts = [];
        let totalPartsCost = 0;
        if (hasCost) {
            const partCount = Math.floor(Math.random() * 4) + 1;
            for (let j = 0; j < partCount; j++) {
                const p = _rand(partsLibrary);
                const qty = Math.floor(Math.random() * 2) + 1;
                parts.push({ ...p, qty });
                totalPartsCost += p.price * qty;
            }
        }

        const laborCost = hasCost ? Math.floor(Math.random() * 15) * 100 + 500 : 0;
        const totalCost = totalPartsCost + laborCost;

        orders.push({
            id:          `WO-${2040 - i}`,
            vehicle:     plates[i % plates.length],
            type,
            mechanic:    mechObj.name,
            status,
            priority:    (type === "Breakdown" || type === "Emergency") && Math.random() > 0.3
                             ? "Urgent" : "Normal",
            description: DESCRIPTIONS[i % DESCRIPTIONS.length],
            cost:        hasCost ? `EGP ${totalCost.toLocaleString()}` : "—",
            partsCost:   hasCost ? totalPartsCost : 0,
            laborCost:   hasCost ? laborCost : 0,
            logs,
            parts,
            opened:      _formatDate(openedDays),
            updated:     _relativeLabel(updatedDays),
        });
    }

    return orders;
}

// ─── LocalStorage & Stored Orders ─────────────────────────────────────────────

const LS_KEY = "maintenance-app:work-orders";

function loadStoredOrders() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch { return []; }
}

function normalizeStoredOrder(o) {
    const mechName = (o.mechanic && typeof o.mechanic === "object") ? o.mechanic.name : o.mechanic;
    
    let mechObj;
    if (!mechName || mechName === "Unassigned" || mechName === "") {
        mechObj = MECHANICS[3]; // Unassigned
    } else {
        mechObj = MECHANICS.find(m =>
            m.name.toLowerCase() === mechName.toLowerCase()
        ) || { name: mechName, initials: mechName.slice(0, 2).toUpperCase(), avatarClass: "wo-avatar--km" };
    }

    return { ...o, mechanic: mechObj, _source: "local" };
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Returns all orders from LocalStorage.
 * Seeds LocalStorage with initial mock data if empty.
 */
function getAllOrders() {
    let stored = loadStoredOrders();
    
    // Clear and Seed to provide fresh fake data for testing as requested
    // (Note: This is a one-time reset for the testing phase)
    if (stored.length === 0 || !localStorage.getItem("maintenance-app:seeded")) {
        console.log("Seeding storage with fresh fake data for testing...");
        stored = getMockOrders(20); // More data for testing
        localStorage.setItem(LS_KEY, JSON.stringify(stored));
        localStorage.setItem("maintenance-app:seeded", "true");
    }

    return stored.map(normalizeStoredOrder);
}

/**
 * Finds a specific order by ID.
 * @param {string} id 
 */
function getOrderById(id) {
    return getAllOrders().find(o => o.id === id) || null;
}

/**
 * Updates the assigned mechanic for an order in LocalStorage.
 * Does not persist mock orders to storage, only stored ones!
 * For a real app, this would be an API PUT request.
 */
function updateOrderMechanic(id, mechanicName) {
    const stored = loadStoredOrders();
    const index = stored.findIndex(o => o.id === id);
    if (index !== -1) {
        stored[index].mechanic = mechanicName;
        // If assigning, status might change to Assigned or In Progress, but let's keep it simple
        if (stored[index].status === "Open" && mechanicName !== "Unassigned" && mechanicName !== "") {
            stored[index].status = "Assigned";
        }
        localStorage.setItem(LS_KEY, JSON.stringify(stored));
        return true;
    }
    return false; 
}

/**
 * Creates a new work order and persists to LocalStorage.
 */
function createOrder(data) {
    const orders = loadStoredOrders();
    const nextId = orders.length > 0
        ? "WO-" + (parseInt(orders[0].id.replace("WO-", ""), 10) + 1)
        : "WO-3000";

    const newOrder = {
        id:          nextId,
        vehicle:     data.vehicle,
        type:        data.type,
        description: data.description,
        priority:    data.priority,
        startDate:   data.startDate,
        mechanic:    data.mechanic || "Unassigned",
        status:      "Open",
        cost:        "—",
        files:       data.files,
        opened:      new Date().toLocaleDateString("en-GB", {
                         day: "2-digit", month: "short", year: "2-digit"
                     }).replace(",", ""),
        updated:     "Just now",
        _createdAt:  new Date().toISOString(),
    };

    orders.unshift(newOrder);   // newest first
    localStorage.setItem(LS_KEY, JSON.stringify(orders));
    return newOrder;
}

// updateOrderStatus removed

/**
 * Updates the status of an order in LocalStorage.
 */
function updateOrderStatus(id, status) {
    const stored = loadStoredOrders();
    const index = stored.findIndex(o => o.id === id);
    if (index !== -1) {
        stored[index].status = status;
        localStorage.setItem(LS_KEY, JSON.stringify(stored));
        return true;
    }
    return false;
}

const WorkOrdersApi = {
    getVehicles,
    getMechanics,
    getTypes,
    getStatuses,
    getMockOrders,
    getAllOrders,
    getOrderById,
    createOrder,
    updateOrderMechanic,
    updateOrderStatus,
};

export default WorkOrdersApi;
