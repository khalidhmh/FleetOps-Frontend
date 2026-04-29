import { getDriverPerformance, getAllPerformances } from "../../api/index.js";

export async function mount(rootElement) {
  const view = rootElement || document;
  const viewAllBtn = view.querySelector(".ps-view-all");
  const downloadBtn = view.querySelector(".ps-btn-download");

  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.history.pushState({}, "", "/alerts");
      window.dispatchEvent(new Event("popstate"));
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // Simulated performance report data
      const reportData = {
        driverName: "Current Driver",
        performanceIndex: 87,
        tier: "Elite Driver Tier",
        rank: 4,
        metrics: {
          deliverySpeed: "94%",
          fuelEfficiency: "82%",
          customerRating: 4.9,
          onTimeRate: "98.2%",
        },
        recentComments: [
          {
            author: "Sarah Jenkins",
            date: "Yesterday, 4:15 PM",
            rating: 5,
            text: "Extremely professional and handled the fragile equipment with great care. Arrived exactly on time.",
          },
          {
            author: "Robert Miller",
            date: "Oct 12, 11:20 AM",
            rating: 4,
            text: "Fast delivery and very polite. Noted that the packaging was slightly scuffed but contents were fine.",
          },
        ],
        generatedAt: new Date().toISOString(),
      };

      // Convert to JSON string for the download
      const dataStr = JSON.stringify(reportData, null, 2);

      // Create a Blob and trigger download
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `Performance_Report_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Dynamic data fetch and rendering
  const driverId = localStorage.getItem("driver_id");
  if (driverId) {
    try {
      const [perf, allPerfs] = await Promise.all([
        getDriverPerformance(driverId),
        getAllPerformances(),
      ]);

      const calculateScore = (p) =>
        Math.round(
          p.on_time_delivery_rate * 0.4 +
            p.safety_score * 0.3 +
            p.customer_rating * 20 * 0.2 +
            p.fuel_efficiency * 0.1,
        );

      const overallScore = calculateScore(perf);

      // Calculate fleet average and rankings
      const scoredDrivers = allPerfs.map((p) => ({
        driver_id: p.driver_id,
        calculated_score: calculateScore(p),
      }));

      scoredDrivers.sort((a, b) => b.calculated_score - a.calculated_score);
      const rankIndex = scoredDrivers.findIndex(
        (s) => s.driver_id === driverId,
      );
      const rankNumber = rankIndex !== -1 ? rankIndex + 1 : 0;
      const totalDrivers = scoredDrivers.length;

      const fleetAverage = Math.round(
        scoredDrivers.reduce((a, b) => a + b.calculated_score, 0) /
          totalDrivers,
      );
      const difference = Math.abs(overallScore - fleetAverage);

      // Inject comparison text
      const descEl = view.querySelector(".ps-index-desc");
      if (descEl) {
        if (overallScore > fleetAverage) {
          descEl.innerHTML = `Exceeding fleet average by <strong class="ps-fleet-diff text-success">${difference}%</strong> this month.`;
        } else if (overallScore < fleetAverage) {
          descEl.innerHTML = `Below fleet average by <strong class="ps-fleet-diff text-danger">${difference}%</strong> this month.`;
        } else {
          descEl.innerHTML = `Matching fleet average this month.`;
        }
      }

      // Inject Rank text
      const rankDisplay = view.querySelector(".driver-rank-display");
      if (rankDisplay && rankNumber > 0) {
        rankDisplay.textContent = `Your Rank: #${rankNumber} out of ${totalDrivers}`;
        if (rankNumber <= 3) {
          rankDisplay.classList.add("top-performer", "text-success");
        } else {
          rankDisplay.classList.remove("top-performer", "text-success");
        }
      }

      const rankValEl = view.querySelector(".ps-rank-val");
      if (rankValEl && rankNumber > 0) {
        rankValEl.textContent = `#${rankNumber}`;
      }

      // Update main score
      const mainScoreEl = view.querySelector(
        ".ps-main-score, .main-score-value",
      );
      if (mainScoreEl) mainScoreEl.textContent = overallScore;

      // Update 4 sub-metrics
      const onTimeEl = view.querySelector(".ps-metric-ontime");
      if (onTimeEl) onTimeEl.textContent = `${perf.on_time_delivery_rate}%`;

      const speedEl = view.querySelector(".ps-metric-speed");
      if (speedEl) speedEl.textContent = `${perf.safety_score}%`;

      const fuelEl = view.querySelector(".ps-metric-fuel");
      if (fuelEl) fuelEl.textContent = `${perf.fuel_efficiency}%`;

      const ratingEl = view.querySelector(".ps-metric-rating");
      if (ratingEl) {
        ratingEl.innerHTML = `<span class="ps-star-icon">★</span> ${perf.customer_rating.toFixed(1)}`;
      }

      // Dynamically render recent comments using Template Literals
      const commentsContainer = view.querySelector(".ps-comments-container");
      if (commentsContainer) {
        commentsContainer.innerHTML = perf.recent_comments
          .map((comment) => {
            // Extract initials from reviewer_name
            const initials = comment.reviewer_name
              .split(" ")
              .map((n) => n[0])
              .join("");
            const stars =
              "★".repeat(Math.round(comment.rating)) +
              "☆".repeat(5 - Math.round(comment.rating));

            return `
                        <div class="ps-comment-card card stack stack-compact">
                            <div class="ps-comment-header row justify-between">
                                <div class="row">
                                    <div class="ps-avatar">${initials}</div>
                                    <div class="ps-comment-meta stack stack-compact">
                                        <span class="ps-comment-author">${comment.reviewer_name}</span>
                                        <span class="ps-comment-time helper-text font-xs">${comment.date}</span>
                                    </div>
                                </div>
                                <div class="ps-comment-rating text-primary">${stars}</div>
                            </div>
                            <p class="ps-comment-body helper-text">"${comment.text}"</p>
                        </div>
                    `;
          })
          .join("");
      }
    } catch (error) {
      console.error("Failed to fetch performance data:", error);
    }
  }
}
