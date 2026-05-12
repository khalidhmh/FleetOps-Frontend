export const routes = [
    // ── Magic-link entry point ─────────────────────────────────────────────
    // Reached via: /track?token=<uuid>
    // Fetches tracking data and redirects to the correct status view.
    {
        path: '/track',
        title: 'Tracking Your Order | FleetOps',
        view: {
            html: 'src/views/tracking/view.html',
            css:  'src/views/tracking/view.css',
            js:   'src/views/tracking/view.js',
        },
    },
    {
        path: '/order-confirmed',
        title: 'Order Confirmed | FleetOps',
        view: {
            html: 'src/views/order-confirmed/view.html',
            css: 'src/views/order-confirmed/view.css',
            js: 'src/views/order-confirmed/view.js',
        },
    },
    {
        path: '/in-transit',
        title: 'In Transit | FleetOps',
        view: {
            html: 'src/views/in-transit/view.html',
            css: 'src/views/in-transit/view.css',
            js: 'src/views/in-transit/view.js',
        },
    },
    {
        path: '/arriving-alerts',
        title: 'Driver Arriving | FleetOps',
        view: {
            html: 'src/views/arriving-alerts/view.html',
            css: 'src/views/arriving-alerts/view.css',
            js: 'src/views/arriving-alerts/view.js',
        },
    },
    {
        path: '/delivered',
        title: 'Delivered | FleetOps',
        view: {
            html: 'src/views/delivered/view.html',
            css: 'src/views/delivered/view.css',
            js: 'src/views/delivered/view.js',
        },
    },
    {
        path: '/delivery-failed',
        title: 'Delivery Failed | FleetOps',
        view: {
            html: 'src/views/delivery-failed/view.html',
            css: 'src/views/delivery-failed/view.css',
            js: 'src/views/delivery-failed/view.js',
        },
    },
    {
        path: '/link-expired',
        title: 'Link Expired | FleetOps',
        view: {
            html: 'src/views/link-expired/view.html',
            css: 'src/views/link-expired/view.css',
            js: 'src/views/link-expired/view.js',
        },
    },
    {
        path: '/delivery-preferences',
        title: 'Delivery Preferences | FleetOps',
        view: {
            html: 'src/views/deliver-preferences/view.html',
            css: 'src/views/deliver-preferences/view.css',
            js: 'src/views/deliver-preferences/view.js',
        },
    }
];

export const defaultRedirect = '/order-confirmed';

export const notFoundRoute = {
    path: '/404',
    title: 'Not Found | FleetOps',
    view: {
        html: 'src/views/not-found/view.html',
        css: 'src/views/not-found/view.css',
        js: 'src/views/not-found/view.js',
    },
};

export function normalizePath(pathname) {
    if (!pathname || pathname === '/' || pathname === '/index.html') {
        return defaultRedirect;
    }
    return pathname.endsWith('/') && pathname.length > 1
        ? pathname.slice(0, -1)
        : pathname;
}