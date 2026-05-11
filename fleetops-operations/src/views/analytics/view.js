import AnalyticsStorage from "../../services/api/analytics.js";
import {
  createIcons,
  icons,
} from "../../../../node_modules/lucide/dist/esm/lucide.mjs";
import { settingsMockData } from "../../services/storage/settings.js";
import { getStoredCo2ReportData } from "../../services/storage/co2ReportData.js";

const defaultCo2ReportMockData = [
  {
    vehicle: "أ ب ج 1001",
    type: "Diesel",
    emissions: 8.4,
    reduction: 4.2,
    status: "Good",
  },
  {
    vehicle: "أ ب ج 1002",
    type: "Electric",
    emissions: 1.2,
    reduction: 12.7,
    status: "Excellent",
  },
  {
    vehicle: "أ ب ج 1003",
    type: "Hybrid",
    emissions: 4.9,
    reduction: -1.5,
    status: "Poor",
  },
];

let exportButton = null;
let exportHandler = null;

export function mount(root) {
  renderKPIs(root, "30d");
  renderMonthlyChart(root);
  renderFleetStatus(root);
  renderDriverPerf(root);
  renderTable(root);
  renderCO2Report(root);
  renderFuelAudit(root);
  renderMaintenanceCost(root);

  // Setup Date Shortcuts
  const dateBtns = root.querySelectorAll(".date-btn");
  dateBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      dateBtns.forEach((b) => b.classList.remove("is-active"));
      const target = e.currentTarget;
      target.classList.add("is-active");
      renderKPIs(root, target.dataset.range);
    });
  });

  // Setup Tab Navigation
  const tabBtns = root.querySelectorAll(".tab-btn");
  const tabContents = root.querySelectorAll(".tab-content");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      // Remove active from all tabs
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      // Add active to current
      const target = e.currentTarget;
      target.classList.add("active");
      const tabId = target.dataset.tab;
      const content = root.querySelector(`#tab-${tabId}`);
      if (content) content.classList.add("active");

      // Refresh icons in case new icons were revealed
      refreshIcons();
    });
  });

  if (window.location.pathname === "/analytics") {
    exportButton = root.querySelector(
      "#routes-export-btn, #export-btn, .export-button",
    );
    exportHandler = (event) => {
      event.preventDefault();
      handleExport(root);
    };
    exportButton?.addEventListener("click", exportHandler);
  }
}

export function unmount() {
  exportButton?.removeEventListener("click", exportHandler);
  exportButton = null;
  exportHandler = null;
}

function getActiveAnalyticsTab(root) {
  const activeTabBtn = root.querySelector(".tab-btn.active");
  return activeTabBtn?.dataset.tab || "kpi";
}

function printKPISection(root) {
  const kpiSection = root.querySelector("#analytics-kpi-grid");
  if (!kpiSection) return;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) return;

  const styles = `
    <style>
      :root {
        --color-primary: #f46639;
        --font-family-display: 'Plus Jakarta Sans', sans-serif;
      }
      body {
        margin: 0;
        padding: 24px;
        font-family: var(--font-family-display);
        color: #111;
        background: #fff;
      }
      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 16px;
      }
      .kpi-card {
        border-radius: 16px;
        padding: 20px;
        background: #fff;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        border: 1px solid rgba(15, 23, 42, 0.04);
      }
      .kpi-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
      }
      .kpi-value {
        font-size: 2rem;
        font-weight: 700;
      }
      .kpi-change.positive {
        color: #10b981;
      }
      .kpi-change.negative {
        color: #ef4444;
      }
    </style>
  `;

  printWindow.document.write(
    `<!doctype html><html><head><title>Analytics KPI</title>${styles}</head><body>${kpiSection.innerHTML}</body></html>`,
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

window.__refreshIcons = () => createIcons({ icons });

function refreshIcons() {
  window.__refreshIcons?.();
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function buildCsvRow(values) {
  return values.map(csvEscape).join(",");
}

function downloadCsv(rows, fileName) {
  const csv = rows.map(buildCsvRow).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function handleExport(root) {
  const activeTab = getActiveAnalyticsTab(root);
  const range =
    root.querySelector(".date-btn.is-active")?.dataset.range || "30d";

  if (activeTab === "kpi") {
    printKPISection(root);
    return;
  }

  try {
    const [fleetData, driverData, co2Data, fuelData, maintenanceData] =
      await Promise.all([
        AnalyticsStorage.getFleetStatus(),
        AnalyticsStorage.getDriverPerformance(),
        AnalyticsStorage.getCO2ReportData(),
        AnalyticsStorage.getFuelAuditData(),
        AnalyticsStorage.getMaintenanceCostData(),
      ]);

    const rows = [];
    let fileName = `analytics-${activeTab}-${range}.csv`;

    switch (activeTab) {
      case "driver":
        rows.push(["Driver Performance"]);
        rows.push(["Rank", "Driver", "Speed", "Fuel", "Rating", "Score"]);
        driverData.forEach((driver, index) =>
          rows.push([
            `#${index + 1}`,
            driver.name,
            `${driver.speed}%`,
            `${driver.fuel}%`,
            driver.rating,
            driver.score,
          ]),
        );
        break;
      case "fleet":
        rows.push(["Fleet Utilization"]);
        rows.push(["Label", "Count"]);
        fleetData.forEach((item) => rows.push([item.label, item.count]));
        break;
      case "co2":
        rows.push(["CO2 Report"]);
        rows.push(["Vehicle", "Type", "Emissions", "Reduction", "Status"]);
        co2Data.forEach((row) =>
          rows.push([
            row.vehicle,
            row.type,
            row.emissions,
            `${row.reduction}%`,
            row.status,
          ]),
        );
        break;
      case "fuel":
        rows.push(["Fuel Audit"]);
        rows.push([
          "Vehicle",
          "GPS Distance",
          "Expected",
          "Actual",
          "Discrepancy",
          "Status",
        ]);
        fuelData.forEach((row) =>
          rows.push([
            row.vehicle,
            row.gpsDistance,
            row.expected,
            row.actual,
            row.discrepancy,
            row.status,
          ]),
        );
        break;
      case "maintenance":
        rows.push(["Maintenance Cost Summary"]);
        rows.push(["Total", "Preventive", "Reactive", "Currency"]);
        rows.push([
          maintenanceData.summary.total,
          maintenanceData.summary.preventive,
          maintenanceData.summary.reactive,
          maintenanceData.summary.currency,
        ]);
        rows.push([]);
        rows.push(["Maintenance Cost Table"]);
        rows.push([
          "Vehicle",
          "Service",
          "Date",
          "Parts",
          "Labor",
          "Total",
          "Status",
        ]);
        (maintenanceData.table || []).forEach((row) =>
          rows.push([
            row.vehicle,
            row.service,
            row.date,
            row.parts,
            row.labor,
            row.total,
            row.status,
          ]),
        );
        break;
      default:
        rows.push(["No export data available for this tab."]);
        break;
    }

    downloadCsv(rows, fileName);
  } catch (error) {
    console.error("Analytics export failed:", error);
  }
}

async function renderKPIs(root, range) {
  const container = root.querySelector("#analytics-kpi-grid");
  if (!container) return;
  const data = await AnalyticsStorage.getKpiData(range);

  container.innerHTML = data
    .map(
      (kpi) => `
    <div class="kpi-card">
      <div class="kpi-header">
        <span>${kpi.label}</span>
        <div class="kpi-icon" style="background: ${kpi.bg}; color: ${kpi.color}">
          <i data-lucide="${kpi.icon}"></i>
        </div>
      </div>
      <div class="kpi-value">${kpi.value}</div>
      <div class="kpi-change ${kpi.change >= 0 ? "positive" : "negative"}">
        <i data-lucide="${kpi.change >= 0 ? "trending-up" : "trending-down"}"></i>
        ${Math.abs(kpi.change)}% vs last period
      </div>
    </div>
  `,
    )
    .join("");

  refreshIcons();
}

async function renderMonthlyChart(root) {
  const container = root.querySelector("#monthly-chart");
  if (!container) return;

  const data = await AnalyticsStorage.getMonthlyChartData();

  if (!data.labels || data.labels.length === 0) {
    container.innerHTML = `<div class="empty-state">No monthly data available</div>`;
    return;
  }

  const maxVal =
    Math.max(
      ...data.revenue,
      ...data.loss.map(Math.abs),
      ...data.profit.map(Math.abs),
    ) || 1;

  container.innerHTML = data.labels
    .map((label, i) => {
      const revenue = data.revenue[i] || 0;
      const loss = data.loss[i] || 0;
      const profit = data.profit[i] || 0;

      const revHeight = (revenue / maxVal) * 100;
      const lossHeight = (loss / maxVal) * 100;
      const profitHeight = (Math.abs(profit) / maxVal) * 100;

      const isProfit = profit >= 0;
      const changeClass = isProfit ? "profit-green" : "loss-red";
      const sign = isProfit ? "+" : "";

      return `
        <div class="bar-group">
          <div class="bars" style="position: relative; height: 240px;">
            
            <!-- Revenue Bar -->
            <div class="bar bar-revenue" 
                style="height: ${revHeight}%; background: #10b981;"
                title="Revenue: ${data.currency} ${revenue.toLocaleString()}">
            </div>

            <!-- Loss Bar (from bottom) -->
            <div class="bar bar-loss" 
                style="height: ${lossHeight}%; background: #ef4444; position: absolute; bottom: 0;"
                title="Loss: ${data.currency} ${loss.toLocaleString()}">
            </div>

            <!-- Profit Indicator -->
            <div class="bar bar-profit ${isProfit ? "profit-green" : "loss-red"}" 
                style="height: ${profitHeight}%; 
                        ${isProfit ? "bottom: " + lossHeight + "%;" : "bottom: 0;"};"
                title="${isProfit ? "Profit" : "Loss"}: ${data.currency} ${Math.abs(profit).toLocaleString()}">
            </div>
          </div>

          <span class="bar-label">${label}</span>
          
          <!-- Profit/Loss Change -->
          <div class="bar-change ${changeClass}">
            ${sign}${profit.toLocaleString()} ${data.currency}
            <span class="change-perc">
              (${sign}${(revenue > 0 ? (profit / revenue) * 100 : 0).toFixed(1)}%)
            </span>
          </div>
        </div>
      `;
    })
    .join("");

  refreshIcons();
}
async function renderFleetStatus(root) {
  const donut = root.querySelector("#fleet-donut");
  const legend = root.querySelector("#fleet-legend");
  if (!donut || !legend) return;

  const data = await AnalyticsStorage.getFleetStatus();
  const total = data.reduce((sum, s) => sum + s.count, 0);
  let conicGradient = [];
  let currentPercent = 0;

  const legendHTML = data
    .map((status) => {
      const percent = total > 0 ? (status.count / total) * 100 : 0;
      conicGradient.push(
        `${status.color} ${currentPercent}% ${currentPercent + percent}%`,
      );
      currentPercent += percent;
      return `
      <div class="fleet-legend-item">
        <span class="legend-dot" style="background: ${status.color}"></span>
        <span>${status.label}</span>
        <span class="fleet-legend-count">${status.count}</span>
      </div>
    `;
    })
    .join("");

  donut.style.background =
    conicGradient.length > 0
      ? `conic-gradient(${conicGradient.join(", ")})`
      : "transparent";
  legend.innerHTML = legendHTML;

  refreshIcons();
}

async function renderDriverPerf(root) {
  const tbody = root.querySelector("#driver-perf-tbody");
  if (!tbody) return;

  const formulaCard = root.querySelector(".formula-card");
  if (formulaCard) {
    const weights = settingsMockData.kpiWeights;
    formulaCard.textContent = `Score Formula: Speed (${weights.deliverySpeed}%) + Fuel Efficiency (${weights.fuelEfficiency}%) + Customer Rating (${weights.customerRating}%)`;
  }

  const driversData = await AnalyticsStorage.getDriverPerformance();

  tbody.innerHTML = driversData
    .map((d, index) => {
      return `
      <tr>
        <td><span class="rank-pill">#${index + 1}</span></td>
        <td><strong>${d.name}</strong></td>
        <td>${d.speed}%</td>
        <td>${d.fuel}%</td>
        <td><i data-lucide="star" class="star-icon"></i> ${d.rating}</td>
        <td><span class="score-pill">${d.score}</span></td>
      </tr>
    `;
    })
    .join("");

  refreshIcons();
}

function renderTable(root) {
  const tbody = root.querySelector("#analytics-table-body");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-state">Analytics table data is not available.</td>
    </tr>
  `;

  refreshIcons();
}

async function renderCO2Report(root) {
  const tbody = root.querySelector("#co2-tbody");
  if (!tbody) return;

  let data = getStoredCo2ReportData();
  if (!Array.isArray(data) || data.length === 0) {
    data = defaultCo2ReportMockData;
  }

  tbody.innerHTML = data
    .map((row) => {
      const statusClass =
        row.status === "Excellent" || row.status === "Good"
          ? "status-Optimal"
          : row.status === "Poor"
            ? "status-NeedsReview"
            : "status-HighUsage";
      const reductionClass = row.reduction >= 0 ? "profit-green" : "loss-red";
      const reductionSign = row.reduction > 0 ? "+" : "";
      return `
      <tr>
        <td><strong>${row.vehicle}</strong></td>
        <td>${row.type}</td>
        <td>${row.emissions}</td>
        <td><span class="${reductionClass}">${reductionSign}${row.reduction}%</span></td>
        <td><span class="status-badge ${statusClass}">${row.status}</span></td>
      </tr>
    `;
    })
    .join("");
}

async function renderFuelAudit(root) {
  const tbody = root.querySelector("#fuel-tbody");
  if (!tbody) return;

  const data = await AnalyticsStorage.getFuelAuditData();

  tbody.innerHTML = data
    .map((row) => {
      const isFlagged = row.status === "Flagged";
      const rowClass = isFlagged ? "row-flagged" : "";
      const discrepancyClass = isFlagged ? "text-red" : "";
      const statusClass = isFlagged ? "status-NeedsReview" : "status-Optimal";
      const subtextHtml =
        isFlagged && row.subtext
          ? `<div class="status-subtext">${row.subtext}</div>`
          : "";

      return `
      <tr class="${rowClass}">
        <td><strong>${row.vehicle}</strong></td>
        <td>${row.gpsDistance}</td>
        <td>${row.expected}</td>
        <td>${row.actual}</td>
        <td><span class="${discrepancyClass}">${row.discrepancy}</span></td>
        <td>
           <span class="status-badge ${statusClass}">${row.status}</span>
           ${subtextHtml}
        </td>
      </tr>
    `;
    })
    .join("");
}

async function renderMaintenanceCost(root) {
  // Render Summary Cards
  const totalEl = root.querySelector("#maintenance-total");
  const preventiveEl = root.querySelector("#maintenance-preventive");
  const reactiveEl = root.querySelector("#maintenance-reactive");

  const data = await AnalyticsStorage.getMaintenanceCostData();

  if (totalEl && preventiveEl && reactiveEl) {
    const { total, preventive, reactive, currency } = data.summary;
    const prevPct = total > 0 ? Math.round((preventive / total) * 100) : 0;
    const reactPct = total > 0 ? Math.round((reactive / total) * 100) : 0;

    totalEl.textContent = `${currency} ${total.toLocaleString()}`;
    preventiveEl.textContent = `${currency} ${preventive.toLocaleString()} (${prevPct}%)`;
    reactiveEl.textContent = `${currency} ${reactive.toLocaleString()} (${reactPct}%)`;
  }

  // Render Table
  const tbody = root.querySelector("#maintenance-tbody");
  if (!tbody) return;

  if (!Array.isArray(data.table) || data.table.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">No maintenance cost records available.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = data.table
    .map((row) => {
      const statusClass =
        row.status === "Completed" ? "status-Optimal" : "status-HighUsage";
      return `
      <tr>
        <td><strong>${row.vehicle}</strong></td>
        <td>${row.service}</td>
        <td>${row.date}</td>
        <td>$${row.parts}</td>
        <td>$${row.labor}</td>
        <td><strong>$${row.total}</strong></td>
        <td><span class="status-badge ${statusClass}">${row.status}</span></td>
      </tr>
    `;
    })
    .join("");
}
