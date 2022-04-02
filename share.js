import { listenAndServe } from "./utils/listen_and_serve.js";

const STORAGE_KEY = 'share';

const PROXY_HOSTNAME = 'localhost';
const PROXY_PORT = 9999;

const ORIGIN_HOSTNAME = 'localhost';
let ORIGIN_PORT;

export async function share(args) {
    ORIGIN_PORT = getPortOrRunSubCommand(args);

    listenAndServe(httpHandler, webSocketHandler, { port: PROXY_PORT, muteLog: true });
    console.log(`%c\nCloudflare Tunnel requests will be forwarded to => http://${ORIGIN_HOSTNAME}:${ORIGIN_PORT}/\n`, 'font-weight:bold;color:#ff4;');

    startCloudflareTunnel(`${PROXY_HOSTNAME}:${PROXY_PORT}`);
}



/*  =====================================================================
    Handlers
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

async function webSocketHandler(req) {

    // STATUS: Not Implemented. The proxy will explicitly refuse upgrade requests.
    // GOAL: Support WebSockets.
    // NOTE: Cloudflare Tunnel seems to properly forwards upgrade requests.
    //
    // Article about sockets and proxies:
    // https://www.infoq.com/articles/Web-Sockets-Proxy-Servers/
    //
    // Libraries that bypass proxies through the TCP layer:
    // https://github.com/TooTallNate/node-https-proxy-agent
    // https://github.com/stbrenner/socket.io-proxy

    return new Response(null); // 200 OK means upgrade is refused.
}



/*  =====================================================================
    Start Cloudflare Tunnel
    ===================================================================== */

async function startCloudflareTunnel(url) {
    try {
        const process = Deno.run({
            cmd: ["cloudflared", "tunnel", "-url", url]
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



/*  =====================================================================
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



/*  =====================================================================
    Get Port or Run Sub Command
    ===================================================================== */

function getPortOrRunSubCommand(args) {
    const configName = args[0];

    if (!configName) {
        console.log('%c\nError: Required argument [name] is missing.\n', 'font-weight:bold;color:#f44;');
        console.log('Pass [name] as the second argument, for example:')
        console.log('$ piko share learnpoint');
        Deno.exit(1);
    }

    // (A) Run Sub Command: clear | list | help

    if (configName === 'clear') {
        clearPorts();
        console.log('\nOK: Deleted all saved ports.');
        Deno.exit(1);
    }

    if (configName === 'list') {
        printSavedPorts();
        Deno.exit(1);
    }

    if (configName === 'help') {
        printHelp();
        Deno.exit(1);
    }

    // (B) Get Port (if sub command not detected)

    const portArg = args[1];

    if (!portArg) {
        const savedPort = getPort(configName);

        if (!savedPort) {
            console.log(`%c\nError: The name "${configName}" was not found.`, 'font-weight:bold;color:#f44;');
            console.log(`\nAdd port to "${configName}" like so:`);
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

    setPort(configName, portArg);

    return portArg;
}



/*  =====================================================================
    Terminal Print Helpers
    ===================================================================== */

function printSavedPorts() {

    const ports = getPorts();

    if (Object.keys(ports).length === 0) {

        console.log('\nNo saved ports.');

    } else {

        console.log('\nSaved ports:');
        console.log('------------');

        for (let key in ports) {
            console.log(key, ports[key]);
        }
    }
}

function printHelp() {
    console.log('\nShare port 56444 and save it with the name "learnpoint":');
    console.log('$ piko share learnpoint 56444');

    console.log('\nShare port 56444 using previously saved name "learnpoint":');
    console.log('$ piko share learnpoint');

    console.log('\nList all saved ports:');
    console.log('$ piko share list');

    console.log('\nDelete all saved ports:');
    console.log('$ piko share clear');
}



/*  =====================================================================
    Storage Helpers
    ===================================================================== */

function getPort(name) {
    const storageObject = getStorageObject();
    return storageObject[name];
}

function setPort(name, port) {
    const storageObject = getStorageObject();
    storageObject[name] = port;
    setStorageObject(storageObject);
}

function getPorts() {
    return getStorageObject();
}

function clearPorts() {
    localStorage.removeItem(STORAGE_KEY);
}

function getStorageObject() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
}

function setStorageObject(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}
