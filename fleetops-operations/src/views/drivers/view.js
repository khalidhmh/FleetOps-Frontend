import DriverStorage from "../../services/api/drivers.js";

let driversData = [];
let escListener = null;
let performanceChartInstance = null;
let statusChartInstance = null;

let _mounted = false;
let _fetchAbortController = null;
let _docListeners = [];
let currentFilter = 'All';

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

  _fetchAbortController?.abort();
  _fetchAbortController = new AbortController();
  _mounted = true;

  try {
    gridContainer.innerHTML = `<div class="helper-text">Loading drivers...</div>`;
    await loadChartJS();
    
    driversData = await DriverStorage.getDrivers({ signal: _fetchAbortController?.signal });
    
    if (!_mounted) return;
    
    renderDrivers(getFilteredDrivers());
    // Pass driversData so the chart counts are calculated dynamically
    renderCharts(driversData);

    document.getElementById("drivers-search")?.addEventListener("input", handleSearch);
    
    document.getElementById("close-modal-btn")?.addEventListener("click", closeModal);
    
    initFilters();

    // Delegated click listener for driver cards
    const cardClickHandler = (e) => {
      const card = e.target.closest('.driver-card');
      if (card) {
        const id = card.getAttribute('data-driver-id');
        const driver = driversData.find(d => (d.driver_id || d.id) == id);
        if (driver) openDriverModal(driver);
      }
    };
    gridContainer.addEventListener('click', cardClickHandler);
    _docListeners.push({ type: 'click', fn: cardClickHandler }); // Track for cleanup

    const overlay = document.getElementById("driver-modal-overlay");
    if (overlay) {
      const overlayClickHandler = (e) => {
        // Only close if clicking the overlay itself, not the panel
        if (e.target === overlay) {
          closeModal();
        }
      };
      overlay.addEventListener("click", overlayClickHandler);
      _docListeners.push({ type: 'click', fn: overlayClickHandler });
    }

    const escListener = (e) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    document.addEventListener("keydown", escListener);
    _docListeners.push({ type: "keydown", fn: escListener });

  } catch (error) {
    if (error?.name === 'AbortError') return;
    console.error("Failed to load drivers:", error);
    if (_mounted) {
      gridContainer.innerHTML = `<div class="helper-text error-text">Error loading drivers.</div>`;
    }
  }
}

function getFilteredDrivers() {
  const searchInput = document.getElementById("drivers-search");
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  
  return driversData.filter(d => {
    // 1. Check status filter
    if (currentFilter !== 'All' && currentFilter.toUpperCase() !== 'ALL' && 
        d.status?.toUpperCase() !== currentFilter.toUpperCase()) {
      return false;
    }
    
    // 2. Check search query
    if (query) {
      const name = d.user?.name || d.name || "";
      const id = d.driver_id || d.id || "";
      return name.toLowerCase().includes(query) || 
             id.toLowerCase().includes(query) ||
             (d.license_no && d.license_no.toLowerCase().includes(query));
    }
    
    return true;
  });
}

function initFilters() {
  const filterContainer = document.querySelector('.filter-chips');
  if (!filterContainer) return;
  
  const buttons = filterContainer.querySelectorAll('button');
  buttons.forEach(btn => {
    // Make sure we only attach the listener once.
    btn.onclick = (e) => {
      // Update active classes
      buttons.forEach(b => {
        b.classList.remove('success');
        b.classList.add('neutral');
      });
      e.target.classList.remove('neutral');
      e.target.classList.add('success');
      
      currentFilter = e.target.textContent.trim();
      renderDrivers(getFilteredDrivers());
    };
  });
}

function renderDrivers(data) {
  const gridContainer = document.getElementById("drivers-grid");
  if (!gridContainer) return;
  
  // Calculate summary metrics
  const totalDrivers = data.length;
  const onRouteDrivers = data.filter(d => d.status === 'On Route' || d.status === 'Active').length;
  const availableDrivers = data.filter(d => d.status === 'Available').length;
  const avgScore = totalDrivers > 0 
      ? Math.round(data.reduce((sum, d) => sum + (d.score || 0), 0) / totalDrivers) 
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
    const status = driver.status || 'Offline';
    let statusColorClass = 'status-off-duty';
    if (status === 'Active' || status === 'On Route') statusColorClass = 'status-on-route';
    else if (status === 'Available') statusColorClass = 'status-available';
    else if (status === 'On Break') statusColorClass = 'status-on-break';
    
    let chipClass = status === 'Active' || status === 'On Route' || status === 'Available' ? 'success' : 'neutral';
    
    // Get initials safely
    const name = driver.user?.name || driver.name || "Unknown";
    const initials = name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || "U";
    const id = driver.driver_id || driver.id || "N/A";
    const phone = driver.user?.phone_no || driver.phone || "N/A";
    const ratingStr = driver.average_rating != null ? driver.average_rating : (driver.score != null ? (Number(driver.score)/20).toFixed(1) : "N/A");

    return `
      <div class="card driver-card stack ${statusColorClass}" data-driver-id="${id}">
        <div class="row driver-card-header">
          <div class="row">
            <div class="avatar-circle">${initials}</div>
            <div class="stack driver-info">
              <strong class="heading-md">${name}</strong>
              <span class="helper-text">${id.toUpperCase()}</span>
            </div>
          </div>
          <div class="stack driver-score">
            <span class="chip ${chipClass}">${status}</span>
            <strong class="text-primary heading-md">${driver.score || "N/A"}</strong>
            <span class="helper-text m-0">Safety</span>
          </div>
        </div>
        
        <div class="row mt-2">
           <span class="helper-text">📞 ${phone}</span>
        </div>
        
        <hr class="card-divider" />
        
        <div class="row driver-metrics">
           <div class="stack metric-item"><strong class="heading-md">${driver.total_deliveries || driver.deliveries || 0}</strong><span class="helper-text m-0">Deliveries</span></div>
           <div class="stack metric-item"><strong class="heading-md">${driver.on_time_percentage || driver.onTime || '0%'}</strong><span class="helper-text m-0">On-Time</span></div>
           <div class="stack metric-item"><strong class="heading-md">${ratingStr}</strong><span class="helper-text m-0">Rating</span></div>
        </div>
        
        <div class="row assigned-vehicle-box">
           <span class="helper-text m-0">🚚 ${driver.vehicle_id ? driver.vehicle_id : 'Unassigned'}</span>
        </div>
      </div>
    `;
  }).join('');
}

function handleSearch(e) {
  renderDrivers(getFilteredDrivers());
}

function openDriverModal(driver) {
  const modal = document.getElementById("driver-modal-overlay");
  if (!modal) return;

  // Safe generic selector hydration explicitly within THIS modal's DOM tree
  const safelyHydrate = (selector, text) => {
    const el = modal.querySelector(selector);
    if (el) el.textContent = text;
  };

  const id = driver.driver_id || driver.id || "N/A";
  const name = driver.user?.name || driver.name || "Unknown";
  const phone = driver.user?.phone_no || driver.phone || "";
  const ratingStr = driver.average_rating != null ? driver.average_rating : (driver.score != null ? (Number(driver.score)/20).toFixed(1) : "N/A");

  safelyHydrate('.modal-name', name);
  safelyHydrate('.modal-id', id.toUpperCase());
  safelyHydrate('.modal-phone', phone);
  safelyHydrate('.modal-email', driver.user?.email || driver.email || 'N/A');
  
  safelyHydrate('.modal-license', driver.license_no || "N/A");
  safelyHydrate('.modal-type', driver.license_type || "N/A");
  safelyHydrate('.modal-expiry', driver.license_expiry || "N/A");
  
  safelyHydrate('.modal-vehicle-id', driver.vehicle_id || "N/A");
  safelyHydrate('.modal-vehicle-plate', driver.vehicle?.plate || driver.vehicle_plate || "N/A");

  safelyHydrate('.modal-safety-score', `${driver.score || 0}/100`);
  safelyHydrate('.modal-total-deliveries', driver.total_deliveries || driver.deliveries || 0);
  safelyHydrate('.modal-on-time-rate', driver.on_time_percentage || driver.onTime || '0%');
  safelyHydrate('.modal-rating', ratingStr);

  // Handle badges specifically
  const statusEl = modal.querySelector(".modal-status");
  if (statusEl) {
    statusEl.textContent = driver.status || "Offline";
    statusEl.className = `chip modal-status ${driver.status === 'Active' || driver.status === 'On Route' ? 'success' : 'neutral'}`;
  }
  
  const dutyStatusEl = modal.querySelector(".modal-duty-status");
  if (dutyStatusEl) {
    dutyStatusEl.textContent = driver.status || "Offline";
    dutyStatusEl.className = `chip modal-duty-status ${driver.status === 'Active' || driver.status === 'On Route' ? 'success' : 'neutral'}`;
  }

  const initials = name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  safelyHydrate('.modal-avatar', initials);
  
  // Show modal
  modal.classList.add("open");
}

function closeModal() {
  const overlay = document.getElementById("driver-modal-overlay");
  if (overlay) {
    overlay.classList.remove("open");
  }
}

export function unmount() {
  _mounted = false;
  _fetchAbortController?.abort();
  _fetchAbortController = null;

  document.getElementById("drivers-search")?.removeEventListener("input", handleSearch);
  document.getElementById("close-modal-btn")?.removeEventListener("click", closeModal);
  
  const filterContainer = document.querySelector('.filter-chips');
  if (filterContainer) {
    filterContainer.querySelectorAll('button').forEach(btn => {
      btn.onclick = null;
    });
  }

  _docListeners.forEach(({ type, fn }) => {
    document.removeEventListener(type, fn);
  });
  _docListeners.length = 0;
}

/**
 * Renders the performance bar chart and the driver-status doughnut chart.
 * @param {Array} data - The live driversData array; used to calculate doughnut segments.
 */
function renderCharts(data = []) {
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

  // ── Doughnut: dynamically calculate counts from the fetched drivers array ──
  const activeCount   = data.filter(d => d.status === 'Active' || d.status === 'On Route' || d.status === 'Available').length;
  const onBreakCount  = data.filter(d => d.status === 'On Break').length;
  // Everything else (Offline, Off Duty, unknown) falls into the third segment
  const offlineCount  = data.filter(d =>
    d.status !== 'Active' && d.status !== 'On Route' &&
    d.status !== 'Available' && d.status !== 'On Break'
  ).length;

  /* // Old hardcoded doughnut data — replaced by dynamic calculation above
  const hardcodedData = [45, 12, 8];
  */

  statusChartInstance = new Chart(doughnutCtx, {
    type: 'doughnut',
    data: {
      labels: ['Active / Available', 'On Break', 'Offline'],
      datasets: [{
        data: [activeCount, onBreakCount, offlineCount],
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

