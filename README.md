# LaTeX Autofill

IDE-style LaTeX autocomplete for [Obsidian](https://obsidian.md). Type inside a math block and a completion list pops up at the cursor, the way code completion works in an IDE. Every command can be found by its English name, its Chinese name, or the LaTeX command itself.

[中文说明](#中文说明)

## Features

- **Autocomplete while typing.** Type `\` followed by a command or a keyword (`\frac`, `\sum`, `\integral`) anywhere. Inside `$...$` or `$$...$$` you can skip the backslash: three or more letters (`alpha`, `matrix`) or any Chinese word (`求和`) is enough.
- **English and Chinese search.** Over 230 entries covering operators, relations, sets, logic, arrows, brackets, fonts, accents, functions, matrices, environments, spacing, probability, and the Greek alphabet.
- **Placeholder selection.** After inserting, the first `{...}` argument is selected, so `\frac{a}{b}` lets you type the numerator straight away.
- **Auto-wrap outside math.** Triggering with `\` in normal text inserts `$...$` for you.
- **Search window.** Open "搜索 LaTeX 写法" (Search LaTeX) from the command palette or the Σ ribbon icon to browse everything. `Enter` inserts, `Shift+Enter` inserts wrapped in `$ $`, `Cmd/Ctrl+Enter` copies.

| Key | Action |
|---|---|
| `↑` `↓` | Move selection |
| `Enter` / `Tab` | Insert |
| `Esc` | Close |

## Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest).
2. Create the folder `<your vault>/.obsidian/plugins/latex-autofill/` and put the three files in it.
3. In Obsidian, open **Settings → Community plugins**, then enable **LaTeX Autofill**.

## Notes

- Inside a `$$` block, a plain English word can open the list. Press `Esc` first if you want `Enter` to start a new line.
- If you also use LaTeX Suite, both plugins listen for `Tab` in math. While the completion list is open, this plugin takes it.

## Adding entries

Entries live in the `DATA` block at the top of `main.js`, one per line:

```
category ;; Chinese name ;; keywords (English and Chinese) ;; LaTeX
```

Pull requests with new entries are welcome.

---

## 中文说明

在 Obsidian 公式里打字时，像 IDE 一样在光标处弹出 LaTeX 补全。中文名、英文名或命令本身都能搜到。

### 怎么用

- 任何地方打 `\` 加命令或关键词，例如 `\frac`、`\sum`、`\求和`。
- 在 `$...$` 或 `$$...$$` 里可以不打 `\`：连续 3 个以上英文字母，或者任意中文，都会弹出候选。
- `↑` `↓` 选择，`回车` 或 `Tab` 插入，`esc` 关闭。
- 插入后会自动选中第一个 `{}` 里的内容，可以直接接着打。
- 在公式外面用 `\` 触发，会自动包上 `$ $`。
- 按 `Cmd+P` 搜索「搜索 LaTeX 写法」，或点左侧 Σ 图标，可以打开完整的搜索窗口。

### 安装

从 [最新 Release](../../releases/latest) 下载 `main.js`、`manifest.json`、`styles.css`，放进 `<你的 Vault>/.obsidian/plugins/latex-autofill/`，再到「设置 → 第三方插件」里启用 **LaTeX Autofill**。

## License

[MIT](LICENSE)
