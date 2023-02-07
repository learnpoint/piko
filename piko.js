#!/usr/bin/env -S deno run -A

import { dev } from "./dev.js";
import { create } from "./create.js";
import { copy } from "./copy.js";
import { serve } from "./serve.js";
import { build } from "./build.js";
import { share } from "./share.js";
import { upgrade } from "./upgrade.js";
import { version, denoVersion } from "./version.js";

if (!import.meta.main) {
    console.error('Error: piko.js was not invoked as main module.');
    Deno.exit(1);
}

const command = Deno.args[0];

switch (command) {
    case 'dev':
        dev({}, Deno.args[1]);
        break;
    case 'create':
        create(Deno.args[1]);
        break;
    case 'copy':
        copy(Deno.args[1], Deno.args[2]);
        break;
    case 'serve':
        serve(null, false, Deno.args[1]);
        break;
    case 'build':
        const options = {};
        if (Deno.args[1] && Deno.args[1] === '-f') {
            options.forceRebuild = true;
        }
        build(options);
        break;
    case 'share':
        share(Deno.args.slice(1));
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
    console.log('A toolkit for Learnpoint developers.');
    console.log();

    console.log(`Docs: https://github.com/learnpoint/piko`);
    console.log();

    console.log('Copy github repo to your computer:');
    console.log('  piko copy <OWNER>/<REPO> [FOLDER_NAME]');
    console.log();

    console.log('Start static web server:')
    console.log('  piko serve');
    console.log();

    console.log('Build site:');
    console.log('  piko build');
    console.log();

    console.log('Start dev server:');
    console.log('  piko dev');
    console.log();

    console.log('Share localhost over a Cloudflare Tunnel:');
    console.log('  piko share <NAME> [PORT]');
    console.log();

    console.log('Create new site:');
    console.log('  piko create <FOLDER_NAME>');
    console.log();

    console.log('Show installed version of Piko:');
    console.log('  piko version');
    console.log();

    console.log('Upgrade:');
    console.log('  piko upgrade');
    console.log();

    console.log('Show available commands:');
    console.log('  piko help');
    console.log();
}
