const fs = require('fs');
const path = require('path');

const dir = path.join('C:\\WWW\\skygrid-pro\\src\\components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = [
  [/"SF Mono", monospace/g,        '"JetBrains Mono", monospace'],
  [/'SF Mono', monospace/g,        '"JetBrains Mono", monospace'],
  [/#0071e3/g,                     '#0ea5e9'],
  [/#0077ed/g,                     '#0284c7'],
  [/rgba\(0,113,227/g,             'rgba(14,165,233'],
  [/rgba\(0, 113, 227/g,           'rgba(14, 165, 233'],
  [/#1d1d1f/g,                     '#0f172a'],
  [/#6e6e73/g,                     '#475569'],
  [/#aeaeb2/g,                     '#94a3b8'],
  [/#c7c7cc/g,                     '#cbd5e1'],
  [/#d2d2d7/g,                     '#e2e8f0'],
  [/'#f5f5f7'/g,                   "'#f8fafc'"],
  [/"#f5f5f7"/g,                   '"#f8fafc"'],
  [/'#fafafa'/g,                   "'#f8fafc'"],
  [/"#fafafa"/g,                   '"#f8fafc"'],
  [/'#e8e8ed'/g,                   "'#f1f5f9'"],
  [/"#e8e8ed"/g,                   '"#f1f5f9"'],
  [/border-radius: 980px/g,        'border-radius: 6px'],
  [/letterSpacing: '-0\.03em'/g,   "letterSpacing: '-0.01em'"],
  [/letterSpacing: '-0\.02em'/g,   "letterSpacing: '-0.01em'"],
  [/text-5xl font-semibold/g,      'text-5xl font-bold'],
  [/text-4xl font-semibold/g,      'text-4xl font-bold'],
  [/text-3xl font-semibold/g,      'text-3xl font-bold'],
  [/text-2xl font-semibold/g,      'text-2xl font-bold'],
  [/rounded-3xl/g,                 'rounded-2xl'],
];

let totalFiles = 0;
let totalChanges = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fileChanges = 0;

  replacements.forEach(([from, to]) => {
    const before = content;
    content = content.replace(from, to);
    if (content !== before) fileChanges++;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalFiles++;
    totalChanges += fileChanges;
    console.log('✓ ' + file + ' (' + fileChanges + ' changes)');
  } else {
    console.log('— ' + file + ' (no changes)');
  }
});

console.log('\nDone: ' + totalChanges + ' changes in ' + totalFiles + ' files');
