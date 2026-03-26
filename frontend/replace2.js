const fs = require('fs');
const path = require('path');

const dir = './src';
const extTypes = ['.tsx', '.ts'];

const map = {
  'bg-purple-900': 'bg-slate-900',
  'text-purple-900': 'text-slate-900',
  'from-purple-900': 'from-slate-900',
  'to-purple-900': 'to-slate-900',
  'from-purple-100': 'from-slate-100',
  'via-purple-50': 'via-slate-50',
  'text-purple-500': 'text-amber-600',
  'text-yellow-500': 'text-amber-600',
  'hover:text-yellow-600': 'hover:text-amber-700',
  'bg-yellow-500': 'bg-amber-600',
  'hover:bg-yellow-600': 'hover:bg-amber-700',
  'focus:ring-yellow-400': 'focus:ring-amber-500',
  'border-yellow-200': 'border-amber-200',
  'text-yellow-800': 'text-amber-800',
  'bg-yellow-100': 'bg-amber-100'
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
