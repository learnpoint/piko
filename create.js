import { path } from "./deps.js";

export async function create(projectName) {
    if (!projectName) {
        console.log();
        console.log('Missing name of folder to create.');
        console.log();
        Deno.exit(1);
    }

    // Define paths
    const projectPath = path.join(Deno.cwd(), projectName);
    const sourcePath = path.join(projectPath, 'src');
    const buildPath = path.join(projectPath, 'docs');
    const componentsPath = path.join(sourcePath, 'components');

    // Create directories
    try {
        await Deno.mkdir(projectPath);
    } catch (error) {
        if (error instanceof Deno.errors.AlreadyExists) {
            console.log();
            console.error(`Folder ${projectName} already exists.`);
            console.log();
            console.log('Delete the folder or choose another name.');
            console.log();
            Deno.exit(1);
        } else {
            throw error;
        }
    }
    await Deno.mkdir(sourcePath);
    await Deno.mkdir(buildPath);
    await Deno.mkdir(componentsPath);

    // Create files
    Deno.writeTextFile(path.join(sourcePath, 'index.html'), indexFileContent());
    Deno.writeTextFile(path.join(sourcePath, 'about.md'), aboutFileContent());
    Deno.writeTextFile(path.join(componentsPath, 'header.html'), headerFileContent(projectName));
    Deno.writeTextFile(path.join(componentsPath, 'footer.html'), footerFileContent());

    // Logging and next steps
    console.log();
    console.log(`piko successfully created the folder ${projectName}`);
    console.log();
    console.log(`1. Open the folder in your html editor.`);
    console.log(`2. Start a terminal and move to the folder.`);
    console.log('3. Run the command "piko dev" in the terminal.');
    console.log();
    console.log('Happy html writing!');
    console.log();
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
