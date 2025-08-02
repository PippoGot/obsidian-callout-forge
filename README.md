# Obsidian Callout Forge

An **Obsidian** plugin to create reusable, parameterized **HTML templates** and enhance the visual quality of your notes.

---
## 🧭 Motivation

While customizing my vault for **TTRPG note-taking**, I often needed to display information in a more **visually structured and engaging** way.  
Existing plugins didn't provide the flexibility I wanted for creating custom visual snippets — so I built **CalloutForge**.

Now, you can design your own templates, add parameters, and have them render beautifully inside Obsidian.

---
## ✨ Features

- **Custom HTML templates** — Reusable snippets for any purpose
- **Flexible parameters** — Required, optional, and fallback values
- **Markdown & codeblock support** — Use rich text, code, and even nest other templates
- **Full control** — Style it however you want with your own HTML and CSS 

---
## 🎬 Demo

Below is a showcase of a few examples created using this plugin:

> _(Insert screenshots or GIFs here demonstrating the rendered output along with their corresponding codeblocks.)_

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

Supported parameter syntax:

- **Required** — `{{ name }}` → Error if missing
- **Optional** — `{{ name ?}}` → Defaults to empty
- **Fallback** — `{{ name | default }}` → Defaults to value after `|`

### 3. Save the Template

Place your `.html` template file inside the following folder in your vault:

```bash
.obsidian/plugins/obsidian-callout-forge/HTML
```

### 4. Use the Codeblock in Your Note

In any Markdown note, use a `calloutforge` codeblock to render the template:

````markdown
```calloutforge
template: template-name
title: A Sample Title
cd: 10
content: This is the main content area.
```
````

### 5. Result

Each parameter (e.g., `title`, `cd`, `content`) will be replaced in the HTML template with the corresponding value from the codeblock, rendering the final output directly in your note.

The template can be reused multiple times in a single note, in different notes and even inside other templates!

`````markdown
````calloutforge
template: parent
content:
Parent content

```calloutforge
template: child
content: Child content **with bold**
```
````
````

---
## 📚 Documentation

This section explains how the plugin handles templates and parameters. Please note this highlights the desired behavior of the plugin but is not guaranteed.

### Required Parameters

Each `calloutforge` codeblock **must** include a `template` parameter specifying the HTML template filename (without `.html`) located in the template folder.

````markdown
```calloutforge
template: my-template
content: This is the content block.
```
`````

## Parameter Rules

- Order of parameters **does not matter**.
- Extra parameters not used in the template are **ignored** (may be configurable in future).
- Spaces inside braces are ignored: `{{title}}` is equivalent to `{{ title }}`.
- Multiple occurrences of a parameter are replaced everywhere in the template. Also, multiple occurrences of the same **defaulted** parameter may have different default values.
- Placeholders are replaced with rendered Markdown from the codeblock.
- No limits on the number of placeholders or in the structure of the template besides regular HTML.

---
## 🤝 Contributing

Contributions are most welcome and appreciated!

If you:
- Find a bug
- Have suggestions
- Want to share your beautiful templates
- Encounter any issue

Please [open an issue](https://github.com/PippoGot/obsidian-callout-forge/issues) or submit a PR.

---
## 🔮 Future Work
- Built-in template editor with CSS + live preview
- Commands to manage and open the template folder
- Support for multiple template folders

---
## ⚠️ Disclaimer

This plugin was created by **[Pippogot](https://github.com/PippoGot)**, a non-professional developer. While every effort has been made to ensure proper functionality, **the plugin is provided as-is with no guarantees**.

Parts of the code were developed with AI assistance, since the author has limited experience with TypeScript and Obsidian plugin development.

Although it should work alongside other Obsidian plugins, **compatibility is not guaranteed**.

Maintenance and updates will be provided on a best-effort basis depending on the author's availability and interest. Please keep this in mind when relying on the plugin.
