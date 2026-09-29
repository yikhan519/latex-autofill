// Builds the compact pinyin table embedded in main.js.
// Dev-only: npm install pinyin-pro, then node scripts/gen-pinyin.js
// The plugin does not depend on pinyin-pro at runtime.
const fs = require("fs");
const path = require("path");
const { polyphonic } = require("pinyin-pro");

// Readings that matter in this math dictionary. Anything not listed keeps the
// most common toneless reading. 数 stays shu so 实数集 is not also shuo.
const DOMAIN = {
  "数": ["shu"],
  "行": ["hang", "xing"],
  "长": ["chang", "zhang"],
  "率": ["lv", "shuai"],
  "参": ["can", "shen"],
  "差": ["cha", "ci", "chai"],
  "重": ["zhong", "chong"],
  "解": ["jie", "xie"],
  "系": ["xi", "ji"],
  "乘": ["cheng", "sheng"],
  "模": ["mo", "mu"],
  "强": ["qiang", "jiang"],
  "单": ["dan"],
  "种": ["zhong", "chong"],
  "乐": ["le", "yue"],
  "没": ["mei", "mo"],
  "了": ["le", "liao"],
  "地": ["di", "de"],
  "得": ["de", "dei"],
  "着": ["zhe", "zhao", "zhuo"],
  "为": ["wei"],
  "角": ["jiao", "jue"],
  "传": ["chuan", "zhuan"],
  "弹": ["dan", "tan"],
  "降": ["jiang", "xiang"],
  "似": ["si", "shi"],
  "薄": ["bao", "bo"],
  "壳": ["ke", "qiao"],
  "血": ["xue", "xie"],
  "削": ["xue", "xiao"],
  "转": ["zhuan"],
  "载": ["zai"],
  "藏": ["cang", "zang"],
  "折": ["zhe", "she"],
  "省": ["sheng", "xing"],
  "干": ["gan"],
  "还": ["hai", "huan"],
  "要": ["yao"],
  "会": ["hui", "kuai"],
  "大": ["da", "dai"],
  "都": ["dou", "du"],
  "相": ["xiang"],
  "圈": ["quan", "juan"],
  "的": ["de", "di"],
  "什": ["shen", "shi"],
  "只": ["zhi"],
  "几": ["ji"],
  "曲": ["qu"],
  "切": ["qie"],
  "空": ["kong"],
  "正": ["zheng"],
  "分": ["fen"],
  "中": ["zhong"],
  "间": ["jian"],
  "量": ["liang"],
  "同": ["tong"],
  "倒": ["dao"],
  "夹": ["jia", "ga"],
  "伽": ["jia", "ga"],
  "缪": ["miu", "mou", "miao"],
  "阿": ["a", "e"],
  "和": ["he", "huo", "hu"],
};

function normalize(raw) {
  return String(raw || "").toLowerCase().replace(/ü/g, "v").replace(/[^a-z]/g, "");
}

function commonChars() {
  const chars = new Set();
  // GB2312 level 1, the everyday simplified-Chinese repertoire.
  for (let hi = 0xb0; hi <= 0xd7; hi++) {
    for (let lo = 0xa1; lo <= 0xfe; lo++) {
      const s = new TextDecoder("gbk").decode(new Uint8Array([hi, lo]));
      const code = s.codePointAt(0);
      if (s.length === 1 && code >= 0x4e00 && code <= 0x9fff) chars.add(s);
    }
  }
  const mainPath = path.join(__dirname, "..", "main.js");
  const src = fs.readFileSync(mainPath, "utf8").replace(/\/\*PINYIN_TABLE\*\/[\s\S]*?\/\*PINYIN_TABLE_END\*\//, "");
  for (const ch of src) {
    const code = ch.codePointAt(0);
    if (code >= 0x3400 && code <= 0x9fff) chars.add(ch);
  }
  for (const ch of Object.keys(DOMAIN)) chars.add(ch);
  return chars;
}

function readingsFor(ch) {
  if (DOMAIN[ch]) return DOMAIN[ch].map(normalize).filter(Boolean);
  const list = polyphonic(ch, { type: "array", toneType: "none" });
  const first = list && list[0] && list[0][0];
  const syl = normalize(first);
  return syl ? [syl] : [];
}

function buildTable() {
  const groups = new Map();
  let covered = 0;
  for (const ch of commonChars()) {
    const reads = [...new Set(readingsFor(ch))];
    if (!reads.length) continue;
    covered++;
    for (const syl of reads) {
      if (!groups.has(syl)) groups.set(syl, []);
      groups.get(syl).push(ch);
    }
  }
  const parts = [];
  for (const syl of [...groups.keys()].sort()) {
    const chars = groups.get(syl).sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join("");
    parts.push(`${syl}:${chars}`);
  }
  return { table: parts.join(";"), covered, syllables: groups.size };
}

function spliceMain(table) {
  const mainPath = path.join(__dirname, "..", "main.js");
  const src = fs.readFileSync(mainPath, "utf8");
  const block = `/*PINYIN_TABLE*/\nconst PINYIN_TABLE = ${JSON.stringify(table)};\n/*PINYIN_TABLE_END*/`;
  const re = /\/\*PINYIN_TABLE\*\/[\s\S]*?\/\*PINYIN_TABLE_END\*\//;
  if (!re.test(src)) {
    console.error("main.js is missing PINYIN_TABLE markers");
    process.exit(1);
  }
  fs.writeFileSync(mainPath, src.replace(re, block));
}

const { table, covered, syllables } = buildTable();
console.log(`characters ${covered}, syllables ${syllables}, bytes ${Buffer.byteLength(table)}`);
if (process.argv.includes("--write")) spliceMain(table);
else process.stdout.write(table);
