import { exists } from "./utils/exists.js";
import { listenAndServe } from "./utils/listen_and_serve.js";
import { Status, STATUS_TEXT } from "./utils/http_status.js";
import { contentType } from "./utils/content_type.js";
import { path } from "./deps.js";

const RELOAD_DEBOUNCE = 80;

const server = {
    root: null,
    sockets: [],
    startTime: 0
};

let etagFastPaths = [];
const etagFastPathKey = (url, etag) => url + ':' + etag;

export async function serve(servePath) {
    server.startTime = Date.now();
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
    // Use etag fast path?
    if (req.headers.get('if-none-match')) {
        if (etagFastPaths.includes(etagFastPathKey(req.url, req.headers.get('if-none-match')))) {
            return respond(req, Status.NotModified);
        }
    }

    const filePath = getFilePath(req);
    let stat;

    // Exists?
    try {
        stat = await Deno.stat(filePath);
    } catch {
        return notFound(req);
    }

    // Directory?
    if (stat.isDirectory) {
        return redirect(req, pathname(req) + "/" + searchString(req));
    }

    // Valid file extension?
    if (!contentType(filePath)) {
        return respond(req, Status.BadRequest, `Not Supported File Extension ${path.extname(filePath)}`);
    }

    // Set Etag
    const etag = 'W/' + stat.mtime.getTime().toString() + server.startTime.toString(); // Flush cache on server (re)boot using server.startTime
    const headers = new Headers();
    headers.set('etag', etag);

    // Use cache?
    if (req.headers.get('if-none-match') && req.headers.get('if-none-match') === etag) {
        etagFastPaths.push(etagFastPathKey(req.url, etag));
        return respond(req, Status.NotModified);
    }

    try {
        // html?
        if (path.extname(filePath) === '.html') {
            const fileContent = await Deno.readTextFile(filePath);
            const body = fileContent.replace("</body>", `${browserReloadScript}</body>`);
            headers.set("content-type", contentType(filePath));
            etagFastPaths.push(etagFastPathKey(req.url, etag));
            return respond(req, Status.OK, body, headers);
        } else {
            const file = await Deno.readFile(filePath);
            headers.set("content-type", contentType(filePath));
            etagFastPaths.push(etagFastPathKey(req.url, etag));
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

            etagFastPaths = [];

            if (server.sockets.length) {
                console.log('\nReloading browser...\n');

                let socket = null;

                while (socket = server.sockets.pop()) {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.close(1000);
                    }
                }
            }
        }, RELOAD_DEBOUNCE);
    }
}

async function redirect(req, location) {
    const headers = new Headers();
    headers.set("content-type", 'text/html');
    headers.set("location", location);

    return respond(req, 302, null, headers);
}

async function notFound(req) {
    const headers = new Headers();
    headers.set("content-type", 'text/html');

    let content;

    try {
        content = await Deno.readTextFile(path.join(server.root, '404.html'));
        content = content.replace("</body>", `${browserReloadScript}</body>`);
    } catch {
        content = 'Not Found';
    }

    return respond(req, 404, content, headers);
}

async function respond(req, status, body, headers) {
    try {
        body = body || STATUS_TEXT.get(status);

        // body must be null on 304, otherwise exception thrown
        if (status === Status.NotModified) {
            body = null;
        }

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
    } catch (err) {
        console.log(err)
    }
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

function searchString(req) {
    return new URL(req.url).search;
}

const browserReloadScript = `
<script>
    window.addEventListener('load', function () {
        
        let socketIsProvenFunctional = false;
        let reloading = false;

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(protocol + '//' + location.host + '/ws');

        ws.onopen = function (event) {
            socketIsProvenFunctional = true;
            console.log('piko reload socket connection established');
        }

        // The server will close the connection on file changes.
        // Reload on close, but only if connection has been proven to work.
        ws.onclose = function(event) {
            if (socketIsProvenFunctional) {
                reload();
            }
        }

        ws.onerror = function (event) {
            console.log('piko reload socket error');
        };

        setInterval(function () {
            if (ws.readyState === 1) {
                ws.send('ping'); // Keep connection alive.
            }
        }, 50000);

        async function reload() {
            if (reloading) {
                return;
            }

            if (!socketIsProvenFunctional) {
                return;
            }

            reloading = true;

            try {
                let res = await fetch(location.href);

                if (res.ok || res.status === 404) {
                    console.log('piko reloading page...');
                    location.reload();
                } else {
                    console.log('piko server not responding, will not reload.');
                    reloading = false;
                }
            } catch {
                console.log('piko server not responding, will not reload.');
                reloading = false;
            }
        }

        // The socket close event might be prevented from firing when page is hidden or inactive.
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

    });
</script>

`;
