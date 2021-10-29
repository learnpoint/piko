import { exists } from "./utils/exists.js";
import { listenAndServe } from "./utils/listen_and_serve.js";
import { Status, STATUS_TEXT } from "./utils/http_status.js";
import { path } from "./deps.js";

const RELOAD_DEBOUNCE_WAIT = 50;

const server = {
    root: null,
    sockets: []
};

export async function serve(servePath) {
    server.root = servePath || Deno.cwd();

    if (!await exists(server.root)) {
        console.log();
        console.log(`%cFolder ${server.root} does not exist.`, 'font-weight:bold;color:#f44;');
        console.log('Create the folder and try again.');
        console.log();
        Deno.exit(1);
    }

    listenAndServe(httpHandler, webSocketHandler);
    watchAndReload();
}

async function webSocketHandler(req) {
    const { socket, response } = Deno.upgradeWebSocket(req);
    server.sockets.push(socket);
    return response;
}

async function httpHandler(req) {
    const filePath = getFilePath(req);

    if (!path.extname(filePath)) {
        try {
            const pathInfo = await Deno.stat(filePath);
            if (pathInfo.isDirectory) {
                return redirect(req, pathname(req) + "/");
            }
        } catch { }

        return notFound(req);
    }

    if (!mimeType.hasOwnProperty(path.extname(filePath))) {
        return respond(req, Status.BadRequest, `Not Supported File Extension ${path.extname(filePath)}`);
    }

    try {
        if (mimeType[path.extname(filePath)].includes('text/html')) {
            const fileContent = await Deno.readTextFile(filePath);

            const body = fileContent.replace("</body>", `${browserReloadScript}</body>`);

            const headers = new Headers();
            headers.set("content-type", mimeType[path.extname(filePath)]);

            return respond(req, Status.OK, body, headers);
        } else {

            const file = await Deno.readFile(filePath);

            const headers = new Headers();
            headers.set("content-type", mimeType[path.extname(filePath)]);

            return respond(req, Status.OK, file, headers);
        }
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            return notFound(req);
        } else {
            console.error(error);
            return respond(req, Status.InternalServerError, error.message);
        }
    }
}

async function watchAndReload() {

    // This is a simple solution for browser reload on file changes.
    //
    // A script is injected into every html page. The script
    // creates a socket connection to the server and reloads
    // the page when the connection is closed by the server.
    //
    // Here we listen for file system events and close all
    // established connections on any fs event, effectively
    // reloading the browser(s) on file changes.

    const watcher = Deno.watchFs(server.root);
    let timeout = null;

    for await (const event of watcher) {

        // Some OS's trigger several fs events on a single
        // file change, and sometimes many files are
        // changed at once. Therefore, reload is debounced
        // until the fs event storm has passed.

        clearTimeout(timeout);

        timeout = setTimeout(async () => {
            console.log();
            console.log('Reloading browser...');
            console.log();

            let socket = null;

            while (socket = server.sockets.pop()) {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.close(1000);
                }

            }
        }, RELOAD_DEBOUNCE_WAIT);
    }
}

async function redirect(req, location) {
    const headers = new Headers();
    headers.set("content-type", mimeType['.html']);
    headers.set("location", location);

    return respond(req, 302, null, headers);
}

async function notFound(req) {
    const headers = new Headers();
    headers.set("content-type", mimeType['.html']);

    let content;

    try {
        content = await Deno.readTextFile(path.join(serverRoot, '404.html'));
        content = content.replace("</body>", `${browserReloadScript}</body>`);
    } catch {
        content = 'Not Found';
    }

    return respond(req, 404, content, headers);
}

async function respond(req, status, body, headers) {
    body = body || STATUS_TEXT.get(status);

    headers = headers || new Headers();
    headers.set("access-control-allow-origin", "*");
    headers.set("server", "piko");

    if (status === 302) {
        console.log(status.toString(), pathname(req), "=> Redirected to", headers.get('location'));
    } else if (status >= 100 && status < 400) {
        console.log(status.toString(), pathname(req), "=>", path.relative(Deno.cwd(), getFilePath(req)));
    } else {
        console.log(`%c${status.toString()} ${pathname(req)} => ${STATUS_TEXT.get(status)}`, 'color:#ff4;');
    }

    return new Response(body, { status, headers });
}

function getFilePath(req) {
    const urlPathname = pathname(req);

    if (urlPathname.endsWith('/')) {
        return path.join(server.root, urlPathname, 'index.html');
    }

    return path.join(server.root, urlPathname);
}

function pathname(req) {
    return new URL(req.url).pathname;
}

const mimeType = {
    '.ico': 'image/x-icon',
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif'
};

const browserReloadScript = `
<script>
    window.addEventListener('load', function () {

        let reloading = false;
        let ws = new WebSocket('ws://' + location.host + '/ws');

        // Ping to keep connection alive.
        setInterval(function () {
            if (ws.readyState === 1) {
                ws.send('ping');
            }
        }, 50000);

        // The server will close the connection on file changes.
        // Reload the page when that happens.
        ws.onclose = reload;

        async function reload() {
            if (reloading) {
                return;
            }

            reloading = true;

            try {
                let res = await fetch(location.href);

                if (res.ok || res.status === 404) {
                    console.log('Piko reloading page...');
                    location.reload();
                } else {
                    console.log('Piko server not responding, will not reload.');
                    reloading = false;
                }
            } catch {
                console.log('Piko server not responding, will not reload.');
                reloading = false;
            }
        }

        // The socket close event might not trigger when the page is hidden or inactive.
        // Therefore, check the connection on pages transitions and reload if connection was lost.
        // Wait to avoid reload before initial connection is established.
        setTimeout(function () {
            document.addEventListener('visibilitychange', reloadIfConnectionLost);
            window.addEventListener('focus', reloadIfConnectionLost);

            function reloadIfConnectionLost() {
                if (ws.readyState !== 1 && document.visibilityState === 'visible') {
                    reload();
                }
            }
        }, 3000); 

        ws.onopen = function (event) {
            console.log('Piko reload socket connection established.');
        }

        ws.onerror = function (event) {
            console.log(event);
        };
    });
</script>

`;
