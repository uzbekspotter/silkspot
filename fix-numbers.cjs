const fs = require('fs');
const path = require('path');

const dir = 'C:\\WWW\\skygrid-pro\\src\\components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = [
  [/\.toLocaleString\(\)/g, ".toLocaleString('en-US')"],
];

let total = 0;
files.forEach(file => {
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, 'utf8');
  const orig = content;
  replacements.forEach(([from, to]) => { content = content.replace(from, to); });
  if (content !== orig) {
    fs.writeFileSync(fp, content, 'utf8');
    total++;
    console.log('✓ ' + file);
  }
});
console.log('Done: ' + total + ' files fixed');
