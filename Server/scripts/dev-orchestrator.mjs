import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "./serve-app.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "../..");
const runtimeFile = path.join(projectRoot, "Server", ".runtime", "ports.json");

const args = parseArgs(process.argv.slice(2));
const shouldOpen = args.open ?? false;
const logRequests = args["log-requests"] ?? false;

const appConfigs = [
    {
        name: "driver",
        title: "Driver App",
        root: "driver-app",
        preferredPort: 3001,
    },
    {
        name: "customer",
        title: "Customer Portal",
        root: "customer-portal",
        preferredPort: 3002,
    },
    {
        name: "dashboard",
        title: "FleetOps Operations",
        root: "fleetops-operations",
        preferredPort: 3003,
    },
    {
        name: "maintenance",
        title: "Maintenance App",
        root: "maintenance-app",
        preferredPort: 3004,
    },
];

const runningServers = [];
let shuttingDown = false;

try {
    for (const app of appConfigs) {
        // eslint-disable-next-line no-await-in-loop
        const server = await startStaticServer({
            appRoot: path.resolve(projectRoot, app.root),
            preferredPort: app.preferredPort,
            title: app.title,
            shouldOpen,
            logRequests,
            logger: (line) => console.log(line),
        });

        runningServers.push({
            ...app,
            ...server,
        });
    }

    await writeRuntimeManifest(runningServers);
    printSummary(runningServers);
} catch (error) {
    console.error("[orchestrator] failed to start", error?.message ?? error);
    await shutdown("startup-failure", 1);
}

process.on("SIGINT", () => {
    void shutdown("SIGINT", 0);
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM", 0);
});

async function shutdown(reason, exitCode) {
    if (shuttingDown) {
        return;
    }

    shuttingDown = true;
    console.log(`[orchestrator] shutting down (${reason})`);

    for (const item of runningServers) {
        try {
            // eslint-disable-next-line no-await-in-loop
            await item.stop();
            console.log(`[${item.title}] stopped`);
        } catch (error) {
            console.error(
                `[${item.title}] failed to stop`,
                error?.message ?? error,
            );
        }
    }

    process.exit(exitCode);
}

async function writeRuntimeManifest(servers) {
    const payload = {
        startedAt: new Date().toISOString(),
        apps: servers.map((item) => ({
            name: item.name,
            title: item.title,
            root: item.root,
            preferredPort: item.preferredPort,
            assignedPort: item.assignedPort,
            url: item.url,
        })),
    };

    await fs.mkdir(path.dirname(runtimeFile), { recursive: true });
    await fs.writeFile(
        runtimeFile,
        `${JSON.stringify(payload, null, 2)}\n`,
        "utf-8",
    );
}

function printSummary(servers) {
    console.log("Started all frontend apps.");
    for (const item of servers) {
        console.log(`${item.title}: ${item.url}`);
    }
    console.log(`Runtime ports file: ${runtimeFile}`);
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
