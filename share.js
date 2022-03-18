import { listenAndServe } from "./utils/listen_and_serve.js";

const PROXY_HOSTNAME = 'localhost';
const PROXY_PORT = 9999;

const ORIGIN_HOSTNAME = 'localhost';
let ORIGIN_PORT;

export async function share(args) {
    ORIGIN_PORT = parseArgs(args);

    listenAndServe(httpHandler, webSocketHandler, { port: PROXY_PORT, muteLog: true });
    console.log(`%c\nCloudflare Tunnel requests will be forwarded to => http://${ORIGIN_HOSTNAME}:${ORIGIN_PORT}/\n`, 'font-weight:bold;color:#ff4;');

    startCloudflareTunnel(`${PROXY_HOSTNAME}:${PROXY_PORT}`);
}



/* =====================================================================
    HTTP Handler
    ===================================================================== */

async function httpHandler(req) {
    const proxyUrl = createProxyUrl(req.url);
    const proxyHeaders = createProxyHeaders(req.headers);

    return await fetch(proxyUrl.href, {
        headers: proxyHeaders,
        method: req.method,
        body: req.body,
        redirect: 'manual'
    });
}



/* =====================================================================
    WebSocket Handler
    ===================================================================== */

async function webSocketHandler(req) {

    // STATUS: WebSockets are explicitly forbidden.
    //
    // WebSockets are symmetrical. The origin server can act as a
    // "client" and send messages to the browser. It's a challenge
    // to implement a symmetrical protocol in a proxy server.
    //
    // Article about sockets and proxies:
    // https://www.infoq.com/articles/Web-Sockets-Proxy-Servers/
    //
    // Interesting libraries that bypass proxies through the TCP layer:
    // https://github.com/TooTallNate/node-https-proxy-agent
    // https://github.com/stbrenner/socket.io-proxy
    //
    // For now, we don't forward upgrade requests. Instead we
    // immediately respond with 200 OK, which means that the
    // upgrade is refused.
    //
    // NOTE: Cloudflare Tunnel seems to properly forwards upgrade requests.

    return new Response(null);
}



/* =====================================================================
    Start Cloudflare Tunnel
    ===================================================================== */

async function startCloudflareTunnel(url) {
    try {
        const process = Deno.run({
            cmd: ["cloudflared", "tunnel", "-url", url],
        });

        await process.status();
        process.close();

    } catch (error) {

        if (error instanceof Deno.errors.NotFound) {
            console.log('%cError: Cloudflare Tunnel not found.', 'font-weight:bold;color:#f44');
            console.log('  Verify that the cloudflared deamon is properly installed on your system.');
            console.log('  Open a terminal and run the command:');
            console.log('  cloudflared -v');
        } else {
            console.log(error);
        }
        Deno.exit(1);
    }
}



/* =====================================================================
    Proxy Helpers
    ===================================================================== */

function createProxyHeaders(headers) {
    const proxyHeaders = new Headers();

    for (const header of headers.entries()) {
        if (header[0] === 'host') {
            header[1] = `${ORIGIN_HOSTNAME}:${ORIGIN_PORT}`;
        } else {
            proxyHeaders.set(header[0], header[1]);
        }
    }

    return proxyHeaders;
}

function createProxyUrl(url) {
    const proxyUrl = new URL(url);
    proxyUrl.protocol = "http:";
    proxyUrl.hostname = ORIGIN_HOSTNAME;
    proxyUrl.port = ORIGIN_PORT;

    return proxyUrl;
}



/* =====================================================================
    Parse Args
    ===================================================================== */

function parseArgs(args) {
    const configName = args[0];

    if (!configName) {
        console.log('%c\nError: Required argument [name] is missing.\n', 'font-weight:bold;color:#f44;');
        console.log('Pass [name] as the second argument, for example:')
        console.log('$ piko share learnpoint');
        Deno.exit(1);
    }

    if (configName === 'clear') {
        localStorage.clear();
        console.log('\nOK Deleted all saved names.\n');
        Deno.exit(1);
    }

    if (configName === 'list') {
        console.log();
        printSavedNames();
        console.log();
        Deno.exit(1);
    }

    if (configName === 'help') {
        printHelp();
        Deno.exit(1);
    }

    const portArg = args[1];

    if (!portArg) {
        const savedPort = localStorage.getItem(configName);

        if (!savedPort) {
            console.log(`%c\nError: The name "${configName}" was not found.\n`, 'font-weight:bold;color:#f44;');
            printSavedNames();
            console.log(`\nTo add the name "${configName}", provide a third argument that specify the port. For example:`);
            console.log(`$ piko share ${configName} 56327`);
            Deno.exit(1);
        }

        return savedPort;
    }

    const portNumber = parseInt(portArg);

    if (!Number.isInteger(portNumber)) {
        console.log(`%c\nError: Argument [port] must be an integer.\n`, 'font-weight:bold;color:#f44;');
        console.log(`The third argument must be an integer, for example:`);
        console.log(`$ piko share ${configName} 56327`);
        Deno.exit(1);
    }

    localStorage.setItem(configName, portArg);

    return portArg;
}



/* =====================================================================
    Terminal Print Helpers
    ===================================================================== */

function printSavedNames() {
    console.log('Saved names');
    console.log('-----------')
    for (let x in localStorage) {
        console.log(x, localStorage.getItem(x));
    }
}

function printHelp() {
    console.log('\n[piko share help text]\n');
}
