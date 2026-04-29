export const routes = [
  {
    path: "/",
    title: "Driver App | Home",
    view: {
      html: "/src/views/home/view.html",
      css: "/src/views/home/view.css",
      js: "/src/views/home/view.js",
    },
  },
  {
    path: "/page-one",
    title: "Driver App | Page One",
    view: {
      html: "/src/views/page-one/view.html",
      css: "/src/views/page-one/view.css",
      js: "/src/views/page-one/view.js",
    },
  },
  {
    path: "/preview-page",
    title: "Driver App | Template Page",
    view: {
      html: "/src/views/preview-page/view.html",
      css: "/src/views/preview-page/view.css",
      js: "/src/views/preview-page/view.js",
    },
  },
  {
    path: "/login-page",
    title: "Driver App | Login Page",
    view: {
      html: "/src/views/login/view.html",
      css: "/src/views/login/view.css",
      js: "/src/views/login/view.js",
    },
  },
  {
    path: "/active-route-page",
    title: "Driver App | Active Route Page",
    view: {
      html: "/src/views/active-route/view.html",
      css: "/src/views/active-route/view.css",
      js: "/src/views/active-route/view.js",
    },
  },
  {
    path: "/pre-trip-inspection-page",
    title: "Driver App | Pre-Trip Inspection Page",
    view: {
      html: "/src/views/pre-trip-inspection/view.html",
      css: "/src/views/pre-trip-inspection/view.css",
      js: "/src/views/pre-trip-inspection/view.js",
    },
  },
  {
    path: "/profile-page",
    title: "Driver App | Profile Page",
    view: {
      html: "/src/views/profile/view.html",
      css: "/src/views/profile/view.css",
      js: "/src/views/profile/view.js",
    },
  },
  {
    path: "/cod-reconcilation-page",
    title: "Driver App | COD Reconcilation Page",
    view: {
      html: "/src/views/cod-reconcilation/view.html",
      css: "/src/views/cod-reconcilation/view.css",
      js: "/src/views/cod-reconcilation/view.js",
    },
  },
  {
    path: "/failed-delivery-page",
    title: "Driver App | Failed Delivery Page",
    view: {
      html: "/src/views/failed-delivery/view.html",
      css: "/src/views/failed-delivery/view.css",
      js: "/src/views/failed-delivery/view.js",
    },
  },
  {
    path: "/delivery-confirm-page",
    title: "Driver App | Delivery Confirm Page",
    view: {
      html: "/src/views/delivery-confirm/view.html",
      css: "/src/views/delivery-confirm/view.css",
      js: "/src/views/delivery-confirm/view.js",
    },
  },
  {
    path: "/stop-details-page",
    title: "Driver App | Stop Details Page",
    view: {
      html: "/src/views/stop-details/view.html",
      css: "/src/views/stop-details/view.css",
      js: "/src/views/stop-details/view.js",
    },
  },
  {
    path: "/qr-scan-page",
    title: "Driver App | QR Scan Page",
    view: {
      html: "/src/views/qr-scan/view.html",
      css: "/src/views/qr-scan/view.css",
      js: "/src/views/qr-scan/view.js",
    },
  },
  {
    path: "/digital-signature-page",
    title: "Driver App | Digital Signature Page",
    view: {
      html: "/src/views/digital-signature/view.html",
      css: "/src/views/digital-signature/view.css",
      js: "/src/views/digital-signature/view.js",
    },
  },
  {
    path: "/alerts-page",
    title: "Driver App | Alerts Page",
    view: {
      html: "/src/views/alerts/view.html",
      css: "/src/views/alerts/view.css",
      js: "/src/views/alerts/view.js",
    },
  },
  {
    path: "/incident-report-page",
    title: "Driver App | Incident Report Page",
    view: {
      html: "/src/views/incident-report/view.html",
      css: "/src/views/incident-report/view.css",
      js: "/src/views/incident-report/view.js",
    },
  },
  {
    path: "/break-rest-page",
    title: "Driver App | Break and Rest Page",
    view: {
      html: "/src/views/break-rest/view.html",
      css: "/src/views/break-rest/view.css",
      js: "/src/views/break-rest/view.js",
    },
  },
  {
    path: "/notification-center-page",
    title: "Driver App | Notification Center Page",
    view: {
      html: "/src/views/notification-center/view.html",
      css: "/src/views/notification-center/view.css",
      js: "/src/views/notification-center/view.js",
    },
  },
  {
    path: "/performance-score-page",
    title: "Driver App | Performance Score Page",
    view: {
      html: "/src/views/performance-score/view.html",
      css: "/src/views/performance-score/view.css",
      js: "/src/views/performance-score/view.js",
    },
  },
  {
    path: "/stats-page",
    title: "Driver App | Stats Page",
    view: {
      html: "/src/views/stats/view.html",
      css: "/src/views/stats/view.css",
      js: "/src/views/stats/view.js",
    },
  },
  
];

export const notFoundRoute = {
  path: "/404",
  title: "Driver App | Not Found",
  view: {
    html: "/src/views/not-found/view.html",
    css: "/src/views/not-found/view.css",
    js: "/src/views/not-found/view.js",
  },
};

export function normalizePath(pathname) {
  if (!pathname || pathname === "/index.html") {
    return "/";
  }

  const trimmed =
    pathname.endsWith("/") && pathname.length > 1
      ? pathname.slice(0, -1)
      : pathname;

  return trimmed;
}
