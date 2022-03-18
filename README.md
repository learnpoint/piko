# <img src="piko.svg" height="20px">


_Piko is a toolkit for Learnpoint Developers_


- **Serve** — A disturbingly fast web server. With auto reload, caching, and compression.
- **Share** — Navigate to your localhost server from a mobile phone. Or share with curious colleagues!
- **Copy** — Copy files from a github template repository.
- **Build** & **Dev** — SSG utils.



## Requirements

- **Deno v1.20.1** or later.
- **Cloudflare Tunnel** (only required for the Share tool).



## Install Deno

Follow the [instructions on this page](https://deno.land/manual/getting_started/installation).

Verify installation (from a fresh terminal):

```bash
$ deno --version
deno 1.20.1 ...
```

Upgrade:
```bash
$ deno upgrade
```



## Install Cloudflare Tunnel on Windows

Cloudflare Tunnel is only required for the **Share** tool. Every other Piko tool can be used without Cloudflare Tunnel.

1. Download the 64-bit version (for Windows) from the [downloads page](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/).
2. Rename the downloaded file to ```cloudflared.exe```
3. Create a folder named ```C:\Program Files (x86)\cloudflared```
4. Copy the (downloaded and renamed) file to the (created) folder.
5. Add ```C:\Program Files (x86)\cloudflared``` to your PATH environment variable.

Verify installation (from a fresh terminal):

```bash
$ cloudflared -v
cloudflared version ...
```

Upgrading Cloudflare Tunnel must be done manually on Windows:

1. Download the new version from the [downloads page](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/).
2. Rename the downloaded file to ```cloudflared.exe```
3. Copy the (downloaded and renamed) file to ```C:\Program Files (x86)\cloudflared```. Accept the warning to overwrite the existing file.



## Install Piko

```bash
$ deno install -A https://cdn.jsdelivr.net/gh/learnpoint/piko@0.9.50/piko.js
```

Verify installation (from a fresh terminal):

```bash
$ piko -v
piko 0.9.50...
```

Upgrade:

```bash
$ piko upgrade
```



## Serve

Serve is a static web server. Launch from any folder using the command:

```bash
$ piko serve
```

Notes about Serve:

- Most common file types are supported.
- Requests to folders are redirected to ```/index.html```.
- Requests to non-existing files (or folders) will recieve a 404 response. If a there's a ```404.html``` file in the server root folder, the response body will be populated with the contents of that file.
- Browser(s) are automatically reloaded when a file is edited (in the folder where Serve was started). The reload functionality is implemented through websockets using javascript injection on html pages.
- Multiple instances are allowed. When you start (a new instance of) Serve, the port is selected dynamically and printed to the terminal. Default port is ```3333```.
- Responses are compressed with gzip or brotly (whatever the browser supports).
- Only the http protocol is supported. There's no plan to implement https, h2 or h3.
- Serve is host agnostic. Both 127.0.0.1 and localhost works fine.
- Responses are marked with an etag headers for caching. The etag headers are re-calculated every time Serve is restarted.


## Share

Share your localhost server with the command:

```bash
$ piko share <name> [PORT]
```




## Copy

Copy a github repo to your computer:
```bash
$ piko copy <OWNER/REPO> [FOLDER_NAME]
```

**Description**

The ```piko copy``` command is somewhat similar to ```git clone```, except it only downloads the latest commited tree. It doesn't download the ```.git``` folder. It also doesn't download files like ```LICENSE```, ```CNAME```, ```README.md```, or ```.gitignore```. This command is useful when you want to use a github repo as a template for your html writing.

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




## Build

Find all pages in the ```src``` folder, stitch them together with components in the ```src/_components``` folder and output the result in the ```docs``` folder:

```bash
$ piko build
```

**Description**

> The ```piko build``` command will copy the files from the ```src``` folder, stitch them together with the files in ```src/_components``` folder, and output the result in the ```docs``` folder.
>
> You should typically not use the ```piko build``` command. When using Piko, you should use the ```piko dev``` command instead.
>
> For more information about pages and components, see _Piko Components_ below.




### ```dev```

Continuously run the ```piko build``` command in the current folder, and start ```piko serve``` in the folder ```docs```:

```bash
piko dev
```

**Description**

> The ```piko dev``` command will run ```piko build``` and ```piko serve``` together at the same time.
>
> For more information about pages and components, see _Piko Components_ below.




### ```create```

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




### ```upgrade```

Upgrade Piko:

```bash
$ piko upgrade
```

**Description**

> The ```piko upgrade``` command will upgrade your local installation of Piko. It will also indicate the recommended version of Deno. If you have the latest version of Piko and Deno installed, this command will do nothing.



### ```version```

Show currently installed version of Piko:

```bash
$ piko version
```




### ```help```

Display the CLI Reference:

```bash
$ piko help
```




## Piko Components

If you're writing a site with several pages, keeping the head tag synchronized between the pages is annoying and error prone. Piko let's you extract the head tag into a separate file that can be included on all the pages in your site.

Piko components are not just for the head tag. They can be used to include any html fragment on a page.

In order to use Piko components, your site needs to include the folders ```docs```, ```src```, and ```src/_components```:

```
your-site
 ├── docs
 |    ├── about.html
 |    └── index.html
 └── src
      ├── _components
      |    ├── header.html
      |    └── footer.html
      ├── about.md
      └── index.html
```

- The **```docs```** folder contains your compiled site. This folder can be deployed to a static web host like Netlify or GitHub Pages. Don't edit the files in this folder. Let Piko manage its content.

- The **```src```** folder is where you do your html writing.

- The **```src/_components```** folder contains components that can be included in pages.

### Understanding Piko components

Piko components are files with html markup. They can be included in pages.

Components are located in the ```src/_components``` folder.

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


## Contributing

Piko is written with our specific use cases at [Learnpoint](https://github.com/learnpoint) in mind. We will not accept pull requests or fix issues that we don't experience at Learnpoint. We've written Piko for fun and for our own use.

That said, feel free to [create your own fork](https://docs.github.com/en/get-started/quickstart/fork-a-repo), or use Piko in any way you wish! ❤️
