import { version as currentPikoVersion } from "./version.js";

const STORAGE_ORIGIN = "https://piko.learnpoint.io/";
const TAGS_URL = "https://api.github.com/repos/learnpoint/piko/tags";
const pikoUrl = version => `https://cdn.jsdelivr.net/gh/learnpoint/piko@${version}/piko.js`;
const pikoVersionModuleUrl = version => `https://cdn.jsdelivr.net/gh/learnpoint/piko@${version}/version.js`;

export async function upgrade() {

    // 1. Upgrade Piko

    console.log();
    console.log('Looking up latest version...');

    const latestPikoVersion = await getLatestPikoVersion();

    let pikoVersionWhenUpgradeFinished;

    if (isPikoUpgradePossible(currentPikoVersion, latestPikoVersion)) {
        console.log('Found new version:', `v${latestPikoVersion}`);
        console.log('Installing...');
        await upgradePikoTo(latestPikoVersion);

        pikoVersionWhenUpgradeFinished = latestPikoVersion;
    } else {
        console.log('Latest version already installed.');
        console.log('Piko', `${currentPikoVersion}`);
        console.log();

        pikoVersionWhenUpgradeFinished = currentPikoVersion;
    }

    // 2. Recommend Deno upgrade

    const [err, recommendedDenoVersion] = await getRecommendedDenoVersion(pikoVersionWhenUpgradeFinished);

    if (err) {
        // Could not get recommended Deno version.
        Deno.exit(1);
    }

    if (isDenoUpgradeRecommended(Deno.version.deno, recommendedDenoVersion)) {
        console.log('You have Deno', `${Deno.version.deno}.`, 'You should upgrade to', `${recommendedDenoVersion}:`);
        console.log(`deno upgrade --version ${recommendedDenoVersion}`);
    } else {
        // Deno upgrade not recommended.
    }
}

async function getLatestPikoVersion() {
    try {
        const tags = await fetch(TAGS_URL).then(res => res.json());
        const versions = tags.map(tag => tag.name.replace('v', ''));
        const sortedVersions = versions.sort(compareVersions);
        return sortedVersions.pop(); // Latest is last
    } catch (err) {
        console.log('%cCould not fetch latest version.', 'font-weight:bold;color:#f44;');
        console.log('=> Check internet connection and try again.');
        console.log(err);
        Deno.exit(1);
    }
}

async function getRecommendedDenoVersion(pikoVersion) {
    try {
        const { denoVersion } = await import(pikoVersionModuleUrl(pikoVersion));
        if (denoVersion) {
            return [null, denoVersion];
        } else {
            return ['Could not find recommended Deno version', null];
        }
    } catch (err) {
        return ['Could not find recommended Deno version', null];
    }
}

function isPikoUpgradePossible(currentPikoVersion, latestPikoVersion) {
    if (compareVersions(currentPikoVersion, latestPikoVersion) === -1) {
        return true;
    } else {
        return false;
    }
}

function isDenoUpgradeRecommended(currentDenoVersion, recommendedDenoVersion) {
    if (compareVersions(currentDenoVersion, recommendedDenoVersion) === -1) {
        return true;
    } else {
        return false;
    }
}

async function upgradePikoTo(version) {
    try {
        const command = new Deno.Command("deno", {
            args: [
                "install",
                "-f",
                "-g",
                "-A",
                "--location",
                STORAGE_ORIGIN,
                pikoUrl(version)
            ]
        });

        const child = command.spawn();
        const status = await child.status;

        if (status.success) {
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
        console.log('%cError. Could not upgrade Piko.', 'font-weight:bold;color:#f44;');
        console.log();
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
