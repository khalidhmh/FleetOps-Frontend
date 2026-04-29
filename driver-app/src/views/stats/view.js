import { getDriverProfile, getDriverPerformance } from "../../api/index.js";

export async function mount(rootElement) {
    const view = rootElement || document;
    const container = view.querySelector('.stats-container');
    const driverId = localStorage.getItem("driver_id");

    if (!container || !driverId) return;

    try {
        const [driver, perf] = await Promise.all([
            getDriverProfile(driverId),
            getDriverPerformance(driverId)
        ]);

        const overallScore = Math.round(
            (perf.on_time_delivery_rate * 0.4) + 
            (perf.safety_score * 0.3) + 
            ((perf.customer_rating * 20) * 0.2) + 
            (perf.fuel_efficiency * 0.1)
        );

        container.innerHTML = `
            <!-- PERFORMANCE SCORE CARD -->
            <div class="card stat-card performance-score-btn">
                <div class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 3v18h18"/>
                        <path d="m19 9-5 5-4-4-3 3"/>
                    </svg>
                </div>
                <div class="card-content">
                    <h2 class="heading-md">Performance Score</h2>
                    <p class="helper-text">Current Score: <strong class="text-success overall-score-display">${overallScore} / 100</strong></p>
                </div>
            </div>

            <!-- TOTAL EARNINGS CARD -->
            <div class="card stat-card cod-reconciliation-btn">
                <div class="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect width="20" height="14" x="2" y="5" rx="2"/>
                        <line x1="2" x2="22" y1="10" y2="10"/>
                    </svg>
                </div>
                <div class="card-content">
                    <h2 class="heading-md">Total Earnings</h2>
                    <p class="helper-text">EGP <strong class="text-primary total-earnings-display">${driver.total_earnings.toLocaleString()}</strong></p>
                </div>
            </div>
        `;

        const performanceBtn = view.querySelector('.performance-score-btn');
        const codBtn = view.querySelector('.cod-reconciliation-btn');

        if (performanceBtn) {
            performanceBtn.addEventListener('click', () => {
                window.history.pushState({}, '', '/performance-score-page');
                window.dispatchEvent(new Event('popstate'));
            });
        }

        if (codBtn) {
            codBtn.addEventListener('click', () => {
                window.history.pushState({}, '', '/cod-reconcilation-page');
                window.dispatchEvent(new Event('popstate'));
            });
        }
    } catch (error) {
        console.error("Error fetching stats data", error);
    }
}

export function unmount() {
    // Cleanup if needed
}
