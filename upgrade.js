import { version as currentVersion } from "./version.js";
import { red, bold } from "./deps.js";

const TAGS_URL = "https://api.github.com/repos/learnpoint/piko/tags";
const pikoUrl = version => `https://cdn.jsdelivr.net/gh/learnpoint/piko@${version}/piko.js`

export async function upgrade() {
    console.log();
    console.log('Looking up latest version...');

    const latestVersion = await getLatestVersion();

    if (isUpgradePossible(currentVersion, latestVersion)) {
        console.log('Found new version:', `v${latestVersion}`);
        console.log('Installing...');
        await upgradeTo(latestVersion);
    } else {
        console.log('Latest version already installed.');
        console.log('Piko', `v${currentVersion}`);
        console.log();
    }
}

async function getLatestVersion() {
    try {
        const tags = await fetch(TAGS_URL).then(res => res.json());
        const versions = tags.map(tag => tag.name.replace('v', ''));
        const sortedVersions = versions.sort(compareVersions);
        return sortedVersions.pop(); // Latest is last
    } catch (err) {
        console.log(bold(red('Error:')), 'Could not fetch latest version.');
        console.log('=> Check internet connection and try again.');
        console.log();
        Deno.exit(1);
    }
}

function compareVersions(a, b) {
    const MAJOR = 0;
    const MINOR = 1;
    const PATCH = 2;

    const aParts = a.split('.').map(part => parseInt(part));
    const bParts = b.split('.').map(part => parseInt(part));

    if (aParts[MAJOR] < bParts[MAJOR]) return -1;
    if (aParts[MAJOR] > bParts[MAJOR]) return 1;

    if (aParts[MINOR] < bParts[MINOR]) return -1;
    if (aParts[MINOR] > bParts[MINOR]) return 1;

    if (aParts[PATCH] < bParts[PATCH]) return -1;
    if (aParts[PATCH] > bParts[PATCH]) return 1;

    return 0;
}

function isUpgradePossible(currentVersion, latestVersion) {
    if (compareVersions(currentVersion, latestVersion) == -1) return true;
    return false;
}

async function upgradeTo(version) {
    try {
        const p = Deno.run({ cmd: ["deno", "install", "-f", "-A", pikoUrl(version)] });
        const code = await p.status();

        if (code.success) {
            console.log();
            console.log('Piko', `v${version}`, 'is now installed.');
            console.log();
        } else {
            console.log();
            console.log('Could not upgrade Piko.');
            console.log();
        }
    } catch (err) {
        console.log();
        console.log(bold(red('Error.')), 'Could not upgrade Piko.');
        console.log();
    }
}
