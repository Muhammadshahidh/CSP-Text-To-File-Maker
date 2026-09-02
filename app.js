
/* ---------- Hero thread canvas (subtle, restrained) ---------- */
(function(){
  const canvas = document.getElementById('threadCanvas');
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize(){
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }
  function init(){
    resize();
    const count = Math.min(46, Math.floor(w/26));
    particles = Array.from({length: count}, () => ({
      x: Math.random()*w, y: Math.random()*h,
      vx: (Math.random()-0.5)*0.12, vy: (Math.random()-0.5)*0.12,
      r: Math.random()*1.4 + 0.4
    }));
  }
  function tick(){
    ctx.clearRect(0,0,w,h);
    for(const p of particles){
      p.x += p.vx; p.y += p.vy;
      if(p.x < 0 || p.x > w) p.vx *= -1;
      if(p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(205,164,94,0.35)';
      ctx.fill();
    }
    for(let i=0;i<particles.length;i++){
      for(let j=i+1;j<particles.length;j++){
        const a = particles[i], b = particles[j];
        const dx = a.x-b.x, dy = a.y-b.y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if(dist < 120){
          ctx.beginPath();
          ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.strokeStyle = `rgba(63,122,89,${0.18 * (1 - dist/120)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
    if(!reduced) requestAnimationFrame(tick);
  }
  window.addEventListener('resize', resize);
  init();
  tick();
})();

/* ---------- Scroll reveal (section-level only) ---------- */
(function(){
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, {threshold:0.12});
  els.forEach(el=>io.observe(el));
})();

document.getElementById('scrollToStudio').addEventListener('click', ()=>{
  document.getElementById('studioSection').scrollIntoView({behavior:'smooth', block:'start'});
});
document.getElementById('scrollToFeatures').addEventListener('click', ()=>{
  document.getElementById('featuresSection').scrollIntoView({behavior:'smooth', block:'start'});
});

/* ---------- Core tool logic ---------- */
const textInput = document.getElementById('textInput');
const fileName = document.getElementById('fileName');
const fileExt = document.getElementById('fileExt');
const toast = document.getElementById('toast');
const previewPanel = document.getElementById('previewPanel');
const previewFrame = document.getElementById('previewFrame');
let queue = [];
let history = [];

const extColors = {
  '.html':'#e37f4e', '.txt':'#8aa39a', '.md':'#7fb2d9', '.json':'#e0c15c',
  '.css':'#79c1a8', '.js':'#e8d15a', '.xml':'#c98fd6', '.csv':'#7fd67f',
  '.yml':'#d68f8f', '.log':'#9c9c9c'
};

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>toast.classList.remove('show'), 2000);
}

function updateStats(){
  const val = textInput.value;
  document.getElementById('statChars').textContent = val.length;
  const words = val.trim().length ? val.trim().split(/\s+/).length : 0;
  document.getElementById('statWords').textContent = words;
  const lines = val.length ? val.split('\n').length : 0;
  document.getElementById('statLines').textContent = lines;
  const readSecs = Math.max(0, Math.round((words/200)*60));
  document.getElementById('statRead').textContent = readSecs < 60 ? readSecs+'s' : Math.round(readSecs/60)+'m';
  updatePreview();
}

function updatePreview(){
  if(fileExt.value === '.html'){
    previewPanel.style.display = 'block';
    previewFrame.srcdoc = textInput.value;
  } else {
    previewPanel.style.display = 'none';
  }
}

textInput.addEventListener('input', updateStats);
fileExt.addEventListener('change', updatePreview);

function getMime(ext){
  const map = {
    '.txt':'text/plain', '.html':'text/html', '.md':'text/markdown',
    '.json':'application/json', '.css':'text/css', '.js':'application/javascript',
    '.xml':'application/xml', '.csv':'text/csv', '.yml':'text/yaml', '.log':'text/plain'
  };
  return map[ext] || 'text/plain';
}

function triggerDownload(name, ext, content){
  const blob = new Blob([content], {type: getMime(ext)});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name + ext;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function addHistory(name, ext, content){
  history.unshift({name, ext, content, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})});
  if(history.length > 12) history.pop();
  renderHistory();
}

function renderHistory(){
  const list = document.getElementById('historyList');
  document.getElementById('historyCount').textContent = history.length ? history.length + ' this session' : 'This session';
  if(!history.length){
    list.innerHTML = '<div class="history-empty">Nothing downloaded yet this session</div>';
    return;
  }
  list.innerHTML = history.map((h,i)=>`
    <div class="history-item">
      <span><span class="qname">${h.name}${h.ext}</span> <span class="hmeta">${h.time}</span></span>
      <button data-i="${i}">Re-download</button>
    </div>
  `).join('');
  list.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      const h = history[parseInt(b.getAttribute('data-i'))];
      if(h.content === null){ showToast('Batch ZIPs are not re-downloadable — rebuild the queue'); return; }
      triggerDownload(h.name, h.ext, h.content);
      showToast('⬇ Re-downloaded ' + h.name + h.ext);
    });
  });
}

function doDownload(){
  const name = (fileName.value.trim() || 'my-file');
  if(!textInput.value.length){ showToast('Editor is empty'); return; }
  triggerDownload(name, fileExt.value, textInput.value);
  addHistory(name, fileExt.value, textInput.value);
  showToast('✓ Downloaded ' + name + fileExt.value);
}

document.getElementById('btnDownload').addEventListener('click', doDownload);

document.addEventListener('keydown', (e)=>{
  if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){
    e.preventDefault();
    doDownload();
  }
});

document.getElementById('btnCopy').addEventListener('click', async ()=>{
  try{ await navigator.clipboard.writeText(textInput.value); showToast('⧉ Copied to clipboard'); }
  catch(e){ showToast('Copy failed'); }
});

document.getElementById('btnClear').addEventListener('click', ()=>{
  textInput.value = ''; updateStats(); showToast('Editor cleared');
});

/* File load */
document.getElementById('btnLoadFile').addEventListener('click', ()=>document.getElementById('hiddenFileInput').click());
document.getElementById('hiddenFileInput').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    textInput.value = ev.target.result;
    const dotIdx = file.name.lastIndexOf('.');
    if(dotIdx > -1){
      fileName.value = file.name.substring(0, dotIdx);
      const ex = file.name.substring(dotIdx);
      const opt = [...fileExt.options].find(o=>o.value === ex);
      if(opt) fileExt.value = ex;
    }
    updateStats();
    showToast('📂 Loaded ' + file.name);
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* Templates */
const templates = {
  html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<title>My Page</title>\n</head>\n<body>\n\n<h1>Hello World</h1>\n\n</body>\n</html>`,
  css: `body {\n  margin: 0;\n  font-family: sans-serif;\n  background: #111;\n  color: #eee;\n}\n\n.container {\n  max-width: 960px;\n  margin: 0 auto;\n  padding: 20px;\n}`,
  js: `// Starter script\nfunction main() {\n  console.log("Hello from CSP Text To File Maker");\n}\n\nmain();`,
  json: `{\n  "name": "example",\n  "version": "1.0.0",\n  "active": true,\n  "items": [1, 2, 3]\n}`
};
document.getElementById('btnTemplateHtml').addEventListener('click', ()=>{ textInput.value = templates.html; fileExt.value = '.html'; updateStats(); });
document.getElementById('btnTemplateCss').addEventListener('click', ()=>{ textInput.value = templates.css; fileExt.value = '.css'; updateStats(); });
document.getElementById('btnTemplateJs').addEventListener('click', ()=>{ textInput.value = templates.js; fileExt.value = '.js'; updateStats(); });
document.getElementById('btnTemplateJson').addEventListener('click', ()=>{ textInput.value = templates.json; fileExt.value = '.json'; updateStats(); });

/* Case tools */
document.querySelectorAll('[data-case]').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const mode = btn.getAttribute('data-case');
    let val = textInput.value;
    if(mode === 'upper') val = val.toUpperCase();
    else if(mode === 'lower') val = val.toLowerCase();
    else if(mode === 'title') val = val.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.substr(1).toLowerCase());
    else if(mode === 'trim') val = val.split('\n').map(l=>l.trim()).join('\n');
    textInput.value = val;
    updateStats();
  });
});

/* Find & Replace */
document.getElementById('btnReplace').addEventListener('click', ()=>{
  const find = document.getElementById('findText').value;
  const repl = document.getElementById('replaceText').value;
  if(!find){ showToast('Enter text to find'); return; }
  const count = textInput.value.split(find).length - 1;
  textInput.value = textInput.value.split(find).join(repl);
  updateStats();
  showToast(`Replaced ${count} occurrence(s)`);
});

/* Batch queue */
function renderQueue(){
  const list = document.getElementById('queueList');
  document.getElementById('queueCount').textContent = queue.length + ' file' + (queue.length===1?'':'s');
  if(!queue.length){
    list.innerHTML = '<div class="queue-empty">No files added yet — use "Add to Batch"</div>';
    return;
  }
  list.innerHTML = queue.map((f, i) => `
    <div class="queue-item">
      <span><span class="qname">${f.name}</span><span class="qext-badge" style="background:${f.ext in extColors ? extColors[f.ext]+'22' : '#1a2a20'};color:${extColors[f.ext]||'var(--gold)'}">${f.ext}</span></span>
      <button data-i="${i}">✕</button>
    </div>
  `).join('');
  list.querySelectorAll('button').forEach(b=>{
    b.addEventListener('click', ()=>{
      queue.splice(parseInt(b.getAttribute('data-i')), 1);
      renderQueue();
    });
  });
}

document.getElementById('btnAddQueue').addEventListener('click', ()=>{
  if(!textInput.value.length){ showToast('Editor is empty'); return; }
  queue.push({ name: fileName.value.trim() || ('file-' + (queue.length+1)), ext: fileExt.value, content: textInput.value });
  renderQueue();
  showToast('＋ Added to batch queue');
});

document.getElementById('btnClearQueue').addEventListener('click', ()=>{
  queue = []; renderQueue(); showToast('Queue cleared');
});

document.getElementById('btnDownloadZip').addEventListener('click', async ()=>{
  if(!queue.length){ showToast('Queue is empty'); return; }
  const zip = new JSZip();
  const usedNames = {};
  queue.forEach(f=>{
    let base = f.name + f.ext;
    if(usedNames[base] !== undefined){ usedNames[base]++; base = f.name + '-' + usedNames[base] + f.ext; }
    else usedNames[base] = 0;
    zip.file(base, f.content);
  });
  const blob = await zip.generateAsync({type:'blob'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'CSP-Text-To-File-Batch.zip';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  addHistory('CSP-Text-To-File-Batch', '.zip', null);
  showToast('📦 ZIP downloaded');
});

document.getElementById('year').textContent = new Date().getFullYear();
updateStats();
renderQueue();
renderHistory();

/* ---------- WhatsApp Channel Popup ---------- */
(() => {
  const popup = document.getElementById('channelPopup');
  const close = document.getElementById('channelPopupClose');
  const later = document.getElementById('channelPopupLater');
  if (!popup) return;

  const hidePopup = () => {
    popup.classList.remove('is-open');
    popup.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  const showPopup = () => {
    popup.classList.add('is-open');
    popup.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  close?.addEventListener('click', hidePopup);
  later?.addEventListener('click', hidePopup);
  popup.addEventListener('click', e => {
    if (e.target === popup) hidePopup();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') hidePopup();
  });

  window.addEventListener('load', () => setTimeout(showPopup, 900), { once: true });
})();
