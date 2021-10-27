import { path } from "./deps.js";

export async function create(projectName) {
    console.log();

    if (!projectName) {
        exitWithError('Missing name of folder to create.');
    }

    const projectPath = path.join(Deno.cwd(), projectName);

    try {
        await Deno.mkdir(projectPath);
    } catch (err) {
        if (err instanceof Deno.errors.AlreadyExists) {
            exitWithError(`Folder ${projectName} already exists.`);
        } else {
            exitWithError('Error', err);
        }
    }

    const sourcePath = path.join(projectPath, 'src');
    const buildPath = path.join(projectPath, 'docs');
    const componentsPath = path.join(sourcePath, 'components');

    await Deno.mkdir(sourcePath);
    await Deno.mkdir(buildPath);
    await Deno.mkdir(componentsPath);

    Deno.writeTextFile(path.join(sourcePath, 'index.html'), indexFileContent());
    Deno.writeTextFile(path.join(sourcePath, 'about.md'), aboutFileContent());
    Deno.writeTextFile(path.join(componentsPath, 'header.html'), headerFileContent(projectName));
    Deno.writeTextFile(path.join(componentsPath, 'footer.html'), footerFileContent());

    console.log(`piko successfully created the folder /${projectName}`);
    console.log();
    console.log(`1. Open /${projectName} in your html editor.`);
    console.log(`2. Start a terminal in /${projectName}.`);
    console.log('3. Run the command "piko dev" in the terminal.');
    console.log();
    console.log('Happy html writing!');
    console.log();
}

function exitWithError(messages, error) {
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

    Deno.exit(1);
}

const indexFileContent = () => `<!-- header.html -->

<h1>Hello world</h1>

<!-- footer.html -->`;

const aboutFileContent = () => `<!-- header.html, { title: "About" } -->

# About

<!-- footer.html -->`;

const headerFileContent = projectName => `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title || ${projectName} }}</title>
</head>

<body>
    <nav>
        <a href="/index.html">Home</a>
        <a href="/about.html">About</a>
    </nav>
`;

const footerFileContent = () => `</body>
</html>
`;
