import { path, decode } from "./deps.js";

const EXCLUDE_FILES = ['LICENSE', 'CNAME', 'README.md', 'CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 'SECURITY.md', '.gitignore', '.gitattributes'];

const state = {
    projectName: null,
    githubPath: null,
    get projectPath() {
        return path.join(Deno.cwd(), this.projectName);
    }
}

export async function copy(githubPath, projectname) {
    console.log();

    const githubRepoName = getRepoNameFromGithubPathOrExit(githubPath);

    state.projectName = projectname || githubRepoName;
    state.githubPath = githubPath;

    try {
        await Deno.mkdir(state.projectPath);
    } catch (err) {
        if (err instanceof Deno.errors.AlreadyExists) {
            exitWithError([`Folder ${state.projectName} already exists.`, 'Delete the folder or choose another name.'], null, false);
        } else {
            exitWithError('Unexpected error.', err, false);
        }
    }

    await copyGithubRepoOrExit();

    writeSuccess();
}

function getRepoNameFromGithubPathOrExit(githubPath) {
    if (!githubPath) {
        exitWithError('Missing github path.', null, false);
    }

    const pathParts = githubPath.split('/');

    if (!pathParts.length === 2) {
        exitWithError('Unvalid github path. Must have format {owner}/{repo}.', null, false);
    }

    return pathParts[1];
}

async function copyGithubRepoOrExit() {
    try {
        const repoResponse = await fetch(`https://api.github.com/repos/${state.githubPath}`);
        const repoData = await repoResponse.json();
        ensureGithubResponseOrExit(repoResponse, repoData);

        const branchResponse = await fetch(`https://api.github.com/repos/${state.githubPath}/branches/${repoData.default_branch}`);
        const branchData = await branchResponse.json();
        ensureGithubResponseOrExit(branchResponse, branchData);

        const treeUrl = branchData.commit.commit.tree.url + '?recursive=1';
        const treeResponse = await fetch(treeUrl);
        const treeData = await treeResponse.json();
        ensureGithubResponseOrExit(treeResponse, treeData);

        for (const node of treeData.tree) {
            if (EXCLUDE_FILES.includes(node.path)) {
                continue;
            }
            await downloadGithubBlobOrExit(path.join(state.projectPath, node.path), node);
        }
        console.log();
    } catch (err) {
        exitWithError(`Error when copying ${state.githubPath}`);
    }
}

async function downloadGithubBlobOrExit(path, node) {
    try {
        if (node.type !== 'blob') {
            Deno.mkdir(path);
            return;
        }

        console.log(`Downloading ${node.path}`);

        const blobResponse = await fetch(node.url);
        const blobData = await blobResponse.json();
        ensureGithubResponseOrExit(blobResponse, blobData);

        await Deno.writeFile(path, decode(blobData.content));
    } catch (err) {
        exitWithError([`Created folder ${projectName}`, `Error when copying ${githubTemplatePath}`]);
    }
}

function ensureGithubResponseOrExit(res, data) {
    if (!res.ok) {
        const message = `Error when fetching ${state.githubPath} from Github: ` + data.message;
        exitWithError(message);
    }
}

function exitWithError(messages, error, clean = true) {
    if (typeof messages === 'string') {
        console.log(messages);
        console.log();
    } else {
        for (const message of messages) {
            console.log(message);
            console.log();
        }
    }

    if (error) {
        console.log(error);
    }

    if (clean) {
        try {
            Deno.remove(state.projectPath, { recursive: true });
        } catch (err) {
            // Write that folder was created?
        }
    }

    Deno.exit(1);
}

function writeSuccess() {
    console.log(`Copied repo ${state.githubPath} into ${state.projectName}.`);
    console.log();
}
