#!/usr/bin/env -S deno run -A

import { dev } from "./dev.js";
import { create } from "./create.js";
import { serve } from "./serve.js";
import { build } from "./build.js";
import { version } from "./version.js";

if (!import.meta.main) {
    console.error('Error: piko.js was not invoked as main module.');
    Deno.exit(1);
}

const command = Deno.args[0];

switch (command) {
    case 'dev':
        dev();
        break;
    case 'create':
        create(Deno.args[1]);
        break;
    case 'serve':
        serve();
        break;
    case 'build':
        build();
        break;
    case '-v':
    case '--version':
        printVersion();
        break;
    default:
        printUsage();
        break;
}

function printVersion() {
    console.log();
    console.log(`piko ${version}`);
    console.log();
}

function printUsage() {
    console.log();
    console.log(`piko ${version}`);
    console.log();
    console.log('Create new site:');
    console.log('$ piko create SITE_NAME');
    console.log();
    console.log('Start the dev server:');
    console.log('$ piko dev');
    console.log();
}
