const {
  Plugin,
  SuggestModal,
  EditorSuggest,
  MarkdownView,
  Notice,
  prepareFuzzySearch,
} = require("obsidian");

// 每行：分类 ;; 名称 ;; 关键词 ;; LaTeX
const DATA = String.raw`
运算 ;; 求和 ;; sum sigma 累加 连加 总和 西格玛 ;; \sum_{i=1}^{n} a_i
运算 ;; 无穷级数 ;; series infinite sum 级数 无穷求和 ;; \sum_{n=0}^{\infty} a_n
运算 ;; 求积 连乘 ;; product prod 累乘 乘积 ;; \prod_{i=1}^{n} a_i
运算 ;; 余积 ;; coproduct coprod ;; \coprod_{i} A_i
运算 ;; 积分 ;; integral int 定积分 ;; \int_{a}^{b} f(x)\,dx
运算 ;; 不定积分 ;; indefinite integral int 原函数 ;; \int f(x)\,dx
运算 ;; 二重积分 ;; double integral iint ;; \iint_{D} f(x,y)\,dA
运算 ;; 三重积分 ;; triple integral iiint ;; \iiint_{V} f\,dV
运算 ;; 环路积分 曲线积分 ;; contour line integral oint ;; \oint_{C} \mathbf{F}\cdot d\mathbf{r}
运算 ;; 极限 ;; limit lim 趋于 趋近 ;; \lim_{x \to a} f(x)
运算 ;; 数列极限 ;; limit sequence 无穷 ;; \lim_{n \to \infty} a_n
运算 ;; 单侧极限 ;; one-sided limit 左极限 右极限 ;; \lim_{x \to a^{+}} f(x)
运算 ;; 上极限 ;; limsup limit superior ;; \limsup_{n \to \infty} a_n
运算 ;; 下极限 ;; liminf limit inferior ;; \liminf_{n \to \infty} a_n
运算 ;; 分数 ;; fraction frac 除 分式 分子 分母 ;; \frac{a}{b}
运算 ;; 大号分数 ;; dfrac display fraction ;; \dfrac{a}{b}
运算 ;; 小号分数 ;; tfrac text fraction ;; \tfrac{a}{b}
运算 ;; 平方根 ;; square root sqrt 根号 开方 ;; \sqrt{x}
运算 ;; n 次根 ;; nth root sqrt 根号 开方 ;; \sqrt[n]{x}
运算 ;; 上标 幂 ;; power superscript 指数 次方 平方 ;; x^{n}
运算 ;; 下标 ;; subscript index 脚标 角标 ;; x_{i}
运算 ;; 组合数 ;; binomial binom choose 二项式 ;; \binom{n}{k}
运算 ;; 导数 ;; derivative 求导 微分 ;; \frac{dy}{dx}
运算 ;; 高阶导数 ;; nth derivative 求导 ;; \frac{d^{n}y}{dx^{n}}
运算 ;; 偏导数 ;; partial derivative 偏微分 ;; \frac{\partial f}{\partial x}
运算 ;; 二阶偏导 ;; second partial mixed 混合偏导 ;; \frac{\partial^2 f}{\partial x \partial y}
运算 ;; 撇号导数 ;; prime derivative 导数 ;; f'(x),\ f''(x)
运算 ;; 梯度 ;; gradient nabla del 散度 旋度 ;; \nabla f
运算 ;; 乘号 叉乘 ;; times cross 乘 叉积 ;; a \times b
运算 ;; 点乘 ;; cdot dot 点积 乘 ;; a \cdot b
运算 ;; 除号 ;; div divide ;; a \div b
运算 ;; 正负号 ;; plus minus pm ;; \pm
运算 ;; 负正号 ;; minus plus mp ;; \mp
运算 ;; 函数复合 ;; composition circ 复合 ;; f \circ g
运算 ;; 直和 ;; direct sum oplus ;; V \oplus W
运算 ;; 张量积 ;; tensor product otimes ;; V \otimes W
运算 ;; 大直和 ;; bigoplus direct sum ;; \bigoplus_{i=1}^{n} V_i
运算 ;; 同余 取模 ;; congruence mod modulo pmod ;; a \equiv b \pmod{n}
运算 ;; 模运算 ;; bmod modulo 余数 ;; a \bmod n
关系 ;; 小于等于 ;; leq le less equal 不大于 ;; \leq
关系 ;; 大于等于 ;; geq ge greater equal 不小于 ;; \geq
关系 ;; 不等于 ;; neq ne not equal ;; \neq
关系 ;; 约等于 ;; approx approximately 近似 ;; \approx
关系 ;; 恒等 ;; equiv identical 等价 同余 ;; \equiv
关系 ;; 定义为 ;; define definition 记为 def ;; \overset{\text{def}}{=}
关系 ;; 相似 同阶 ;; sim similar tilde ;; \sim
关系 ;; 同构 全等 ;; cong isomorphic congruent ;; \cong
关系 ;; 渐近相等 ;; simeq asymptotic ;; \simeq
关系 ;; 正比于 ;; propto proportional ;; \propto
关系 ;; 远小于 ;; ll much less ;; \ll
关系 ;; 远大于 ;; gg much greater ;; \gg
关系 ;; 整除 ;; divides mid 竖线 ;; a \mid b
关系 ;; 不整除 ;; not divides nmid ;; a \nmid b
关系 ;; 平行 ;; parallel ;; \parallel
关系 ;; 垂直 正交 ;; perp perpendicular orthogonal ;; \perp
集合 ;; 属于 ;; in element member 元素 ;; x \in A
集合 ;; 不属于 ;; notin not element ;; x \notin A
集合 ;; 包含 逆向属于 ;; ni contains ;; A \ni x
集合 ;; 子集 ;; subseteq subset 包含于 ;; A \subseteq B
集合 ;; 真子集 ;; proper subset subsetneq ;; A \subsetneq B
集合 ;; 子集（严格记号） ;; subset ;; A \subset B
集合 ;; 超集 ;; supseteq superset 包含 ;; A \supseteq B
集合 ;; 并集 ;; union cup 并 ;; A \cup B
集合 ;; 交集 ;; intersection cap 交 ;; A \cap B
集合 ;; 大并 ;; bigcup union 并 ;; \bigcup_{i=1}^{n} A_i
集合 ;; 大交 ;; bigcap intersection 交 ;; \bigcap_{i=1}^{n} A_i
集合 ;; 差集 ;; setminus difference 减 ;; A \setminus B
集合 ;; 补集 ;; complement ;; A^{c}
集合 ;; 空集 ;; emptyset empty ;; \emptyset
集合 ;; 空集（变体） ;; varnothing empty ;; \varnothing
集合 ;; 集合构造 ;; set builder 集合 花括号 ;; \{\, x \in A \mid P(x) \,\}
集合 ;; 实数集 ;; real numbers R mathbb 黑板粗体 ;; \mathbb{R}
集合 ;; 自然数集 ;; natural numbers N mathbb ;; \mathbb{N}
集合 ;; 整数集 ;; integers Z mathbb ;; \mathbb{Z}
集合 ;; 有理数集 ;; rationals Q mathbb ;; \mathbb{Q}
集合 ;; 复数集 ;; complex numbers C mathbb ;; \mathbb{C}
集合 ;; n 维实空间 ;; euclidean space R^n ;; \mathbb{R}^{n}
集合 ;; 幂集 ;; power set ;; \mathcal{P}(A)
集合 ;; 笛卡尔积 ;; cartesian product times ;; A \times B
集合 ;; 基数 势 ;; cardinality aleph ;; |A|,\ \aleph_0
逻辑 ;; 任意 ;; forall for all 对所有 全称 ;; \forall x
逻辑 ;; 存在 ;; exists 存在量词 ;; \exists x
逻辑 ;; 存在唯一 ;; exists unique ;; \exists! x
逻辑 ;; 不存在 ;; nexists not exists ;; \nexists x
逻辑 ;; 非 ;; not neg 否定 ;; \neg p
逻辑 ;; 且 ;; and land wedge 合取 ;; p \land q
逻辑 ;; 或 ;; or lor vee 析取 ;; p \lor q
逻辑 ;; 推出 蕴含 ;; implies 则 如果 ;; p \implies q
逻辑 ;; 被推出 ;; impliedby ;; p \impliedby q
逻辑 ;; 当且仅当 ;; iff if and only if 等价 充要 ;; p \iff q
逻辑 ;; 所以 ;; therefore ;; \therefore
逻辑 ;; 因为 ;; because since ;; \because
逻辑 ;; 真 假 矛盾 ;; top bot true false contradiction ;; \top,\ \bot
箭头 ;; 趋于 右箭头 ;; to rightarrow ;; x \to a
箭头 ;; 映射到 ;; mapsto maps to ;; x \mapsto f(x)
箭头 ;; 函数定义 ;; function map 映射 ;; f: A \to B
箭头 ;; 左箭头 ;; leftarrow gets ;; \leftarrow
箭头 ;; 双向箭头 ;; leftrightarrow ;; \leftrightarrow
箭头 ;; 双线右箭头 ;; Rightarrow double arrow ;; \Rightarrow
箭头 ;; 双线左箭头 ;; Leftarrow double arrow ;; \Leftarrow
箭头 ;; 双线双向箭头 ;; Leftrightarrow double arrow ;; \Leftrightarrow
箭头 ;; 长箭头 ;; longrightarrow long arrow ;; \longrightarrow
箭头 ;; 单射箭头 ;; injection hookrightarrow 单射 ;; \hookrightarrow
箭头 ;; 满射箭头 ;; surjection twoheadrightarrow 满射 ;; \twoheadrightarrow
箭头 ;; 带字箭头 ;; xrightarrow labeled arrow ;; \xrightarrow{f}
箭头 ;; 上下箭头 单调 ;; uparrow downarrow monotone ;; \uparrow\ \downarrow
箭头 ;; 斜箭头 ;; nearrow searrow ;; \nearrow\ \searrow
括号 ;; 自适应圆括号 ;; left right parentheses 括号 大小 ;; \left( \frac{a}{b} \right)
括号 ;; 方括号 ;; brackets square ;; \left[ x \right]
括号 ;; 花括号 ;; braces curly 大括号 ;; \left\{ x \right\}
括号 ;; 尖括号 内积 ;; angle brackets inner product langle rangle ;; \langle u, v \rangle
括号 ;; 绝对值 ;; absolute value abs ;; \left| x \right|
括号 ;; 范数 ;; norm 双竖线 ;; \left\| x \right\|
括号 ;; 向下取整 ;; floor 取整 ;; \lfloor x \rfloor
括号 ;; 向上取整 ;; ceil ceiling 取整 ;; \lceil x \rceil
括号 ;; 求值竖线 ;; evaluated at 代入 ;; \left. f(x) \right|_{x=0}
括号 ;; 上大括号 ;; overbrace 上括号 ;; \overbrace{a+b}^{n}
括号 ;; 下大括号 ;; underbrace 下括号 ;; \underbrace{a+\cdots+a}_{n}
字体 ;; 黑板粗体 ;; mathbb blackboard bold 空心 ;; \mathbb{R}
字体 ;; 花体 ;; mathcal calligraphic 手写 ;; \mathcal{F}
字体 ;; 哥特体 ;; mathfrak fraktur ;; \mathfrak{g}
字体 ;; 粗体 ;; mathbf bold 向量 ;; \mathbf{v}
字体 ;; 粗斜体 ;; boldsymbol bold greek ;; \boldsymbol{\alpha}
字体 ;; 正体 ;; mathrm roman upright 直立 ;; \mathrm{d}x
字体 ;; 文字 ;; text 文本 中文 ;; \text{if } x > 0
字体 ;; 自定义算子 ;; operatorname function name 函数名 ;; \operatorname{rank}(A)
装饰 ;; 帽子 ;; hat 估计 ;; \hat{x}
装饰 ;; 宽帽子 ;; widehat ;; \widehat{xy}
装饰 ;; 横线 ;; bar mean 均值 ;; \bar{x}
装饰 ;; 上划线 共轭 闭包 ;; overline conjugate closure ;; \overline{z}
装饰 ;; 下划线 ;; underline ;; \underline{x}
装饰 ;; 向量箭头 ;; vec vector 向量 ;; \vec{v}
装饰 ;; 长向量箭头 ;; overrightarrow vector 向量 ;; \overrightarrow{AB}
装饰 ;; 波浪 ;; tilde ;; \tilde{x}
装饰 ;; 宽波浪 ;; widetilde ;; \widetilde{xy}
装饰 ;; 一阶点 ;; dot time derivative 时间导数 ;; \dot{x}
装饰 ;; 二阶点 ;; ddot ;; \ddot{x}
装饰 ;; 上方加字 ;; overset stackrel ;; \overset{!}{=}
装饰 ;; 下方加字 ;; underset ;; \underset{x}{\operatorname{arg\,max}}
装饰 ;; 否定斜线 ;; not negate slash 划掉 ;; \not\equiv
函数 ;; 三角函数 ;; sin cos tan trig 正弦 余弦 正切 ;; \sin x,\ \cos x,\ \tan x
函数 ;; 反三角函数 ;; arcsin arccos arctan inverse trig ;; \arcsin x,\ \arctan x
函数 ;; 双曲函数 ;; sinh cosh tanh hyperbolic ;; \sinh x,\ \cosh x
函数 ;; 自然对数 ;; ln log natural ;; \ln x
函数 ;; 对数 ;; log logarithm base ;; \log_{a} x
函数 ;; 指数函数 ;; exp e exponential ;; e^{x},\ \exp(x)
函数 ;; 最大 最小 ;; max min maximum minimum 最值 ;; \max_{x \in S} f(x)
函数 ;; 上确界 ;; sup supremum ;; \sup_{x \in S} f(x)
函数 ;; 下确界 ;; inf infimum ;; \inf_{x \in S} f(x)
函数 ;; 最值点 ;; argmax argmin ;; \arg\max_{x} f(x)
函数 ;; 行列式 ;; det determinant ;; \det(A)
函数 ;; 维数 ;; dim dimension ;; \dim V
函数 ;; 核 零空间 ;; ker kernel null space ;; \ker T
函数 ;; 像 值域 ;; image range ;; \operatorname{im} T
函数 ;; 迹 ;; trace tr ;; \operatorname{tr}(A)
函数 ;; 秩 ;; rank ;; \operatorname{rank}(A)
函数 ;; 转置 ;; transpose ;; A^{T}
函数 ;; 逆 ;; inverse 逆矩阵 反函数 ;; A^{-1}
函数 ;; 共轭转置 ;; dagger hermitian adjoint ;; A^{\dagger}
函数 ;; 最大公约数 ;; gcd greatest common divisor ;; \gcd(a, b)
函数 ;; 大 O ;; big o complexity 复杂度 ;; \mathcal{O}(n^2)
矩阵 ;; 圆括号矩阵 ;; pmatrix matrix parentheses 小括号 ;; \begin{pmatrix} a & b \\ c & d \end{pmatrix}
矩阵 ;; 方括号矩阵 ;; bmatrix matrix brackets 中括号 ;; \begin{bmatrix} a & b \\ c & d \end{bmatrix}
矩阵 ;; 花括号矩阵 ;; Bmatrix matrix braces 大括号 ;; \begin{Bmatrix} a & b \\ c & d \end{Bmatrix}
矩阵 ;; 行列式竖线矩阵 ;; vmatrix determinant ;; \begin{vmatrix} a & b \\ c & d \end{vmatrix}
矩阵 ;; 无括号矩阵 ;; matrix plain ;; \begin{matrix} a & b \\ c & d \end{matrix}
矩阵 ;; 一般 m×n 矩阵 ;; general matrix dots 省略 ;; \begin{pmatrix} a_{11} & \cdots & a_{1n} \\ \vdots & \ddots & \vdots \\ a_{m1} & \cdots & a_{mn} \end{pmatrix}
矩阵 ;; 列向量 ;; column vector 向量 ;; \begin{pmatrix} x_1 \\ x_2 \\ x_3 \end{pmatrix}
矩阵 ;; 增广矩阵 ;; augmented matrix array ;; \left[\begin{array}{cc|c} 1 & 2 & 3 \\ 4 & 5 & 6 \end{array}\right]
结构 ;; 分段函数 ;; cases piecewise 分情况 ;; f(x) = \begin{cases} x & x \ge 0 \\ -x & x < 0 \end{cases}
结构 ;; 方程组 ;; system of equations cases ;; \begin{cases} x + y = 1 \\ x - y = 0 \end{cases}
结构 ;; 多行对齐 ;; aligned align 等号对齐 推导 ;; \begin{aligned} a &= b + c \\ &= d \end{aligned}
结构 ;; 公式编号 ;; tag number 编号 ;; E = mc^2 \tag{1}
点 ;; 居中省略号 ;; cdots dots ellipsis ;; a_1 + \cdots + a_n
点 ;; 底部省略号 ;; ldots dots ellipsis ;; a_1, \ldots, a_n
点 ;; 竖省略号 ;; vdots vertical dots ;; \vdots
点 ;; 斜省略号 ;; ddots diagonal dots ;; \ddots
空格 ;; 小空格 ;; thin space 间距 ;; a\,b
空格 ;; 普通空格 ;; space 间距 ;; a\ b
空格 ;; quad 空格 ;; quad space 间距 ;; a \quad b
空格 ;; qquad 空格 ;; qquad space 间距 ;; a \qquad b
空格 ;; 负空格 ;; negative space 间距 ;; a\!b
符号 ;; 无穷 ;; infinity infty ;; \infty
符号 ;; 偏微分符号 ;; partial ;; \partial
符号 ;; 角 ;; angle ;; \angle ABC
符号 ;; 三角形 ;; triangle ;; \triangle ABC
符号 ;; 度 ;; degree 角度 ;; 90^\circ
符号 ;; 约化普朗克常数 ;; hbar planck ;; \hbar
符号 ;; 手写 l ;; ell ;; \ell
符号 ;; 实部 虚部 ;; real imaginary part re im ;; \operatorname{Re}(z),\ \operatorname{Im}(z)
符号 ;; 阿列夫 ;; aleph cardinal ;; \aleph_0
符号 ;; 星号 ;; star ast asterisk ;; \star,\ \ast
符号 ;; 证毕 ;; qed square box 证明完毕 ;; \square,\ \blacksquare
概率 ;; 期望 ;; expectation expected value ;; \mathbb{E}[X]
概率 ;; 概率 ;; probability ;; \mathbb{P}(A)
概率 ;; 条件概率 ;; conditional probability ;; P(A \mid B)
概率 ;; 方差 ;; variance var ;; \operatorname{Var}(X)
概率 ;; 服从分布 ;; distributed sim normal 正态 ;; X \sim N(\mu, \sigma^2)
概率 ;; 独立 ;; independent perp ;; X \perp Y
`;

// [中文名, 命令, 英文名]
const GREEK = [
  ["阿尔法", "alpha"], ["贝塔", "beta"], ["伽马", "gamma"], ["德尔塔", "delta"],
  ["艾普西隆", "epsilon"], ["艾普西隆（变体）", "varepsilon"], ["泽塔", "zeta"],
  ["伊塔", "eta"], ["西塔", "theta"], ["西塔（变体）", "vartheta"], ["约塔", "iota"],
  ["卡帕", "kappa"], ["兰布达", "lambda"], ["缪", "mu"], ["纽", "nu"], ["克西", "xi"],
  ["派", "pi"], ["柔", "rho"], ["西格玛", "sigma"], ["陶", "tau"],
  ["宇普西隆", "upsilon"], ["斐", "phi"], ["斐（变体）", "varphi"], ["卡伊", "chi"],
  ["普西", "psi"], ["欧米伽", "omega"],
];
const GREEK_UPPER = [
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega",
];

function buildEntries() {
  const entries = [];
  for (const line of DATA.split("\n")) {
    if (!line.trim()) continue;
    const [cat, name, keys, tex] = line.split(" ;; ").map((s) => s.trim());
    if (!tex) continue;
    entries.push({ cat, name, keys, tex });
  }
  for (const [cn, cmd] of GREEK) {
    entries.push({ cat: "希腊字母", name: `${cn} ${cmd}`, en: "", keys: "greek 希腊 小写", tex: `\\${cmd}` });
  }
  const cnByCmd = Object.fromEntries(GREEK.map(([cn, cmd]) => [cmd, cn]));
  for (const cmd of GREEK_UPPER) {
    const cn = cnByCmd[cmd.toLowerCase()] || "";
    entries.push({ cat: "希腊字母", name: `大写${cn} ${cmd}`, en: "", keys: "greek 希腊 大写 uppercase", tex: `\\${cmd}` });
  }
  for (const e of entries) {
    if (e.en === undefined) {
      const leading = [];
      for (const word of e.keys.split(/\s+/)) {
        if (!/^[A-Za-z][A-Za-z-]*$/.test(word) || leading.length === 2) break;
        leading.push(word);
      }
      e.en = leading.join(" ");
    }
    e.nameLc = e.name.toLowerCase();
    e.texLc = e.tex.toLowerCase();
    e.hay = `${e.name} ${e.keys} ${e.cat} ${e.tex}`.toLowerCase();
  }
  return entries;
}

const ENTRIES = buildEntries();

function appendHighlighted(parent, text, query) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter((term) => term.length > 0);
  if (terms.length === 0) {
    parent.appendText(text);
    return;
  }

  const lower = text.toLowerCase();
  const marks = [];
  for (const term of terms) {
    let from = 0;
    while (from <= lower.length - term.length) {
      const index = lower.indexOf(term, from);
      if (index < 0) break;
      marks.push([index, index + term.length]);
      from = index + term.length;
    }
  }
  if (marks.length === 0) {
    parent.appendText(text);
    return;
  }

  marks.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged = [];
  for (const range of marks) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push(range.slice());
  }

  let cursor = 0;
  for (const [start, end] of merged) {
    if (cursor < start) parent.appendText(text.slice(cursor, start));
    parent.createSpan({ cls: "latex-lookup-match", text: text.slice(start, end) });
    cursor = end;
  }
  if (cursor < text.length) parent.appendText(text.slice(cursor));
}

function search(query, allowFuzzy = true) {
  const q = query.trim().toLowerCase();
  if (!q) return ENTRIES;

  const terms = q.split(/\s+/);
  const scored = [];
  for (const e of ENTRIES) {
    let score = 0;
    let ok = true;
    for (const term of terms) {
      const idx = e.hay.indexOf(term);
      if (idx < 0) { ok = false; break; }
      if (e.nameLc === term) score += 50;
      else if (e.nameLc.startsWith(term)) score += 20;
      else if (e.nameLc.includes(term)) score += 10;
      if (e.texLc.startsWith(term) || e.texLc.startsWith("\\" + term)) score += 15;
      else score -= idx * 0.01;
    }
    if (ok) scored.push({ e, score: score - e.tex.length * 0.001 });
  }

  if (scored.length === 0 && allowFuzzy) {
    const fuzzy = prepareFuzzySearch(q);
    for (const e of ENTRIES) {
      const r = fuzzy(e.hay);
      if (r) scored.push({ e, score: r.score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.e);
}

function renderRow(entry, el, query) {
  el.addClass("latex-lookup-item");

  const icon = el.createDiv({ cls: "latex-lookup-icon", attr: { "aria-hidden": "true" } });
  icon.createSpan({ text: "i" });

  const main = el.createDiv({ cls: "latex-lookup-main" });
  const name = main.createSpan({ cls: "latex-lookup-name" });
  appendHighlighted(name, entry.name, query);
  if (entry.en) {
    const en = main.createSpan({ cls: "latex-lookup-en" });
    appendHighlighted(en, entry.en, query);
  }
  main.createSpan({ cls: "latex-lookup-cat", text: entry.cat });

  const code = el.createEl("code", { cls: "latex-lookup-code" });
  appendHighlighted(code, entry.tex, query);
}

function isInMath(text) {
  let inFence = false;
  let inCode = false;
  let inline = false;
  let display = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const atLineStart = i === 0 || text[i - 1] === "\n";
    if (atLineStart && text.startsWith("```", i) && !inline && !display) {
      inFence = !inFence;
      i += 2;
      continue;
    }
    if (inFence) continue;
    if (ch === "\\") { i++; continue; }
    if (ch === "`" && !inline && !display) { inCode = !inCode; continue; }
    if (inCode) continue;
    if (ch === "\n" && text[i + 1] === "\n") inline = false;
    if (ch !== "$") continue;
    if (text[i + 1] === "$" && !inline) {
      display = !display;
      i++;
    } else if (!display) {
      inline = !inline;
    }
  }
  return inline || display;
}

function firstArgumentRange(tex) {
  for (let i = 0; i < tex.length; i++) {
    if (tex[i] === "\\") { i++; continue; }
    if (tex[i] !== "{") continue;
    let depth = 1;
    for (let j = i + 1; j < tex.length; j++) {
      if (tex[j] === "\\") { j++; continue; }
      if (tex[j] === "{") depth++;
      else if (tex[j] === "}" && --depth === 0) return j > i + 1 ? [i + 1, j] : null;
    }
    return null;
  }
  return null;
}

const HAN = "\\u3400-\\u9fff";
const BACKSLASH_TRIGGER = new RegExp(`\\\\([A-Za-z${HAN}]+)$`);
const WORD_TRIGGER = new RegExp(`(?:^|[^A-Za-z${HAN}\\\\])([${HAN}]+|[A-Za-z]{3,})$`);

class LatexAutocomplete extends EditorSuggest {
  constructor(app) {
    super(app);
    this.limit = 20;
    if (this.suggestEl) this.suggestEl.addClass("latex-lookup-suggest");
    this.setInstructions([
      { command: "↵ / Tab", purpose: "插入" },
      { command: "↑↓", purpose: "选择" },
      { command: "esc", purpose: "关闭" },
    ]);
    this.scope.register([], "Tab", (evt) => {
      if (this.suggestions && this.suggestions.useSelectedItem) {
        this.suggestions.useSelectedItem(evt);
        return false;
      }
      return true;
    });
  }

  onTrigger(cursor, editor) {
    const before = editor.getLine(cursor.line).slice(0, cursor.ch);
    const inMath = isInMath(editor.getRange({ line: 0, ch: 0 }, cursor));

    let match = before.match(BACKSLASH_TRIGGER);
    let start;
    if (match) {
      start = cursor.ch - match[0].length;
      this.fromBackslash = true;
    } else if (inMath && (match = before.match(WORD_TRIGGER))) {
      start = cursor.ch - match[1].length;
      this.fromBackslash = false;
    } else {
      return null;
    }

    this.inMath = inMath;
    return {
      start: { line: cursor.line, ch: start },
      end: cursor,
      query: match[1],
    };
  }

  getSuggestions(context) {
    return search(context.query, this.fromBackslash).slice(0, this.limit);
  }

  renderSuggestion(entry, el) {
    renderRow(entry, el, this.context ? this.context.query : "");
  }

  selectSuggestion(entry) {
    const context = this.context;
    if (!context) return;
    const { editor, start, end } = context;
    const prefix = this.inMath ? "" : "$";
    const text = `${prefix}${entry.tex}${prefix}`;
    editor.replaceRange(text, start, end);

    const offset = editor.posToOffset(start) + prefix.length;
    const arg = firstArgumentRange(entry.tex);
    if (arg) {
      editor.setSelection(editor.offsetToPos(offset + arg[0]), editor.offsetToPos(offset + arg[1]));
    } else {
      editor.setCursor(editor.offsetToPos(offset + entry.tex.length));
    }
    this.close();
  }
}

class LatexLookupModal extends SuggestModal {
  constructor(app, editor) {
    super(app);
    this.editor = editor;
    this.limit = 60;
    this.modalEl.addClass("latex-lookup-modal");
    this.setPlaceholder("搜索 LaTeX 写法，例如：求和、积分、矩阵、alpha");
    this.setInstructions([
      { command: "↵", purpose: editor ? "插入" : "复制" },
      { command: "Shift ↵", purpose: editor ? "插入并用 $ $ 包裹" : "复制（带 $ $）" },
      { command: "Mod ↵", purpose: "复制" },
      { command: "esc", purpose: "关闭" },
    ]);
    this.scope.register(["Shift"], "Enter", (evt) => { this.selectActiveSuggestion(evt); return false; });
    this.scope.register(["Mod"], "Enter", (evt) => { this.selectActiveSuggestion(evt); return false; });
  }

  getSuggestions(query) {
    return search(query);
  }

  renderSuggestion(entry, el) {
    renderRow(entry, el, this.inputEl.value);
  }

  onChooseSuggestion(entry, evt) {
    const wrap = evt && evt.shiftKey;
    const text = wrap ? `$${entry.tex}$` : entry.tex;
    const copyOnly = (evt && (evt.metaKey || evt.ctrlKey)) || !this.editor;

    if (copyOnly) {
      navigator.clipboard.writeText(text).then(
        () => new Notice(`已复制：${text}`),
        () => new Notice("复制失败"),
      );
      return;
    }
    this.editor.replaceSelection(text);
  }
}

module.exports = class LatexLookupPlugin extends Plugin {
  async onload() {
    this.registerEditorSuggest(new LatexAutocomplete(this.app));

    const open = () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const editor = view ? view.editor : null;
      new LatexLookupModal(this.app, editor).open();
    };

    this.addRibbonIcon("sigma", "搜索 LaTeX 写法", open);
    this.addCommand({
      id: "open-latex-lookup",
      name: "搜索 LaTeX 写法",
      callback: open,
    });
  }
};
