import { path } from "./deps.js";
import { build } from "./build.js";
import { serve } from "./serve.js";

export async function dev(options, port = null) {
    const defaults = {
        buildWatch: true,
        getWatchBuildCallbackFromInitialBuildCallback: true,
        initialBuildCallback: () => serve(path.join(Deno.cwd(), 'docs'), true, port)
    };

    options = { ...defaults, ...options };

    build(options);
}
