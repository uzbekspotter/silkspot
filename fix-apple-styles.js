const fs = require('fs');
const path = require('path');

const dir = 'C:\\WWW\\skygrid-pro\\src\\components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && f !== 'ExplorePage.tsx');

// Apple → SkyGrid replacements
const replacements = [
  // SF Pro → Inter/JetBrains
  [/"SF Mono", monospace/g, '"JetBrains Mono", monospace'],
  [/'"SF Mono", monospace'/g, '"JetBrains Mono", monospace'],
  [/-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif/g, '"Inter", sans-serif'],
  [/-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif/g, '"Inter", sans-serif'],
  // Apple blue → aviation blue
  [/#0071e3/g, '#0ea5e9'],
  [/#0077ed/g, '#0284c7'],
  // Apple grays → Tailwind slate
  [/#1d1d1f/g, '#0f172a'],
  [/#6e6e73/g, '#475569'],
  [/#aeaeb2/g, '#94a3b8'],
  [/#c7c7cc/g, '#cbd5e1'],
  [/#d2d2d7/g, '#e2e8f0'],
  [/#f5f5f7/g, '#f8fafc'],
  [/#e8e8ed/g, '#f1f5f9'],
  [/#fafafa/g, '#f8fafc'],
  // Rounded pill buttons → 6px
  [/border-radius: 980px/g, 'border-radius: 6px'],
  // Huge card radii → tighter
  [/borderRadius: '18px 18px 0 0'/g, "borderRadius: '9px 9px 0 0'"],
  [/rounded-3xl/g, 'rounded-2xl'],
  // Letter spacing Apple-style
  [/letterSpacing: '-0.03em'/g, "letterSpacing: '-0.01em'"],
  [/letterSpacing: '-0.02em'/g, "letterSpacing: '-0.01em'"],
  // font-semibold in headlines → font-bold
  [/className="font-headline text-4xl font-semibold/g, 'className="font-headline text-4xl font-bold'],
  [/className="font-headline text-3xl font-semibold/g, 'className="font-headline text-3xl font-bold'],
  [/className="font-headline text-2xl font-semibold/g, 'className="font-headline text-2xl font-bold'],
  [/className="font-headline text-xl font-semibold/g, 'className="font-headline text-xl font-semibold'],
];

let totalChanges = 0;
files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = 0;
  replacements.forEach(([from, to]) => {
    const before = content;
    content = content.replace(from, to);
    if (content !== before) changed++;
  });
  if (changed > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalChanges += changed;
    console.log(`✓ ${file}: ${changed} replacements`);
  }
});
console.log(`\nTotal: ${totalChanges} changes across ${files.length} files`);
