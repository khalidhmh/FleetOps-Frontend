import DriverStorage from "../../services/api/drivers.js";
import VehicleStorage from "../../services/api/vehicles.js";
import InspectionsAPI from "../../services/api/Inspections.js";

export async function mount() {
  const container = document.querySelector('.Pre-Trip-view');
  if (!container) return;

  // Date Display
  const dateElement = container.querySelector('.today-date');
  if (dateElement) {
    const today = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    dateElement.textContent = today.toLocaleDateString('en-US', options);
  }

  // Vehicle Display
  const driverId = localStorage.getItem("driver_id");
  if (driverId) {
    try {
      const driver = await DriverStorage.getDriverProfile(driverId);
      if (driver.assigned_vehicle_id) {
        const vehicle = await VehicleStorage.getVehicleById(driver.assigned_vehicle_id);
        const plateEl = container.querySelector('.vehicle-plate-value');
        const modelEl = container.querySelector('.vehicle-model-value');
        if (plateEl) plateEl.textContent = vehicle.plate_number;
        if (modelEl) modelEl.textContent = vehicle.model;
      }
    } catch (e) {
      console.error("Failed to load vehicle data:", e);
    }
  }

  // Progress Tracking
  const form = container.querySelector('.inspection-form');
  const checkboxes = form ? form.querySelectorAll('input[type="checkbox"]') : [];
  const progressText = container.querySelector('.progress-text');
  const progressBar = container.querySelector('.progress-bar');
  const submitBtn = container.querySelector('.inspection-button');
  const banner = container.querySelector('.banner');

  const total = checkboxes.length;

  function updateProgress() {
    const checkedCount = form ? form.querySelectorAll('input[type="checkbox"]:checked').length : 0;

    // Update text
    if (progressText) {
      progressText.innerHTML = `<span>${checkedCount}</span> of ${total}`;
    }

    // Update progress bar
    if (progressBar) {
      const percentage = total === 0 ? 0 : (checkedCount / total) * 100;
      progressBar.value = percentage;
    }

    // Submit button logic — enabled only when all items are checked
    if (submitBtn) {
      submitBtn.disabled = (checkedCount !== total);
    }
  }

  // Initial call
  updateProgress();

  // Listen to changes
  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateProgress);
  });

  // ─── Form Submission ───────────────────────────────────────────────────────
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (!submitBtn || submitBtn.disabled) return;

      // ── 1. Build the payload ────────────────────────────────────────────────
      const isChecked = (name) => form.querySelector(`input[name="${name}"]`)?.checked ?? false;

      const payload = {
        // Identity — driver_id from localStorage, others hardcoded for now
        driver_id: parseInt(localStorage.getItem("driver_id"), 10),
        vehicle_id: 1,
        route_id: 20002,

        // Tires
        pressure_tread_depth:     isChecked('tire_pressure'),
        wheel_nut_security:       isChecked('wheel_nut'),
        sidewall_condition:       isChecked('sidewall'),
        spare_tire:               isChecked('spare_tire'),

        // Brakes
        service_brake_test:       isChecked('service_brake'),
        parking_brake_engagement: isChecked('parking_brake'),
        air_leakage_check:        isChecked('air_leakage'),

        // Lights
        headlights_indicators:    isChecked('headlights'),
        brake_tail_lights:        isChecked('tail_lights'),
        reflectors_markers:       isChecked('reflectors'),

        // Documents
        insurance_verification:   isChecked('insurance'),
        registration_receipt:     isChecked('registration'),
        route_manifest:           isChecked('route_manifest'),

        // Cabin
        mirror_adjustments:       isChecked('mirrors'),
        wipers_fluid:             isChecked('wipers'),
        emergency_kit_check:      isChecked('emergency_kit'),

        // Readings — hardcoded until UI inputs are available
        odometer_reading: 124500,
        fuel_level: 85,
      };

      // ── 2. Enter loading state ──────────────────────────────────────────────
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      const originalHTML = submitBtn.innerHTML;
      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
          class="spinner-icon">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Submitting...
      `;

      // ── 3. Call the API ─────────────────────────────────────────────────────
      try {
        await InspectionsAPI.submitInspection(payload);

        // ── 4a. Success — show banner then redirect ──────────────────────────
        if (banner) {
          banner.classList.remove('hidden');
        }

        setTimeout(() => {
          window.history.pushState({}, '', '/active-route-page');
          window.dispatchEvent(new Event('popstate'));
        }, 1500);

      } catch (err) {
        // ── 4b. Error — restore button and alert driver ──────────────────────
        console.error("Inspection submission failed:", err);
        submitBtn.innerHTML = originalHTML;
        submitBtn.disabled = false;

        // Re-evaluate to restore correct disabled state
        updateProgress();

        alert("Failed to submit inspection. Please check your connection and try again.");
      }
    });
  }

  // Fallback for submit button if it's outside the form and form ID is missing
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      if (form && !form.id) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
  }
}

export function unmount() {
  // Clean up if needed
}
