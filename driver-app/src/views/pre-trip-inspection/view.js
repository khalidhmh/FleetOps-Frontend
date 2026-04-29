import { getDriverProfile, getVehicleById } from "../../api/index.js";

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
      const driver = await getDriverProfile(driverId);
      if (driver.assigned_vehicle_id) {
        const vehicle = await getVehicleById(driver.assigned_vehicle_id);
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
    
    // Submit button logic
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

  // Navigation on form submit
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      if (submitBtn && !submitBtn.disabled) {
        // Show success banner
        if (banner) {
          banner.classList.remove('hidden');
          
          // Redirect after a short delay to show success
          setTimeout(() => {
            window.history.pushState({}, '', '/active-route-page');
            window.dispatchEvent(new Event('popstate'));
          }, 1500);
        } else {
          window.history.pushState({}, '', '/active-route-page');
          window.dispatchEvent(new Event('popstate'));
        }
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
