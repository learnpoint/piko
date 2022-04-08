import { path } from "./deps.js";
import { build } from "./build.js";
import { serve } from "./serve.js";

export async function dev(options) {
    const defaults = {
        buildWatch: true,
        getWatchBuildCallbackFromInitialBuildCallback: true,
        initialBuildCallback: () => serve(path.join(Deno.cwd(), 'docs'), true)
    };

    options = { ...defaults, ...options };

    build(options);
}
