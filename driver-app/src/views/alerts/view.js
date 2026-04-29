export function mount(rootElement) {
  const navigateTo = (path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event("popstate"));
  };

  const reportCard = rootElement.querySelector(".card-report-incident");
  if (reportCard) {
    reportCard.addEventListener("click", () => navigateTo("/incident-report-page"));
  }

  const notifyCard = rootElement.querySelector(".card-notification-center");
  if (notifyCard) {
    notifyCard.addEventListener("click", () => navigateTo("/notification-center-page"));
  }
}