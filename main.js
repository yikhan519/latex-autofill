const {
  Plugin,
  SuggestModal,
  EditorSuggest,
  MarkdownView,
  Notice,
  prepareFuzzySearch,
  moment,
} = require("obsidian");
const { StateField, StateEffect, Prec } = require("@codemirror/state");
const { EditorView, Decoration, WidgetType, keymap } = require("@codemirror/view");

// 每行：分类 ;; 中文名 ;; 关键词 ;; LaTeX ;; 英文名
// 英文名可省略；省略时用关键词开头连续的英文单词。
const DATA = String.raw`
运算 ;; 求和 ;; sum sigma 累加 连加 总和 西格玛 ;; \sum_{i=1}^{n} a_i ;; Summation
运算 ;; 无穷级数 ;; series infinite sum 级数 无穷求和 ;; \sum_{n=0}^{\infty} a_n ;; Infinite series
运算 ;; 求积 连乘 ;; product prod 累乘 乘积 ;; \prod_{i=1}^{n} a_i ;; Product
运算 ;; 余积 ;; coproduct coprod ;; \coprod_{i} A_i ;; Coproduct
运算 ;; 定积分 ;; integral definite int 积分 ;; \int_{a}^{b} f(x)\,dx ;; Definite integral
运算 ;; 不定积分 ;; indefinite integral int 原函数 ;; \int f(x)\,dx ;; Indefinite integral
运算 ;; 二重积分 ;; double integral iint ;; \iint_{D} f(x,y)\,dA ;; Double integral
运算 ;; 三重积分 ;; triple integral iiint ;; \iiint_{V} f\,dV ;; Triple integral
运算 ;; 环路积分 曲线积分 ;; contour line integral oint ;; \oint_{C} \mathbf{F}\cdot d\mathbf{r} ;; Contour integral
运算 ;; 极限 ;; limit lim 趋于 趋近 ;; \lim_{x \to a} f(x) ;; Limit
运算 ;; 数列极限 ;; limit sequence 无穷 ;; \lim_{n \to \infty} a_n ;; Sequence limit
运算 ;; 单侧极限 ;; one-sided limit 左极限 右极限 ;; \lim_{x \to a^{+}} f(x) ;; One-sided limit
运算 ;; 上极限 ;; limsup limit superior ;; \limsup_{n \to \infty} a_n ;; Limit superior
运算 ;; 下极限 ;; liminf limit inferior ;; \liminf_{n \to \infty} a_n ;; Limit inferior
运算 ;; 分数 ;; fraction frac 除 分式 分子 分母 ;; \frac{a}{b} ;; Fraction
运算 ;; 大号分数 ;; dfrac display fraction ;; \dfrac{a}{b} ;; Display fraction
运算 ;; 小号分数 ;; tfrac text fraction ;; \tfrac{a}{b} ;; Text fraction
运算 ;; 平方根 ;; square root sqrt 根号 开方 ;; \sqrt{x} ;; Square root
运算 ;; n 次根 ;; nth root sqrt 根号 开方 ;; \sqrt[n]{x} ;; nth root
运算 ;; 上标 幂 ;; power superscript 指数 次方 平方 ;; x^{n} ;; Power
运算 ;; 下标 ;; subscript index 脚标 角标 ;; x_{i} ;; Subscript
运算 ;; 组合数 ;; binomial binom choose 二项式 ;; \binom{n}{k} ;; Binomial
运算 ;; 导数 ;; derivative 求导 微分 ;; \frac{dy}{dx} ;; Derivative
运算 ;; 高阶导数 ;; nth derivative 求导 ;; \frac{d^{n}y}{dx^{n}} ;; nth derivative
运算 ;; 偏导数 ;; partial derivative 偏微分 ;; \frac{\partial f}{\partial x} ;; Partial derivative
运算 ;; 二阶偏导 ;; second partial mixed 混合偏导 ;; \frac{\partial^2 f}{\partial x \partial y} ;; Second partial derivative
运算 ;; 撇号导数 ;; prime derivative 导数 ;; f'(x),\ f''(x) ;; Prime notation
运算 ;; 梯度 ;; gradient nabla del 散度 旋度 ;; \nabla f ;; Gradient
运算 ;; 乘号 叉乘 ;; times cross 乘 叉积 ;; a \times b ;; Times
运算 ;; 点乘 ;; cdot dot 点积 乘 ;; a \cdot b ;; Dot product
运算 ;; 除号 ;; div divide ;; a \div b ;; Division
运算 ;; 正负号 ;; plus minus pm ;; \pm ;; Plus-minus
运算 ;; 负正号 ;; minus plus mp ;; \mp ;; Minus-plus
运算 ;; 函数复合 ;; composition circ 复合 ;; f \circ g ;; Composition
运算 ;; 直和 ;; direct sum oplus ;; V \oplus W ;; Direct sum
运算 ;; 张量积 ;; tensor product otimes ;; V \otimes W ;; Tensor product
运算 ;; 大直和 ;; bigoplus direct sum ;; \bigoplus_{i=1}^{n} V_i ;; Big direct sum
运算 ;; 同余 取模 ;; congruence mod modulo pmod ;; a \equiv b \pmod{n} ;; Congruence
运算 ;; 模运算 ;; bmod modulo 余数 ;; a \bmod n ;; Modulo
关系 ;; 小于等于 ;; leq le less equal 不大于 ;; \leq ;; Less than or equal
关系 ;; 大于等于 ;; geq ge greater equal 不小于 ;; \geq ;; Greater than or equal
关系 ;; 不等于 ;; neq ne not equal ;; \neq ;; Not equal
关系 ;; 约等于 ;; approx approximately 近似 ;; \approx ;; Approximately equal
关系 ;; 恒等 ;; equiv identical 等价 同余 ;; \equiv ;; Identical
关系 ;; 定义为 ;; define definition 记为 def ;; \overset{\text{def}}{=} ;; Defined as
关系 ;; 相似 同阶 ;; sim similar tilde ;; \sim ;; Similar
关系 ;; 同构 全等 ;; cong isomorphic congruent ;; \cong ;; Congruent
关系 ;; 渐近相等 ;; simeq asymptotic ;; \simeq ;; Asymptotic
关系 ;; 正比于 ;; propto proportional ;; \propto ;; Proportional to
关系 ;; 远小于 ;; ll much less ;; \ll ;; Much less than
关系 ;; 远大于 ;; gg much greater ;; \gg ;; Much greater than
关系 ;; 整除 ;; divides mid 竖线 ;; a \mid b ;; Divides
关系 ;; 不整除 ;; not divides nmid ;; a \nmid b ;; Does not divide
关系 ;; 平行 ;; parallel ;; \parallel ;; Parallel
关系 ;; 垂直 正交 ;; perp perpendicular orthogonal ;; \perp ;; Perpendicular
集合 ;; 属于 ;; in element member 元素 ;; x \in A ;; Element of
集合 ;; 不属于 ;; notin not element ;; x \notin A ;; Not an element
集合 ;; 包含 逆向属于 ;; ni contains ;; A \ni x ;; Contains
集合 ;; 子集 ;; subseteq subset 包含于 ;; A \subseteq B ;; Subset
集合 ;; 真子集 ;; proper subset subsetneq ;; A \subsetneq B ;; Proper subset
集合 ;; 子集（严格记号） ;; subset ;; A \subset B ;; Strict subset
集合 ;; 超集 ;; supseteq superset 包含 ;; A \supseteq B ;; Superset
集合 ;; 并集 ;; union cup 并 ;; A \cup B ;; Union
集合 ;; 交集 ;; intersection cap 交 ;; A \cap B ;; Intersection
集合 ;; 大并 ;; bigcup union 并 ;; \bigcup_{i=1}^{n} A_i ;; Big union
集合 ;; 大交 ;; bigcap intersection 交 ;; \bigcap_{i=1}^{n} A_i ;; Big intersection
集合 ;; 差集 ;; setminus difference 减 ;; A \setminus B ;; Set difference
集合 ;; 补集 ;; complement ;; A^{c} ;; Complement
集合 ;; 空集 ;; emptyset empty ;; \emptyset ;; Empty set
集合 ;; 空集（变体） ;; varnothing empty ;; \varnothing ;; Empty set (variant)
集合 ;; 集合构造 ;; set builder 集合 花括号 ;; \{\, x \in A \mid P(x) \,\} ;; Set builder
集合 ;; 实数集 ;; real numbers R mathbb 黑板粗体 ;; \mathbb{R} ;; Real numbers
集合 ;; 自然数集 ;; natural numbers N mathbb ;; \mathbb{N} ;; Natural numbers
集合 ;; 整数集 ;; integers Z mathbb ;; \mathbb{Z} ;; Integers
集合 ;; 有理数集 ;; rationals Q mathbb ;; \mathbb{Q} ;; Rational numbers
集合 ;; 复数集 ;; complex numbers C mathbb ;; \mathbb{C} ;; Complex numbers
集合 ;; n 维实空间 ;; euclidean space R^n ;; \mathbb{R}^{n} ;; Euclidean space
集合 ;; 幂集 ;; power set ;; \mathcal{P}(A) ;; Power set
集合 ;; 笛卡尔积 ;; cartesian product times ;; A \times B ;; Cartesian product
集合 ;; 基数 势 ;; cardinality aleph ;; |A|,\ \aleph_0 ;; Cardinality
逻辑 ;; 任意 ;; forall for all 对所有 全称 ;; \forall x ;; For all
逻辑 ;; 存在 ;; exists 存在量词 ;; \exists x ;; There exists
逻辑 ;; 存在唯一 ;; exists unique ;; \exists! x ;; Unique existence
逻辑 ;; 不存在 ;; nexists not exists ;; \nexists x ;; Does not exist
逻辑 ;; 非 ;; not neg 否定 ;; \neg p ;; Not
逻辑 ;; 且 ;; and land wedge 合取 ;; p \land q ;; And
逻辑 ;; 或 ;; or lor vee 析取 ;; p \lor q ;; Or
逻辑 ;; 推出 蕴含 ;; implies 则 如果 ;; p \implies q ;; Implies
逻辑 ;; 被推出 ;; impliedby ;; p \impliedby q ;; Implied by
逻辑 ;; 当且仅当 ;; iff if and only if 等价 充要 ;; p \iff q ;; If and only if
逻辑 ;; 所以 ;; therefore ;; \therefore ;; Therefore
逻辑 ;; 因为 ;; because since ;; \because ;; Because
逻辑 ;; 真 假 矛盾 ;; top bot true false contradiction ;; \top,\ \bot ;; True and false
箭头 ;; 趋于 右箭头 ;; to rightarrow ;; x \to a ;; Right arrow
箭头 ;; 映射到 ;; mapsto maps to ;; x \mapsto f(x) ;; Maps to
箭头 ;; 函数定义 ;; function map 映射 ;; f: A \to B ;; Mapping
箭头 ;; 左箭头 ;; leftarrow gets ;; \leftarrow ;; Left arrow
箭头 ;; 双向箭头 ;; leftrightarrow ;; \leftrightarrow ;; Left-right arrow
箭头 ;; 双线右箭头 ;; Rightarrow double arrow ;; \Rightarrow ;; Double right arrow
箭头 ;; 双线左箭头 ;; Leftarrow double arrow ;; \Leftarrow ;; Double left arrow
箭头 ;; 双线双向箭头 ;; Leftrightarrow double arrow ;; \Leftrightarrow ;; Double left-right arrow
箭头 ;; 长箭头 ;; longrightarrow long arrow ;; \longrightarrow ;; Long arrow
箭头 ;; 单射箭头 ;; injection hookrightarrow 单射 ;; \hookrightarrow ;; Injection
箭头 ;; 满射箭头 ;; surjection twoheadrightarrow 满射 ;; \twoheadrightarrow ;; Surjection
箭头 ;; 带字箭头 ;; xrightarrow labeled arrow ;; \xrightarrow{f} ;; Labeled arrow
箭头 ;; 上下箭头 单调 ;; uparrow downarrow monotone ;; \uparrow\ \downarrow ;; Up-down arrows
箭头 ;; 斜箭头 ;; nearrow searrow ;; \nearrow\ \searrow ;; Diagonal arrows
括号 ;; 自适应圆括号 ;; left right parentheses 括号 大小 ;; \left( \frac{a}{b} \right) ;; Parentheses
括号 ;; 方括号 ;; brackets square ;; \left[ x \right] ;; Square brackets
括号 ;; 花括号 ;; braces curly 大括号 ;; \left\{ x \right\} ;; Curly braces
括号 ;; 尖括号 内积 ;; angle brackets inner product langle rangle ;; \langle u, v \rangle ;; Angle brackets
括号 ;; 绝对值 ;; absolute value abs ;; \left| x \right| ;; Absolute value
括号 ;; 范数 ;; norm 双竖线 ;; \left\| x \right\| ;; Norm
括号 ;; 向下取整 ;; floor 取整 ;; \lfloor x \rfloor ;; Floor
括号 ;; 向上取整 ;; ceil ceiling 取整 ;; \lceil x \rceil ;; Ceiling
括号 ;; 求值竖线 ;; evaluated at 代入 ;; \left. f(x) \right|_{x=0} ;; Evaluated at
括号 ;; 上大括号 ;; overbrace 上括号 ;; \overbrace{a+b}^{n} ;; Overbrace
括号 ;; 下大括号 ;; underbrace 下括号 ;; \underbrace{a+\cdots+a}_{n} ;; Underbrace
字体 ;; 黑板粗体 ;; mathbb blackboard bold 空心 ;; \mathbb{R} ;; Blackboard bold
字体 ;; 花体 ;; mathcal calligraphic 手写 ;; \mathcal{F} ;; Calligraphic
字体 ;; 哥特体 ;; mathfrak fraktur ;; \mathfrak{g} ;; Fraktur
字体 ;; 粗体 ;; mathbf bold 向量 ;; \mathbf{v} ;; Bold
字体 ;; 粗斜体 ;; boldsymbol bold greek ;; \boldsymbol{\alpha} ;; Bold symbol
字体 ;; 正体 ;; mathrm roman upright 直立 ;; \mathrm{d}x ;; Roman
字体 ;; 文字 ;; text 文本 中文 ;; \text{if } x > 0 ;; Text
字体 ;; 自定义算子 ;; operatorname function name 函数名 ;; \operatorname{rank}(A) ;; Operator name
装饰 ;; 帽子 ;; hat 估计 ;; \hat{x} ;; Hat
装饰 ;; 宽帽子 ;; widehat ;; \widehat{xy} ;; Wide hat
装饰 ;; 横线 ;; bar mean 均值 ;; \bar{x} ;; Bar
装饰 ;; 上划线 共轭 闭包 ;; overline conjugate closure ;; \overline{z} ;; Overline
装饰 ;; 下划线 ;; underline ;; \underline{x} ;; Underline
装饰 ;; 向量箭头 ;; vec vector 向量 ;; \vec{v} ;; Vector
装饰 ;; 长向量箭头 ;; overrightarrow vector 向量 ;; \overrightarrow{AB} ;; Long vector
装饰 ;; 波浪 ;; tilde ;; \tilde{x} ;; Tilde
装饰 ;; 宽波浪 ;; widetilde ;; \widetilde{xy} ;; Wide tilde
装饰 ;; 一阶点 ;; dot time derivative 时间导数 ;; \dot{x} ;; Dot
装饰 ;; 二阶点 ;; ddot ;; \ddot{x} ;; Double dot
装饰 ;; 上方加字 ;; overset stackrel ;; \overset{!}{=} ;; Overset
装饰 ;; 下方加字 ;; underset ;; \underset{x}{\operatorname{arg\,max}} ;; Underset
装饰 ;; 否定斜线 ;; not negate slash 划掉 ;; \not\equiv ;; Negation
函数 ;; 三角函数 ;; sin cos tan trig 正弦 余弦 正切 ;; \sin x,\ \cos x,\ \tan x ;; Trig functions
函数 ;; 反三角函数 ;; arcsin arccos arctan inverse trig ;; \arcsin x,\ \arctan x ;; Inverse trig
函数 ;; 双曲函数 ;; sinh cosh tanh hyperbolic ;; \sinh x,\ \cosh x ;; Hyperbolic functions
函数 ;; 自然对数 ;; ln log natural ;; \ln x ;; Natural log
函数 ;; 对数 ;; log logarithm base ;; \log_{a} x ;; Logarithm
函数 ;; 指数函数 ;; exp e exponential ;; e^{x},\ \exp(x) ;; Exponential
函数 ;; 最大 最小 ;; max min maximum minimum 最值 ;; \max_{x \in S} f(x) ;; Max and min
函数 ;; 上确界 ;; sup supremum ;; \sup_{x \in S} f(x) ;; Supremum
函数 ;; 下确界 ;; inf infimum ;; \inf_{x \in S} f(x) ;; Infimum
函数 ;; 最值点 ;; argmax argmin ;; \arg\max_{x} f(x) ;; Argmax
函数 ;; 行列式 ;; det determinant ;; \det(A) ;; Determinant
函数 ;; 维数 ;; dim dimension ;; \dim V ;; Dimension
函数 ;; 核 零空间 ;; ker kernel null space ;; \ker T ;; Kernel
函数 ;; 像 值域 ;; image range ;; \operatorname{im} T ;; Image
函数 ;; 迹 ;; trace tr ;; \operatorname{tr}(A) ;; Trace
函数 ;; 秩 ;; rank ;; \operatorname{rank}(A) ;; Rank
函数 ;; 转置 ;; transpose ;; A^{T} ;; Transpose
函数 ;; 逆 ;; inverse 逆矩阵 反函数 ;; A^{-1} ;; Inverse
函数 ;; 共轭转置 ;; dagger hermitian adjoint ;; A^{\dagger} ;; Conjugate transpose
函数 ;; 最大公约数 ;; gcd greatest common divisor ;; \gcd(a, b) ;; GCD
函数 ;; 大 O ;; big o complexity 复杂度 ;; \mathcal{O}(n^2) ;; Big O
矩阵 ;; 圆括号矩阵 ;; pmatrix matrix parentheses 小括号 2x2 ;; \begin{pmatrix} a & b \\ c & d \end{pmatrix} ;; 2×2 matrix
矩阵 ;; 方括号矩阵 ;; bmatrix matrix brackets 中括号 ;; \begin{bmatrix} a & b \\ c & d \end{bmatrix} ;; Bracketed matrix
矩阵 ;; 花括号矩阵 ;; Bmatrix matrix braces 大括号 ;; \begin{Bmatrix} a & b \\ c & d \end{Bmatrix} ;; Braced matrix
矩阵 ;; 行列式竖线矩阵 ;; vmatrix determinant ;; \begin{vmatrix} a & b \\ c & d \end{vmatrix} ;; Vertical bar matrix
矩阵 ;; 无括号矩阵 ;; matrix plain ;; \begin{matrix} a & b \\ c & d \end{matrix} ;; Matrix
矩阵 ;; 一般 m×n 矩阵 ;; general matrix dots 省略 ;; \begin{pmatrix} a_{11} & \cdots & a_{1n} \\ \vdots & \ddots & \vdots \\ a_{m1} & \cdots & a_{mn} \end{pmatrix} ;; General matrix
矩阵 ;; 列向量 ;; column vector 向量 ;; \begin{pmatrix} x_1 \\ x_2 \\ x_3 \end{pmatrix} ;; Column vector
矩阵 ;; 增广矩阵 ;; augmented matrix array ;; \left[\begin{array}{cc|c} 1 & 2 & 3 \\ 4 & 5 & 6 \end{array}\right] ;; Augmented matrix
结构 ;; 分段函数 ;; cases piecewise 分情况 ;; f(x) = \begin{cases} x & x \ge 0 \\ -x & x < 0 \end{cases} ;; Piecewise function
结构 ;; 方程组 ;; system of equations cases ;; \begin{cases} x + y = 1 \\ x - y = 0 \end{cases} ;; System of equations
结构 ;; 多行对齐 ;; aligned align 等号对齐 推导 ;; \begin{aligned} a &= b + c \\ &= d \end{aligned} ;; Aligned equations
结构 ;; 公式编号 ;; tag number 编号 ;; E = mc^2 \tag{1} ;; Equation tag
点 ;; 居中省略号 ;; cdots dots ellipsis ;; a_1 + \cdots + a_n ;; Centered dots
点 ;; 底部省略号 ;; ldots dots ellipsis ;; a_1, \ldots, a_n ;; Low dots
点 ;; 竖省略号 ;; vdots vertical dots ;; \vdots ;; Vertical dots
点 ;; 斜省略号 ;; ddots diagonal dots ;; \ddots ;; Diagonal dots
空格 ;; 小空格 ;; thin space 间距 ;; a\,b ;; Thin space
空格 ;; 普通空格 ;; space 间距 ;; a\ b ;; Space
空格 ;; quad 空格 ;; quad space 间距 ;; a \quad b ;; Quad
空格 ;; qquad 空格 ;; qquad space 间距 ;; a \qquad b ;; Double quad
空格 ;; 负空格 ;; negative space 间距 ;; a\!b ;; Negative space
符号 ;; 无穷 ;; infinity infty ;; \infty ;; Infinity
符号 ;; 偏微分符号 ;; symbol partial ;; \partial ;; Partial symbol
符号 ;; 角 ;; angle ;; \angle ABC ;; Angle
符号 ;; 三角形 ;; triangle ;; \triangle ABC ;; Triangle
符号 ;; 度 ;; degree 角度 ;; 90^\circ ;; Degree
符号 ;; 约化普朗克常数 ;; hbar planck ;; \hbar ;; h-bar
符号 ;; 手写 l ;; ell ;; \ell ;; Script l
符号 ;; 实部 虚部 ;; real imaginary part re im ;; \operatorname{Re}(z),\ \operatorname{Im}(z) ;; Real and imaginary parts
符号 ;; 阿列夫 ;; aleph cardinal ;; \aleph_0 ;; Aleph
符号 ;; 星号 ;; star ast asterisk ;; \star,\ \ast ;; Star
符号 ;; 证毕 ;; qed square box 证明完毕 ;; \square,\ \blacksquare ;; QED
概率 ;; 期望 ;; expectation expected value ;; \mathbb{E}[X] ;; Expected value
概率 ;; 概率 ;; probability ;; \mathbb{P}(A) ;; Probability
概率 ;; 条件概率 ;; conditional probability ;; P(A \mid B) ;; Conditional probability
概率 ;; 方差 ;; variance var ;; \operatorname{Var}(X) ;; Variance
概率 ;; 服从分布 ;; distributed sim normal 正态 ;; X \sim N(\mu, \sigma^2) ;; Distributed as
概率 ;; 独立 ;; independent perp ;; X \perp Y ;; Independent
`;

// [中文名, 命令]
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

// Command list from Completr (MIT License, Copyright (c) 2021 tth05), https://github.com/tth05/obsidian-completr
// The full license text is in THIRD_PARTY_LICENSES.
// `#` marks a placeholder and `~` marks where the cursor ends up.
const COMPLETR_COMMANDS = [
  "\\begin{align}\n~\n\\end{align}",
  "\\begin{alignat}{#}\n\\end{alignat}",
  "\\begin{aligned}\n~\n\\end{aligned}",
  "\\begin{alignedat}{#}\n\\end{alignedat}",
  "\\begin{array}{#}\n\\end{array}",
  "\\begin{bmatrix}\n~\n\\end{bmatrix}",
  "\\begin{Bmatrix}\n~\n\\end{Bmatrix}",
  "\\begin{bsmallmatrix}\n~\n\\end{bsmallmatrix}",
  "\\begin{Bsmallmatrix}\n~\n\\end{Bsmallmatrix}",
  "\\begin{cases}\n~\n\\end{cases}",
  "\\begin{crampedsubarray}{#}\n\\end{crampedsubarray}",
  "\\begin{dcases}\n~\n\\end{dcases}",
  "\\begin{drcases}\n~\n\\end{drcases}",
  "\\begin{empheq}{#}{#}\n\\end{empheq}",
  "\\begin{eqnarray}\n~\n\\end{eqnarray}",
  "\\begin{equation}\n~\n\\end{equation}",
  "\\begin{flalign}\n~\n\\end{flalign}",
  "\\begin{gather}\n~\n\\end{gather}",
  "\\begin{gathered}\n~\n\\end{gathered}",
  "\\begin{lgathered}\n~\n\\end{lgathered}",
  "\\begin{matrix}\n~\n\\end{matrix}",
  "\\begin{multiline}\n~\n\\end{multiline}",
  "\\begin{multilined}\n~\n\\end{multilined}",
  "\\begin{numcases}{#}\n\\end{numcases}",
  "\\begin{pmatrix}\n~\n\\end{pmatrix}",
  "\\begin{prooftree}\n~\n\\end{prooftree}",
  "\\begin{psmallmatrix}\n~\n\\end{psmallmatrix}",
  "\\begin{rcases}\n~\n\\end{rcases}",
  "\\begin{rgathered}\n~\n\\end{rgathered}",
  "\\begin{smallmatrix}\n~\n\\end{smallmatrix}",
  "\\begin{split}\n~\n\\end{split}",
  "\\begin{spreadlines}{#}\n\\end{spreadlines}",
  "\\begin{subarray}{#}\n\\end{subarray}",
  "\\begin{subnumcases}{#}\n\\end{subnumcases}",
  "\\begin{vmatrix}\n~\n\\end{vmatrix}",
  "\\begin{Vmatrix}\n~\n\\end{Vmatrix}",
  "\\begin{vsmallmatrix}\n~\n\\end{vsmallmatrix}",
  "\\begin{Vsmallmatrix}\n~\n\\end{Vsmallmatrix}",
  "\\begin{xalignat}{#}\n\\end{xalignat}",
  "\\begin{xxalignat}{#}\n\\end{xxalignat}",
  "\\begin{align*}\n~\n\\end{align*}",
  "\\begin{alignat*}{#}\n\\end{alignat*}",
  "\\begin{bmatrix*}\n~\n\\end{bmatrix*}",
  "\\begin{Bmatrix*}\n~\n\\end{Bmatrix*}",
  "\\begin{bsmallmatrix*}\n~\n\\end{bsmallmatrix*}",
  "\\begin{Bsmallmatrix*}\n~\n\\end{Bsmallmatrix*}",
  "\\begin{cases*}\n~\n\\end{cases*}",
  "\\begin{dcases*}\n~\n\\end{dcases*}",
  "\\begin{drcases*}\n~\n\\end{drcases*}",
  "\\begin{eqnarray*}\n~\n\\end{eqnarray*}",
  "\\begin{equation*}\n~\n\\end{equation*}",
  "\\begin{flalign*}\n~\n\\end{flalign*}",
  "\\begin{gather*}\n~\n\\end{gather*}",
  "\\begin{matrix*}\n~\n\\end{matrix*}",
  "\\begin{multiline*}\n~\n\\end{multiline*}",
  "\\begin{pmatrix*}\n~\n\\end{pmatrix*}",
  "\\begin{psmallmatrix*}\n~\n\\end{psmallmatrix*}",
  "\\begin{rcases*}\n~\n\\end{rcases*}",
  "\\begin{smallmatrix*}\n~\n\\end{smallmatrix*}",
  "\\begin{vmatrix*}\n~\n\\end{vmatrix*}",
  "\\begin{Vmatrix*}\n~\n\\end{Vmatrix*}",
  "\\begin{vsmallmatrix*}\n~\n\\end{vsmallmatrix*}",
  "\\begin{Vsmallmatrix*}\n~\n\\end{Vsmallmatrix*}",
  "\\begin{xalignat*}{#}\n\\end{xalignat*}",
  "\\above{#}{#}",
  "\\verb|#|",
  "\\left\\",
  "\\right\\",
  "\\acute{#}",
  "\\aleph",
  "\\alpha",
  "\\amalg",
  "\\And",
  "\\angle",
  "\\approx",
  "\\approxeq",
  "\\arccos",
  "\\arcsin",
  "\\arctan",
  "\\arg",
  "\\array{#}",
  "\\arrowvert",
  "\\Arrowvert",
  "\\ast",
  "\\asymp",
  "\\atop",
  "\\backepsilon",
  "\\backprime",
  "\\backsim",
  "\\backsimeq",
  "\\backslash",
  "\\bar{#}",
  "\\barwedge",
  "\\Bbb{#}",
  "\\Bbbk",
  "\\bbFont",
  "\\bbox{#}",
  "\\bcancel{#}",
  "\\because",
  "\\beta",
  "\\beth",
  "\\between",
  "\\bf",
  "\\bigcap",
  "\\bigcirc",
  "\\bigcup",
  "\\bigodot",
  "\\bigoplus",
  "\\bigotimes",
  "\\bigsqcup",
  "\\bigstar",
  "\\bigtimes",
  "\\bigtriangledown",
  "\\bigtriangleup",
  "\\biguplus",
  "\\bigvee",
  "\\bigwedge",
  "\\binom{#}{#}",
  "\\blacklozenge",
  "\\blacksquare",
  "\\blacktriangle",
  "\\blacktriangledown",
  "\\blacktriangleleft",
  "\\blacktriangleright",
  "\\bmod",
  "\\boldsymbol{#}",
  "\\bot",
  "\\bowtie",
  "\\Box",
  "\\boxdot",
  "\\boxed{#}",
  "\\boxminus",
  "\\boxplus",
  "\\boxtimes",
  "\\bra{#}",
  "\\Bra{#}",
  "\\brace",
  "\\bracevert",
  "\\brack",
  "\\braket{#}",
  "\\Braket{#}",
  "\\breve{#}",
  "\\bullet",
  "\\bumpeq",
  "\\Bumpeq",
  "\\cal",
  "\\cancel{#}",
  "\\cancelto{#}{#}",
  "\\cap",
  "\\Cap",
  "\\cases{#}",
  "\\cdot",
  "\\cdotp",
  "\\cdots",
  "\\celsius",
  "\\centercolon",
  "\\centerdot",
  "\\centernot{#}",
  "\\centerOver{#}{#}",
  "\\cfrac{#}{#}",
  "\\check{#}",
  "\\checkmark",
  "\\chi",
  "\\choose",
  "\\circ",
  "\\circeq",
  "\\circlearrowleft",
  "\\circlearrowright",
  "\\circledast",
  "\\circledcirc",
  "\\circleddash",
  "\\circledR",
  "\\circledS",
  "\\clap{#}",
  "\\class{#}{#}",
  "\\clubsuit",
  "\\colon",
  "\\colonapprox",
  "\\Colonapprox",
  "\\coloneq",
  "\\Coloneq",
  "\\coloneqq",
  "\\Coloneqq",
  "\\colonsim",
  "\\Colonsim",
  "\\color{#}",
  "\\colorbox{#}{#}",
  "\\complement",
  "\\cong",
  "\\coprod",
  "\\cos",
  "\\cosh",
  "\\cot",
  "\\coth",
  "\\cramped{#}",
  "\\crampedclap{#}",
  "\\crampedllap{#}",
  "\\crampedrlap{#}",
  "\\crampedsubstack{#}",
  "\\csc",
  "\\cssId{#}{#}",
  "\\cup",
  "\\Cup",
  "\\curlyeqprec",
  "\\curlyeqsucc",
  "\\curlyvee",
  "\\curlywedge",
  "\\curvearrowleft",
  "\\curvearrowright",
  "\\dagger",
  "\\daleth",
  "\\dashleftarrow",
  "\\dashrightarrow",
  "\\dashv",
  "\\dbinom{#}{#}",
  "\\dblcolon",
  "\\ddagger",
  "\\ddddot{#}",
  "\\dddot{#}",
  "\\ddot{#}",
  "\\ddots",
  "\\DeclareMathOperator{#}{#}",
  "\\DeclarePairedDelimiters{#}{#}{#}",
  "\\DeclarePairedDelimitersX{#}{#}{#}{#}",
  "\\DeclarePairedDelimitersXPP{#}{#}{#}{#}{#}{#}",
  "\\deg",
  "\\degree",
  "\\delta",
  "\\Delta",
  "\\det",
  "\\dfrac{#}{#}",
  "\\diagdown",
  "\\diagup",
  "\\diamond",
  "\\Diamond",
  "\\diamondsuit",
  "\\digamma",
  "\\dim",
  "\\displaylines{#}",
  "\\displaystyle",
  "\\div",
  "\\divideontimes",
  "\\divsymbol",
  "\\dot{#}",
  "\\doteq",
  "\\Doteq",
  "\\doteqdot",
  "\\dotplus",
  "\\dots",
  "\\dotsb",
  "\\dotsc",
  "\\dotsi",
  "\\dotsm",
  "\\dotso",
  "\\doublebarwedge",
  "\\doublecap",
  "\\doublecup",
  "\\downarrow",
  "\\Downarrow",
  "\\downdownarrows",
  "\\downharpoonleft",
  "\\downharpoonright",
  "\\ell",
  "\\empheqbiglangle",
  "\\empheqbiglbrace",
  "\\empheqbiglbrack",
  "\\empheqbiglceil",
  "\\empheqbiglfloor",
  "\\empheqbiglparen",
  "\\empheqbiglvert",
  "\\empheqbiglVert",
  "\\empheqbigrangle",
  "\\empheqbigrbrace",
  "\\empheqbigrbrack",
  "\\empheqbigrceil",
  "\\empheqbigrfloor",
  "\\empheqbigrparen",
  "\\empheqbigrvert",
  "\\empheqbigrVert",
  "\\empheqlangle",
  "\\empheqlbrace",
  "\\empheqlbrack",
  "\\empheqlceil",
  "\\empheqlfloor",
  "\\empheqlparen",
  "\\empheqlvert",
  "\\empheqlVert",
  "\\empheqrangle",
  "\\empheqrbrace",
  "\\empheqrbrack",
  "\\empheqrceil",
  "\\empheqrfloor",
  "\\empheqrparen",
  "\\empheqrvert",
  "\\empheqrVert",
  "\\emptyset",
  "\\enclose{#}{#}",
  "\\enspace",
  "\\epsilon",
  "\\eqalign{#}",
  "\\eqalignno{#}",
  "\\eqcirc",
  "\\eqcolon",
  "\\Eqcolon",
  "\\eqqcolon",
  "\\Eqqcolon",
  "\\eqref{#}",
  "\\eqsim",
  "\\eqslantgtr",
  "\\eqslantless",
  "\\equiv",
  "\\eta",
  "\\eth",
  "\\exists",
  "\\exp",
  "\\fallingdotseq",
  "\\fbox{#}",
  "\\fCenter",
  "\\fcolorbox{#}{#}{#}",
  "\\Finv",
  "\\flat",
  "\\forall",
  "\\frac{#}{#}",
  "\\frak",
  "\\framebox{#}",
  "\\frown",
  "\\Game",
  "\\gamma",
  "\\Gamma",
  "\\gcd",
  "\\ge",
  "\\geq",
  "\\geqq",
  "\\geqslant",
  "\\gets",
  "\\gg",
  "\\ggg",
  "\\gggtr",
  "\\gimel",
  "\\gnapprox",
  "\\gneq",
  "\\gneqq",
  "\\gnsim",
  "\\grave{#}",
  "\\gt",
  "\\gtrapprox",
  "\\gtrdot",
  "\\gtreqless",
  "\\gtreqqless",
  "\\gtrless",
  "\\gtrsim",
  "\\gvertneqq",
  "\\hat{#}",
  "\\hbar",
  "\\hbox{#}",
  "\\heartsuit",
  "\\hline",
  "\\hom",
  "\\hookleftarrow",
  "\\hookrightarrow",
  "\\hphantom{#}",
  "\\href{#}{#}",
  "\\hslash",
  "\\huge",
  "\\Huge",
  "\\idotsint",
  "\\iff",
  "\\iiiint",
  "\\iiint",
  "\\iint",
  "\\Im",
  "\\imath",
  "\\impliedby",
  "\\implies",
  "\\in",
  "\\inf",
  "\\infty",
  "\\injlim",
  "\\int",
  "\\int^{#}_{#}",
  "\\intercal",
  "\\intop",
  "\\iota",
  "\\it",
  "\\jmath",
  "\\Join",
  "\\kappa",
  "\\ker",
  "\\ket{#}",
  "\\Ket{#}",
  "\\ketbra{#}{#}",
  "\\Ketbra{#}{#}",
  "\\label{#}",
  "\\lambda",
  "\\Lambda",
  "\\land",
  "\\langle",
  "\\large",
  "\\Large",
  "\\LARGE",
  "\\LaTeX",
  "\\lbrace",
  "\\lbrack",
  "\\lceil",
  "\\ldots",
  "\\ldotp",
  "\\le",
  "\\leadsto",
  "\\Leftarrow",
  "\\leftarrow",
  "\\leftarrowtail",
  "\\leftharpoondown",
  "\\leftharpoonup",
  "\\leftleftarrows",
  "\\Leftrightarrow",
  "\\leftrightarrow",
  "\\leftrightarrows",
  "\\leftrightharpoons",
  "\\leftrightsquigarrow",
  "\\leftthreetimes",
  "\\leq",
  "\\leqalignno{#}",
  "\\leqq",
  "\\leqslant",
  "\\lessapprox",
  "\\lessdot",
  "\\lesseqgtr",
  "\\lesseqqgtr",
  "\\lessgtr",
  "\\lesssim",
  "\\lfloor",
  "\\lg",
  "\\lgroup",
  "\\lhd",
  "\\lim",
  "\\lim_{#}",
  "\\liminf",
  "\\limsup",
  "\\ll",
  "\\llap{#}",
  "\\llcorner",
  "\\Lleftarrow",
  "\\lll",
  "\\llless",
  "\\lmoustache",
  "\\ln",
  "\\lnapprox",
  "\\lneq",
  "\\lneqq",
  "\\lnot",
  "\\lnsim",
  "\\log",
  "\\longleftarrow",
  "\\Longleftarrow",
  "\\Longleftrightarrow",
  "\\longleftrightarrow",
  "\\longleftrightarrows",
  "\\longLeftrightharpoons",
  "\\longmapsto",
  "\\longrightarrow",
  "\\Longrightarrow",
  "\\longrightleftharpoons",
  "\\longRightleftharpoons",
  "\\looparrowleft",
  "\\looparrowright",
  "\\lor",
  "\\lozenge",
  "\\lparen",
  "\\lrcorner",
  "\\Lsh",
  "\\lt",
  "\\ltimes",
  "\\lvert",
  "\\lVert",
  "\\lvertneqq",
  "\\maltese",
  "\\mapsto",
  "\\mathbb{#}",
  "\\mathbb{R}",
  "\\mathbb{N}",
  "\\mathbb{C}",
  "\\mathbb{Z}",
  "\\mathbb{Q}",
  "\\mathbf{#}",
  "\\mathbfcal{#}",
  "\\mathbffrak{#}",
  "\\mathbfit{#}",
  "\\mathbfscr{#}",
  "\\mathbfsf{#}",
  "\\mathbfsfit{#}",
  "\\mathbfsfup{#}",
  "\\mathbfup{#}",
  "\\mathbin{#}",
  "\\mathcal{#}",
  "\\mathchoice{#}{#}{#}{#}",
  "\\mathclap{#}",
  "\\mathclose{#}",
  "\\mathfrak{#}",
  "\\mathinner{#}",
  "\\mathit{#}",
  "\\mathllap{#}",
  "\\mathmakebox{#}",
  "\\mathmbox{#}",
  "\\mathnormal{#}",
  "\\mathop{#}",
  "\\mathopen{#}",
  "\\mathord{#}",
  "\\mathpunct{#}",
  "\\mathrel{#}",
  "\\mathring{#}",
  "\\mathrlap{#}",
  "\\mathrm{#}",
  "\\mathscr{#}",
  "\\mathsf{#}",
  "\\mathsfit{#}",
  "\\mathsfup{#}",
  "\\mathstrut",
  "\\mathtip{#}{#}",
  "\\mathtt{#}",
  "\\mathup{#}",
  "\\max",
  "\\mbox{#}",
  "\\measuredangle",
  "\\mho",
  "\\micro",
  "\\mid",
  "\\min",
  "\\mit",
  "\\mod{#}",
  "\\models",
  "\\mp",
  "\\MTThinColon",
  "\\mu",
  "\\multimap",
  "\\nabla",
  "\\natural",
  "\\ncong",
  "\\ndownarrow",
  "\\ne",
  "\\nearrow",
  "\\neg",
  "\\negmedspace",
  "\\negthickspace",
  "\\negthinspace",
  "\\neq",
  "\\newcommand{#}{#}",
  "\\newenvironment{#}{#}{#}",
  "\\newline",
  "\\newtagform{#}{#}{#}",
  "\\nexists",
  "\\ngeq",
  "\\ngeqq",
  "\\ngeqslant",
  "\\ngtr",
  "\\ni",
  "\\nleftarrow",
  "\\nLeftarrow",
  "\\nleftrightarrow",
  "\\nLeftrightarrow",
  "\\nleq",
  "\\nleqq",
  "\\nleqslant",
  "\\nless",
  "\\nmid",
  "\\nobreakspace",
  "\\nonscript",
  "\\nonumber",
  "\\normalsize",
  "\\not",
  "\\notag",
  "\\notChar",
  "\\notin",
  "\\nparallel",
  "\\nprec",
  "\\npreceq",
  "\\nrightarrow",
  "\\nRightarrow",
  "\\nshortmid",
  "\\nshortparallel",
  "\\nsim",
  "\\nsubseteq",
  "\\nsubseteqq",
  "\\nsucc",
  "\\nsucceq",
  "\\nsupseteq",
  "\\nsupseteqq",
  "\\ntriangleleft",
  "\\ntrianglelefteq",
  "\\ntriangleright",
  "\\ntrianglerighteq",
  "\\nu",
  "\\nuparrow",
  "\\nvdash",
  "\\nvDash",
  "\\nVdash",
  "\\nVDash",
  "\\nwarrow",
  "\\odot",
  "\\ohm",
  "\\oint",
  "\\oldstyle",
  "\\omega",
  "\\Omega",
  "\\omicron",
  "\\ominus",
  "\\operatorname{#}",
  "\\oplus",
  "\\ordinarycolon",
  "\\oslash",
  "\\otimes",
  "\\over",
  "\\overbrace{#}",
  "\\overbracket{#}",
  "\\overleftarrow{#}",
  "\\overleftrightarrow{#}",
  "\\overline{#}",
  "\\overparen{#}",
  "\\overrightarrow{#}",
  "\\overset{#}{#}",
  "\\overunderset{#}{#}{#}",
  "\\owns",
  "\\parallel",
  "\\partial",
  "\\perp",
  "\\perthousand",
  "\\phantom{#}",
  "\\phi",
  "\\Phi",
  "\\pi",
  "\\Pi",
  "\\pitchfork",
  "\\pm",
  "\\pmb{#}",
  "\\pmod{#}",
  "\\pod{#}",
  "\\Pr",
  "\\prec",
  "\\precapprox",
  "\\preccurlyeq",
  "\\preceq",
  "\\precnapprox",
  "\\precneqq",
  "\\precnsim",
  "\\precsim",
  "\\prescript{#}{#}{#}",
  "\\prime",
  "\\prod",
  "\\prod^{#}_{#}",
  "\\projlim",
  "\\propto",
  "\\psi",
  "\\Psi",
  "\\qquad",
  "\\quad",
  "\\rangle",
  "\\rbrace",
  "\\rbrack",
  "\\rceil",
  "\\Re",
  "\\ref{#}",
  "\\refeq{#}",
  "\\renewcommand{#}{#}",
  "\\renewenvironment{#}{#}{#}",
  "\\renewtagform{#}{#}{#}",
  "\\restriction",
  "\\rfloor",
  "\\rgroup",
  "\\rhd",
  "\\rho",
  "\\Rightarrow",
  "\\rightarrow",
  "\\rightarrowtail",
  "\\rightharpoondown",
  "\\rightharpoonup",
  "\\rightleftarrows",
  "\\rightleftharpoons",
  "\\rightrightarrows",
  "\\rightsquigarrow",
  "\\rightthreetimes",
  "\\risingdotseq",
  "\\rlap{#}",
  "\\rm",
  "\\rmoustache",
  "\\rparen",
  "\\Rrightarrow",
  "\\Rsh",
  "\\rtimes",
  "\\rvert",
  "\\rVert",
  "\\S",
  "\\scr",
  "\\scriptscriptstyle",
  "\\scriptsize",
  "\\scriptstyle",
  "\\searrow",
  "\\sec",
  "\\set{#}",
  "\\Set{#}",
  "\\setminus",
  "\\sf",
  "\\sharp",
  "\\shortmid",
  "\\shortparallel",
  "\\sideset{#}{#}{#}",
  "\\sigma",
  "\\Sigma",
  "\\sim",
  "\\simeq",
  "\\sin",
  "\\sinh",
  "\\skew{#}{#}{#}",
  "\\SkipLimits",
  "\\small",
  "\\smallfrown",
  "\\smallint",
  "\\smallsetminus",
  "\\smallsmile",
  "\\smash{#}",
  "\\smile",
  "\\space",
  "\\spadesuit",
  "\\sphericalangle",
  "\\splitdfrac{#}{#}",
  "\\splitfrac{#}{#}",
  "\\sqcap",
  "\\sqcup",
  "\\sqrt{#}",
  "\\sqsubset",
  "\\sqsubseteq",
  "\\sqsupset",
  "\\sqsupseteq",
  "\\square",
  "\\stackbin{#}{#}",
  "\\stackrel{#}{#}",
  "\\star",
  "\\strut",
  "\\style{#}{#}",
  "\\subset",
  "\\Subset",
  "\\subseteq",
  "\\subseteqq",
  "\\subsetneq",
  "\\subsetneqq",
  "\\substack{#}",
  "\\succ",
  "\\succapprox",
  "\\succcurlyeq",
  "\\succeq",
  "\\succnapprox",
  "\\succneqq",
  "\\succnsim",
  "\\succsim",
  "\\sum",
  "\\sum^{#}_{#}",
  "\\sup",
  "\\supset",
  "\\Supset",
  "\\supseteq",
  "\\supseteqq",
  "\\supsetneq",
  "\\supsetneqq",
  "\\surd",
  "\\swarrow",
  "\\symbb{#}",
  "\\symbf{#}",
  "\\symbfcal{#}",
  "\\symbffrak{#}",
  "\\symbfit{#}",
  "\\symbfscr{#}",
  "\\symbfsf{#}",
  "\\symbfsfit{#}",
  "\\symbfsfup{#}",
  "\\symbfup{#}",
  "\\symcal{#}",
  "\\symfrak{#}",
  "\\symit{#}",
  "\\symnormal{#}",
  "\\symrm{#}",
  "\\symscr{#}",
  "\\symsf{#}",
  "\\symsfit{#}",
  "\\symsfup{#}",
  "\\symtt{#}",
  "\\symup{#}",
  "\\tag{#}",
  "\\tan",
  "\\tanh",
  "\\tau",
  "\\tbinom{#}{#}",
  "\\TeX",
  "\\text{#}",
  "\\textacutedbl",
  "\\textasciiacute",
  "\\textasciibreve",
  "\\textasciicaron",
  "\\textasciicircum",
  "\\textasciidieresis",
  "\\textasciimacron",
  "\\textasciitilde",
  "\\textasteriskcentered",
  "\\textbackslash",
  "\\textbaht",
  "\\textbar",
  "\\textbardbl",
  "\\textbf{#}",
  "\\textbigcircle",
  "\\textblank",
  "\\textborn",
  "\\textbraceleft",
  "\\textbraceright",
  "\\textbrokenbar",
  "\\textbullet",
  "\\textcelsius",
  "\\textcent",
  "\\textcentoldstyle",
  "\\textcircledP",
  "\\textclap{#}",
  "\\textcolonmonetary",
  "\\textcolor{#}{#}",
  "\\textcompwordmark",
  "\\textcopyleft",
  "\\textcopyright",
  "\\textcurrency",
  "\\textdagger",
  "\\textdaggerdbl",
  "\\textdegree",
  "\\textdied",
  "\\textdiscount",
  "\\textdiv",
  "\\textdivorced",
  "\\textdollar",
  "\\textdollaroldstyle",
  "\\textdong",
  "\\textdownarrow",
  "\\texteightoldstyle",
  "\\textellipsis",
  "\\textemdash",
  "\\textendash",
  "\\textestimated",
  "\\texteuro",
  "\\textexclamdown",
  "\\textfiveoldstyle",
  "\\textflorin",
  "\\textfouroldstyle",
  "\\textfractionsolidus",
  "\\textgravedbl",
  "\\textgreater",
  "\\textguarani",
  "\\textinterrobang",
  "\\textinterrobangdown",
  "\\textit{#}",
  "\\textlangle",
  "\\textlbrackdbl",
  "\\textleftarrow",
  "\\textless",
  "\\textlira",
  "\\textllap{#}",
  "\\textlnot",
  "\\textlquill",
  "\\textmarried",
  "\\textmho",
  "\\textminus",
  "\\textmu",
  "\\textmusicalnote",
  "\\textnaira",
  "\\textnineoldstyle",
  "\\textnormal{#}",
  "\\textnumero",
  "\\textohm",
  "\\textonehalf",
  "\\textoneoldstyle",
  "\\textonequarter",
  "\\textonesuperior",
  "\\textopenbullet",
  "\\textordfeminine",
  "\\textordmasculine",
  "\\textparagraph",
  "\\textperiodcentered",
  "\\textpertenthousand",
  "\\textperthousand",
  "\\textpeso",
  "\\textpm",
  "\\textquestiondown",
  "\\textquotedblleft",
  "\\textquotedblright",
  "\\textquoteleft",
  "\\textquoteright",
  "\\textrangle",
  "\\textrbrackdbl",
  "\\textrecipe",
  "\\textreferencemark",
  "\\textregistered",
  "\\textrightarrow",
  "\\textrlap{#}",
  "\\textrm{#}",
  "\\textrquill",
  "\\textsection",
  "\\textservicemark",
  "\\textsevenoldstyle",
  "\\textsf{#}",
  "\\textsixoldstyle",
  "\\textsterling",
  "\\textstyle",
  "\\textsurd",
  "\\textthreeoldstyle",
  "\\textthreequarters",
  "\\textthreesuperior",
  "\\texttildelow",
  "\\texttimes",
  "\\texttip{#}{#}",
  "\\texttrademark",
  "\\texttt{#}",
  "\\texttwooldstyle",
  "\\texttwosuperior",
  "\\textunderscore",
  "\\textup{#}",
  "\\textuparrow",
  "\\textvisiblespace",
  "\\textwon",
  "\\textyen",
  "\\textzerooldstyle",
  "\\tfrac{#}{#}",
  "\\therefore",
  "\\theta",
  "\\Theta",
  "\\thickapprox",
  "\\thicksim",
  "\\thinspace",
  "\\tilde{#}",
  "\\times",
  "\\tiny",
  "\\Tiny",
  "\\to",
  "\\top",
  "\\triangle",
  "\\triangledown",
  "\\triangleleft",
  "\\trianglelefteq",
  "\\triangleq",
  "\\triangleright",
  "\\trianglerighteq",
  "\\tripledash",
  "\\tt",
  "\\twoheadleftarrow",
  "\\twoheadrightarrow",
  "\\ulcorner",
  "\\underbrace{#}",
  "\\underbracket{#}",
  "\\underleftarrow{#}",
  "\\underleftrightarrow{#}",
  "\\underline{#}",
  "\\underparen{#}",
  "\\underrightarrow{#}",
  "\\underset{#}{#}",
  "\\unicode{#}",
  "\\unlhd",
  "\\unrhd",
  "\\upalpha",
  "\\uparrow",
  "\\Uparrow",
  "\\upbeta",
  "\\upchi",
  "\\updelta",
  "\\Updelta",
  "\\updownarrow",
  "\\Updownarrow",
  "\\upepsilon",
  "\\upeta",
  "\\upgamma",
  "\\Upgamma",
  "\\upharpoonleft",
  "\\upharpoonright",
  "\\upiota",
  "\\upkappa",
  "\\uplambda",
  "\\Uplambda",
  "\\uplus",
  "\\upmu",
  "\\upnu",
  "\\upomega",
  "\\Upomega",
  "\\upomicron",
  "\\upphi",
  "\\Upphi",
  "\\uppi",
  "\\Uppi",
  "\\uppsi",
  "\\Uppsi",
  "\\uprho",
  "\\upsigma",
  "\\Upsigma",
  "\\upsilon",
  "\\Upsilon",
  "\\uptau",
  "\\uptheta",
  "\\Uptheta",
  "\\upuparrows",
  "\\upupsilon",
  "\\Upupsilon",
  "\\upvarepsilon",
  "\\upvarphi",
  "\\upvarpi",
  "\\upvarrho",
  "\\upvarsigma",
  "\\upvartheta",
  "\\upxi",
  "\\Upxi",
  "\\upzeta",
  "\\urcorner",
  "\\usetagform{#}",
  "\\varDelta",
  "\\varepsilon",
  "\\varGamma",
  "\\varinjlim",
  "\\varkappa",
  "\\varLambda",
  "\\varliminf",
  "\\varlimsup",
  "\\varnothing",
  "\\varOmega",
  "\\varphi",
  "\\varPhi",
  "\\varpi",
  "\\varPi",
  "\\varprojlim",
  "\\varpropto",
  "\\varPsi",
  "\\varrho",
  "\\varsigma",
  "\\varSigma",
  "\\varsubsetneq",
  "\\varsubsetneqq",
  "\\varsupsetneq",
  "\\varsupsetneqq",
  "\\vartheta",
  "\\varTheta",
  "\\vartriangle",
  "\\vartriangleleft",
  "\\vartriangleright",
  "\\varUpsilon",
  "\\varXi",
  "\\vcenter{#}",
  "\\vdash",
  "\\vDash",
  "\\Vdash",
  "\\vdots",
  "\\vec{#}",
  "\\vee",
  "\\veebar",
  "\\Vert",
  "\\vert",
  "\\vphantom{#}",
  "\\Vvdash",
  "\\wedge",
  "\\widehat{#}",
  "\\widetilde{#}",
  "\\wp",
  "\\wr",
  "\\xcancel{#}",
  "\\xhookleftarrow{#}",
  "\\xhookrightarrow{#}",
  "\\xi",
  "\\Xi",
  "\\xleftarrow{#}",
  "\\xLeftarrow{#}",
  "\\xleftharpoondown{#}",
  "\\xleftharpoonup{#}",
  "\\xleftrightarrow{#}",
  "\\xLeftrightarrow{#}",
  "\\xleftrightharpoons{#}",
  "\\xLeftrightharpoons{#}",
  "\\xlongequal{#}",
  "\\xmapsto{#}",
  "\\xmathstrut{#}",
  "\\xrightarrow{#}",
  "\\xRightarrow{#}",
  "\\xrightharpoondown{#}",
  "\\xrightharpoonup{#}",
  "\\xrightleftharpoons{#}",
  "\\xRightleftharpoons{#}",
  "\\xtofrom{#}",
  "\\xtwoheadleftarrow{#}",
  "\\xtwoheadrightarrow{#}",
  "\\yen",
  "\\zeta",
];

function buildEntries() {
  const entries = [];
  for (const line of DATA.split("\n")) {
    if (!line.trim()) continue;
    const parts = line.split(" ;; ").map((s) => s.trim());
    if (parts.length < 4) continue;
    const [cat, name, keys, tex, en] = parts;
    entries.push({ cat, name, keys, tex, en });
  }
  for (const [cn, cmd] of GREEK) {
    const variant = cmd.startsWith("var");
    entries.push({
      cat: "希腊字母",
      name: cn,
      en: variant ? `Variant ${cmd.slice(3)}` : cmd,
      keys: `${cmd} greek 希腊 小写${variant ? " variant" : ""}`,
      tex: `\\${cmd}`,
    });
  }
  const cnByCmd = Object.fromEntries(GREEK.map(([cn, cmd]) => [cmd, cn]));
  for (const cmd of GREEK_UPPER) {
    const cn = cnByCmd[cmd.toLowerCase()] || "";
    entries.push({
      cat: "希腊字母",
      name: `大写${cn}`,
      en: `Uppercase ${cmd}`,
      keys: `uppercase ${cmd} greek 希腊 大写`,
      tex: `\\${cmd}`,
    });
  }
  const known = new Set(entries.map((e) => e.tex));
  for (const tex of COMPLETR_COMMANDS) {
    const cmd = tex.match(/^\\(?:begin\{[^}]+\}|[A-Za-z]+\*?|.)/);
    const name = cmd ? cmd[0] : tex;
    if (known.has(tex) || known.has(name)) continue;
    known.add(tex);
    entries.push({ cat: "命令", name, en: "", keys: name.replace(/^\\/, ""), tex, extra: true });
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
    e.enLc = (e.en || "").toLowerCase();
    e.texLc = e.tex.toLowerCase();
    e.keyTokens = (e.keys || "").toLowerCase().split(/\s+/).filter(Boolean);
    e.hay = `${e.name} ${e.en} ${e.keys} ${e.cat} ${e.tex}`.toLowerCase();
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

function labelBonus(label, term) {
  if (!label) return 0;
  if (label === term) return 50;
  if (label.startsWith(term)) return 20;
  if (label.includes(term)) return 10;
  return 0;
}

function search(query, allowFuzzy = true, includeExtra = true) {
  const q = query.trim().toLowerCase();
  const pool = includeExtra ? ENTRIES : ENTRIES.filter((e) => !e.extra);
  if (!q) return pool;

  const terms = q.split(/\s+/);
  const scored = [];
  for (const e of pool) {
    let score = e.extra ? -12 : 0;
    let ok = true;
    let commandPrefix = false;
    for (const term of terms) {
      const idx = e.hay.indexOf(term);
      if (idx < 0) { ok = false; break; }
      const nameScore = Math.max(labelBonus(e.nameLc, term), labelBonus(e.enLc, term));
      score += nameScore;
      const keyAt = e.keyTokens.indexOf(term);
      if (keyAt === 0) score += 30;
      else if (keyAt > 0) score += 8;
      if (e.texLc.startsWith(term) || e.texLc.startsWith("\\" + term)) {
        score += 15;
        commandPrefix = true;
      } else if (nameScore === 0 && keyAt < 0) score -= idx * 0.01;
    }
    // Whole-query command prefix. Skip when a term already scored that prefix,
    // so "partial" is not counted twice against \partial.
    if (ok && !commandPrefix && e.tex.startsWith("\\" + query.trim())) score += 8;
    if (ok) scored.push({ e, score: score - e.tex.length * 0.001 });
  }

  if (scored.length === 0 && allowFuzzy) {
    const fuzzy = prepareFuzzySearch(q);
    for (const e of pool) {
      const r = fuzzy(e.hay);
      if (r) scored.push({ e, score: r.score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.e);
}

const CATEGORY_EN = {
  "运算": "Operators",
  "关系": "Relations",
  "集合": "Sets",
  "逻辑": "Logic",
  "箭头": "Arrows",
  "括号": "Delimiters",
  "字体": "Fonts",
  "装饰": "Decorations",
  "函数": "Functions",
  "矩阵": "Matrices",
  "结构": "Structures",
  "点": "Dots",
  "空格": "Spacing",
  "符号": "Symbols",
  "概率": "Probability",
  "希腊字母": "Greek",
  "命令": "Commands",
};

function displayLabels(entry, lang) {
  const en = entry.en || "";
  const zh = entry.name || "";
  const cat = lang === "en" ? (CATEGORY_EN[entry.cat] || entry.cat) : entry.cat;
  if (lang === "en" && en) return { primary: en, secondary: zh === en ? "" : zh, cat };
  return { primary: zh, secondary: en === zh ? "" : en, cat };
}

function renderRow(entry, el, query) {
  el.addClass("latex-lookup-item");

  const icon = el.createDiv({ cls: "latex-lookup-icon", attr: { "aria-hidden": "true" } });
  icon.createSpan({ text: "i" });

  const labels = displayLabels(entry, uiLanguage());
  const main = el.createDiv({ cls: "latex-lookup-main" });
  const name = main.createSpan({ cls: "latex-lookup-name" });
  appendHighlighted(name, labels.primary, query);
  if (labels.secondary) {
    const alt = main.createSpan({ cls: "latex-lookup-en" });
    appendHighlighted(alt, labels.secondary, query);
  }
  const cat = main.createSpan({ cls: "latex-lookup-cat" });
  appendHighlighted(cat, labels.cat, query);

  if (entry.tex !== entry.name) {
    const code = el.createEl("code", { cls: "latex-lookup-code" });
    appendHighlighted(code, entry.tex.replace(/\s*\n\s*/g, " "), query);
  }
}

const FENCE = / {0,3}(`{3,}|~{3,})/y;
const INITIAL_SCAN = { fence: null, code: false, inline: false, display: false, start: -1 };

// Scans `text`, which must begin at a line start at document offset `base`, from `state`.
// `onLineStart(offset, state)` receives the state before each later line; that state only
// depends on the document up to and including `offset`.
function scanMath(text, base, state, onLineStart) {
  let { fence, code, inline, display, start } = state;
  for (let i = 0; i < text.length; i++) {
    if (i === 0 || text[i - 1] === "\n") {
      if (onLineStart && i > 0) onLineStart(base + i, { fence, code, inline, display, start });
      if (!inline && !display) {
        FENCE.lastIndex = i;
        const m = FENCE.exec(text);
        if (m && (!fence || (m[1][0] === fence[0] && m[1].length >= fence.length))) {
          fence = fence ? null : m[1];
          const eol = text.indexOf("\n", i);
          if (eol < 0) break;
          i = eol - 1;
          continue;
        }
      }
    }
    if (fence) continue;
    const ch = text[i];
    if (ch === "\\") { i++; continue; }
    if (ch === "\n" && text[i + 1] === "\n") { inline = false; code = false; }
    if (ch === "`" && !inline && !display) { code = !code; continue; }
    if (code) continue;
    if (ch !== "$") continue;
    if (text[i + 1] === "$" && !inline) {
      display = !display;
      start = base + i + 2;
      i++;
    } else if (!display) {
      inline = !inline;
      start = base + i + 1;
    }
  }
  return { fence, code, inline, display, start };
}

function toContext(state) {
  const mode = state.display ? "display" : state.inline ? "inline" : null;
  return { mode, start: mode ? state.start : -1 };
}

function mathContext(text) {
  return toContext(scanMath(text, 0, INITIAL_SCAN));
}

const CHECKPOINT_SPACING = 2048;

// Scanner states at line starts, so a lookup only rescans from the nearest checkpoint.
const scanCache = StateField.define({
  create: () => ({ points: [] }),
  update(value, tr) {
    if (!tr.docChanged) return value;
    let changed = Infinity;
    tr.changes.iterChangedRanges((fromA) => { changed = Math.min(changed, fromA); });
    return { points: value.points.filter((p) => p.offset < changed) };
  },
});

function cachedContext(state, offset) {
  const points = state.field(scanCache).points;
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].offset <= offset) lo = mid + 1;
    else hi = mid;
  }
  const from = lo > 0 ? points[lo - 1] : { offset: 0, state: INITIAL_SCAN };
  const record = lo === points.length
    ? (at, s) => {
      const last = points.length ? points[points.length - 1].offset : 0;
      if (at - last >= CHECKPOINT_SPACING) points.push({ offset: at, state: s });
    }
    : null;
  return toContext(scanMath(state.doc.sliceString(from.offset, offset), from.offset, from.state, record));
}

function mathContextAt(editor, pos = editor.getCursor("from")) {
  const view = editor.cm;
  if (view && view.state && view.state.field(scanCache, false)) {
    return cachedContext(view.state, editor.posToOffset(pos));
  }
  return mathContext(editor.getRange({ line: 0, ch: 0 }, pos));
}

function mathModeAt(editor, pos) {
  return mathContextAt(editor, pos).mode;
}

// Commands whose braced argument is typeset as text, where ordinary words are expected.
const TEXT_COMMANDS = new Set([
  "text", "textrm", "textbf", "textit", "textsf", "texttt", "textup", "textmd",
  "textnormal", "textsl", "textsc", "emph", "mbox", "hbox", "fbox",
  "operatorname", "operatorname*", "tag", "tag*", "intertext",
]);
const COMMAND_NAME = /[A-Za-z]+\*?/y;

function inTextMode(math) {
  const stack = [];
  let pending = false;
  for (let i = 0; i < math.length; i++) {
    const ch = math[i];
    if (ch === "\\") {
      COMMAND_NAME.lastIndex = i + 1;
      const m = COMMAND_NAME.exec(math);
      pending = !!m && TEXT_COMMANDS.has(m[0]);
      i += m ? m[0].length : 1;
    } else if (ch === "{") {
      stack.push(pending || (stack.length > 0 && stack[stack.length - 1]));
      pending = false;
    } else if (ch === "}") {
      stack.pop();
      pending = false;
    } else if (!/\s/.test(ch)) {
      pending = false;
    }
  }
  return stack.length > 0 && stack[stack.length - 1];
}

function matchBrace(tex, open) {
  let depth = 0;
  for (let i = open; i < tex.length; i++) {
    if (tex[i] === "\\") { i++; continue; }
    if (tex[i] === "{") depth++;
    else if (tex[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

function findEnvEnd(tex, name, from) {
  const open = `\\begin{${name}}`;
  const close = `\\end{${name}}`;
  let depth = 1;
  for (let i = from; i < tex.length; i++) {
    if (tex.startsWith(open, i)) depth++;
    else if (tex.startsWith(close, i) && --depth === 0) return i;
  }
  return -1;
}

function pushTrimmed(tex, from, to, stops) {
  while (from < to && /\s/.test(tex[from])) from++;
  while (to > from && /\s/.test(tex[to - 1])) to--;
  if (to > from) stops.push([from, to]);
}

function addCells(tex, from, to, stops) {
  let cell = from;
  let depth = 0;
  for (let i = from; i < to; i++) {
    if (tex.startsWith("\\begin{", i)) {
      const nameEnd = tex.indexOf("}", i + 7);
      const close = nameEnd < 0 ? -1 : findEnvEnd(tex, tex.slice(i + 7, nameEnd), nameEnd + 1);
      if (close >= 0) {
        i = close + (nameEnd - i - 7) + 5;
        continue;
      }
    }
    const ch = tex[i];
    if (ch === "\\") {
      if (tex[i + 1] === "\\" && depth === 0) {
        pushTrimmed(tex, cell, i, stops);
        cell = i + 2;
      }
      i++;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
    } else if (ch === "&" && depth === 0) {
      pushTrimmed(tex, cell, i, stops);
      cell = i + 1;
    }
  }
  pushTrimmed(tex, cell, to, stops);
}

function deriveStops(tex) {
  const stops = [];
  let i = 0;
  while (i < tex.length) {
    if (tex.startsWith("\\begin{", i)) {
      const nameEnd = tex.indexOf("}", i + 7);
      const name = tex.slice(i + 7, nameEnd);
      const close = nameEnd < 0 ? -1 : findEnvEnd(tex, name, nameEnd + 1);
      if (close < 0) { i += 7; continue; }
      let body = nameEnd + 1;
      while (tex[body] === "{") {
        const end = matchBrace(tex, body);
        if (end < 0) break;
        if (end > body + 1) stops.push([body + 1, end]);
        body = end + 1;
      }
      addCells(tex, body, close, stops);
      i = close + name.length + 6;
    } else if (tex.startsWith("\\sqrt[", i)) {
      const end = tex.indexOf("]", i + 6);
      if (end > i + 6) stops.push([i + 6, end]);
      i = end < 0 ? i + 6 : end + 1;
    } else if (tex[i] === "\\") {
      i += 2;
    } else if (tex[i] === "{") {
      const end = matchBrace(tex, i);
      if (end < 0) { i++; continue; }
      if (end > i + 1) stops.push([i + 1, end]);
      i = end + 1;
    } else {
      i++;
    }
  }
  return stops.sort((a, b) => a[0] - b[0]);
}

function expandSnippet(tex, isExtra) {
  if (!isExtra) return { text: tex, stops: deriveStops(tex), exit: tex.length };

  let text = "";
  const stops = [];
  let exit = null;
  for (let i = 0; i < tex.length; i++) {
    const ch = tex[i];
    if (ch === "\\" && i + 1 < tex.length) {
      text += ch + tex[i + 1];
      i++;
    } else if (ch === "#") {
      stops.push([text.length, text.length]);
    } else if (ch === "~") {
      exit = text.length;
    } else {
      text += ch;
    }
  }
  return { text, stops, exit: exit === null ? text.length : exit };
}

const setSnippet = StateEffect.define();

const stopMark = Decoration.mark({ class: "latex-lookup-stop" });

class EmptyStopWidget extends WidgetType {
  eq() { return true; }
  toDOM() {
    const el = document.createElement("span");
    el.className = "latex-lookup-stop latex-lookup-stop-empty";
    return el;
  }
  ignoreEvent() { return false; }
}

const emptyStopMark = Decoration.widget({ widget: new EmptyStopWidget(), side: 1 });

const snippetField = StateField.define({
  create: () => null,
  update(value, tr) {
    if (value && tr.docChanged) {
      let outside = false;
      tr.changes.iterChangedRanges((fromA, toA) => {
        if (fromA < value.start || toA > value.end) outside = true;
      });
      value = outside ? null : {
        stops: value.stops.map(([a, b]) => [tr.changes.mapPos(a, -1), tr.changes.mapPos(b, 1)]),
        index: value.index,
        start: tr.changes.mapPos(value.start, -1),
        end: tr.changes.mapPos(value.end, 1),
        exit: tr.changes.mapPos(value.exit, 1),
      };
    }
    for (const effect of tr.effects) {
      if (effect.is(setSnippet)) value = effect.value;
    }
    if (value && tr.selection) {
      const head = tr.state.selection.main.head;
      if (head < value.start || head > value.end) value = null;
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field, (value) => {
    if (!value) return Decoration.none;
    const marks = value.stops
      .slice(Math.max(value.index, 0))
      .map(([a, b]) => (b > a ? stopMark.range(a, b) : emptyStopMark.range(a)));
    return Decoration.set(marks, true);
  }),
});

function jumpToStop(view, direction) {
  const value = view.state.field(snippetField, false);
  if (!value) return false;
  const next = value.index + direction;
  if (next < 0) return true;
  if (next >= value.stops.length) {
    view.dispatch({ selection: { anchor: value.exit }, effects: setSnippet.of(null), scrollIntoView: true });
    return true;
  }
  const [a, b] = value.stops[next];
  view.dispatch({
    selection: { anchor: a, head: b },
    effects: setSnippet.of({ ...value, index: next }),
    scrollIntoView: true,
  });
  return true;
}

const snippetKeymap = Prec.highest(keymap.of([
  { key: "Tab", run: (view) => jumpToStop(view, 1) },
  { key: "Shift-Tab", run: (view) => jumpToStop(view, -1) },
  {
    key: "Escape",
    run: (view) => {
      if (view.state.field(snippetField, false)) view.dispatch({ effects: setSnippet.of(null) });
      return false;
    },
  },
]));

function insertSnippet(editor, from, to, entry, mode) {
  const source = mode === "display" ? entry.tex : entry.tex.replace(/\s*\n\s*/g, " ");
  const { text, stops, exit } = expandSnippet(source, entry.extra);
  const prefix = mode ? "" : "$";
  const insert = `${prefix}${text}${prefix}`;
  const fromOffset = editor.posToOffset(from);
  const toOffset = editor.posToOffset(to);
  const base = fromOffset + prefix.length;
  const absolute = stops.map(([a, b]) => [base + a, base + b]);
  const exitOffset = base + exit;

  const view = editor.cm;
  const previous = view ? view.state.field(snippetField, false) : undefined;
  if (previous === undefined) {
    editor.replaceRange(insert, from, to);
    if (absolute.length) editor.setSelection(editor.offsetToPos(absolute[0][0]), editor.offsetToPos(absolute[0][1]));
    else editor.setCursor(editor.offsetToPos(exitOffset));
    return;
  }

  let snippet = absolute.length
    ? { stops: absolute, index: 0, start: base, end: base + text.length, exit: exitOffset }
    : null;
  if (previous && fromOffset >= previous.start && toOffset <= previous.end) {
    const changes = view.state.changes({ from: fromOffset, to: toOffset, insert });
    const rest = previous.stops
      .slice(previous.index + 1)
      .map(([a, b]) => [changes.mapPos(a, -1), changes.mapPos(b, 1)]);
    if (absolute.length || rest.length) {
      snippet = {
        stops: [...absolute, ...rest],
        index: absolute.length ? 0 : -1,
        start: changes.mapPos(previous.start, -1),
        end: changes.mapPos(previous.end, 1),
        exit: changes.mapPos(previous.exit, 1),
      };
    }
  }

  view.dispatch({
    changes: { from: fromOffset, to: toOffset, insert },
    selection: absolute.length ? { anchor: absolute[0][0], head: absolute[0][1] } : { anchor: exitOffset },
    effects: setSnippet.of(snippet),
    scrollIntoView: true,
  });
}

function plainText(entry) {
  return entry.extra ? entry.tex.replace(/[#~]/g, "") : entry.tex;
}

const STRINGS = {
  en: {
    search: "Search LaTeX",
    placeholder: "Search LaTeX, e.g. sum, integral, matrix, alpha, 求和",
    insert: "insert",
    select: "select",
    close: "close",
    copy: "copy",
    insertWrapped: "insert wrapped in $ $",
    copyWrapped: "copy wrapped in $ $",
    copied: "Copied: ",
    copyFailed: "Copy failed",
  },
  zh: {
    search: "搜索 LaTeX 写法",
    placeholder: "搜索 LaTeX 写法，例如：求和、积分、矩阵、alpha",
    insert: "插入",
    select: "选择",
    close: "关闭",
    copy: "复制",
    insertWrapped: "插入并用 $ $ 包裹",
    copyWrapped: "复制（带 $ $）",
    copied: "已复制：",
    copyFailed: "复制失败",
  },
};

// Obsidian stores the interface language in localStorage only when it isn't English.
function uiLanguage() {
  let lang = null;
  try {
    lang = window.localStorage.getItem("language");
  } catch (e) {
    lang = null;
  }
  if (!lang && moment) lang = moment.locale();
  return /^zh/i.test(lang || "") ? "zh" : "en";
}

let S = STRINGS.en;

const HAN = "\\u3400-\\u9fff";
const BACKSLASH_TRIGGER = new RegExp(`\\\\([A-Za-z${HAN}]+)$`);
const WORD_TRIGGER = new RegExp(`(?:^|[^A-Za-z${HAN}\\\\])([${HAN}]+|[A-Za-z]{3,})$`);

class LatexAutocomplete extends EditorSuggest {
  constructor(app) {
    super(app);
    this.limit = 20;
    if (this.suggestEl) this.suggestEl.addClass("latex-lookup-suggest");
    this.setInstructions([
      { command: "↵ / Tab", purpose: S.insert },
      { command: "↑↓", purpose: S.select },
      { command: "esc", purpose: S.close },
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
    const { mode, start: mathStart } = mathContextAt(editor, cursor);

    let match = before.match(BACKSLASH_TRIGGER);
    let start;
    if (match) {
      start = cursor.ch - match[0].length;
      this.fromBackslash = true;
    } else if (
      mode
      && (match = before.match(WORD_TRIGGER))
      && !inTextMode(editor.getRange(editor.offsetToPos(mathStart), cursor))
    ) {
      start = cursor.ch - match[1].length;
      this.fromBackslash = false;
    } else {
      return null;
    }

    this.mathMode = mode;
    return {
      start: { line: cursor.line, ch: start },
      end: cursor,
      query: match[1],
    };
  }

  getSuggestions(context) {
    return search(context.query, this.fromBackslash, this.fromBackslash).slice(0, this.limit);
  }

  renderSuggestion(entry, el) {
    renderRow(entry, el, this.context ? this.context.query : "");
  }

  selectSuggestion(entry) {
    const context = this.context;
    if (!context) return;
    this.close();
    insertSnippet(context.editor, context.start, context.end, entry, this.mathMode);
  }
}

class LatexLookupModal extends SuggestModal {
  constructor(app, editor) {
    super(app);
    this.editor = editor;
    this.limit = 60;
    this.modalEl.addClass("latex-lookup-modal");
    this.setPlaceholder(S.placeholder);
    this.setInstructions([
      { command: "↵", purpose: editor ? S.insert : S.copy },
      { command: "Shift ↵", purpose: editor ? S.insertWrapped : S.copyWrapped },
      { command: "Mod ↵", purpose: S.copy },
      { command: "esc", purpose: S.close },
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
    const copyOnly = (evt && (evt.metaKey || evt.ctrlKey)) || !this.editor;

    if (copyOnly) {
      const text = wrap ? `$${plainText(entry)}$` : plainText(entry);
      navigator.clipboard.writeText(text).then(
        () => new Notice(`${S.copied}${text}`),
        () => new Notice(S.copyFailed),
      );
      return;
    }
    const editor = this.editor;
    const from = editor.getCursor("from");
    const mode = wrap ? null : mathModeAt(editor, from) || "display";
    insertSnippet(editor, from, editor.getCursor("to"), entry, mode);
  }
}

module.exports = class LatexLookupPlugin extends Plugin {
  async onload() {
    S = STRINGS[uiLanguage()];
    this.registerEditorExtension([snippetField, snippetKeymap, scanCache]);
    const suggest = new LatexAutocomplete(this.app);
    this.registerEditorSuggest(suggest);

    // LaTeX Suite's tabout also binds Tab at the highest precedence and loads first,
    // so placeholder jumps are intercepted before the event reaches CodeMirror.
    this.registerDomEvent(document, "keydown", (evt) => {
      if (evt.key !== "Tab" || evt.ctrlKey || evt.metaKey || evt.altKey || evt.isComposing) return;
      if (suggest.isOpen) return;
      const target = evt.target instanceof Element ? evt.target.closest(".cm-editor") : null;
      const view = target ? EditorView.findFromDOM(target) : null;
      if (!view || !view.state.field(snippetField, false)) return;
      if (jumpToStop(view, evt.shiftKey ? -1 : 1)) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
      }
    }, { capture: true });

    const open = () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      const editor = view ? view.editor : null;
      new LatexLookupModal(this.app, editor).open();
    };

    this.addRibbonIcon("sigma", S.search, open);
    this.addCommand({
      id: "open-latex-lookup",
      name: S.search,
      callback: open,
    });
  }
};
