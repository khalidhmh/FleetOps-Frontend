// ─── Maintenance Dashboard — Seed / Mock Data ─────────────────────────────────
// This is the single source of truth for static maintenance data.
// Views consume this data only through services/api/maintenance.js.

export const maintenanceVehiclesData = [
    { id: "TRK-042", type: "Heavy",        odometer: "124,500 km", lastService: "25 days ago", nextDue: "Oil Change",          state: "healthy"  },
    { id: "TRK-015", type: "Light",        odometer: "89,200 km",  lastService: "13 days ago", nextDue: "Tire Rotation",        state: "healthy"  },
    { id: "TRK-023", type: "Heavy",        odometer: "210,300 km", lastService: "30 days ago", nextDue: "Brake Inspection",     state: "warning"  },
    { id: "TRK-007", type: "Refrigerated", odometer: "156,800 km", lastService: "45 days ago", nextDue: "Engine Overhaul",      state: "critical" },
    { id: "TRK-031", type: "Light",        odometer: "67,400 km",  lastService: "9 days ago",  nextDue: "Oil Change",          state: "healthy"  },
    { id: "TRK-019", type: "Heavy",        odometer: "185,000 km", lastService: "35 days ago", nextDue: "Transmission Check",   state: "warning"  },
];

export const maintenanceWorkOrdersData = [
    { id: "WO-301", vehicle: "TRK-007", issue: "Breakdown", mechanic: "Ahmed Tariq",  status: "In Progress", opened: "Apr 12, 2026" },
    { id: "WO-302", vehicle: "TRK-023", issue: "Routine",   mechanic: "Khalid Omar",  status: "Open",        opened: "Apr 13, 2026" },
    { id: "WO-298", vehicle: "TRK-042", issue: "Routine",   mechanic: "Ahmed Tariq",  status: "Resolved",    opened: "Apr 8, 2026"  },
    { id: "WO-295", vehicle: "TRK-019", issue: "Emergency", mechanic: "Khalid Omar",  status: "In Progress", opened: "Apr 10, 2026" },
];

export const maintenanceAlertsData = [
    { vehicle: "TRK-023", title: "Service Due",        desc: "500 km remaining", icon: "wrench"         },
    { vehicle: "TRK-007", title: "Insurance Expiry",   desc: "18 days",          icon: "triangle-alert" },
    { vehicle: "TRK-019", title: "Inspection Expiry",  desc: "22 days",          icon: "clock"          },
    { vehicle: "TRK-042", title: "Service Due",        desc: "1,200 km remaining",icon: "wrench"        },
];

export const stockWarningsData = [
    { item: "Oil Filter", category: "Filters", qty: 3, capacity: 10, unit: "min", reorder: 20 },
    { item: "Brake Pads", category: "Brakes",  qty: 5, capacity: 8,  unit: "min", reorder: 15 },
    { item: "Coolant 5L", category: "Fluids",  qty: 2, capacity: 6,  unit: "min", reorder: 12 },
    { item: "Air Filter", category: "Filters", qty: 8, capacity: 10, unit: "min", reorder: 20 },
];
