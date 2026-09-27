# LaTeX Autofill

IDE-style LaTeX autocomplete for [Obsidian](https://obsidian.md). Type inside a math block and a completion list pops up at the cursor, the way code completion works in an IDE. Every command can be found by its English name, its Chinese name, or the LaTeX command itself.

[中文说明](#中文说明)

## Why another LaTeX completer?

Most LaTeX completers match what you type against command names, so you have to know `\overset` or `\left.` before they can help. LaTeX Autofill matches what you mean, and still includes the full command list for when you do know the name.

| | LaTeX Autofill | Completr |
|---|---|---|
| Find `\frac{\partial f}{\partial x}` by typing | `偏导数`, or `partial derivative` in the search window | `\frac` or `\partial` |
| Search in Chinese | Yes | No |
| Each entry shows a name and category | Yes (`偏导数 · partial derivative · 运算`) | Command only |
| Matrices and `cases` | Inserted with example contents; `Tab` walks through every cell | Inserted as an empty `\begin … \end` skeleton |
| Commands | About 1,240: 236 curated entries plus Completr's full command list | About 1,085 |
| `Tab` / `Shift+Tab` between placeholders | Yes | Yes |
| Completes ordinary words, front matter, callouts | No, LaTeX only | Yes |

## Features

- **Autocomplete while typing.** Type `\` followed by a command or a keyword (`\frac`, `\sum`, `\integral`) anywhere. Inside `$...$` or `$$...$$` you can skip the backslash: three or more letters (`alpha`, `matrix`) or any Chinese word (`求和`) is enough. Without the backslash only curated entries are shown, so ordinary words in a formula don't flood the list.
- **English and Chinese search.** 236 curated entries covering operators, relations, sets, logic, arrows, brackets, fonts, accents, functions, matrices, environments, spacing, probability, and the Greek alphabet, ranked above the plain command list.
- **Placeholders.** After inserting, the first argument is selected. `Tab` jumps to the next one and `Shift+Tab` goes back; after the last one, `Tab` moves the cursor past the snippet. Remaining placeholders are underlined. In matrices and `cases`, every cell is a placeholder.
- **Nested snippets.** Completing inside a placeholder (for example `\sqrt` inside `\frac{…}`) keeps the outer snippet's remaining placeholders.
- **Inline-aware.** Multi-line environments are flattened to one line inside `$...$`.
- **Auto-wrap outside math.** Triggering with `\` in normal text inserts `$...$` for you.
- **Search window.** Open "搜索 LaTeX 写法" (Search LaTeX) from the command palette or the Σ ribbon icon to browse everything. `Enter` inserts, `Shift+Enter` inserts wrapped in `$ $`, `Cmd/Ctrl+Enter` copies.

| Key | Action |
|---|---|
| `↑` `↓` | Move selection in the list |
| `Enter` / `Tab` | Insert |
| `Tab` / `Shift+Tab` | Next / previous placeholder |
| `Esc` | Close the list, or stop placeholder jumping |

## Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](../../releases/latest).
2. Create the folder `<your vault>/.obsidian/plugins/latex-autofill/` and put the three files in it.
3. In Obsidian, open **Settings → Community plugins**, then enable **LaTeX Autofill**.

## Notes

- Inside a `$$` block, a plain English word can open the list. Press `Esc` first if you want `Enter` to start a new line.
- If you also use LaTeX Suite, both plugins listen for `Tab` in math. While the list is open or placeholders are active, this plugin takes it.
- Don't enable Completr's LaTeX provider at the same time, or two lists will pop up.

## Adding entries

Curated entries live in the `DATA` block at the top of `main.js`, one per line:

```
category ;; Chinese name ;; keywords (English and Chinese) ;; LaTeX
```

Each `{...}` argument and each matrix cell becomes a placeholder automatically. Pull requests with new entries are welcome.

## Credits

The plain command list comes from [Completr](https://github.com/tth05/obsidian-completr) by tth05, used under the MIT License. See [LICENSE](LICENSE).

---

## 中文说明

在 Obsidian 公式里打字时，像 IDE 一样在光标处弹出 LaTeX 补全。中文名、英文名或命令本身都能搜到。

### 和 Completr 有什么不同

大多数 LaTeX 补全插件只按命令名匹配，得先知道命令叫什么才能用。这个插件按意思匹配：想要偏导数，直接打「偏导数」就行。同时也收录了 Completr 的完整命令表，知道命令名时照样能用。

| | LaTeX Autofill | Completr |
|---|---|---|
| 找到 `\frac{\partial f}{\partial x}` 要打 | `偏导数`（搜索窗口里也可以打 `partial derivative`） | `\frac` 或 `\partial` |
| 中文搜索 | 支持 | 不支持 |
| 每条显示名称和分类 | 是（`偏导数 · partial derivative · 运算`） | 只显示命令 |
| 矩阵、分段函数 | 插入带示例内容的完整写法，`Tab` 逐格跳 | 插入空的 `\begin … \end` 骨架 |
| 命令数量 | 约 1240 条：236 条精选 + Completr 的全部命令 | 约 1085 条 |
| `Tab` / `Shift+Tab` 在参数间跳转 | 支持 | 支持 |
| 补全普通单词、front matter、callout | 不支持，只做 LaTeX | 支持 |

### 怎么用

- 任何地方打 `\` 加命令或关键词，例如 `\frac`、`\sum`、`\求和`。
- 在 `$...$` 或 `$$...$$` 里可以不打 `\`：连续 3 个以上英文字母，或者任意中文，都会弹出候选。不打 `\` 时只显示精选条目，免得公式里的普通单词弹出一大堆。
- `↑` `↓` 选择，`回车` 或 `Tab` 插入，`esc` 关闭。
- 插入后自动选中第一个参数；`Tab` 跳到下一个，`Shift+Tab` 回到上一个，最后一个之后再按 `Tab`，光标跳到这段写法的末尾。没填的参数有下划线提示。矩阵和分段函数的每一格都是参数。
- 在参数里再补全（比如在 `\frac{…}` 里补一个 `\sqrt`），外层剩下的参数照样能跳。
- 在 `$...$` 里插入多行环境，会自动合并成一行。
- 在公式外面用 `\` 触发，会自动包上 `$ $`。
- 按 `Cmd+P` 搜索「搜索 LaTeX 写法」，或点左侧 Σ 图标，可以打开完整的搜索窗口。

### 安装

从 [最新 Release](../../releases/latest) 下载 `main.js`、`manifest.json`、`styles.css`，放进 `<你的 Vault>/.obsidian/plugins/latex-autofill/`，再到「设置 → 第三方插件」里启用 **LaTeX Autofill**。

### 致谢

普通命令表来自 tth05 的 [Completr](https://github.com/tth05/obsidian-completr)，按 MIT 协议使用，详见 [LICENSE](LICENSE)。

## License

[MIT](LICENSE)
