// 中英 locale key 集合一致性自检（递归拍平后对比），并列出 page.application 段落 key 数。
// locale 文件带无扩展名 import（由 vite 解析），node ESM 解析不了，走 esbuild 打包加载。
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require2 = createRequire(import.meta.url);
const esbuild = require2(path.join(__dirname, '..', 'node_modules', 'esbuild'));

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function load(p) {
  const result = esbuild.buildSync({
    entryPoints: [p],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    absWorkingDir: path.dirname(p),
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require2);
  return flatten(mod.exports.default);
}

const zh = load(path.join(__dirname, '..', 'src', 'locales', 'zh_CN.js'));
const en = load(path.join(__dirname, '..', 'src', 'locales', 'en_US.js'));

const zhKeys = new Set(Object.keys(zh));
const enKeys = new Set(Object.keys(en));
const onlyZh = [...zhKeys].filter((k) => !enKeys.has(k));
const onlyEn = [...enKeys].filter((k) => !zhKeys.has(k));

console.log(`zh_CN keys: ${zhKeys.size}`);
console.log(`en_US keys: ${enKeys.size}`);
const appZh = [...zhKeys].filter((k) => k.startsWith('page.application.'));
console.log(`page.application keys (zh): ${appZh.length}`);
if (onlyZh.length) { console.log('ONLY in zh:'); onlyZh.forEach((k) => console.log(`  ${k}`)); }
if (onlyEn.length) { console.log('ONLY in en:'); onlyEn.forEach((k) => console.log(`  ${k}`)); }

// 与 Vue2 的 page.application key 集合对比
const zh2 = load('C:\\huawei\\goproject\\SamWafWeb\\src\\i18n\\zh_CN.js');
const en2 = load('C:\\huawei\\goproject\\SamWafWeb\\src\\i18n\\en_US.js');
const app2zh = new Set(Object.keys(zh2).filter((k) => k.startsWith('page.application.')));
const app2en = new Set(Object.keys(en2).filter((k) => k.startsWith('page.application.')));
const app3zh = new Set(appZh);
const app3en = new Set([...enKeys].filter((k) => k.startsWith('page.application.')));
const diff = (a, b, nameA, nameB) => {
  const d = [...a].filter((k) => !b.has(k));
  if (d.length) { console.log(`in ${nameA} but not ${nameB}:`); d.forEach((k) => console.log(`  ${k}`)); }
};
diff(app2zh, app3zh, 'Vue2 zh', 'Vue3 zh');
diff(app3zh, app2zh, 'Vue3 zh', 'Vue2 zh');
diff(app2en, app3en, 'Vue2 en', 'Vue3 en');
diff(app3en, app2en, 'Vue3 en', 'Vue2 en');
console.log(`page.application: Vue2 zh=${app2zh.size} Vue3 zh=${app3zh.size} Vue2 en=${app2en.size} Vue3 en=${app3en.size}`);
console.log(onlyZh.length === 0 && onlyEn.length === 0 ? 'PARITY OK' : 'PARITY FAIL');
