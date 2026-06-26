const $ = (id) => document.getElementById(id);

const video = $("video");
const layoutSelect = $("layoutSelect");
const templateSelect = $("templateSelect");
const filterSelect = $("filterSelect");

const startBtn = $("startBtn");
const captureBtn = $("captureBtn");
const peaceBtn = $("peaceBtn");
const retakeBtn = $("retakeBtn");
const resetBtn = $("resetBtn");
const downloadBtn = $("downloadBtn");

const zoomInBtn = $("zoomInBtn");
const zoomOutBtn = $("zoomOutBtn");
const rotateBtn = $("rotateBtn");
const resetEditBtn = $("resetEditBtn");

const cameraStatus = $("cameraStatus");
const countdownEl = $("countdown");
const statusBox = $("statusBox");
const previewCanvas = $("previewCanvas");
const captureCanvas = $("captureCanvas");
const detectCanvas = $("detectCanvas");

const sessionActions = $("sessionActions");
const completeBox = $("completeBox");
const photoProgress = $("photoProgress");
const flash = $("flash");

let stream = null;
let photos = [];
let edits = [];
let templateImage = null;
let currentTemplate = null;
let photoAreas = [];
let peaceEnabled = CONFIG.peaceCapture;
let lastPeaceCapture = 0;
let isCapturing = false;
let peaceReady = false;
let activeFrame = 0;
let dragging = false;
let lastPointer = null;
let livePreviewLoop = null;

init();

function init() {
  renderLayoutOptions();
  layoutSelect.value = CONFIG.defaultLayout;

  renderTemplateOptions();
  bindEvents();
  applyVideoFilter();

  loadDefaultTemplate().then(renderPreview);
  updateStatus();
}

function bindEvents() {
  startBtn.onclick = startCamera;
  captureBtn.onclick = () => capturePhoto(false);
  retakeBtn.onclick = retakePhoto;
  resetBtn.onclick = resetAll;
  downloadBtn.onclick = downloadStrip;
  peaceBtn.onclick = togglePeace;

  zoomInBtn.onclick = () => editFrame({ scale: 0.08 });
  zoomOutBtn.onclick = () => editFrame({ scale: -0.08 });
  rotateBtn.onclick = () => editFrame({ rotate: 90 });
  resetEditBtn.onclick = resetActiveEdit;

  layoutSelect.onchange = async () => {
    photos = [];
    edits = [];
    templateImage = null;
    photoAreas = [];

    renderTemplateOptions();
    await loadDefaultTemplate();
    await renderPreview();
    updateStatus();
  };

  templateSelect.onchange = async () => {
    photos = [];
    edits = [];

    await loadTemplate(templateSelect.value);
    await renderPreview();
    updateStatus();
  };

  filterSelect.onchange = () => {
    applyVideoFilter();
    renderPreview();
  };

  previewCanvas.addEventListener("pointerdown", startDrag);
  previewCanvas.addEventListener("pointermove", moveDrag);
  previewCanvas.addEventListener("pointerup", endDrag);
  previewCanvas.addEventListener("pointerleave", endDrag);
  previewCanvas.addEventListener("wheel", wheelZoom, { passive: false });
}

function renderLayoutOptions() {
  layoutSelect.innerHTML = "";

  Object.entries(CONFIG.layouts).forEach(([id, layout]) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = layout.name;
    layoutSelect.appendChild(option);
  });
}

function renderTemplateOptions() {
  const layoutId = layoutSelect.value;

  templateSelect.innerHTML = "";

  CONFIG.templates
    .filter((template) => template.layout === layoutId)
    .forEach((template) => {
      const option = document.createElement("option");
      option.value = template.id;
      option.textContent = template.name;
      templateSelect.appendChild(option);
    });

  templateSelect.value = CONFIG.defaultTemplate[layoutId] || templateSelect.value;
}

function getLayout() {
  return CONFIG.layouts[layoutSelect.value];
}

function getTemplateById(id) {
  return CONFIG.templates.find((template) => template.id === id);
}

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    video.srcObject = stream;
    cameraStatus.textContent = "CAM ON";

    startBtn.style.display = "none";
    sessionActions.style.display = "grid";

    applyVideoFilter();
    setupPeaceDetection();
    startLivePreview();
    updateStatus();
  } catch (error) {
    alert("Kamera gagal dibuka. Izinkan akses kamera dulu.");
  }
}

async function capturePhoto(fromPeace = false) {
  const layout = getLayout();

  if (!stream) {
    if (!fromPeace) alert("Klik Mulai Kamera dulu.");
    return;
  }

  if (photos.length >= layout.photoCount || isCapturing) return;

  isCapturing = true;

  await runCountdown();

  flash.classList.remove("active");
  void flash.offsetWidth;
  flash.classList.add("active");

  captureCanvas.width = video.videoWidth;
  captureCanvas.height = video.videoHeight;

  const ctx = captureCanvas.getContext("2d");

  ctx.save();
  ctx.filter = getCanvasFilter();
  ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  ctx.restore();

  photos.push(captureCanvas.toDataURL("image/png", CONFIG.quality));
  edits.push({ x: 0, y: 0, scale: 1, rotate: 0 });

  activeFrame = photos.length - 1;

  await renderPreview();
  updateStatus();

  isCapturing = false;
}

function runCountdown() {
  return new Promise((resolve) => {
    let count = CONFIG.countdown;

    countdownEl.style.display = "grid";
    countdownEl.textContent = count;

    const timer = setInterval(() => {
      count--;
      countdownEl.textContent = count;

      if (count <= 0) {
        clearInterval(timer);
        countdownEl.style.display = "none";
        resolve();
      }
    }, 800);
  });
}

function retakePhoto() {
  if (photos.length > 0) {
    photos.pop();
    edits.pop();
    activeFrame = Math.max(0, photos.length - 1);
  }

  renderPreview();
  updateStatus();
}

function resetAll() {
  photos = [];
  edits = [];
  activeFrame = 0;

  renderPreview();
  updateStatus();
}

function togglePeace() {
  peaceEnabled = !peaceEnabled;

  peaceBtn.textContent = peaceEnabled ? "PEACE AUTO ✓" : "PEACE AUTO OFF";
  peaceBtn.classList.toggle("peace-off", !peaceEnabled);

  updateStatus();
}

async function loadDefaultTemplate() {
  await loadTemplate(CONFIG.defaultTemplate[layoutSelect.value]);
}

async function loadTemplate(id) {
  currentTemplate = getTemplateById(id);

  if (!currentTemplate || !currentTemplate.file) {
    templateImage = null;
    photoAreas = generateFallbackAreas();
    return;
  }

  templateImage = await loadImage(currentTemplate.file);

  photoAreas = templateImage
  ? detectMarkerAreas(templateImage, templateImage.naturalWidth, templateImage.naturalHeight)
  : generateFallbackAreas();

  if (photoAreas.length < getLayout().photoCount) {
    photoAreas = generateFallbackAreas();
  }
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);

    img.src = src;
  });
}

function detectMarkerAreas(img, width, height) {
  detectCanvas.width = width;
  detectCanvas.height = height;

  const ctx = detectCanvas.getContext("2d");

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const data = ctx.getImageData(0, 0, width, height).data;
  const target = hexToRgb(CONFIG.markerColor);
  const visited = new Uint8Array(width * height);
  const areas = [];
  const step = 4;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = y * width + x;

      if (visited[index]) continue;

      const pixelIndex = index * 4;

      if (!isMarkerPixel(data, pixelIndex, target)) continue;

      const area = flood(x, y, width, height, data, visited, target, step);

      if (area.w > 80 && area.h > 80) {
        areas.push(area);
      }
    }
  }

  areas.sort((a, b) => {
    if (Math.abs(a.x - b.x) > 30) return a.x - b.x;
    return a.y - b.y;
  });

  return areas.slice(0, getLayout().photoCount);
}

function flood(startX, startY, width, height, data, visited, target, step) {
  const queue = [[startX, startY]];

  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  visited[startY * width + startX] = 1;

  while (queue.length) {
    const [x, y] = queue.pop();

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    [
      [x + step, y],
      [x - step, y],
      [x, y + step],
      [x, y - step]
    ].forEach(([nx, ny]) => {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;

      const index = ny * width + nx;

      if (visited[index]) return;

      if (isMarkerPixel(data, index * 4, target)) {
        visited[index] = 1;
        queue.push([nx, ny]);
      }
    });
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY
  };
}

function isMarkerPixel(data, index, target) {
  return (
    Math.abs(data[index] - target.r) <= CONFIG.tolerance &&
    Math.abs(data[index + 1] - target.g) <= CONFIG.tolerance &&
    Math.abs(data[index + 2] - target.b) <= CONFIG.tolerance
  );
}

function hexToRgb(hex) {
  hex = hex.replace("#", "");

  if (hex.length === 3) {
    hex = hex.split("").map((char) => char + char).join("");
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  };
}

function generateFallbackAreas() {
  const id = layoutSelect.value;
  const layout = getLayout();
  const padding = 90;

  if (id === "2") {
    return [
      { x: padding, y: 140, w: layout.width - padding * 2, h: 480 },
      { x: padding, y: 700, w: layout.width - padding * 2, h: 480 }
    ];
  }

  if (id === "3") {
    return [
      { x: padding, y: 120, w: layout.width - padding * 2, h: 430 },
      { x: padding, y: 610, w: layout.width - padding * 2, h: 430 },
      { x: padding, y: 1100, w: layout.width - padding * 2, h: 430 }
    ];
  }

  if (id === "4") {
    return [
      { x: padding, y: 100, w: layout.width - padding * 2, h: 390 },
      { x: padding, y: 560, w: layout.width - padding * 2, h: 390 },
      { x: padding, y: 1020, w: layout.width - padding * 2, h: 390 },
      { x: padding, y: 1480, w: layout.width - padding * 2, h: 390 }
    ];
  }

  if (id === "6") {
    return [
      { x: padding, y: 90, w: layout.width - padding * 2, h: 330 },
      { x: padding, y: 470, w: layout.width - padding * 2, h: 330 },
      { x: padding, y: 850, w: layout.width - padding * 2, h: 330 },
      { x: padding, y: 1230, w: layout.width - padding * 2, h: 330 },
      { x: padding, y: 1610, w: layout.width - padding * 2, h: 330 },
      { x: padding, y: 1990, w: layout.width - padding * 2, h: 330 }
    ];
  }

  if (id === "4v2") {
    return [
      { x: 90, y: 170, w: 470, h: 560 },
      { x: 90, y: 820, w: 470, h: 560 },
      { x: 640, y: 170, w: 470, h: 560 },
      { x: 640, y: 820, w: 470, h: 560 }
    ];
  }

  if (id === "6v2") {
    return [
      { x: 90, y: 150, w: 470, h: 470 },
      { x: 90, y: 690, w: 470, h: 470 },
      { x: 90, y: 1230, w: 470, h: 470 },
      { x: 640, y: 150, w: 470, h: 470 },
      { x: 640, y: 690, w: 470, h: 470 },
      { x: 640, y: 1230, w: 470, h: 470 }
    ];
  }

  return [];
}

async function renderPreview(showLive = false) {
  const ctx = previewCanvas.getContext("2d");

  const canvasWidth = templateImage ? templateImage.naturalWidth : getLayout().width;
  const canvasHeight = templateImage ? templateImage.naturalHeight : getLayout().height;

  previewCanvas.width = canvasWidth;
  previewCanvas.height = canvasHeight;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const areas = photoAreas.length ? photoAreas : generateFallbackAreas();

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (!templateImage) {
    drawDefaultTemplate(ctx, getLayout(), areas);
  }

  for (let i = 0; i < photos.length; i++) {
    const img = await loadImage(photos[i]);

    if (img && areas[i]) {
      drawPhotoToArea(ctx, img, areas[i], edits[i] || getDefaultEdit());
    }
  }

  if (showLive && stream && photos.length < getLayout().photoCount) {
  const liveIndex = photos.length;

  if (areas[liveIndex]) {
    drawPhotoToArea(ctx, video, areas[liveIndex], getDefaultEdit());
  }
}

  if (templateImage) {
    drawTemplateWithoutMarkers(ctx, templateImage, canvasWidth, canvasHeight);
  }

  updateStatus();
}

function drawTemplateWithoutMarkers(ctx, img, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const tempCtx = canvas.getContext("2d");

  tempCtx.drawImage(img, 0, 0, width, height);

  const imageData = tempCtx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const target = hexToRgb(CONFIG.markerColor);

  for (let i = 0; i < data.length; i += 4) {
    if (isMarkerPixel(data, i, target)) {
      data[i + 3] = 0;
    }
  }

  tempCtx.putImageData(imageData, 0, 0);
  ctx.drawImage(canvas, 0, 0);
}

function drawDefaultTemplate(ctx, layout, areas) {
  ctx.fillStyle = "#ffe14d";
  ctx.fillRect(0, 0, layout.width, layout.height);

  ctx.lineWidth = 14;
  ctx.strokeStyle = "#111";
  ctx.strokeRect(28, 28, layout.width - 56, layout.height - 56);

  areas.forEach((area, index) => {
    ctx.fillStyle = CONFIG.markerColor;
    ctx.fillRect(area.x, area.y, area.w, area.h);

    ctx.lineWidth = 8;
    ctx.strokeStyle = "#111";
    ctx.strokeRect(area.x, area.y, area.w, area.h);

    ctx.fillStyle = "#111";
    ctx.font = "900 42px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PHOTO " + (index + 1), area.x + area.w / 2, area.y + area.h / 2);
  });

  ctx.fillStyle = "#ff4fd8";
  ctx.fillRect(80, layout.height - 220, layout.width - 160, 120);

  ctx.lineWidth = 8;
  ctx.strokeStyle = "#111";
  ctx.strokeRect(80, layout.height - 220, layout.width - 160, 120);

  ctx.fillStyle = "#111";
  ctx.font = "900 54px Arial";
  ctx.textAlign = "center";
  ctx.fillText(CONFIG.brand, layout.width / 2, layout.height - 145);
}

function drawPhotoToArea(ctx, img, area, edit) {
  const ratio = Math.max(area.w / img.width, area.h / img.height) * edit.scale;
  const drawW = img.width * ratio;
  const drawH = img.height * ratio;

  ctx.save();

  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();

  ctx.translate(area.x + area.w / 2 + edit.x, area.y + area.h / 2 + edit.y);

  if (CONFIG.mirror) {
    ctx.scale(-1, 1);
  }

  ctx.rotate((edit.rotate * Math.PI) / 180);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore();
}

function getDefaultEdit() {
  return {
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0
  };
}

function getCanvasFilter() {
  const value = filterSelect.value;

  if (value === "bw") return "grayscale(1) contrast(1.12)";
  if (value === "warm") return "sepia(.35) saturate(1.35)";
  if (value === "pop") return "contrast(1.25) saturate(1.75)";
  if (value === "soft") return "brightness(1.08) contrast(.95) saturate(1.08)";

  return "none";
}

function applyVideoFilter() {
  video.style.filter = getCanvasFilter();
}

function setupPeaceDetection() {
  if (peaceReady || !window.Hands || !window.Camera) return;

  peaceReady = true;

  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults((results) => {
    if (!peaceEnabled || isCapturing || photos.length >= getLayout().photoCount) return;

    const hand = results.multiHandLandmarks && results.multiHandLandmarks[0];

    if (hand && isPeaceSign(hand)) {
      const now = Date.now();

      if (now - lastPeaceCapture > CONFIG.peaceDelay) {
        lastPeaceCapture = now;
        capturePhoto(true);
      }
    }
  });

  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 640,
    height: 480
  });

  camera.start();
}

function isPeaceSign(hand) {
  return (
    hand[8].y < hand[6].y &&
    hand[12].y < hand[10].y &&
    hand[16].y > hand[14].y &&
    hand[20].y > hand[18].y
  );
}

async function downloadStrip() {
  if (photos.length < getLayout().photoCount) return;

  await renderPreview();

  const link = document.createElement("a");
  link.download = `photobooth-${Date.now()}.png`;
  link.href = previewCanvas.toDataURL("image/png", CONFIG.quality);
  link.click();
}

function updateStatus() {
  const layout = getLayout();
  const done = photos.length >= layout.photoCount;

  statusBox.innerHTML = `
    SESSION<br><br>
    Layout<br>
    <b>${layout.name}</b><br><br>
    Template<br>
    <b>${currentTemplate ? currentTemplate.name : "Default"}</b><br><br>
    Photo<br>
    <b>${photos.length}</b> / <b>${layout.photoCount}</b><br><br>
    Peace<br>
    <b>${peaceEnabled ? "ON" : "OFF"}</b><br><br>
    Camera<br>
    <b>${stream ? "CONNECTED" : "OFF"}</b>
  `;

  photoProgress.innerHTML = "";

  for (let i = 0; i < layout.photoCount; i++) {
    const dot = document.createElement("div");
    dot.className = "dot" + (i < photos.length ? " filled" : "");
    photoProgress.appendChild(dot);
  }

  if (done) {
    sessionActions.style.display = "none";
    completeBox.style.display = "block";
    downloadBtn.classList.remove("disabled");
  } else {
    completeBox.style.display = "none";
    downloadBtn.classList.add("disabled");

    if (stream) {
      sessionActions.style.display = "grid";
    }
  }
}

function frameFromPointer(event) {
  const rect = previewCanvas.getBoundingClientRect();
  const scaleX = previewCanvas.width / rect.width;
  const scaleY = previewCanvas.height / rect.height;

  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const areas = photoAreas.length ? photoAreas : generateFallbackAreas();

  for (let i = 0; i < areas.length; i++) {
    const area = areas[i];

    if (
      x >= area.x &&
      x <= area.x + area.w &&
      y >= area.y &&
      y <= area.y + area.h
    ) {
      return i;
    }
  }

  return activeFrame;
}

function startDrag(event) {
  if (!photos.length) return;

  activeFrame = frameFromPointer(event);
  dragging = true;

  lastPointer = {
    x: event.clientX,
    y: event.clientY
  };

  previewCanvas.setPointerCapture(event.pointerId);
}

function moveDrag(event) {
  if (!dragging || !photos[activeFrame]) return;

  const rect = previewCanvas.getBoundingClientRect();
  const scale = previewCanvas.width / rect.width;

  edits[activeFrame].x += (event.clientX - lastPointer.x) * scale;
  edits[activeFrame].y += (event.clientY - lastPointer.y) * scale;

  lastPointer = {
    x: event.clientX,
    y: event.clientY
  };

  renderPreview();
}

function endDrag() {
  dragging = false;
  lastPointer = null;
}

function wheelZoom(event) {
  if (!photos[activeFrame]) return;

  event.preventDefault();

  editFrame({
    scale: event.deltaY < 0 ? 0.06 : -0.06
  });
}

function editFrame({ scale = 0, rotate = 0 }) {
  if (!photos[activeFrame]) return;

  edits[activeFrame].scale = Math.max(0.4, edits[activeFrame].scale + scale);
  edits[activeFrame].rotate = (edits[activeFrame].rotate + rotate) % 360;

  renderPreview();
}

function resetActiveEdit() {
  if (!photos[activeFrame]) return;

  edits[activeFrame] = getDefaultEdit();

  renderPreview();
}

function startLivePreview() {
  if (livePreviewLoop) cancelAnimationFrame(livePreviewLoop);

  const loop = async () => {
    await renderPreview(true);
    livePreviewLoop = requestAnimationFrame(loop);
  };

  loop();
}
