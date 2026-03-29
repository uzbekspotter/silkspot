const fs = require('fs');
const path = require('path');

const dir = path.join('C:\\WWW\\skygrid-pro\\src\\components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = [
  [/"JetBrains Mono", monospace/g, '"B612 Mono", monospace'],
  [/'JetBrains Mono', monospace/g, '"B612 Mono", monospace'],
  [/"Inter", sans-serif/g,         '"B612", sans-serif'],
  [/"Inter", ui-sans-serif/g,      '"B612", ui-sans-serif'],
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
