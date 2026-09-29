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

const DICT_FOLDER = "LaTeX Autofill";
const DICT_PATH = "LaTeX Autofill/dictionary.md";
const DICT_DEBOUNCE_MS = 400;
const USAGE_LIMIT = 400;
const USAGE_BONUS_CAP = 36;
const MAX_USAGE_COUNT = 100000;

// Generated the first time the user opens the dictionary. Every non-entry line is
// either a comment, prose, or a fenced example, so loading it adds nothing.
const DICT_TEMPLATE = `# LaTeX Autofill 个人词典 / Personal dictionary

这个文件在库里，会随库同步。改完保存后自动重新加载，没有单独的设置页。
插件保持离线：词典只在本地解析，不会发起网络请求。

使用统计（插入或复制某个公式的次数）存在本机，不写进这个文件，也不随库同步。
在命令面板里运行「清除 LaTeX 使用统计」可以清掉。
Usage counts stay on this device. They are not written into this file and do not sync with the vault.
Run "Clear LaTeX usage statistics" from the command palette to reset them.

以 # 开头的行是注释。普通说明文字会忽略。代码块里的例子不会生效；
把示例那一行剪到代码块外面才会启用。
Lines starting with # are comments. Prose is ignored. Examples inside code fences are not active;
move a line outside the fence to enable it.

## 新增一条 / New entry

一行一条。英文名可以省略。关键词用空格分隔，中文和英文都可以。

\`\`\`
中文名 ;; 关键词 ;; LaTeX ;; English name
\`\`\`

需要分类时写成五段：分类、中文名、关键词、LaTeX、英文名，分隔符同样是空格加两个分号。

自定义模板的占位符（内置条目仍用花括号，命令表仍用 # 和 ~）：

- \`$1\`、\`$2\` 按编号跳转，不必按出现顺序。Tab 到下一个，Shift+Tab 回到上一个
- \`\${1:默认文字}\` 插入后选中默认文字，接着打字就会覆盖
- \`$0\` 是跳出占位符后光标停下的位置；不写则停在末尾
- 模板里如果完全没有 $ 编号，花括号里的内容仍是占位符
- \`#\` 和 \`~\` 在自定义模板里是普通字符。美元符号写成 \`\\$\`

\`\`\`
我的分数 ;; myfrac 自定义分式 ;; \\frac{\${1:a}}{\${2:b}}\$0 ;; My fraction
\`\`\`

## 给已有条目加别名 / Add an alias

行首写 +。目标可以是中文名、英文名、LaTeX，或条目 id。多个别名用 | 分开。
别名参与搜索，并且和名称一样加权。

\`\`\`
+求和 ;; 连加符号 | running total
+builtin:集合/实数集 ;; 实数轴
\`\`\`

中文名和中文别名会自动转成拼音。个别读音不对时，可以写死音节（空格分开，ü 写成 v）：

\`\`\`
~实数集 ;; shi shu ji
\`\`\`

有些公式对应不止一条，例如实数集和黑板粗体都是 \\mathbb{R}。
请改用中文名、英文名或上面这种 id，不要只用公式本身。
`;

let usageCounts = Object.create(null);
let usageSave = null;

function usageBonus(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const rounded = Math.round(10 * Math.log2(n + 1) * 10) / 10;
  return Math.min(USAGE_BONUS_CAP, rounded);
}

function boundUsage(counts, maxEntries) {
  const limit = maxEntries > 0 ? maxEntries : USAGE_LIMIT;
  const ids = Object.keys(counts);
  if (ids.length <= limit) return counts;
  ids.sort((a, b) => (counts[b] - counts[a]) || (a < b ? -1 : a > b ? 1 : 0));
  const kept = Object.create(null);
  for (let i = 0; i < limit; i++) kept[ids[i]] = counts[ids[i]];
  return kept;
}

function bumpUsage(counts, id, maxEntries) {
  const limit = maxEntries > 0 ? maxEntries : USAGE_LIMIT;
  const next = Object.assign(Object.create(null), counts);
  next[id] = Math.min(MAX_USAGE_COUNT, (Number(next[id]) || 0) + 1);
  if (Object.keys(next).length <= limit) return next;
  const bounded = boundUsage(next, limit);
  if (bounded[id]) return bounded;
  const ordered = Object.keys(bounded).sort(
    (a, b) => (bounded[a] - bounded[b]) || (a < b ? -1 : a > b ? 1 : 0),
  );
  delete bounded[ordered[0]];
  bounded[id] = next[id];
  return bounded;
}

function noteUsed(entry) {
  if (!entry || !entry.id) return;
  usageCounts = bumpUsage(usageCounts, entry.id, USAGE_LIMIT);
  if (typeof usageSave === "function") usageSave();
}

function setUsageSaver(fn) {
  usageSave = fn;
}

// Syllable → characters. Everyday simplified Chinese (GB2312 level 1) plus every
// Han character used by the built-in entries. Most characters keep their common
// toneless reading; polyphones that matter here (行, 长, 数, …) list each one.
// ü is written v. Regenerate with: node scripts/gen-pinyin.js --write
// (that script needs the dev package pinyin-pro; the plugin does not).
/*PINYIN_TABLE*/
const PINYIN_TABLE = "a:啊阿;ai:哀哎唉埃挨爱癌皑矮碍艾蔼隘;an:俺安岸按暗案氨胺鞍;ang:昂盎肮;ao:傲凹嚣奥懊敖澳熬翱袄;ba:八叭吧坝巴扒把拔捌爸疤笆罢芭跋霸靶;bai:佰拜摆柏白百稗败;ban:伴办半扮扳拌搬斑板版班瓣绊般颁;bang:傍帮梆棒榜磅绑膀蚌谤邦镑;bao:保剥包堡宝报抱暴爆胞苞薄褒豹雹饱鲍;bei:倍北卑备悲惫杯焙狈碑背被贝辈钡;ben:奔本笨苯;beng:崩泵甭绷蹦迸;bi:壁币庇弊彼必敝比毕毖毙痹碧笔臂蓖蔽逼避鄙闭陛鼻;bian:便卞变扁编贬辨辩辫边遍鞭;biao:彪标膘表;bie:别憋瘪鳖;bin:宾彬摈斌滨濒;bing:丙兵冰并柄炳病秉饼;bo:伯勃博帛拨搏播泊波渤玻箔簿脖膊舶菠薄钵铂驳;bu:不卜哺埠布怖捕步补部;ca:擦;cai:彩才材猜睬菜蔡裁财踩采;can:参惨惭残灿蚕餐;cang:仓沧舱苍藏;cao:操曹槽糙草;ce:侧册厕测策;ceng:层曾蹭;cha:刹叉察岔差插搽查碴茬茶诧;chai:差拆柴豺;chan:产掺搀缠蝉谗铲阐颤馋;chang:倡偿厂唱场尝常敞昌猖畅肠长;chao:吵嘲巢抄朝潮炒超钞;che:彻扯掣撤澈车;chen:尘忱晨沉臣衬趁辰郴陈;cheng:乘呈城惩成承撑橙澄秤称程诚逞骋;chi:侈匙吃尺弛持斥池炽痴翅耻赤迟驰齿;chong:充冲宠崇种虫重;chou:丑仇愁抽畴瞅稠筹绸臭踌酬;chu:储出初厨处搐楚橱滁畜矗础触躇锄除雏;chuai:揣;chuan:串传喘川椽穿船;chuang:创床疮窗闯;chui:吹垂捶炊锤;chun:唇春椿淳纯蠢醇;chuo:戳绰;ci:刺差慈次此瓷疵磁茨词赐辞雌;cong:丛从匆囱聪葱;cou:凑;cu:促簇粗醋;cuan:窜篡蹿;cui:催崔摧淬瘁粹翠脆;cun:存寸村;cuo:挫措搓撮磋错;da:大打搭瘩答达;dai:代傣呆大带待怠戴歹殆袋贷逮;dan:丹但单弹惮担掸旦氮淡耽胆蛋诞郸;dang:党当挡档荡;dao:倒刀到导岛悼捣盗祷稻蹈道;de:地得德的;dei:得;deng:凳灯登瞪等蹬邓;di:低地堤嫡帝底弟抵敌涤滴狄的笛第缔蒂迪递;dian:佃典垫奠店惦掂殿淀滇点电甸碘靛颠;diao:凋刁叼吊掉碉钓雕;die:叠爹碟蝶谍跌迭;ding:丁叮定盯订钉锭顶鼎;diu:丢;dong:东侗冬冻动恫懂栋洞董;dou:兜抖斗痘豆逗都陡;du:堵妒度杜毒渡犊独督睹肚读赌都镀;duan:断段短端缎锻;dui:兑堆对队;dun:吨墩敦盾蹲遁钝顿;duo:剁哆垛堕多夺惰掇朵舵跺躲;e:俄厄娥峨恶扼蛾讹轭遏鄂阿额饿鹅;en:恩;er:二儿尔洱而耳贰饵;fa:乏伐发法珐筏罚阀;fan:凡反帆樊泛烦犯番矾繁翻范藩贩返钒饭;fang:仿坊妨房放方纺肪芳访防;fei:匪吠啡废斐沸肥肺菲诽费非飞;fen:份分吩坟奋忿愤氛汾焚粉粪纷芬酚;feng:丰冯凤奉封峰枫烽疯缝蜂讽逢锋风;fo:佛;fou:否;fu:付伏俘俯傅副咐复夫妇孵富幅府弗扶抚拂敷斧服氟浮涪父甫福符缚肤腐腑腹袱覆讣负赋赴辅辐釜阜附;ga:伽嘎噶夹;gai:改概溉盖该钙;gan:干感敢杆柑甘秆竿肝赣赶;gang:冈刚岗杠港纲缸肛钢;gao:告搞皋稿篙糕羔膏高;ge:个割各咯哥戈搁格歌疙胳葛铬阁隔革鸽;gei:给;gen:根跟;geng:埂庚更梗羹耕耿;gong:供公共功宫工巩弓恭拱攻汞贡躬龚;gou:勾垢够构沟狗苟购钩;gu:估古咕固姑孤故沽箍股菇蛊谷辜雇顾骨鼓;gua:刮剐寡挂瓜褂;guai:乖怪拐;guan:关冠官惯棺灌管罐观贯馆;guang:光广逛;gui:刽圭归柜桂瑰癸硅规诡贵跪轨闺鬼龟;gun:棍滚辊;guo:国果裹过郭锅;ha:哈蛤;hai:亥咳孩害氦海还骇骸;han:函含喊寒悍憨憾捍撼旱汉汗涵焊罕翰邯酣韩;hang:夯杭航行;hao:号嚎壕好毫浩耗豪郝镐;he:何合呵和喝核河涸盒禾荷菏褐贺赫阂鹤;hei:嘿黑;hen:很恨狠痕;heng:亨哼恒横衡;hong:哄宏弘洪烘红虹轰鸿;hou:侯候厚后吼喉猴;hu:乎互呼和唬壶弧忽户护沪湖狐瑚糊胡葫虎蝴;hua:划化华哗滑猾画花话;huai:坏徊怀槐淮;huan:唤宦幻患换桓欢涣焕环痪缓豢还;huang:凰幌恍惶慌晃煌皇磺簧荒蝗谎黄;hui:会卉回徽恢悔惠慧挥晦毁汇灰烩秽绘蛔讳诲贿辉;hun:婚昏浑混荤魂;huo:伙和惑或活火祸获豁货霍;ji:伎冀几击剂即及吉圾基妓姬嫉季寂寄己忌急悸技挤既机极棘汲济激畸疾祭积稽箕籍系级纪继绩缉肌脊蓟计讥记辑迹际集饥鸡;jia:价伽佳假加嘉夹嫁家架枷甲稼荚贾钾颊驾;jian:件俭健兼减剑剪坚奸尖建拣捡柬检歼涧渐溅煎监硷碱笺简箭缄肩舰艰茧荐见贱践鉴键间饯;jiang:僵匠奖姜将强桨江浆疆蒋讲酱降;jiao:交侥剿叫嚼娇搅教椒浇焦狡矫礁窖绞缴胶脚蕉角轿较郊酵铰饺骄;jie:介借劫姐届戒截捷接揭杰洁界疥皆睫秸竭结节芥藉街解诫阶;jin:仅今劲尽巾斤晋津浸烬禁筋紧襟谨近进金锦靳;jing:井京兢净境径惊敬景晶痉睛竞竟粳精经茎荆警镜靖静颈鲸;jiong:炯窘;jiu:久九厩咎就揪救旧灸玖疚究纠臼舅酒韭;ju:举俱具剧句局居巨惧拒拘据桔沮炬狙疽矩聚菊距踞锯鞠驹;juan:倦卷圈娟捐眷绢鹃;jue:倔决抉掘撅攫爵绝觉角诀;jun:俊军君均峻浚竣菌郡钧骏;ka:卡咖喀;kai:凯开慨揩楷;kan:刊勘坎堪槛看砍;kang:亢康慷扛抗炕糠;kao:拷烤考靠;ke:克刻可坷壳客柯棵渴磕科苛课颗;ken:啃垦恳肯;keng:吭坑;kong:孔恐控空;kou:口寇扣抠;ku:哭库枯窟苦裤酷;kua:垮夸挎胯跨;kuai:会侩块快筷;kuan:宽款;kuang:况匡旷框狂眶矿筐;kui:亏傀奎岿愧溃盔窥葵馈魁;kun:困坤捆昆;kuo:廓扩括阔;la:啦喇垃拉腊蜡辣;lai:来莱赖;lan:兰婪懒拦揽栏滥澜烂篮缆蓝览谰阑;lang:廊朗榔浪狼琅郎;lao:佬劳姥捞涝烙牢老酪;le:乐了勒;lei:儡垒擂泪磊类累肋蕾镭雷;leng:冷棱楞;li:丽例俐傈利力励历厉厘吏哩李栗梨沥漓犁狸理璃痢砾礼离立篱粒荔莉里隶鲤黎;lia:俩;lian:帘廉怜恋敛涟炼练联脸莲连链镰;liang:两亮凉晾梁粮粱良谅辆量;liao:了僚寥廖撂撩料潦燎疗聊辽镣;lie:列劣烈猎裂;lin:临凛吝拎林淋琳磷赁邻霖鳞;ling:令伶凌另岭灵玲羚菱铃陵零领龄;liu:六刘柳榴流溜琉留瘤硫馏;long:咙垄拢窿笼聋陇隆龙;lou:娄搂楼漏篓陋;lu:卢卤庐录戮掳潞炉碌禄芦虏赂路陆露颅鲁鹿麓;luan:乱卵孪峦挛滦;lun:仑伦抡沦纶论轮;luo:洛箩络罗萝落螺裸逻锣骆骡;lv:侣吕屡履律旅氯滤率绿缕虑铝驴;lve:掠略;ma:吗嘛妈玛码蚂马骂麻;mai:买卖埋脉迈麦;man:慢曼满漫瞒蔓蛮谩馒;mang:忙氓盲芒茫莽;mao:冒卯帽毛猫矛茂茅貌贸铆锚;me:么;mei:妹媒媚寐昧枚梅每没煤玫眉美酶镁霉;men:们门闷;meng:孟梦檬猛盟萌蒙锰;mi:密幂弥泌眯秘米糜蜜觅谜迷醚靡;mian:免冕勉娩棉眠绵缅面;miao:妙庙描渺瞄秒缪苗藐;mie:灭蔑;min:悯抿敏民皿闽;ming:名命明螟铭鸣;miu:缪谬;mo:墨寞抹摩摸摹末模没沫漠磨膜莫蘑貉陌魔默;mou:某缪谋;mu:亩募墓姆幕慕拇暮木模母牟牡牧目睦穆;na:呐哪娜拿纳那钠;nai:乃奈奶氖耐;nan:南男难;nang:囊;nao:恼挠淖脑闹;ne:呢;nei:内馁;nen:嫩;neng:能;ni:你倪匿妮尼拟泥溺腻逆霓;nian:年念拈捻撵碾粘蔫辗;niang:娘酿;niao:尿鸟;nie:啮孽捏涅聂镊镍;nin:您;ning:凝宁拧柠泞狞;niu:扭牛纽钮;nong:农弄浓脓;nu:努奴怒;nuan:暖;nuo:懦挪糯诺;nv:女;nve:疟虐;o:哦;ou:偶呕欧殴沤藕鸥;pa:啪帕怕爬琶耙趴;pai:徘拍排派湃牌;pan:判叛攀潘畔盘盼磐;pang:乓庞旁耪胖;pao:刨咆抛泡炮袍跑;pei:佩呸培沛胚裴赔配陪;pen:喷盆;peng:彭抨捧朋棚澎烹砰硼碰篷膨蓬鹏;pi:僻劈匹啤坯屁批披毗琵疲痞皮砒脾譬辟霹;pian:偏片篇骗;piao:漂瓢票飘;pie:撇瞥;pin:品拼聘贫频;ping:乒凭坪屏平瓶苹萍评;po:坡婆泼破粕迫颇魄;pou:剖;pu:仆圃埔扑普曝朴浦瀑脯莆菩葡蒲谱铺;qi:七乞企其凄启器奇契妻岂崎弃戚旗期柒栖棋欺歧气汽沏泣漆畦砌祁祈脐讫起迄骑齐;qia:恰掐洽;qian:乾仟前千堑嵌扦欠歉浅潜牵签谦谴迁遣钎钱钳铅黔;qiang:呛墙强抢枪羌腔蔷;qiao:乔侨俏壳峭巧悄撬敲桥橇瞧窍翘锹鞘;qie:且切怯窃茄;qin:亲侵勤寝擒沁琴禽秦芹钦;qing:倾卿庆情擎晴氢氰清请轻青顷;qiong:琼穷;qiu:丘囚求泅球秋邱酋;qu:区去取娶屈曲渠蛆趋趣躯驱龋;quan:全券劝圈拳权泉犬痊醛颧;que:却榷炔瘸确缺雀鹊;qun:群裙;ran:冉染然燃;rang:嚷壤攘瓤让;rao:扰绕饶;re:惹热;ren:人仁任刃壬妊忍纫认韧;reng:仍扔;ri:日;rong:冗容戎溶熔绒茸荣蓉融;rou:揉柔肉;ru:乳儒入如孺汝茹蠕褥辱;ruan:软阮;rui:瑞蕊锐;run:润闰;ruo:弱若;sa:撒洒萨;sai:塞腮赛鳃;san:三伞叁散;sang:丧嗓桑;sao:嫂扫搔骚;se:涩瑟色;sen:森;seng:僧;sha:傻厦啥杀沙煞砂纱莎;shai:晒筛;shan:删善山扇擅杉栅汕煽珊缮膳苫衫赡闪陕;shang:上伤商墒尚晌裳赏;shao:勺哨少捎梢烧稍绍芍邵韶;she:奢射慑折摄涉社舌舍蛇设赊赦;shen:什伸参呻娠婶审慎沈深渗甚申砷神绅肾身;sheng:乘剩升圣声牲生甥盛省绳胜;shi:世事什仕似使侍势十史嗜噬士失始实室尸屎市师式恃拭拾施时是柿氏湿狮矢石示虱蚀视誓识试诗适逝释食饰驶;shou:兽受售守寿手授收瘦首;shu:书叔墅孰属庶恕戍抒数暑曙术束枢树梳殊淑漱熟疏竖署舒蔬薯蜀赎输述黍鼠;shua:刷耍;shuai:帅摔率甩衰;shuan:拴栓;shuang:双爽霜;shui:水睡税谁;shun:吮瞬舜顺;shuo:朔烁硕说;si:丝伺似司嗣嘶四寺巳思撕斯死私肆饲;song:宋怂松耸讼诵送颂;sou:嗽搜擞艘;su:俗僳塑宿溯粟素肃苏诉速酥;suan:算蒜酸;sui:岁碎祟穗绥虽遂隋随隧髓;sun:孙损笋;suo:唆所梭琐索缩蓑锁;ta:他塌塔她它挞獭踏蹋;tai:台太态抬汰泰胎苔酞;tan:叹坍坛坦弹探摊檀毯滩潭炭痰瘫碳袒谈谭贪;tang:倘唐堂塘搪棠汤淌烫糖膛趟躺;tao:套掏桃涛淘滔绦萄讨逃陶;te:特;teng:疼腾藤誊;ti:体剃剔啼嚏屉惕提替梯涕踢蹄锑题;tian:填天恬添甜田腆舔;tiao:挑条眺调跳迢;tie:帖贴铁;ting:亭停厅听庭廷挺汀烃艇;tong:同彤捅桐桶痛瞳童筒统通酮铜;tou:偷头投透;tu:兔凸吐图土屠徒涂秃突途;tuan:团湍;tui:推腿蜕褪退颓;tun:吞囤屯臀;tuo:唾妥托拓拖椭脱陀驮驼鸵;wa:哇娃挖洼瓦蛙袜;wai:外歪;wan:万丸婉完宛弯惋挽晚湾烷玩皖碗腕豌顽;wang:亡妄往忘旺望枉汪王网;wei:为伟伪位卫危味唯喂围委威尉尾巍微惟慰未桅渭潍畏纬维胃苇萎蔚谓违韦魏;wen:吻文温瘟稳紊纹蚊问闻;weng:嗡瓮翁;wo:卧我挝握斡沃涡窝蜗;wu:乌五伍侮务勿午吴吾呜坞屋巫悟戊捂无晤梧武毋污物舞芜诬误钨雾;xi:习吸喜嘻夕媳希席息悉惜戏昔晰析檄汐洗溪烯熄熙牺犀矽硒稀系细膝袭西锡隙;xia:下侠匣吓夏峡暇狭瞎虾辖霞;xian:仙先县咸嫌宪弦掀显涎献现纤线羡腺舷衔贤铣锨闲限险陷馅鲜;xiang:乡享像厢向响巷想橡湘相祥箱翔襄详象镶降项香;xiao:削哮啸孝宵小效晓校消淆硝笑肖萧销霄;xie:些写协卸屑懈挟携斜械楔歇泄泻胁蝎蟹血解谐谢邪鞋;xin:信心忻新欣芯薪衅辛锌;xing:兴刑型姓幸形性惺星杏猩省腥行邢醒;xiong:兄凶匈汹熊胸雄;xiu:休修嗅朽秀绣羞袖锈;xu:叙吁嘘墟婿序徐恤戌旭絮绪续蓄虚许酗需须;xuan:喧宣悬旋玄癣眩绚轩选;xue:削学穴薛血雪靴;xun:勋寻巡循旬殉汛熏训讯询迅逊驯;ya:丫亚压呀哑崖押涯牙芽蚜衙讶轧雅鸦鸭;yan:严厌咽唁堰奄宴岩延彦掩沿淹演炎烟焉焰燕盐眼研砚艳蜒衍言谚阉阎雁颜验;yang:仰佯养央扬杨样殃氧洋漾疡痒秧羊阳鸯;yao:咬妖姚尧摇瑶窑耀腰舀药要谣遥邀钥;ye:业也冶叶噎夜掖曳椰液爷耶腋野页;yi:一义乙亦亿以仪伊依倚医壹夷姨宜屹已异彝役忆意抑揖易椅毅沂溢疑疫益矣移绎翌翼肄胰臆艺蚁衣裔议译诣谊逸遗邑铱颐;yin:印吟因姻寅尹引殷淫茵荫银阴隐音饮;ying:婴应影映樱盈硬缨英荧莹萤营蝇赢迎颖鹰;yo:哟;yong:佣勇咏庸恿拥永泳涌用痈臃蛹踊雍;you:优佑又友右尤幼幽忧悠有油游犹由诱邮酉釉铀;yu:与予于余俞喻域娱宇寓屿峪御愈愉愚榆欲浴淤渔渝狱玉盂禹羽育舆芋虞裕誉语豫迂逾遇郁隅雨预驭鱼;yuan:元冤原员园圆垣怨愿援渊源猿缘苑袁辕远院鸳;yue:乐岳悦曰月粤约越跃阅;yun:云允匀孕晕耘蕴运郧酝陨韵;za:匝咋杂砸;zai:仔再哉在宰栽灾载;zan:咱攒暂赞;zang:脏葬藏赃;zao:凿噪早枣澡灶燥皂糟藻蚤躁造遭;ze:则择泽责;zei:贼;zen:怎;zeng:增憎赠;zha:乍喳扎札柞榨渣炸眨诈铡闸;zhai:债宅寨摘斋窄翟;zhan:占展崭战斩栈毡沾湛盏瞻站绽蘸詹;zhang:丈仗帐张彰掌杖樟涨漳瘴章胀账长障;zhao:兆召找招昭沼照着罩肇赵;zhe:哲折浙着者蔗蛰辙这遮锗;zhen:侦帧振斟枕珍甄疹真砧臻诊贞针镇阵震;zheng:争征怔拯挣政整正狰症睁蒸证郑;zhi:之侄值制只吱址峙帜志执指挚掷支旨智枝植止殖汁治滞炙痔直知秩稚窒纸织置职肢脂至致芝蜘质趾;zhong:中仲众忠盅种终肿衷重钟;zhou:周咒宙州帚昼洲皱粥肘舟诌轴骤;zhu:主住助嘱拄朱柱株注烛煮猪珠瞩祝竹筑著蛀蛛诛诸贮逐铸驻;zhua:抓爪;zhuai:拽;zhuan:专传撰砖篆赚转;zhuang:壮妆幢庄撞桩状装;zhui:坠椎缀赘追锥;zhun:准谆;zhuo:卓啄拙捉桌浊灼琢着茁酌;zi:兹咨姿子字孜淄渍滋滓籽紫自资;zong:宗总棕纵综踪鬃;zou:奏揍走邹;zu:卒族祖租组诅足阻;zuan:纂钻;zui:咀嘴最罪醉;zun:尊遵;zuo:佐作做坐左座昨";
/*PINYIN_TABLE_END*/

const PINYIN_EXACT = 7;
const PINYIN_PREFIX = 6;
const PINYIN_INITIALS = 5;
const PINYIN_INITIALS_PREFIX = 4;

let PINYIN_OF = null;

function pinyinMap() {
  if (PINYIN_OF) return PINYIN_OF;
  const map = Object.create(null);
  for (const part of PINYIN_TABLE.split(";")) {
    if (!part) continue;
    const colon = part.indexOf(":");
    if (colon <= 0) continue;
    const syl = part.slice(0, colon);
    for (const ch of part.slice(colon + 1)) {
      if (!map[ch]) map[ch] = [syl];
      else if (!map[ch].includes(syl)) map[ch].push(syl);
    }
  }
  PINYIN_OF = map;
  return map;
}

function attachPinyin(e) {
  const map = pinyinMap();
  const seqs = [];
  const texts = [e.name];
  if (e.aliases) {
    for (const alias of e.aliases) texts.push(alias);
  }
  for (const text of texts) {
    const chars = [];
    let ok = true;
    for (const ch of text || "") {
      const code = ch.codePointAt(0);
      if (code < 0x3400 || code > 0x9fff) continue;
      const reads = map[ch];
      if (!reads) { ok = false; break; }
      chars.push(reads);
    }
    if (ok && chars.length) seqs.push(chars);
  }
  if (e.pinyinOverride && e.pinyinOverride.length) seqs.push(e.pinyinOverride.map((syl) => [syl]));
  e.pySeqs = seqs;
}

// Full pinyin, a prefix that may stop mid-syllable, or consonant initials.
// Scores stay under the keyword bonus (8) so `frac` / `int` are unchanged,
// and above a loose hay substring so the pinyin hit is not buried.
function scorePinyinSequence(seq, term) {
  return Math.max(syllableScore(seq, term), initialsScore(seq, term));
}

function syllableScore(seq, term) {
  let best = 0;
  function walk(ci, qi) {
    if (best === PINYIN_EXACT) return;
    if (qi === term.length) {
      best = Math.max(best, ci === seq.length ? PINYIN_EXACT : PINYIN_PREFIX);
      return;
    }
    if (ci >= seq.length) return;
    const rest = term.slice(qi);
    for (const syl of seq[ci]) {
      if (rest.startsWith(syl)) walk(ci + 1, qi + syl.length);
      else if (rest.length < syl.length && syl.startsWith(rest)) best = Math.max(best, PINYIN_PREFIX);
    }
  }
  walk(0, 0);
  return best;
}

function initialsScore(seq, term) {
  if (term.length < 2 || term.length > seq.length) return 0;
  if (!/^[bcdfghjklmnpqrstwxyz]+$/.test(term)) return 0;
  function walk(ci, qi) {
    if (qi === term.length) {
      return term.length === seq.length ? PINYIN_INITIALS : PINYIN_INITIALS_PREFIX;
    }
    if (ci >= seq.length) return 0;
    const ch = term[qi];
    for (const syl of seq[ci]) {
      if (syl[0] === ch) return walk(ci + 1, qi + 1);
    }
    return 0;
  }
  return walk(0, 0);
}

function pinyinTermScore(entry, term) {
  if (!entry.pySeqs || term.length < 2 || !/^[a-z]+$/.test(term)) return 0;
  let best = 0;
  for (const seq of entry.pySeqs) {
    best = Math.max(best, scorePinyinSequence(seq, term));
    if (best === PINYIN_EXACT) return best;
  }
  return best;
}

function finalizeEntry(e) {
  if (e.en === undefined || e.en === null) {
    const leading = [];
    for (const word of (e.keys || "").split(/\s+/)) {
      if (!/^[A-Za-z][A-Za-z-]*$/.test(word) || leading.length === 2) break;
      leading.push(word);
    }
    e.en = leading.join(" ");
  }
  if (!Array.isArray(e.aliases)) e.aliases = [];
  e.nameLc = (e.name || "").toLowerCase();
  e.enLc = (e.en || "").toLowerCase();
  e.texLc = (e.tex || "").toLowerCase();
  e.aliasLc = e.aliases.map((alias) => alias.toLowerCase());
  const baseTokens = (e.keys || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (e.aliases.length === 0) {
    e.keyTokens = baseTokens;
  } else {
    const extra = e.aliases.join(" ").toLowerCase().split(/\s+/).filter(Boolean);
    e.keyTokens = baseTokens.concat(extra.filter((token) => !baseTokens.includes(token)));
  }
  e.hay = `${e.name} ${e.en} ${e.keys} ${e.cat} ${e.tex}`.toLowerCase();
  if (e.aliases.length) e.hay += ` ${e.aliases.join(" ").toLowerCase()}`;
  if (!e.id) e.id = e.user ? `user:${e.name}\0${e.tex}` : `builtin:${e.cat}/${e.name}`;
  attachPinyin(e);
  return e;
}

function disambiguateIds(entries) {
  const seen = new Map();
  for (const e of entries) {
    if (!e.id) continue;
    const n = seen.get(e.id) || 0;
    seen.set(e.id, n + 1);
    if (n > 0) e.id = `${e.id}#${n + 1}`;
  }
  return entries;
}

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
  for (const e of entries) finalizeEntry(e);
  disambiguateIds(entries);
  return entries;
}

let ENTRIES = buildEntries();

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

function rankEmpty(pool, usage) {
  if (!usage) return pool;
  let any = false;
  for (const id in usage) {
    if (usage[id] > 0) { any = true; break; }
  }
  if (!any) return pool;
  return pool
    .map((e, i) => ({ e, i, u: e.id && usage[e.id] ? usage[e.id] : 0 }))
    .sort((a, b) => b.u - a.u || a.i - b.i)
    .map((row) => row.e);
}

// Usage can raise a row, but not from at-or-below an exact name/alias match to
// at-or-above that match. With an empty usage map every bonus is zero, so scores
// stay equal to the historical base score.
function applyUsage(scored, usage) {
  const rows = scored.map((s) => {
    const count = usage && s.e.id ? usage[s.e.id] || 0 : 0;
    const bonus = usageBonus(count);
    return { ...s, usage: count, bonus, score: s.base + bonus };
  });
  const exacts = rows.filter((s) => s.exactName);
  if (exacts.length === 0) return rows;
  for (const row of rows) {
    if (row.exactName) continue;
    let score = row.score;
    for (const ex of exacts) {
      const exScore = ex.base + ex.bonus;
      if (row.base <= ex.base && score >= exScore) score = Math.min(score, exScore - 1e-4);
    }
    if (score < row.base) score = row.base;
    row.score = score;
  }
  return rows;
}

function compareRank(a, b) {
  if (a.score !== b.score) return b.score - a.score;
  if ((a.usage || b.usage) && a.exactName !== b.exactName) return a.exactName ? -1 : 1;
  if (a.usage !== b.usage) return b.usage - a.usage;
  return 0;
}

function searchEntries(entries, query, options = {}) {
  const allowFuzzy = options.allowFuzzy !== false;
  const includeExtra = options.includeExtra !== false;
  const usage = options.usage || null;
  const pool = includeExtra ? entries : entries.filter((e) => !e.extra);
  const raw = (query || "").trim();
  const q = raw.toLowerCase();
  if (!q) return rankEmpty(pool, usage);

  const terms = q.split(/\s+/);
  const scored = [];
  for (const e of pool) {
    let score = e.extra ? -12 : 0;
    let ok = true;
    let commandPrefix = false;
    let exactName = e.nameLc === q || (!!e.enLc && e.enLc === q);
    let aliasExact = false;
    if (e.aliasLc) {
      for (const alias of e.aliasLc) {
        if (alias === q) {
          exactName = true;
          aliasExact = true;
        }
      }
    }
    // A multi-word alias is not covered by the per-term exact bonus. Name and
    // English label keep their historical per-term scores.
    if (aliasExact && q.includes(" ") && e.nameLc !== q && e.enLc !== q) score += 50;
    for (const term of terms) {
      const idx = e.hay.indexOf(term);
      // Pinyin is not stored in hay: a mid-word substring would drown 实数集 under
      // unrelated Latin hits. It only fills a term the hay does not contain.
      if (idx < 0) {
        const py = pinyinTermScore(e, term);
        if (!py) { ok = false; break; }
        score += py;
        continue;
      }
      const nameScore = Math.max(labelBonus(e.nameLc, term), labelBonus(e.enLc, term));
      let aliasScore = 0;
      if (e.aliasLc) {
        for (const alias of e.aliasLc) aliasScore = Math.max(aliasScore, labelBonus(alias, term));
      }
      const best = Math.max(nameScore, aliasScore);
      if (best === 50) exactName = true;
      score += best;
      const keyAt = e.keyTokens.indexOf(term);
      if (keyAt === 0) score += 30;
      else if (keyAt > 0) score += 8;
      if (e.texLc.startsWith(term) || e.texLc.startsWith("\\" + term)) {
        score += 15;
        commandPrefix = true;
      } else if (best === 0 && keyAt < 0) score -= idx * 0.01;
    }
    // Whole-query command prefix. Skip when a term already scored that prefix,
    // so "partial" is not counted twice against \partial.
    if (ok && !commandPrefix && e.tex.startsWith("\\" + raw)) score += 8;
    if (ok) scored.push({ e, base: score - e.tex.length * 0.001, exactName });
  }

  if (scored.length === 0 && allowFuzzy) {
    const fuzzy = prepareFuzzySearch(q);
    for (const e of pool) {
      const r = fuzzy(e.hay);
      if (r) scored.push({ e, base: r.score, exactName: false });
    }
  }

  return applyUsage(scored, usage).sort(compareRank).map((s) => s.e);
}

function search(query, allowFuzzy = true, includeExtra = true) {
  return searchEntries(ENTRIES, query, { allowFuzzy, includeExtra, usage: usageCounts });
}

function readDollar(tex, i) {
  let j = i + 1;
  if (j >= tex.length) return null;
  if (tex[j] === "{") {
    j++;
    const start = j;
    if (j < tex.length && tex[j] === "0" && (j + 1 >= tex.length || !/\d/.test(tex[j + 1]))) {
      j++;
    } else if (j < tex.length && /[1-9]/.test(tex[j])) {
      j++;
      while (j < tex.length && /\d/.test(tex[j])) j++;
    } else {
      return null;
    }
    const n = Number(tex.slice(start, j));
    if (tex[j] === "}") return { n, def: "", next: j + 1 };
    if (tex[j] !== ":") return null;
    j++;
    let def = "";
    while (j < tex.length) {
      if (tex[j] === "\\" && j + 1 < tex.length) {
        const nxt = tex[j + 1];
        if (nxt === "\\") {
          def += "\\";
          j += 2;
          continue;
        }
        if (nxt === "}") {
          def += "}";
          j += 2;
          continue;
        }
        def += tex[j] + nxt;
        j += 2;
        continue;
      }
      if (tex[j] === "}") return { n, def, next: j + 1 };
      def += tex[j];
      j++;
    }
    return { error: "unclosed" };
  }
  if (tex[j] === "0" && (j + 1 >= tex.length || !/\d/.test(tex[j + 1]))) {
    return { n: 0, def: "", next: j + 1 };
  }
  if (/[1-9]/.test(tex[j])) {
    const start = j;
    j++;
    while (j < tex.length && /\d/.test(tex[j])) j++;
    return { n: Number(tex.slice(start, j)), def: "", next: j };
  }
  return null;
}

function hasDollarStops(tex) {
  for (let i = 0; i < tex.length; i++) {
    if (tex[i] === "\\" && i + 1 < tex.length) {
      i++;
      continue;
    }
    if (tex[i] === "$" && readDollar(tex, i)) return true;
  }
  return false;
}

function expandUserTemplate(tex) {
  let text = "";
  const stops = [];
  let exit = null;
  for (let i = 0; i < tex.length; i++) {
    const ch = tex[i];
    if (ch === "\\" && i + 1 < tex.length) {
      text += ch + tex[i + 1];
      i++;
      continue;
    }
    if (ch === "$") {
      const parsed = readDollar(tex, i);
      if (parsed && parsed.error) return { error: parsed.error };
      if (parsed) {
        if (parsed.n === 0) {
          text += parsed.def;
          if (exit === null) exit = text.length;
        } else {
          const from = text.length;
          text += parsed.def;
          stops.push({ n: parsed.n, from, to: text.length });
        }
        i = parsed.next - 1;
        continue;
      }
    }
    text += ch;
  }
  stops.sort((a, b) => a.n - b.n || a.from - b.from);
  return {
    text,
    stops: stops.map((stop) => [stop.from, stop.to]),
    exit: exit === null ? text.length : exit,
  };
}

function parseAliasLine(line, lineNo) {
  const body = line.slice(1).trim();
  const sep = body.indexOf(" ;; ");
  if (sep < 0) return { error: { line: lineNo, code: "empty-alias", target: body } };
  const target = body.slice(0, sep).trim();
  const parts = body.slice(sep + 4).split("|").map((s) => s.trim()).filter(Boolean);
  if (!target || parts.length === 0) return { error: { line: lineNo, code: "empty-alias", target } };
  return { alias: { line: lineNo, target, parts } };
}

function parseEntryLine(line, lineNo) {
  const parts = line.split(" ;; ").map((s) => s.trim());
  let cat = "自定义";
  let name;
  let keys;
  let tex;
  let en;
  if (parts.length === 3) {
    [name, keys, tex] = parts;
  } else if (parts.length === 4) {
    [name, keys, tex, en] = parts;
  } else if (parts.length === 5) {
    [cat, name, keys, tex, en] = parts;
  } else {
    return { error: { line: lineNo, code: "bad-entry" } };
  }
  if (!name) return { error: { line: lineNo, code: "empty-name" } };
  if (!tex) return { error: { line: lineNo, code: "empty-tex" } };
  if (hasDollarStops(tex)) {
    const expanded = expandUserTemplate(tex);
    if (expanded.error) return { error: { line: lineNo, code: "bad-placeholder", detail: expanded.error } };
  }
  return {
    entry: finalizeEntry({
      cat: cat || "自定义",
      name,
      keys: keys || "",
      tex,
      en,
      user: true,
      extra: false,
      aliases: [],
    }),
  };
}

function parseDictionary(text) {
  const entries = [];
  const aliases = [];
  const pinyins = [];
  const errors = [];
  const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  let fence = false;
  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i].trim();
    if (/^```/.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence || !line || line.startsWith("#")) continue;
    if (line.startsWith("+")) {
      const parsed = parseAliasLine(line, lineNo);
      if (parsed.error) errors.push(parsed.error);
      else aliases.push(parsed.alias);
      continue;
    }
    if (line.startsWith("~")) {
      const parsed = parsePinyinLine(line, lineNo);
      if (parsed.error) errors.push(parsed.error);
      else pinyins.push(parsed.pinyin);
      continue;
    }
    if (!line.includes(" ;; ")) continue;
    const parsed = parseEntryLine(line, lineNo);
    if (parsed.error) errors.push(parsed.error);
    else entries.push(parsed.entry);
  }
  if (fence) errors.push({ line: lines.length || 1, code: "unclosed-fence" });
  return { entries, aliases, pinyins, errors };
}

function parsePinyinLine(line, lineNo) {
  const body = line.slice(1).trim();
  const sep = body.indexOf(" ;; ");
  if (sep < 0) return { error: { line: lineNo, code: "bad-pinyin", target: body } };
  const target = body.slice(0, sep).trim();
  const syllables = body.slice(sep + 4).toLowerCase().split(/[\s|/]+/).map((s) => s.trim()).filter(Boolean);
  if (!target || syllables.length === 0 || syllables.some((syl) => !/^[a-z]+$/.test(syl))) {
    return { error: { line: lineNo, code: "bad-pinyin", target } };
  }
  return { pinyin: { line: lineNo, target, syllables } };
}

function findAliasTargets(entries, target) {
  const t = target.trim();
  const idHits = entries.filter((e) => e.id === t);
  if (idHits.length === 1) return { matches: idHits, ambiguous: false };
  if (idHits.length > 1) return { matches: idHits, ambiguous: true };
  const lc = t.toLowerCase();
  const matches = entries.filter((e) =>
    e.name === t || (!!e.en && e.en.toLowerCase() === lc) || e.tex === t);
  return { matches, ambiguous: matches.length > 1 };
}

function entryProblemLabel(e) {
  const en = e.en && e.en !== e.name ? `, ${e.en}` : "";
  return `${e.name}${en} [${e.id}]`;
}

function addAliasParts(entry, parts) {
  if (!entry.aliases) entry.aliases = [];
  for (const alias of parts) {
    const dup = entry.aliases.some((have) => have.toLowerCase() === alias.toLowerCase());
    if (!dup) entry.aliases.push(alias);
  }
  finalizeEntry(entry);
}

function applyAliases(entries, aliases) {
  const errors = [];
  for (const alias of aliases) {
    const found = findAliasTargets(entries, alias.target);
    if (found.matches.length === 0) {
      errors.push({ line: alias.line, code: "alias-not-found", target: alias.target });
      continue;
    }
    if (found.ambiguous) {
      errors.push({
        line: alias.line,
        code: "ambiguous",
        target: alias.target,
        names: found.matches.map(entryProblemLabel),
      });
      continue;
    }
    addAliasParts(found.matches[0], alias.parts);
  }
  return errors;
}

function applyPinyinOverrides(entries, overrides) {
  const errors = [];
  for (const ov of overrides || []) {
    const found = findAliasTargets(entries, ov.target);
    if (found.matches.length === 0) {
      errors.push({ line: ov.line, code: "pinyin-not-found", target: ov.target });
      continue;
    }
    if (found.ambiguous) {
      errors.push({
        line: ov.line,
        code: "ambiguous",
        target: ov.target,
        names: found.matches.map(entryProblemLabel),
      });
      continue;
    }
    found.matches[0].pinyinOverride = ov.syllables;
    attachPinyin(found.matches[0]);
  }
  return errors;
}

function rebuildFromDictionary(text) {
  const parsed = parseDictionary(text);
  const entries = buildEntries().concat(parsed.entries);
  disambiguateIds(entries);
  const aliasErrors = applyAliases(entries, parsed.aliases);
  const pinyinErrors = applyPinyinOverrides(entries, parsed.pinyins);
  return { entries, errors: parsed.errors.concat(aliasErrors, pinyinErrors) };
}

function formatDictionaryProblem(error, lang) {
  const zh = lang === "zh";
  const line = zh ? `第 ${error.line} 行` : `Line ${error.line}`;
  switch (error.code) {
    case "bad-entry":
      return zh
        ? `${line}：格式应为「名称 ;; 关键词 ;; LaTeX」`
        : `${line}: expected "name ;; keywords ;; tex"`;
    case "empty-name":
      return zh ? `${line}：名称为空` : `${line}: name is empty`;
    case "empty-tex":
      return zh ? `${line}：LaTeX 为空` : `${line}: LaTeX is empty`;
    case "bad-placeholder":
      return zh ? `${line}：占位符没有闭合` : `${line}: unclosed placeholder`;
    case "unclosed-fence":
      return zh ? `${line}：代码块没有闭合，块内的条目不会生效` : `${line}: code fence is not closed, so lines inside it were skipped`;
    case "empty-alias":
      return zh
        ? `${line}：别名行应为「+目标 ;; 别名」`
        : `${line}: alias line should look like "+target ;; alias"`;
    case "bad-pinyin":
      return zh
        ? `${line}：拼音行应为「~目标 ;; pin yin」`
        : `${line}: pinyin line should look like "~target ;; pin yin"`;
    case "pinyin-not-found":
      return zh
        ? `${line}：找不到要标注拼音的「${error.target}」`
        : `${line}: no entry matches pinyin target "${error.target}"`;
    case "alias-not-found":
      return zh
        ? `${line}：找不到「${error.target}」`
        : `${line}: no entry matches "${error.target}"`;
    case "ambiguous":
      return zh
        ? `${line}：「${error.target}」匹配到多条（${(error.names || []).join("、")}），请改用名称或 id`
        : `${line}: "${error.target}" matches more than one entry (${(error.names || []).join(", ")}); use the name or id`;
    default:
      return `${line}: ${error.code}`;
  }
}

function isDictPath(path) {
  return path === DICT_PATH;
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
  "自定义": "Custom",
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

function expandExtraSnippet(tex) {
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

function expandSnippet(tex, isExtra, isUser) {
  if (isExtra) return expandExtraSnippet(tex);
  if (isUser && hasDollarStops(tex)) {
    const expanded = expandUserTemplate(tex);
    if (!expanded.error) return { text: expanded.text, stops: expanded.stops, exit: expanded.exit };
  }
  return { text: tex, stops: deriveStops(tex), exit: tex.length };
}

function snippetFor(entry, mode) {
  const source = mode === "display" ? entry.tex : entry.tex.replace(/\s*\n\s*/g, " ");
  return expandSnippet(source, !!entry.extra, !!entry.user);
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
    // Numbered placeholders are stored in tab order, which is not always document
    // order. Drop overlaps so an empty $1$2 pair cannot throw inside Decoration.set.
    const marks = value.stops
      .slice(Math.max(value.index, 0))
      .map(([a, b]) => (b > a ? stopMark.range(a, b) : emptyStopMark.range(a)))
      .sort((a, b) => a.from - b.from || a.to - b.to);
    const ranges = [];
    let lastTo = -1;
    for (const range of marks) {
      if (range.from < lastTo) continue;
      if (range.from === lastTo && range.to === lastTo) continue;
      ranges.push(range);
      lastTo = Math.max(lastTo, range.to);
    }
    return Decoration.set(ranges);
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
  const { text, stops, exit } = snippetFor(entry, mode);
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
    try { noteUsed(entry); } catch (e) { /* ranking must not block insertion */ }
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
  try { noteUsed(entry); } catch (e) { /* ranking must not block insertion */ }
}

function plainText(entry) {
  if (entry.extra) return entry.tex.replace(/[#~]/g, "");
  if (entry.user && hasDollarStops(entry.tex)) {
    const expanded = expandUserTemplate(entry.tex);
    if (!expanded.error) return expanded.text;
  }
  return entry.tex;
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
    openDictionary: "Open personal dictionary",
    clearStats: "Clear LaTeX usage statistics",
    statsCleared: "LaTeX usage statistics cleared",
    dictReadFailed: "Couldn't read the personal dictionary",
    dictCreateFailed: "Couldn't create the personal dictionary",
    dictProblem: "Personal dictionary has problems; other lines were loaded",
    dictMore: "more",
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
    openDictionary: "打开个人词典",
    clearStats: "清除 LaTeX 使用统计",
    statsCleared: "已清除 LaTeX 使用统计",
    dictReadFailed: "无法读取个人词典",
    dictCreateFailed: "无法创建个人词典",
    dictProblem: "个人词典有问题，其余行已加载",
    dictMore: "处未显示",
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
        () => {
          try { noteUsed(entry); } catch (e) { /* ranking must not block copy */ }
          new Notice(`${S.copied}${text}`);
        },
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

class LatexLookupPlugin extends Plugin {
  async onload() {
    S = STRINGS[uiLanguage()];
    this._dictGen = 0;
    this._dictErrorSig = null;
    this.loadUsage();
    setUsageSaver(() => this.scheduleUsageSave());
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
    this.addCommand({
      id: "open-personal-dictionary",
      name: S.openDictionary,
      callback: () => { this.openDictionary(); },
    });
    this.addCommand({
      id: "clear-usage-stats",
      name: S.clearStats,
      callback: () => { this.clearUsage(); },
    });

    this.app.workspace.onLayoutReady(() => {
      if (this._unloaded) return;
      this.registerEvent(this.app.vault.on("modify", (file) => this.scheduleDictionaryReload(file)));
      this.registerEvent(this.app.vault.on("delete", (file) => this.scheduleDictionaryReload(file)));
      this.registerEvent(this.app.vault.on("create", (file) => this.scheduleDictionaryReload(file)));
      this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
        if (isDictPath(file && file.path) || isDictPath(oldPath)) this.scheduleDictionaryReload();
      }));
      this.reloadDictionary();
    });
  }

  onunload() {
    this._unloaded = true;
    setUsageSaver(null);
    if (this._dictTimer) window.clearTimeout(this._dictTimer);
    if (this._usageTimer) {
      window.clearTimeout(this._usageTimer);
      this.persistUsage();
    }
  }

  usageKey() {
    let id = "vault";
    try {
      if (this.app && this.app.appId) id = String(this.app.appId);
      else if (this.app && this.app.vault && this.app.vault.getName) id = String(this.app.vault.getName());
    } catch (e) {
      id = "vault";
    }
    return `latex-autofill-usage-v1:${id}`;
  }

  loadUsage() {
    try {
      const raw = window.localStorage.getItem(this.usageKey());
      if (!raw) return;
      const data = JSON.parse(raw);
      const counts = data && data.counts;
      if (!counts || typeof counts !== "object") return;
      const clean = Object.create(null);
      for (const [id, n] of Object.entries(counts)) {
        if (typeof id !== "string" || !id || !Number.isFinite(n) || n <= 0) continue;
        clean[id] = Math.min(MAX_USAGE_COUNT, Math.floor(n));
      }
      usageCounts = boundUsage(clean, USAGE_LIMIT);
    } catch (e) {
      usageCounts = Object.create(null);
    }
  }

  persistUsage() {
    try {
      window.localStorage.setItem(this.usageKey(), JSON.stringify({ v: 1, counts: usageCounts }));
    } catch (e) {
      // localStorage can throw in private mode or when the quota is full.
    }
  }

  scheduleUsageSave() {
    if (this._unloaded) return;
    if (this._usageTimer) window.clearTimeout(this._usageTimer);
    this._usageTimer = window.setTimeout(() => {
      this._usageTimer = null;
      this.persistUsage();
    }, DICT_DEBOUNCE_MS);
  }

  clearUsage() {
    usageCounts = Object.create(null);
    if (this._usageTimer) {
      window.clearTimeout(this._usageTimer);
      this._usageTimer = null;
    }
    try {
      window.localStorage.removeItem(this.usageKey());
    } catch (e) {
      // ignore quota / private-mode failures
    }
    new Notice(S.statsCleared);
  }

  scheduleDictionaryReload(file) {
    if (file && !isDictPath(file.path)) return;
    if (this._dictTimer) window.clearTimeout(this._dictTimer);
    this._dictTimer = window.setTimeout(() => {
      this._dictTimer = null;
      this.reloadDictionary();
    }, DICT_DEBOUNCE_MS);
  }

  async reloadDictionary() {
    if (this._unloaded) return;
    const gen = ++this._dictGen;
    const file = this.app.vault.getAbstractFileByPath(DICT_PATH);
    let text = "";
    if (file) {
      try {
        text = await this.app.vault.read(file);
      } catch (e) {
        if (gen !== this._dictGen || this._unloaded) return;
        new Notice(S.dictReadFailed);
        return;
      }
    }
    if (gen !== this._dictGen || this._unloaded) return;
    let built;
    try {
      built = rebuildFromDictionary(text);
    } catch (e) {
      new Notice(S.dictReadFailed);
      return;
    }
    if (gen !== this._dictGen || this._unloaded) return;
    ENTRIES = built.entries;
    const sig = built.errors
      .map((error) => `${error.line}:${error.code}:${error.target || ""}`)
      .join("\n");
    if (sig === this._dictErrorSig) return;
    this._dictErrorSig = sig;
    if (!built.errors.length) return;
    const lang = uiLanguage();
    const lines = built.errors.slice(0, 6).map((error) => formatDictionaryProblem(error, lang));
    if (built.errors.length > 6) {
      const rest = built.errors.length - 6;
      lines.push(lang === "zh" ? `另有 ${rest} ${S.dictMore}` : `${rest} ${S.dictMore}`);
    }
    new Notice([S.dictProblem, ...lines].join("\n"), 10000);
  }

  async openDictionary() {
    try {
      let file = this.app.vault.getAbstractFileByPath(DICT_PATH);
      if (!file) {
        const folder = this.app.vault.getAbstractFileByPath(DICT_FOLDER);
        if (!folder) await this.app.vault.createFolder(DICT_FOLDER);
        file = await this.app.vault.create(DICT_PATH, DICT_TEMPLATE);
      }
      const leaf = this.app.workspace.getLeaf(false);
      await leaf.openFile(file);
    } catch (e) {
      new Notice(S.dictCreateFailed);
    }
  }
}

module.exports = LatexLookupPlugin;
module.exports.parseDictionary = parseDictionary;
module.exports.rebuildFromDictionary = rebuildFromDictionary;
module.exports.searchEntries = searchEntries;
module.exports.expandSnippet = expandSnippet;
module.exports.expandUserTemplate = expandUserTemplate;
module.exports.usageBonus = usageBonus;
module.exports.bumpUsage = bumpUsage;
module.exports.buildEntries = buildEntries;
module.exports.finalizeEntry = finalizeEntry;
module.exports.hasDollarStops = hasDollarStops;
module.exports.formatDictionaryProblem = formatDictionaryProblem;
module.exports.snippetFor = snippetFor;
module.exports.DICT_PATH = DICT_PATH;
module.exports.DICT_TEMPLATE = DICT_TEMPLATE;
module.exports.USAGE_BONUS_CAP = USAGE_BONUS_CAP;
module.exports.USAGE_LIMIT = USAGE_LIMIT;
module.exports.pinyinTermScore = pinyinTermScore;
