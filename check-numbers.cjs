const fs = require('fs');
const path = require('path');

const dir = 'C:\\WWW\\skygrid-pro\\src\\components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

// Check what's actually in the files
files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const matches = content.match(/toLocaleString[^)]*\)/g);
  if (matches) console.log(file + ': ' + matches.join(', '));
});
