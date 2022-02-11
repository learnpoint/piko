<img src="piko.svg" height="20px">

_A minimal CLI toolkit for html writing._




# Requirements

- [Deno](https://deno.land/manual/getting_started/installation) v1.18.2 or later.




# Installation

```bash
$ deno install -A https://cdn.jsdelivr.net/gh/learnpoint/piko@0.9.40/piko.js
```

Verify installation:

```bash
$ piko -v

piko 0.9.40
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




# CLI Reference

Piko is a CLI with a small collection of commands.




## ```copy```

Copy a github repo to your computer:
```bash
$ piko copy <OWNER/REPO> [FOLDER_NAME]
```

**Description**

> The ```piko copy``` command is somewhat similar to ```git clone```, except it only downloads the latest commited tree. It doesn't download the ```.git``` folder. It also doesn't download files like ```LICENSE```, ```CNAME```, ```README.md```, or ```.gitignore```. This command is useful when you want to use a github repo as a template for your html writing.

**```<OWNER/REPO>```** _required_

> Path to github repository.

**```[FOLDER_NAME]```** _optional_

> Name of folder that Piko should create and copy repo files into.
>
> Default value is ```REPO``` (extracted from the first argument).
>
> If value is ```.``` then Piko will not create a new folder, but instead copy the repo files into the current folder.

**Examples**

> Create a folder named ```empty``` and copy the files from ```https://github.com/ekmwest/empty``` into that folder:
>
> ```bash
> $ piko copy ekmwest/empty
> ```
>
> Create a folder named ```fake``` and copy the files from  ```https://github.com/ekmwest/empty``` into that folder:
>
>```bash
>$ piko copy ekmwest/empty fake
>```
>
> Copy the files from ```https://github.com/ekmwest/empty``` into the current folder:
>
> ```bash
> $ piko copy ekmwest/empty .
> ```




## ```serve```

Start a static web server in current folder:
```bash
$ piko serve
```

**Description**

> The ```piko serve``` command will start a fast static web server in the current folder.
>
> The server will automatically reload the browser(s) upon file changes.
>
> The server is completely non-cached. It never asks clients to cache resources. If you need to test http caching logic, you should use another server.
> 
> Requests to folders will be redirected to ```/index.html```.
>
> Requests to non-existing files or folders will recieve a 404 response. If there's a file named ```404.html``` in the root folder (the folder where ```piko serve``` was started), the reponse body will be populated with the contents of that file.




## ```build```

Find all pages in the ```src``` folder, stitch them together with components in the ```src/components``` folder and output the result in the ```docs``` folder:

```bash
$ piko build
```

**Description**

> The ```piko build``` command will copy the files from the ```src``` folder, stitch them together with the files in ```src/components``` folder, and output the result in the ```docs``` folder.
>
> You should typically not use the ```piko build``` command. When using Piko, you should use the ```piko dev``` command instead.
>
> For more information about pages and components, see _Piko Components_ below.




## ```dev```

Continuously run the ```piko build``` command in the current folder, and start ```piko serve``` in the folder ```docs```:

```bash
piko dev
```

**Description**

> The ```piko dev``` command will run ```piko build``` and ```piko serve``` together at the same time.
>
> For more information about pages and components, see _Piko Components_ below.




## ```create```

Create a folder with example pages and Piko components:

```bash
$ piko crate <FOLDER_NAME>
```

**Description**

> The ```piko create``` command will create a new folder with some example pages and some example Piko components.

**```<FOLDER_NAME>```** _required_

> Name of folder that Piko should create.

**Example**

> Create a new folder named ```test``` with some example pages and Piko components:

```bash
$ piko create test
```




## ```upgrade```

Upgrade Piko:

```bash
$ piko upgrade
```

**Description**

> The ```piko upgrade``` command will upgrade your local installation of Piko. It will also indicate the recommended version of Deno. If you have the latest version of Piko and Deno installed, this command will do nothing.



## ```version```

Show currently installed version of Piko:

```bash
$ piko version
```




## ```help```

Display the CLI Reference:

```bash
$ piko help
```




# Piko Components

If you're writing a site with several pages, keeping the head tag synchronized between the pages is annoying and error prone. Piko let's you extract the head tag into a separate file that can be included on all the pages in your site.

Piko components are not just for the head tag. They can be used to include any html fragment on a page.

In order to use Piko components, your site needs to include the folders ```docs```, ```src```, and ```src/components```:

```
your-site
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

### Understanding Piko components

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


### Using markdown

Pages can be written in markdown. Components can be included in markdown pages:

```md
<!-- header.html, { title: "Welcome" } -->

# Welcome

<!-- footer.html -->
```

***NOTE:*** Components must be written in html. Markdown is only supported in pages.


# Contributing

Piko is written with our specific use cases at [Learnpoint](https://github.com/learnpoint) in mind. We will not accept pull requests or fix issues that we don't experience at Learnpoint. We've written Piko for fun and for our own use.

That said, feel free to [create your own fork](https://docs.github.com/en/free-pro-team@latest/github/getting-started-with-github/fork-a-repo), or use Piko in any way you wish! ❤️
