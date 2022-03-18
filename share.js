import { serve } from "https://deno.land/std@0.129.0/http/server.ts";

const PROXY_HOSTNAME = 'localhost';
const PROXY_PORT = 9999;

const ORIGIN_HOSTNAME = 'localhost';
let ORIGIN_PORT;

export async function share(args) {
    ORIGIN_PORT = parseArgs(args);
    startProxyServer(handler, PROXY_PORT);
    startCloudflareTunnel(`${PROXY_HOSTNAME}:${PROXY_PORT}`);
}

async function startProxyServer(handler, port) {
    serve(handler, { port });
    console.log(`%c\nCloudflare Tunnel request will be forwarded to => http://${ORIGIN_HOSTNAME}:${ORIGIN_PORT}/\n`, 'color:#ff4;')
}

async function startCloudflareTunnel(url) {
    try {
        const p = Deno.run({
            cmd: ["cloudflared", "tunnel", "-url", url],
        });
        await p.status();
        p.close();
    } catch (ex) {
        if (ex instanceof Deno.errors.NotFound) {
            console.log('%cError: Cloudflare Tunnel not found.', 'font-weight:bold;color:#f44');
            console.log('=> Verify that the cloudflared deamon is properly installed on your system.');
        } else {
            console.log(ex)
        }
        Deno.exit(1);
    }
}

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

function printSavedNames() {
    console.log('Saved names');
    console.log('-----------')
    for (let x in localStorage) {
        console.log(x, localStorage.getItem(x));
    }
}

function printHelp() {
    console.log('\n[piko share help]\n');
}

async function handler(req) {
    const proxyUrl = createProxyUrl(req.url);
    const proxyHeaders = createProxyHeaders(req.headers);

    return await fetch(proxyUrl.href, {
        headers: proxyHeaders,
        method: req.method,
        body: req.body,
        redirect: 'manual'
    });
}

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
