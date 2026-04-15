import http from "node:http";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "../..");
const sharedApiHandlerPath = path.resolve(scriptDir, "api-handler.js");

const mimeTypes = new Map([
    [".html", "text/html; charset=utf-8"],
    [".css", "text/css; charset=utf-8"],
    [".js", "application/javascript; charset=utf-8"],
    [".mjs", "application/javascript; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".svg", "image/svg+xml"],
    [".png", "image/png"],
    [".jpg", "image/jpeg"],
    [".jpeg", "image/jpeg"],
    [".ico", "image/x-icon"],
]);

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
    const args = parseArgs(process.argv.slice(2));
    const rootName = args.root ?? "driver-app";
    const title = args.title ?? "Fleet App";
    const host = args.host ?? "127.0.0.1";
    const preferredPort = Number(args["preferred-port"] ?? args.port ?? 3001);
    const shouldOpen = args.open ?? false;
    const logRequests = args["log-requests"] ?? false;
    const spaFallbackPath =
        args["spa-fallback"] === true ? "/index.html" : args["spa-fallback"];

    try {
        await startStaticServer({
            appRoot: path.resolve(projectRoot, rootName),
            preferredPort,
            host,
            title,
            shouldOpen,
            logRequests,
            spaFallbackPath,
        });
    } catch (error) {
        console.error(`[${title}] failed to start`, error?.message ?? error);
        process.exitCode = 1;
    }
}

export async function startStaticServer({
    appRoot,
    preferredPort,
    host = "127.0.0.1",
    title,
    shouldOpen = false,
    logRequests = false,
    spaFallbackPath,
    logger = console.log,
}) {
    const resolvedRoot = path.resolve(appRoot);
    const assignedPort = await findOpenPort(preferredPort, host);

    const server = http.createServer(async (request, response) => {
        const startedAt = Date.now();
        const requestUrl = new URL(request.url ?? "/", "http://localhost");
        const normalizedPath = decodeURIComponent(requestUrl.pathname);
        const cleanPath =
            normalizedPath === "/" ? "/index.html" : normalizedPath;

        try {
            if (normalizedPath === "/shared/api-handler.js") {
                const content = await fs.readFile(sharedApiHandlerPath);
                response.writeHead(200, {
                    "Content-Type": "application/javascript; charset=utf-8",
                    "Cache-Control": "no-store",
                });
                response.end(content);
                return;
            }

            const filePath = path.resolve(
                path.join(resolvedRoot, `.${cleanPath}`),
            );

            if (!isInsideRoot(resolvedRoot, filePath)) {
                writeText(response, 403, "Forbidden");
                return;
            }

            const content = await fs.readFile(filePath);
            const ext = path.extname(filePath).toLowerCase();
            response.writeHead(200, {
                "Content-Type":
                    mimeTypes.get(ext) ?? "application/octet-stream",
                "Cache-Control": "no-store",
            });
            response.end(content);
        } catch (error) {
            if (error?.code === "ENOENT") {
                const shouldUseFallback =
                    Boolean(spaFallbackPath) || !path.extname(cleanPath);

                if (shouldUseFallback) {
                    try {
                        const resolvedFallbackPath =
                            spaFallbackPath ?? "/index.html";
                        const fallbackPath = path.resolve(
                            path.join(resolvedRoot, `.${resolvedFallbackPath}`),
                        );

                        if (!isInsideRoot(resolvedRoot, fallbackPath)) {
                            writeText(response, 403, "Forbidden");
                            return;
                        }

                        const fallbackContent = await fs.readFile(fallbackPath);
                        response.writeHead(200, {
                            "Content-Type": "text/html; charset=utf-8",
                            "Cache-Control": "no-store",
                        });
                        response.end(fallbackContent);
                        return;
                    } catch {
                        writeText(response, 404, "Not found");
                        return;
                    }
                }

                writeText(response, 404, "Not found");
            } else {
                writeText(response, 500, "Server error");
            }
        } finally {
            if (logRequests) {
                const method = request.method ?? "GET";
                const url = request.url ?? "/";
                const durationMs = Date.now() - startedAt;
                logger(
                    `[${title}] ${method} ${url} ${response.statusCode} ${durationMs}ms`,
                );
            }
        }
    });

    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(assignedPort, host, () => {
            server.off("error", reject);
            resolve();
        });
    });

    const url = `http://${host}:${assignedPort}`;
    logger(
        `[${title}] running at ${url}${assignedPort !== preferredPort ? ` (preferred ${preferredPort} busy)` : ""}`,
    );

    if (shouldOpen) {
        openBrowser(url);
    }

    return {
        server,
        title,
        host,
        assignedPort,
        preferredPort,
        url,
        stop: () => closeServer(server),
    };
}

function writeText(response, statusCode, text) {
    response.writeHead(statusCode, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
    });
    response.end(text);
}

function isInsideRoot(rootPath, targetPath) {
    const relative = path.relative(rootPath, targetPath);
    return (
        relative === "" ||
        (!relative.startsWith("..") && !path.isAbsolute(relative))
    );
}

export async function findOpenPort(preferredPort, host = "127.0.0.1") {
    let candidatePort = preferredPort;

    while (candidatePort <= 65535) {
        // eslint-disable-next-line no-await-in-loop
        const isFree = await canListenOnPort(candidatePort, host);
        if (isFree) {
            return candidatePort;
        }
        candidatePort += 1;
    }

    throw new Error(`No available port found starting from ${preferredPort}`);
}

function canListenOnPort(port, host) {
    return new Promise((resolve) => {
        const tester = net.createServer();

        tester.once("error", () => {
            resolve(false);
        });

        tester.once("listening", () => {
            tester.close(() => resolve(true));
        });

        tester.listen(port, host);
    });
}

function closeServer(server) {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

function parseArgs(argv) {
    const parsed = {};

    for (let index = 0; index < argv.length; index += 1) {
        const current = argv[index];
        const next = argv[index + 1];

        if (current === "--open") {
            parsed.open = true;
            continue;
        }

        if (current === "--log-requests") {
            parsed["log-requests"] = true;
            continue;
        }

        if (current.startsWith("--")) {
            const key = current.slice(2);
            if (next && !next.startsWith("--")) {
                parsed[key] = next;
                index += 1;
            } else {
                parsed[key] = true;
            }
        }
    }

    return parsed;
}

function openBrowser(url) {
    if (process.platform === "win32") {
        spawn("cmd", ["/c", "start", "", url], {
            stdio: "ignore",
            detached: true,
        }).unref();
        return;
    }

    if (process.platform === "darwin") {
        spawn("open", [url], { stdio: "ignore", detached: true }).unref();
        return;
    }

    spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
}
