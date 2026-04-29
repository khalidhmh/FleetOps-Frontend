const drivers = [
  {
    id: "drv_1",
    name: "Ahmed Tariq",
    status: "Active",
    rating: 4.9,
    contact: { phone: "+20 123 456 7890", email: "ahmed.tariq@fleetops.com" },
    license: { number: "DL-8475639", expiry: "Oct 2026" },
    vehicle: { id: "TRK-042", type: "Heavy Duty", plate: "ABC-1234" },
    performance: { safetyScore: 98, onTimeRate: 95, totalDeliveries: 1240 }
  },
  {
    id: "drv_2",
    name: "Marcus Vance",
    status: "On Route",
    rating: 4.8,
    contact: { phone: "+1 234 567 8900", email: "marcus.v@fleetops.com" },
    license: { number: "CDL-992-FX", expiry: "Dec 2025" },
    vehicle: { id: "TRK-050", type: "Refrigerated", plate: "XYZ-9876" },
    performance: { safetyScore: 92, onTimeRate: 90, totalDeliveries: 850 }
  },
  {
    id: "drv_3",
    name: "Jane Doe",
    status: "Offline",
    rating: 4.5,
    contact: { phone: "+1 987 654 3210", email: "jane.d@fleetops.com" },
    license: { number: "CDL-456-TX", expiry: "Jan 2027" },
    vehicle: { id: "Unassigned", type: "N/A", plate: "N/A" },
    performance: { safetyScore: 88, onTimeRate: 85, totalDeliveries: 420 }
  },
  {
    id: "drv_4",
    name: "Ali Hassan",
    status: "On Break",
    rating: 4.7,
    contact: { phone: "+20 100 123 4567", email: "ali.h@fleetops.com" },
    license: { number: "DL-123456", expiry: "Mar 2028" },
    vehicle: { id: "V-008", type: "Light Duty", plate: "DEF-5678" },
    performance: { safetyScore: 95, onTimeRate: 92, totalDeliveries: 930 }
  },
  {
    id: "drv_5",
    name: "Sarah Jones",
    status: "On Leave",
    rating: 4.9,
    contact: { phone: "+1 555 123 4567", email: "sarah.j@fleetops.com" },
    license: { number: "CDL-998-AZ", expiry: "Jul 2025" },
    vehicle: { id: "Unassigned", type: "N/A", plate: "N/A" },
    performance: { safetyScore: 99, onTimeRate: 98, totalDeliveries: 2100 }
  }
];

export { drivers };
