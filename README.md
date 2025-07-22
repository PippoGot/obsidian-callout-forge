# Obsidian Callout Forge

An Obsidian plugin to create custom HTML structures from templates and enhance the visual quality of your workspace!

---
## 🧭 Motivation

While continuously optimizing my vault for TTRPG note-taking, I often felt the need to display information in a more visually engaging and structured way. Unfortunately, I couldn’t find any existing plugin that offered the flexibility to create highly customized visual snippets — so I decided to build one myself.

This plugin is the result of that effort. I hope you find it useful and enjoyable!

---
## ✨ Features

- Custom and reusable HTML templates to render elements as you like
- Flexible parameter support
- Markdown content compatibility

---
## 🎬 Demo

Below is a showcase of a few examples created using this plugin:

> _(Insert screenshots or GIFs here demonstrating the rendered output along with their corresponding code blocks.)_

For more details, check the `examples/` folder in the repository.

If you've built something cool using **CalloutForge**, feel free to share it! You're welcome to contribute your own templates or demos via a pull request.

---
## 🔧 Installation

### Manual Installation

- Clone this repository.
- `npm run build` to build file in `./dist`.
- Copy over `main.js`, `styles.css`, `manifest.json` to your vault `VaultFolder/.obsidian/plugins/obsidian-callout-forge/`.
- Enable plugin in Obsidian setting.

### BRAT

- [Install the BRAT Plugin](https://obsidian.md/plugins?id=obsidian42-brat)
- Execute command `Obsidian42 - BRAT: Add a beta plugin for testing`
- Paste the URL of this repository and confirm
- Enable plugin in Obsidian setting.

### Community Plugins List

This plugin is not yet available in the community plugins list, let's hope it will someday!

After installation follow the **Usage** steps to start!

---
## 📘 Usage

After installing and enabling the plugin, you'll need to add your custom HTML templates. Here's how to get started:

### 1. Create an HTML Template

Create a standard `.html` file with your desired structure. For example:

````html
<div class="check-callout-container">
	<div class="dice-wrapper">
		<div class="dice-shadow"></div>
		<div class="dice">
			<img class="dice-image" src="dice-image.png">
			<div class="dice-number"></div>
		</div>
	</div>
	<div class="callout-box">
		<div class="callout-title"></div>
		<hr class="callout-divider">
		<div class="callout-content"></div>
	</div>
</div>
`````

### 2. Add Parameters Using Curly Braces

Use double curly braces (`{{ ... }}`) to indicate dynamic placeholders. For example:

```html
<div class="check-callout-container">
	<div class="dice-wrapper">
		<div class="dice-shadow"></div>
		<div class="dice">
			<img class="dice-image" src="dice-image.png">
			<div class="dice-number">{{ cd }}</div>
		</div>
	</div>
	<div class="callout-box">
		<div class="callout-title">{{ title }}</div>
		<hr class="callout-divider">
		<div class="callout-content">
			{{ content }}
		</div>
	</div>
</div>
```

### 3. Save the Template

Place your `.html` template file inside the following folder in your vault:

```bash
.obsidian/plugins/obsidian-callout-forge/HTML
```

### 4. Use the Code Block in Your Note

In any Markdown note, use a `calloutforge` code block to render the template:

````markdown
```calloutforge
template: template-name
title: A Sample Title
cd: 10
---
This is the main content area.
```
````

### 5. Result

Each parameter (e.g., `title`, `cd`, `content`) is replaced in the HTML template with the corresponding value from the code block, rendering the final output directly in your note.

---
## 📚 Documentation

This section explains how the plugin handles templates and parameters.

### Required Parameters

Each `calloutforge` code block **must** include a `template` parameter specifying the HTML template filename (without `.html`) located in the template folder.

````markdown
```calloutforge
template: my-template
---
This is the content block.
```
````

### Parameter Order in the Code Block

- Parameter order does **not** matter, but all parameters must be listed **before** the `---` separator.
- Everything after `---` is treated as the `content` parameter.
- Extra parameters in the code block that don’t appear in the template are **ignored**.

### HTML Placeholders

- Spaces inside curly braces are ignored (`{{title}}` and `{{ title }}` are equivalent).
- Placeholders are replaced with rendered Markdown content from the code block.
- Templates support multiple different keywords and multiple occurrences of the same keyword.
- There are no limits on keyword quantity or template structure beyond valid HTML.
- If the template contains placeholders not supplied in the code block, an **error** will be thrown.

Support for optional parameters and default values is planned for future releases.

### Code Block Nesting and Markdown Syntax Support

Nesting multiple `calloutforge` code blocks (with same or different templates) is supported. Keywords from different blocks do not interfere with each other. For example:

`````markdown
````calloutforge
template: template1
params: param-values
---
Content 1

```calloutforge
template: template2.1
params: param-values
---
Content 2.1
```

```calloutforge
template: template2.2
params: param-values
---
Content 2.2
```

````
`````

Markdown syntax is fully supported inside code block parameters.

---
## 🤝 Contribution

Contributions are most welcome and appreciated!

If you find bugs, have suggestions, or encounter issues, please [open an issue](https://github.com/PippoGot/obsidian-callout-forge/issues).
Pull requests are also encouraged, whether for fixes, improvements, or new features.

---
## 🔮 Future Work

Features currently under consideration include:

- A dedicated template editor with CSS integration and live preview
- Commands to move notes into the template folder
- Commands to open the template folder for easier file management
- Support for optional parameters and default values
- Ability to configure multiple template folders

---
## ⚠️ Disclaimer

This plugin was created by **[Pippogot](https://github.com/PippoGot)**, a non-professional developer. While every effort has been made to ensure proper functionality, **the plugin is provided as-is with no guarantees**.

Parts of the code were developed with AI assistance, and the author has limited experience with TypeScript and Obsidian plugin development.

Although it should work alongside other Obsidian plugins, **compatibility is not guaranteed**.

Maintenance and updates will be provided on a best-effort basis depending on the author's availability and interest. Please keep this in mind when relying on the plugin.
