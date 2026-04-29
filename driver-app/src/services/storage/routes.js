const routes = [
  {
    driver_id: "driver_1",
    route_id: "RT-2041",
    status: "active",
    start_point: "Central Depot",
    end_point: "North District",
    stops: [
      {
        stop_id: "STP-001",
        stop_number: 1,
        customer_name: "John Doe",
        address: "123 Industrial Parkway, Sector 7G, Downtown Logistics Hub",
        coords: { lat: 30.0444, lng: 31.2357 },
        status: "pending",
        time_window: "10:00 - 11:00",
        eta_minutes: 18,
        payment: { amount: 450.00, currency: "EGP", cod_required: true },
        phone_number: "+20 111 696 5591",
        special_instructions: "Leave at door — Ring bell twice",
        parcels: [
          { parcel_id: "QR-9901", type: "STANDARD BOX", weight: "2.4KG", status: "awaiting" }
        ],
        delivery_proof: { signature_encrypted: null, iv: null }
      },
      {
        stop_id: "STP-002",
        stop_number: 2,
        customer_name: "Central Warehouse",
        address: "45 Logistics Blvd, Industrial Zone",
        coords: { lat: 30.0500, lng: 31.2400 },
        status: "pending",
        time_window: "11:30 - 12:30",
        eta_minutes: 45,
        payment: { amount: 0, currency: "EGP", cod_required: false },
        phone_number: "+20 987 654 3210",
        special_instructions: "Deliver to loading dock",
        parcels: [
          { parcel_id: "QR-9902", type: "HEAVY BOX", weight: "5.0KG", status: "awaiting" }
        ],
        delivery_proof: { signature_encrypted: null, iv: null }
      }
    ]
  }
];

export { routes };