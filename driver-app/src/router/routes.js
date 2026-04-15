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
