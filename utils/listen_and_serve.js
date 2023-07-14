export async function listenAndServe(httpHandler, webSocketHandler, options = { port: null, muteLog: false }) {

    if (options.port && isNaN(options.port)) {
        console.log(`%c\nError. Invalid port: ${options.port}\n`, 'font-weight:bold;color:#f44;');
        Deno.exit(1);
    }

    const PORT_CANDIDATES = options.port ? [Number(options.port)] : [3333, 4444, 5555, 6666, 7777, 8888, 9999];

    recursiveTryListenAndServe(httpHandler, webSocketHandler, PORT_CANDIDATES, options.muteLog);
}

function recursiveTryListenAndServe(httpHandler, webSocketHandler, portCandidates, muteLog) {

    if (portCandidates.length < 1) {
        console.log('%c\nError. Port not available.\n', 'font-weight:bold;color:#f44;')
        Deno.exit(1);
    }

    const port = portCandidates.shift();

    try {
        Deno.serve({
            port,
            handler: req => requestHandler(req, httpHandler, webSocketHandler),
            onListen: () => muteLog ? {} : console.log(`%c\nServer started at http://localhost:${port}/\n`, 'color:#4f4;')
        });

    } catch (error) {

        if (error instanceof Deno.errors.AddrInUse) {
            return recursiveTryListenAndServe(httpHandler, webSocketHandler, portCandidates, muteLog);
        } else {
            console.log(error);
            Deno.exit(1);
        }
    }
}

function requestHandler(request, httpHandler, webSocketHandler) {
    if (request.headers.get("upgrade") === "websocket") {
        return webSocketHandler(request);
    } else {
        return httpHandler(request);
    }
}
