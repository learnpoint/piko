import { exists } from "./utils/exists.js";
import { listenAndServe } from "./utils/listen_and_serve.js";
import { Status, STATUS_TEXT } from "./utils/http_status.js";
import { contentType } from "./utils/content_type.js";
import { path } from "./deps.js";
import { ByteSliceStream } from "./deps.js";

const RELOAD_DEBOUNCE = 80;

const server = {
    root: null,
    sockets: [],
    startTime: 0
};

let etagFastPaths = [];
const etagFastPathKey = (url, etag) => url + ':' + etag;

export async function serve(servePath, disableAutoReload = false, port = null) {
    server.startTime = Date.now();
    server.root = servePath || Deno.cwd();

    if (!await exists(server.root)) {
        console.log();
        console.log(`%cFolder ${server.root} does not exist.`, 'font-weight:bold;color:#f44;');
        console.log('Create the folder and try again.');
        console.log();
        Deno.exit(1);
    }

    listenAndServe(httpHandler, webSocketHandler, { port });

    if (!disableAutoReload) {
        watchAndReload();
    }

    return reload;
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

    // Set content type
    headers.set("content-type", contentType(filePath));

    // Respond with file
    try {

        // HTML => buffer & insert reload script tag
        if (path.extname(filePath) === '.html') {
            const fileContent = await Deno.readTextFile(filePath);
            const body = fileContent.replace("</body>", `${browserReloadScript}</body>`);
            etagFastPaths.push(etagFastPathKey(req.url, etag));
            return respond(req, Status.OK, body, headers);
        }

        // Allow range requests (not for html resources, bc those need reload script tag)
        headers.set("accept-ranges", "bytes");

        // Set content length
        headers.set("content-length", `${stat.size}`);

        // Extract range
        const requestRange = getRequestRange(req, stat.size);

        // NON RANGE REQUEST => stream response
        if (!requestRange) {
            const file = await Deno.open(filePath);
            etagFastPaths.push(etagFastPathKey(req.url, etag));
            return respond(req, Status.OK, file.readable, headers);
        }

        // INVALID RANGE => 416
        if (requestRange.end < 0 || requestRange.end < requestRange.start || stat.size <= requestRange.start) {
            headers.set("content-range", `bytes */${stat.size}`);
            return respond(req, Status.RequestedRangeNotSatisfiable, undefined, headers);
        }

        // Clamp range
        const start = Math.max(0, requestRange.start);
        const end = Math.min(requestRange.end, stat.size - 1);

        // Set range header
        headers.set("content-range", `bytes ${start}-${end}/${stat.size}`);

        // Update content length based on current range
        const contentLength = end - start + 1;
        headers.set("content-length", `${contentLength}`);

        // Extract range (slice) stream
        const file = await Deno.open(filePath);
        await file.seek(start, Deno.SeekMode.Start);
        const rangeStream = file.readable.pipeThrough(new ByteSliceStream(0, contentLength - 1));

        // VALID RANGE => 206
        return respond(req, Status.PartialContent, rangeStream, headers);

    } catch (error) {

        if (error instanceof Deno.errors.NotFound) {
            return notFound(req);
        } else {
            return serverError(req, error);
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
        timeout = setTimeout(reload, RELOAD_DEBOUNCE);
    }
}

function reload() {
    etagFastPaths = [];

    if (server.sockets.length) {
        console.log('\nReloading browser...\n');

        let socket = null;

        while (socket = server.sockets.pop()) {
            if (socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
        }
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

async function serverError(req, error) {
    const headers = new Headers();
    headers.set("content-type", 'text/html');
    return respond(req, Status.InternalServerError, error, headers)
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

function getRequestRange(req, fileSize) {
    const rangeValue = req.headers.get('range');

    if (!rangeValue) {
        return null;
    }

    if (fileSize < 1) {
        return null;
    }

    const rangeRegex = /bytes=(?<start>\d+)?-(?<end>\d+)?$/u;
    const parsed = rangeValue.match(rangeRegex);

    if (!parsed || !parsed.groups) {
        return null;
    }

    const { start, end } = parsed.groups;
    if (start !== undefined) {
        if (end !== undefined) {
            return { start: +start, end: +end };
        } else {
            return { start: +start, end: fileSize - 1 };
        }
    } else {
        if (end !== undefined) {
            return { start: fileSize - +end, end: fileSize - 1 };
        } else {
            return null;
        }
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
    return decodeURI(new URL(req.url).pathname);
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
            if(!socketIsProvenFunctional) {
                return;
            }

            reload();
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
