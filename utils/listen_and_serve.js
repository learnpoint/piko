export async function listenAndServe(httpHandler, webSocketHandler, options = { port: null, muteLog: false }) {

    const PORT_CANDIDATES = options.port ? [options.port] : [3333, 4444, 5555, 6666, 7777, 8888, 9999];
    const listener = createListener(PORT_CANDIDATES);

    if (!options.muteLog) {
        console.log(`%c\nServer started at http://localhost:${listener.addr.port}/\n`, 'color:#4f4;');
    }

    for await (const connection of listener) {
        connectionHandler(connection, httpHandler, webSocketHandler);
    }
}

async function connectionHandler(connection, httpHandler, webSocketHandler) {
    const httpConnection = Deno.serveHttp(connection);
    try {
        for await (const requestEvent of httpConnection) {
            try {
                await requestEvent.respondWith(requestHandler(requestEvent.request, httpHandler, webSocketHandler));
            } catch {
                // Typically: Connection Closed by Client
            }
        }
    } catch {
        // Typically: Connection Closed by Client
    }
}

function requestHandler(request, httpHandler, webSocketHandler) {
    if (request.headers.get("upgrade") === "websocket") {
        return webSocketHandler(request);
    } else {
        return httpHandler(request);
    }
}

function createListener(portCandidates) {

    // Recursively try listen on port candidates.
    // Return listener if successful.
    // Exit if all candidates unsuccessfully tried.

    if (portCandidates.length < 1) {
        console.log('%c\nError. Port not available.\n', 'font-weight:bold;color:#f44;')
        Deno.exit(1);
    }

    const port = portCandidates.shift();

    try {
        return Deno.listen({ port });
    } catch (err) {
        if (err instanceof Deno.errors.AddrInUse) {
            return createListener(portCandidates);
        }
    }
}
