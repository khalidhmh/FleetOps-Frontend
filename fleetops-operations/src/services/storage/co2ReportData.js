const CO2_REPORT_STORAGE_KEY = "fleetops_co2_report_data";

const defaultCo2ReportMockData = [
  {
    vehicle: "TRK-1001",
    type: "Diesel",
    emissions: 8.4,
    reduction: 4.2,
    status: "Good",
  },
  {
    vehicle: "VAN-2022",
    type: "Electric",
    emissions: 1.2,
    reduction: 12.7,
    status: "Excellent",
  },
  {
    vehicle: "LIF-3090",
    type: "Hybrid",
    emissions: 4.9,
    reduction: -1.5,
    status: "Poor",
  },
];

function normalizeCo2StoragePayload(rawData) {
  if (!rawData) return [];

  if (Array.isArray(rawData)) return rawData;

  const payload = rawData.data ?? rawData;
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.vehicles)
      ? payload.vehicles
      : [];

  return rows.map((item) => ({
    vehicle:
      item.vehicle || item.Vehicle || item.license || item.vehicle_id || "",
    type: item.type || item.Type || "",
    emissions: item.emissions_tons || item.emissions || 0,
    reduction:
      parseFloat(item.reduction_vs_last_month ?? item.reduction ?? 0) || 0,
    status: item.status || item.Status || "Unknown",
  }));
}

function getStoredCo2ReportData() {
  try {
    const raw = localStorage.getItem(CO2_REPORT_STORAGE_KEY);
    if (!raw) {
      saveCo2ReportData(defaultCo2ReportMockData);
      return normalizeCo2StoragePayload(defaultCo2ReportMockData);
    }

    const parsed = JSON.parse(raw);
    return normalizeCo2StoragePayload(parsed);
  } catch (e) {
    console.error("Failed to read stored CO2 report data", e);
    saveCo2ReportData(defaultCo2ReportMockData);
    return normalizeCo2StoragePayload(defaultCo2ReportMockData);
  }
}

function saveCo2ReportData(data) {
  try {
    localStorage.setItem(CO2_REPORT_STORAGE_KEY, JSON.stringify(data || []));
  } catch (e) {
    console.error("Failed to save CO2 report data", e);
  }
}

function clearCo2ReportData() {
  localStorage.removeItem(CO2_REPORT_STORAGE_KEY);
}

export { getStoredCo2ReportData, saveCo2ReportData, clearCo2ReportData };
