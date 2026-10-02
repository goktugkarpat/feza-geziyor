/* After adding local runtime assets: node tools/update-cache.cjs */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),file=path.join(root,'sw.js');
const base=['index.html','manifest.webmanifest','icon.svg','icons/apple-touch-icon.png','icons/icon-192.png','icons/icon-512.png','vendor/three.js'];
const source=fs.readdirSync(path.join(root,'src')).filter(f=>/\.(js|css)$/.test(f)).sort().map(f=>'src/'+f);
const assets=['voice','ui','music'].filter(d=>fs.existsSync(path.join(root,'assets',d))).flatMap(d=>fs.readdirSync(path.join(root,'assets',d)).filter(f=>/\.(mp3|m4a|ogg|wav|json|png)$/.test(f)).sort().map(f=>'assets/'+d+'/'+f));
const files=[...base,...source,...assets];
let sw=fs.readFileSync(file,'utf8');
sw=sw.replace(/const CORE = \[[\s\S]*?\];/,'const CORE = [\n'+files.map(f=>"  '"+f+"'").join(',\n')+'\n];');
const hash=crypto.createHash('sha256');hash.update(sw.replace(/const CACHE = PREFIX \+ '[^']+';/,"const CACHE = PREFIX + 'VERSION';"));
files.forEach(f=>{hash.update(f+'\0');hash.update(fs.readFileSync(path.join(root,f)));});const version='v3-'+hash.digest('hex').slice(0,12);
sw=sw.replace(/const CACHE = PREFIX \+ '[^']+';/,"const CACHE = PREFIX + '"+version+"';");
fs.writeFileSync(file,sw);console.log(files.length+' local files in offline cache ('+version+').');
