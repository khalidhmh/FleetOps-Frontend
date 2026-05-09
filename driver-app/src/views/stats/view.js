export function mount(rootElement) {
  const navigateTo = (path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event("popstate"));
  };

  const performanceCard = rootElement.querySelector(".card-performance-score");
  if (performanceCard) {
    performanceCard.addEventListener("click", () => navigateTo("/performance-score-page"));
  }

  const codCard = rootElement.querySelector(".card-cod-reconciliation");
  if (codCard) {
    codCard.addEventListener("click", () => navigateTo("/cod-reconcilation-page"));
  }
}