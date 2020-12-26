<img src="piko.svg" height="24px">

_A minimal toolkit for html writing_

We use Piko at [Learnpoint](https://github.com/learnpoint) for writing html sites. Piko is not a powerful frontend framework, or a static site generator with pre-processing, bundling, or any other fancy features. Rather, Piko is the smallest step up possible from writing every single html page completely by hand.

If your site consists of a single html page, you don't need Piko. But when your site grows to more than one page, keeping the ```head``` tag up to date between pages can become error prone and annoying. This is where Piko comes in. Piko lets you extract the ```head``` tag into a separate snippet that can be included and reused on multiple pages.

A typical scenario for Piko would be a portfolio site with several html pages.

## Requirements

In order to use Piko, you have to [install Deno](https://deno.land/manual/getting_started/installation) version ```1.6.1```

## Installation

```bash
$ deno install -A https://cdn.jsdelivr.net/gh/learnpoint/piko@0.9.0/piko.js
```

Verify the installation:

```bash
$ piko

piko 0.9.0
```

## Upgrading

```bash
$ deno install -f -A https://cdn.jsdelivr.net/gh/learnpoint/piko@0.9.0/piko.js
```

## Get started

1. Use the **```create```** command to create a new site:

    ```bash
    $ piko create my-site
    ```
2. Use the **```dev```** command, from inside the created folder, to start the Piko dev server:

    ```bash
    $ cd my-site
    $ piko dev
    ```

3. Verify that you site is running at ```http://127.0.0.1:3333```

4. Edit ```src/index.html```. The dev server should rebuild your site and reload your browser.

5. Stop the dev server using ```Ctrl+C```.

6. Deploy the ```docs``` folder to your web host.

## Piko folders

```
my-site
 ├── docs
 |    ├── about.html
 |    └── index.html
 └── src
      ├── snippets
      |    ├── header.html
      |    └── footer.html
      ├── about.md
      └── index.html
```

There are three important folders in Piko:

- The **```docs```** folder contains your build (compiled) site. You should _never make manual edits inside the ```docs``` folder_. Instead, let Piko manage all of its content. When you deploy your site to GitHub Pages, Heroku, or Netlify, this is the folder you should deploy.

- The **```src```** folder is where you do all of your lovely html writing. When Piko builds your site, it basically just copies the contents of the ```src``` folder into the ```docs``` folder.

- The **```src/snippets```** folder contains your html snippets.

## Using snippets

Each file in the ```src/snippets``` folder is a snippet that can be included in a page.

Include two snippets in a html page:

```html
<!-- header.html -->

<h1>Welcome</h1>

<!-- footer.html -->
```

You can pass props to a snippet using a JavaScript object. Use a comma to separate the object from the snippet name:

```html
<!-- header.html, { title: "Welcome" } -->

<h1>Welcome</h1>

<!-- footer.html -->
```

Inside a snippet, you can access passed props with ```{{ prop }}``` syntax:

```html
<title>{{ title }}</title>
```

You can provide a default value for a prop with ```||``` syntax:

```html
<title>{{ title || Home }}</title>
```

## Using markdown

You can write your pages in markdown. When building your site, Piko uses [Marked](https://github.com/markedjs/marked) to parse markdown into html.

Just as in html pages, snippets can be included in markdown:

```md
<!-- header.html, { title: "Welcome"} -->

# Welcome

<!-- footer.html -->
```

Pages can be written in markdown, but snippets must be written in html. You cannot write your snippets in markdown.

## A note on Git Bash for Windows

On Windows, Piko is installed as a ```.cmd``` executable. Unfortunately, Git Bash for Windows does not properly recognize ```.cmd``` as an executable file extension.

To run Piko with Git Bash for Windows, you have to specify the ```.cmd``` extension:

```bash
$ piko.cmd

piko 0.9.0
```

If you don't like typing the file extension, there is a simple workaround:

1. Create a file named ```piko``` (without file extension).

2. Save the file _in the same folder_ as ```piko.cmd```. On Windows, this folder is typically located at ```C:\Users\USER\.deno\bin```. If you have trouble finding the folder in which ```piko.cmd``` is installed, you can consult the documentation for the [Deno script installer](https://deno.land/manual@v1.6.2/tools/script_installer) which is used for the Piko installation.

3. Add the following content to the ```piko``` file you created:

    ```bash
    #!/bin/sh
    piko.cmd "$@"
    ```

You should now be able to run Piko without specifying the file extension:

```bash
$ piko

piko 0.9.0
```

## A note on the CNAME file for GitHub Pages

[GitHub Pages](https://pages.github.com/) is a great host for Piko sites.

When you enable GitHub Pages for your Piko site, GitHub stores a ```CNAME``` file in the ```docs``` folder. You should copy this file into the ```src``` folder. This way, you can safely delete the entire ```docs``` folder if there are any file mismatch problems, and restart the Piko dev server to rebuild the site, without loosing your ```CNAME``` file.

## Contributing

Piko is written with our own specific use cases at [Learnpoint](https://github.com/learnpoint) in mind. We will not accept pull requests or fix issues that we don't experience at Learnpoint. We've written Piko for fun and for our own use. That said, feel free to [create your own fork](https://docs.github.com/en/free-pro-team@latest/github/getting-started-with-github/fork-a-repo), or use Piko in any way you wish! ❤️
