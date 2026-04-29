import DriverStorage from "../../services/api/drivers.js";

let driversData = [];
let escListener = null;
let performanceChartInstance = null;
let statusChartInstance = null;

function loadChartJS() {
  return new Promise((resolve, reject) => {
    if (window.Chart) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function mount() {
  const gridContainer = document.getElementById("drivers-grid");
  
  if (!gridContainer) return;

  try {
    gridContainer.innerHTML = `<div class="helper-text">Loading drivers...</div>`;
    await loadChartJS();
    driversData = await DriverStorage.getDrivers();
    
    renderDrivers(driversData);
    renderCharts();

    document.getElementById("drivers-search")?.addEventListener("input", handleSearch);
    
    document.getElementById("close-modal-btn")?.addEventListener("click", closeModal);
    
    const overlay = document.getElementById("driver-modal-overlay");
    if (overlay) {
      overlay.addEventListener("click", (e) => {
        // Only close if clicking the overlay itself, not the panel
        if (e.target === overlay) {
          closeModal();
        }
      });
    }

    escListener = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    document.addEventListener("keydown", escListener);

  } catch (error) {
    console.error("Failed to load drivers:", error);
    gridContainer.innerHTML = `<div class="helper-text error-text">Error loading drivers.</div>`;
  }
}

function renderDrivers(data) {
  const gridContainer = document.getElementById("drivers-grid");
  if (!gridContainer) return;
  
  // Calculate summary metrics
  const totalDrivers = data.length;
  const onRouteDrivers = data.filter(d => d.status === 'On Route' || d.status === 'Active').length;
  const availableDrivers = data.filter(d => d.status === 'Available').length;
  const avgScore = totalDrivers > 0 
      ? Math.round(data.reduce((sum, d) => sum + (d.performance?.safetyScore || 0), 0) / totalDrivers) 
      : 0;
      
  // Update Header Count
  const countEl = document.getElementById("drivers-count");
  if (countEl) countEl.textContent = `${totalDrivers} drivers · ${onRouteDrivers} on route`;

  // Update Summary Cards
  const onRouteEl = document.getElementById("summary-on-route");
  if (onRouteEl) onRouteEl.textContent = onRouteDrivers;
  
  const availableEl = document.getElementById("summary-available");
  if (availableEl) availableEl.textContent = availableDrivers;
  
  const avgScoreEl = document.getElementById("summary-avg-score");
  if (avgScoreEl) avgScoreEl.textContent = avgScore;

  if (data.length === 0) {
    gridContainer.innerHTML = `<div class="helper-text">No drivers found matching your search.</div>`;
    return;
  }
  
  gridContainer.innerHTML = data.map(driver => {
    let statusColorClass = 'status-off-duty';
    if (driver.status === 'Active' || driver.status === 'On Route') statusColorClass = 'status-on-route';
    else if (driver.status === 'Available') statusColorClass = 'status-available';
    else if (driver.status === 'On Break') statusColorClass = 'status-on-break';
    
    let chipClass = driver.status === 'Active' || driver.status === 'On Route' || driver.status === 'Available' ? 'success' : 'neutral';
    
    // Get initials
    const initials = driver.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();

    return `
      <div class="card driver-card stack ${statusColorClass}" data-driver-id="${driver.id}">
        <div class="row driver-card-header">
          <div class="row">
            <div class="avatar-circle">${initials}</div>
            <div class="stack driver-info">
              <strong class="heading-md">${driver.name}</strong>
              <span class="helper-text">${driver.id.toUpperCase()}</span>
            </div>
          </div>
          <div class="stack driver-score">
            <span class="chip ${chipClass}">${driver.status || 'Offline'}</span>
            <strong class="text-primary heading-md">${driver.performance?.safetyScore || "N/A"}</strong>
            <span class="helper-text m-0">Safety</span>
          </div>
        </div>
        
        <div class="row mt-2">
           <span class="helper-text">📞 ${driver.contact?.phone || 'N/A'}</span>
        </div>
        
        <hr class="card-divider" />
        
        <div class="row driver-metrics">
           <div class="stack metric-item"><strong class="heading-md">${driver.performance?.totalDeliveries || 0}</strong><span class="helper-text m-0">Deliveries</span></div>
           <div class="stack metric-item"><strong class="heading-md">${driver.performance?.onTimeRate || 0}%</strong><span class="helper-text m-0">On-Time</span></div>
           <div class="stack metric-item"><strong class="heading-md">${driver.rating || 'N/A'}</strong><span class="helper-text m-0">Rating</span></div>
        </div>
        
        <div class="row assigned-vehicle-box">
           <span class="helper-text m-0">🚚 ${driver.vehicle?.id !== "Unassigned" ? `${driver.vehicle?.id} (${driver.vehicle?.type})` : "Unassigned"}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach click listeners to cards
  document.querySelectorAll('.driver-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-driver-id');
      const driver = driversData.find(d => d.id === id);
      if (driver) hydrateModal(driver);
    });
  });
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase();
  const filtered = driversData.filter(d => 
    d.name.toLowerCase().includes(query) || 
    d.id.toLowerCase().includes(query) ||
    (d.license?.number && d.license.number.toLowerCase().includes(query))
  );
  renderDrivers(filtered);
}

function hydrateModal(driver) {
  // Safe generic selector hydration
  const safelyHydrate = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  };

  safelyHydrate('.modal-name', driver.name);
  safelyHydrate('.modal-id', driver.id.toUpperCase());
  safelyHydrate('.modal-phone', driver.contact?.phone || '');
  safelyHydrate('.modal-email', driver.contact?.email || '');
  
  safelyHydrate('.modal-license', driver.license?.number || "N/A");
  safelyHydrate('.modal-type', driver.vehicle?.type || "N/A");
  safelyHydrate('.modal-expiry', driver.license?.expiry || "N/A");
  
  safelyHydrate('.modal-vehicle-id', driver.vehicle?.id || "N/A");
  safelyHydrate('.modal-vehicle-plate', driver.vehicle?.plate || "N/A");

  safelyHydrate('.modal-safety-score', `${driver.performance?.safetyScore || 0}/100`);
  safelyHydrate('.modal-total-deliveries', driver.performance?.totalDeliveries || 0);
  safelyHydrate('.modal-on-time-rate', `${driver.performance?.onTimeRate || 0}%`);
  safelyHydrate('.modal-rating', driver.rating || "N/A");

  // Handle badges specifically
  const statusEl = document.querySelector(".modal-status");
  if (statusEl) {
    statusEl.textContent = driver.status || "Offline";
    statusEl.className = `chip modal-status ${driver.status === 'Active' || driver.status === 'On Route' ? 'success' : 'neutral'}`;
  }
  
  const dutyStatusEl = document.querySelector(".modal-duty-status");
  if (dutyStatusEl) {
    dutyStatusEl.textContent = driver.status || "Offline";
    dutyStatusEl.className = `chip modal-duty-status ${driver.status === 'Active' || driver.status === 'On Route' ? 'success' : 'neutral'}`;
  }

  const initials = driver.name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  safelyHydrate('.modal-avatar', initials);
  
  // Show modal
  const overlay = document.getElementById("driver-modal-overlay");
  if (overlay) {
    overlay.classList.add("open");
  }
}

function closeModal() {
  const overlay = document.getElementById("driver-modal-overlay");
  if (overlay) {
    overlay.classList.remove("open");
  }
}

export function unmount() {
  document.getElementById("drivers-search")?.removeEventListener("input", handleSearch);
  document.getElementById("close-modal-btn")?.removeEventListener("click", closeModal);
  
  const overlay = document.getElementById("driver-modal-overlay");
  if (overlay) {
    overlay.removeEventListener("click", closeModal);
  }

  if (escListener) {
    document.removeEventListener("keydown", escListener);
    escListener = null;
  }
}

function renderCharts() {
  const barCtx = document.getElementById('performanceBarChart');
  const doughnutCtx = document.getElementById('statusDoughnutChart');
  
  if (!barCtx || !doughnutCtx || !window.Chart) return;
  
  if (performanceChartInstance) performanceChartInstance.destroy();
  if (statusChartInstance) statusChartInstance.destroy();

  performanceChartInstance = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Deliveries Completed',
        data: [18, 22, 11, 24, 21, 10, 8],
        backgroundColor: '#0D6EFD', // Matches a primary blue
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: 'Weekly Deliveries',
          align: 'start'
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  statusChartInstance = new Chart(doughnutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Active', 'On Break', 'Offline'],
      datasets: [{
        data: [45, 12, 8],
        backgroundColor: ['#10b981', '#f59e0b', '#94a3b8'], // Green, Yellow/Orange, Gray
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position: 'bottom' },
        title: {
          display: true,
          text: 'Driver Status',
          align: 'start'
        }
      }
    }
  });
}
