const memoryDialog = document.querySelector('#memory-dialog');
const essayDialog = document.querySelector('#essay-dialog');
const soundToggle = document.querySelector('#sound-toggle');
const statusAnnouncer = document.querySelector('#status-announcer');
let currentPhotoIndex = 0;
let soundEnabled = false;
let audioContext;
const photos = [
  { image: 'assets/foto-01.jpeg', label: 'FOTO 01', title: 'Um retrato da infância', story: 'Um registro de quando eu era pequeno. O olhar curioso e a camiseta azul guardam um pedacinho da infância que hoje posso revisitar nesta jornada.' },
  { image: 'assets/foto-02.jpeg', label: 'FOTO 02', title: 'Um momento espontâneo', story: 'Um retrato espontâneo da infância, feito perto de casa. Às vezes, uma foto simples acaba virando uma janela para lembrar de outra fase da vida.' },
  { image: 'assets/foto-03.jpeg', label: 'FOTO 03', title: 'Ao lado da minha mãe', story: 'Um registro ao lado da minha mãe. O sorriso compartilhado destaca a presença da família e o carinho que acompanham minha trajetória.' }
];

function escapeHTML(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function playCue(kind = 'select') {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume();
    const notes = kind === 'power' ? [523.25, 659.25, 783.99] : kind === 'essay' ? [392, 523.25] : [659.25];
    notes.forEach((frequency, index) => {
      const start = audioContext.currentTime + index * 0.075;
      const oscillator = audioContext.createOscillator();
      const volume = audioContext.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, start);
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(0.035, start + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
      oscillator.connect(volume); volume.connect(audioContext.destination);
      oscillator.start(start); oscillator.stop(start + 0.1);
    });
  } catch { /* Audio stays optional if the browser blocks Web Audio. */ }
}
function renderPhotos() {
  document.querySelector('#photo-gallery').innerHTML = photos.map((photo, i) => `<article class="photo-save ${i === currentPhotoIndex ? 'selected' : ''}"><div class="photo-screen"><img src="${photo.image}" alt="${photo.title}"><span class="screen-tag">${photo.label} · CHECKPOINT</span><span class="screen-corner">▶ REC</span><span class="scanlines"></span></div><div class="photo-save-info"><div><span class="photo-kicker">SAVE POINT 0${i + 1}</span><h3>${photo.title}</h3><p>${photo.story}</p></div><button class="photo-open" data-open-photo="${i}" aria-label="Abrir flashcard: ${photo.title}" aria-pressed="${i === currentPhotoIndex}">▶ VER FLASHCARD <b>${['×','○','□'][i]}</b></button></div></article>`).join('');
  document.querySelectorAll('#photo-gallery [data-open-photo]').forEach(button => button.addEventListener('click', () => openPhoto(Number(button.dataset.openPhoto))));
}
function updatePhotoSelection() {
  document.querySelectorAll('.photo-save').forEach((card, i) => {
    const selected = i === currentPhotoIndex;
    card.classList.toggle('selected', selected);
    card.querySelector('.photo-open')?.setAttribute('aria-pressed', String(selected));
  });
}
function openPhoto(index) {
  currentPhotoIndex = (index + photos.length) % photos.length;
  index = currentPhotoIndex;
  updatePhotoSelection();
  const photo = photos[index];
  memoryDialog.dataset.photoIndex = index;
  memoryDialog.querySelector('.memory-dialog-content').innerHTML = `<p class="eyebrow">${photo.label} · FLASHCARD DE MEMÓRIA</p><h3 id="memory-dialog-title">${photo.title}</h3><div class="photo-detail"><img src="${photo.image}" alt="${photo.title}"><span>CHECKPOINT ${String(index + 1).padStart(2, '0')} / 03</span></div><p class="story-label">A HISTÓRIA POR TRÁS DA FOTO</p><p class="story-copy">${photo.story}</p><p class="story-label">LEMBRANÇA DESBLOQUEADA</p><p class="story-copy">Uma imagem que faz parte do arquivo da minha vida e da pessoa que estou me tornando.</p><div class="memory-nav"><button data-photo-step="-1">◀ FOTO ANTERIOR</button><span>${String(index + 1).padStart(2, '0')} / 03</span><button data-photo-step="1">PRÓXIMA FOTO ▶</button></div>`;
  if (!memoryDialog.open) memoryDialog.showModal();
  statusAnnouncer.textContent = `Flashcard aberto: ${photo.title}, foto ${index + 1} de ${photos.length}.`;
  playCue();
  memoryDialog.querySelectorAll('[data-photo-step]').forEach(button => button.addEventListener('click', () => openPhoto((index + Number(button.dataset.photoStep) + photos.length) % photos.length)));
}

function renderEssays(filter = '') {
  const grid = document.querySelector('#essay-grid');
  const cards = (window.ESSAY_DATA || []).map((data, i) => {
    const number = String(data.number).padStart(2, '0');
    const excerpt = data.sections?.[0]?.text || '';
    const haystack = `${data.title} ${number} ${excerpt}`.toLocaleLowerCase('pt-BR');
    if (!haystack.includes(filter.toLocaleLowerCase('pt-BR'))) return '';
    return `<button class="essay-card complete" data-essay="${i}"><span class="essay-top"><span class="essay-number">TXT_${number}</span><span>● ARQUIVADO</span></span><span class="essay-symbol">▤</span><span class="essay-title">${escapeHTML(data.title)}</span><span class="essay-topic">${escapeHTML(excerpt.slice(0, 118))}${excerpt.length > 118 ? '…' : ''}</span><span class="essay-bottom"><span>TEXTO INTEGRAL</span><b>ABRIR ↗</b></span></button>`;
  }).join('');
  grid.innerHTML = cards || '<div class="empty-search">NENHUMA REDAÇÃO ENCONTRADA.</div>';
  if (filter) statusAnnouncer.textContent = `${grid.querySelectorAll('.essay-card').length} redações encontradas.`;
  grid.querySelectorAll('[data-essay]').forEach(button => button.addEventListener('click', () => openEssay(Number(button.dataset.essay))));
}
function openEssay(index) {
  const data = window.ESSAY_DATA[index], number = String(data.number).padStart(2, '0');
  essayDialog.querySelector('.essay-dialog-content').innerHTML = `<p class="eyebrow">REDAÇÃO ${number} · TEXTO COMPLETO</p><h3 id="essay-dialog-title">${escapeHTML(data.title)}</h3><div class="essay-body">${data.sections.map(paragraph => `<p>${escapeHTML(paragraph.text)}</p>`).join('')}</div><div class="essay-reading-footer"><span>FIM DO TEXTO</span><span>REDAÇÃO ${number} / 17 <b>◆</b></span></div>`;
  essayDialog.showModal();
  statusAnnouncer.textContent = `Redação ${number} aberta: ${data.title}.`;
  playCue('essay');
}
document.querySelectorAll('.dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
});
document.querySelector('#essay-search').addEventListener('input', event => renderEssays(event.target.value.trim()));
soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.setAttribute('aria-label', soundEnabled ? 'Desativar sons do site' : 'Ativar sons do site');
  soundToggle.textContent = soundEnabled ? '♪ SOM: ON' : '♪ SOM: OFF';
  statusAnnouncer.textContent = soundEnabled ? 'Sons ativados.' : 'Sons desativados.';
  playCue('power');
});
document.querySelectorAll('.gamepad [data-open-photo]').forEach(button => button.addEventListener('click', () => openPhoto(Number(button.dataset.openPhoto))));
document.querySelectorAll('.gamepad [data-photo-step]').forEach(button => button.addEventListener('click', () => openPhoto(currentPhotoIndex + Number(button.dataset.photoStep))));
document.querySelectorAll('[data-scroll]').forEach(button => button.addEventListener('click', () => { const target = button.dataset.scroll; document.querySelector(`#${target}`).scrollIntoView({ behavior: 'smooth' }); statusAnnouncer.textContent = target === 'memorias' ? 'Seção de memórias.' : 'Seção de redações.'; playCue(); }));
document.querySelector('[data-pad-action="open-current-photo"]').addEventListener('click', () => openPhoto(currentPhotoIndex));
document.querySelector('[data-pad-action="focus-search"]').addEventListener('click', () => { document.querySelector('#redacoes').scrollIntoView({ behavior: 'smooth' }); document.querySelector('#essay-search').focus({ preventScroll: true }); statusAnnouncer.textContent = 'Busca de redações selecionada.'; playCue(); });
document.addEventListener('keydown', event => {
  const gameControlFocused = event.target instanceof Element && (event.target.closest('.gamepad') || event.target.closest('#memory-dialog'));
  if (!gameControlFocused || event.target.matches('input, textarea, select') || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowLeft') { event.preventDefault(); openPhoto(currentPhotoIndex - 1); }
  else if (event.key === 'ArrowRight') { event.preventDefault(); openPhoto(currentPhotoIndex + 1); }
  else if (event.key === '1') openPhoto(0);
  else if (event.key === '2') openPhoto(1);
  else if (event.key === '3') openPhoto(2);
});
renderPhotos(); renderEssays();
