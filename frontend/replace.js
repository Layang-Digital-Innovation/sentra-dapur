const fs = require('fs');
const path = require('path');

const dir = './src';
const extTypes = ['.tsx', '.ts'];

const map = {
  'bg-purple-600': 'bg-slate-900',
  'hover:bg-purple-700': 'hover:bg-slate-800',
  'text-purple-600': 'text-amber-600',
  'text-purple-700': 'text-amber-700',
  'bg-purple-50': 'bg-slate-50',
  'hover:bg-purple-50': 'hover:bg-slate-50',
  'bg-purple-100': 'bg-slate-100',
  'border-purple-600': 'border-slate-900',
  'border-purple-500': 'border-slate-800',
  'from-purple-600': 'from-slate-900',
  'to-purple-700': 'to-slate-800',
  'focus:ring-purple-600': 'focus:ring-slate-900',
  'focus:border-purple-600': 'focus:border-slate-900',
  'from-purple-50': 'from-slate-50',
  'to-purple-100': 'to-slate-100',
  'bg-purple-700': 'bg-slate-800',
  'ring-purple-500': 'ring-slate-900',
  'text-purple-800': 'text-amber-800'
};

function walk(directory) {
  const files = fs.readdirSync(directory);
  for (const f of files) {
    const full = path.join(directory, f);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (extTypes.some(ext => full.endsWith(ext))) {
      let content = fs.readFileSync(full, 'utf8');
      let changed = false;
      
      for (const [key, value] of Object.entries(map)) {
        if (content.includes(key)) {
          content = content.replace(new RegExp(key, 'g'), value);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(full, content);
        console.log(`Updated ${full}`);
      }
    }
  }
}

walk(dir);
