<img src="piko.svg" height="20px">

_A minimal CLI toolkit for html writing._



# Requirements

- [Deno](https://deno.land/manual/getting_started/installation) v1.15.3 or later.



# Installation

```bash
$ deno install -A https://cdn.jsdelivr.net/gh/learnpoint/piko@0.9.34/piko.js
```

Verify installation:

```bash
$ piko -v

piko 0.9.34
```



# Upgrading

```bash
$ piko upgrade
```

If you encounter any problems when upgrading, the easiest way out is to install Piko from scratch:

1. Make sure you have the required version of Deno installed (see _Requirements_ above).
2. Delete the Piko binaries (there are one or two files, depending on operating system). The binaries are located here:
    - Windows: ```%USERPROFILE%\.deno\bin```
    - Mac: ```$HOME/.deno/bin```
3. Install Piko from scratch (see _Installation_ above).



# CLI Usage

Piko is a CLI with a minimal collection of commands.


## ```copy```

Copy a github repo to your computer:
```bash
$ piko copy <OWNER/REPO> [FOLDER_NAME]
```

> The ```piko copy``` command is somewhat similar to ```git clone```, except it only downloads the last commited tree. It doesn't download the ```.git``` folder. It also doesn't download files like ```LICENSE```, ```CNAME```, ```README.md```, or ```.gitignore```. This command is useful when you want to use a github repo as a template.

**```<OWNER/REPO>```** _required_

> Path to github repository.

**```[FOLDER_NAME]```** _optional_

> Name of folder that Piko should create and copy repo files into.
>
> Default value is ```REPO``` (extracted from the first argument).
>
> If value is ```.``` then Piko will not create a new folder, but instead copy the repo files into the current folder.

***Examples***

> Create the folder ```empty``` and copy the files from ```https://github.com/ekmwest/empty``` into that folder:
>
> ```bash
> $ piko copy ekmwest/empty
> ```
>
> Create the folder ```fake``` and copy the files from  ```https://github.com/ekmwest/empty``` into that folder:
>
>```bash
>$ piko copy ekmwest/empty fake
>```
>
>Copy the files from ```https://github.com/ekmwest/empty``` into the current folder:
>
>```bash
>$ piko copy ekmwest/empty .
>```


## ```serve```

Start a static web server in current folder:
```bash
$ piko serve
```

The ```piko serve``` command will start a very fast static web server in the current folder. The server will automatically reload the browser(s) upon file changes.

The server is 100% non-cached. It will never ask the client to cache any resources whatsoever. This is great during html writing. When you need to test your caching logic, you should use another tool.

Any request to a folder will be redirected to the file ```index.html```.

Any request to a file or folder that doesn't exist, will get the reponse 404. If there's a file named ```404.html``` in the root folder, the reponse body will populated with the contents of that file.



## ```build```

Build to docs folder:
```bash
$ piko build
```



# Getting started

1. Create a new site:

    ```bash
    $ piko create new-site
    ```
2. Start the dev server:

    ```bash
    $ cd new-site
    $ piko dev
    ```

3. Verify that your site is running at ```http://127.0.0.1:3333```

4. Edit the file ```new-site/src/index.html``` and save. The dev server should rebuild your site and reload the browser.

5. Stop the dev server using ```Ctrl+C```.

6. When done, deploy the ```docs``` folder to a static web host.



# Understanding the Piko folder structure

```
new-site
 ├── docs
 |    ├── about.html
 |    └── index.html
 └── src
      ├── components
      |    ├── header.html
      |    └── footer.html
      ├── about.md
      └── index.html
```

- The **```docs```** folder contains your compiled site. This folder can be deployed to a static web host like Netlify or GitHub Pages. Don't edit the files in this folder. Let Piko manage its content.

- The **```src```** folder is where you do your html writing.

- The **```src/components```** folder contains components that can be included in pages.

# Understanding Piko components

Piko components are files with html markup. They can be included in pages.

Components are located in the ```src/components``` folder.

Use html comment syntax to include a component in a page:

```html
<!-- header.html -->

<h1>Welcome</h1>

<!-- footer.html -->
```

Use JavaScript object syntax to pass props to a component:

```html
<!-- header.html, { title: "Welcome" } -->

<h1>Welcome</h1>

<!-- footer.html -->
```

Use ```{{ prop }}``` syntax inside a component to render props:

```html
<title>{{ title }}</title>
```

You can provide a default prop value with ```||``` syntax:

```html
<title>{{ title || Home }}</title>
```


# Using markdown

Pages can be written in markdown. Components can be included in markdown pages:

```md
<!-- header.html, { title: "Welcome" } -->

# Welcome

<!-- footer.html -->
```

***NOTE:*** Components must be written in html. Markdown is only supported in pages.


# Static web server

Piko has a very fast static web server that can be used on its own. It's completely cache-less and has build-in browser reload.

The server can be started from any folder:

```bash
$ piko serve
```


# Copy github template repositories

Piko has a tool for copying github repos. It downloads the files from a repo to your local computer, excluding files like ```LICENSE```, ```CNAME```, ```README.md```, ```.gitignore```, etc. It doesn't download the ```.git``` database, just the files in the latest commited tree.

Here's how to copy the github repo ```learnpoint/draft``` into a new folder named ```gradebook-idea```:

```bash
$ piko copy learnpoint/draft gradebook-idea
```


# Contributing

Piko is written with our specific use cases at [Learnpoint](https://github.com/learnpoint) in mind. We will not accept pull requests or fix issues that we don't experience at Learnpoint. We've written Piko for fun and for our own use.

That said, feel free to [create your own fork](https://docs.github.com/en/free-pro-team@latest/github/getting-started-with-github/fork-a-repo), or use Piko in any way you wish! ❤️
