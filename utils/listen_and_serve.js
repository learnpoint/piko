export async function listenAndServe(httpHandler, webSocketHandler) {
    const PORT_CANDIDATES = [3333, 4444, 5555, 6666, 7777, 8888, 9999];

    const listener = createListener(PORT_CANDIDATES);

    console.log();
    console.log(`%cServer started at http://127.0.0.1:${listener.addr.port}/`, 'color:#4f4;');
    console.log();

    for await (const connection of listener) {
        connectionHandler(connection, httpHandler, webSocketHandler);
    }
}

async function connectionHandler(connection, httpHandler, webSocketHandler) {
    const httpConnection = Deno.serveHttp(connection);
    for await (const requestEvent of httpConnection) {
        await requestEvent.respondWith(requestHandler(requestEvent.request, httpHandler, webSocketHandler));
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
    // Throw error when all candidates unsuccessfully tried.

    if (portCandidates.length < 1) {
        throw new Error('Could not find an available port.');
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
