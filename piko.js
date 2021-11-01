#!/usr/bin/env -S deno run -A

import { dev } from "./dev.js";
import { create } from "./create.js";
import { copy } from "./copy.js";
import { serve } from "./serve.js";
import { build } from "./build.js";
import { upgrade } from "./upgrade.js";
import { version, denoVersion } from "./version.js";

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
    case 'copy':
        copy(Deno.args[1], Deno.args[2]);
        break;
    case 'serve':
        serve();
        break;
    case 'build':
        build();
        break;
    case 'upgrade':
        upgrade();
        break;
    case '-v':
    case '--version':
    case 'version':
        printVersion();
        break;
    default:
        printUsage();
        break;
}

function printVersion() {
    console.log(`piko ${version}`);
    console.log(`deno ${Deno.version.deno} (installed)`);
    console.log(`deno ${denoVersion} (recommended)`);
    console.log();
}

function printUsage() {
    console.log(`piko ${version}`);
    console.log('A minimal toolkit for html writing.');
    console.log();
    console.log(`Docs: https://github.com/learnpoint/piko`);
    console.log();
    console.log('Create new site:');
    console.log('  piko create [name]');
    console.log();
    console.log('Start dev server:');
    console.log('  piko dev');
    console.log();
    console.log('Start static web server:')
    console.log('  piko serve');
    console.log();
    console.log('Copy github repo:');
    console.log('  piko copy [owner/repo] [name]');
    console.log();
    console.log('Build site:');
    console.log('  piko build');
    console.log();
    console.log('Upgrade:');
    console.log('  piko upgrade');
    console.log();
    console.log('Print installed version of Piko:');
    console.log('  piko version');
    console.log();
}
