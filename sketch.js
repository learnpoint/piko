import { path } from "./deps.js";

export async function sketch(projectName) {
    if (!projectName) {
        console.log();
        console.log('Missing name of folder.');
        console.log();
        Deno.exit(1);
    }

    // Define path
    const projectPath = path.join(Deno.cwd(), projectName);

    // Create directory
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

    // Create files
    Deno.writeTextFile(path.join(projectPath, 'index.html'), indexFileContent(projectName));
    Deno.writeTextFile(path.join(projectPath, 'style.css'), styleFileContent());
    Deno.writeTextFile(path.join(projectPath, 'script.js'), scriptFileContent());

    // Logging and next steps
    console.log();
    console.log(`piko successfully created the folder ${projectName}`);
    console.log();
    console.log(`1. Open the folder in your html editor.`);
    console.log(`2. Start a terminal and move into the created folder.`);
    console.log('3. Run the command "piko serve" in the terminal.');
    console.log();
    console.log('Happy html sketching!');
    console.log();
}

const indexFileContent = projectName => `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>${projectName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="/style.css">
    <script src="/script.js"></script>
</head>

<body>
    <h1>${projectName}</h1>
</body>

</html>
`;

const styleFileContent = () => `body {
    font-family: 'Segoe UI', sans-serif;
}
`;

const scriptFileContent = () => `document.addEventListener('DOMContentLoaded', event => {
    console.log('Script Loaded OK');
});
`;
