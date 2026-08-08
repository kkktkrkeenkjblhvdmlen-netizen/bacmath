const canvas = document.getElementById('graphCanvas');
const exprInput = document.getElementById('expressionInput');
const variationBody = document.getElementById('variationTable');
const cursorInfo = document.getElementById('cursorInfo');
const statusText = document.getElementById('statusText');
const keyboard = document.getElementById('mathKeyboard');
const themeToggle = document.getElementById('themeToggle');
const toggleKeyboard = document.getElementById('toggleKeyboard');
const plotFunctionButton = document.getElementById('plotFunction');
const plotLineButton = document.getElementById('plotLine');
const plotBranchButton = document.getElementById('plotBranch');
const plotTangentButton = document.getElementById('plotTangent');
const plotAsymptoteButton = document.getElementById('plotAsymptote');
const zoomInButton = document.getElementById('zoomIn');
const zoomOutButton = document.getElementById('zoomOut');
const resetViewButton = document.getElementById('resetView');
const toggleGridButton = document.getElementById('toggleGrid');

if (!canvas) {
  console.warn('Legacy script.js: graphCanvas element not found. Script skipped.');
} else {
  const ctx = canvas.getContext('2d');
  const keyboardButtons = document.querySelectorAll('#mathKeyboard button');

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  }

  function toGraphX(pixelX) {
    return state.xMin + (pixelX / canvas.width) * (state.xMax - state.xMin);
  }

  function toGraphY(pixelY) {
    return state.yMax - (pixelY / canvas.height) * (state.yMax - state.yMin);
  }

  function toPixelX(x) {
    return ((x - state.xMin) / (state.xMax - state.xMin)) * canvas.width;
  }

  function toPixelY(y) {
    return ((state.yMax - y) / (state.yMax - state.yMin)) * canvas.height;
  }

  function evaluateExpression(expr, xValue) {
    try {
      const compiled = math.compile(expr);
      const scope = { x: xValue, e: Math.E, pi: Math.PI };
      let value = compiled.evaluate(scope);
      if (typeof value === 'boolean') value = value ? 1 : 0;
      return Number(value);
    } catch (error) {
      return NaN;
    }
  }

  function parseExpression() {
    const raw = exprInput.value.trim();
    if (!raw) return null;
    if (raw.includes('=')) {
      const parts = raw.split('=');
      return parts.slice(1).join('=');
    }
    return raw;
  }

  function drawAxes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    if (state.grid) {
      const xStep = Math.max(1, (state.xMax - state.xMin) / 20);
      const yStep = Math.max(1, (state.yMax - state.yMin) / 12);
      for (let x = Math.ceil(state.xMin / xStep) * xStep; x <= state.xMax; x += xStep) {
        const px = toPixelX(x);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height);
        ctx.stroke();
      }
      for (let y = Math.ceil(state.yMin / yStep) * yStep; y <= state.yMax; y += yStep) {
        const py = toPixelY(y);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(canvas.width, py);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    const yZero = toPixelY(0);
    const xZero = toPixelX(0);
    ctx.beginPath();
    ctx.moveTo(0, yZero);
    ctx.lineTo(canvas.width, yZero);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(xZero, 0);
    ctx.lineTo(xZero, canvas.height);
    ctx.stroke();

    ctx.fillStyle = '#ffb45c';
    ctx.font = '13px sans-serif';
    ctx.fillText('O', xZero + 6, yZero - 8);
    ctx.fillText('i', canvas.width - 24, yZero - 6);
    ctx.fillText('j', xZero + 6, 18);
  }

  function drawFunction() {
    const expr = parseExpression();
    if (!expr) return;
    ctx.strokeStyle = '#ff9f1c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    let firstPoint = true;
    for (let pixelX = 0; pixelX <= canvas.width; pixelX += 1) {
      const x = toGraphX(pixelX);
      const y = evaluateExpression(expr, x);
      if (!isFinite(y) || Math.abs(y) > 1e5) {
        firstPoint = true;
        continue;
      }
      const py = toPixelY(y);
      if (firstPoint) {
        ctx.moveTo(pixelX, py);
        firstPoint = false;
      } else {
        ctx.lineTo(pixelX, py);
      }
    }
    ctx.stroke();
  }

  function drawAsymptotes() {
    if (!state.asymptotes.length) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 2;
    state.asymptotes.forEach(({ x, y, type }) => {
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      if (type === 'vertical') {
        const px = toPixelX(x);
        ctx.moveTo(px, 0);
        ctx.lineTo(px, canvas.height);
        ctx.stroke();
        ctx.fillText(`x=${x.toFixed(2)}`, px + 6, 20);
      } else if (type === 'horizontal') {
        const py = toPixelY(y);
        ctx.moveTo(0, py);
        ctx.lineTo(canvas.width, py);
        ctx.stroke();
        ctx.fillText(`y=${y.toFixed(2)}`, 10, py - 8);
      }
      ctx.setLineDash([]);
    });
  }

  function drawTangents() {
    if (!state.tangents.length) return;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.6;
    state.tangents.forEach(({ x0, slope, y0 }) => {
      const yLeft = y0 + slope * (state.xMin - x0);
      const yRight = y0 + slope * (state.xMax - x0);
      ctx.beginPath();
      ctx.moveTo(toPixelX(state.xMin), toPixelY(yLeft));
      ctx.lineTo(toPixelX(state.xMax), toPixelY(yRight));
      ctx.stroke();
    });
  }

  function updateGraph() {
    drawAxes();
    drawAsymptotes();
    drawTangents();
    drawFunction();
  }

  function updateVariationTable() {
    if (!variationBody) return;
    const expr = parseExpression();
    if (!expr) {
      variationBody.innerHTML = '<tr><td colspan="5">Entrez une expression pour voir la table.</td></tr>';
      return;
    }

    const derivative = math.derivative(expr, 'x').toString();
    const secondDerivative = math.derivative(derivative, 'x').toString();
    const points = [-8, -5, -2, -1, 0, 1, 2, 4, 7];
    variationBody.innerHTML = '';
    points.forEach((x) => {
      const fx = evaluateExpression(expr, x);
      const fp = evaluateExpression(derivative, x);
      const fpp = evaluateExpression(secondDerivative, x);
      const variation = fp > 0 ? '⇧' : fp < 0 ? '⇩' : '0';
      const concavity = fpp > 0 ? 'Convexe' : fpp < 0 ? 'Concave' : 'Neutre';
      const row = document.createElement('tr');
      row.innerHTML = `<td>${x}</td><td>${Number.isFinite(fx) ? fx.toFixed(3) : '∞'}</td><td>${Number.isFinite(fp) ? fp.toFixed(3) : '∞'}</td><td>${variation}</td><td>${concavity}</td>`;
      variationBody.appendChild(row);
    });
  }

  function setMode(mode) {
    state.mode = mode;
    state.branchMode = mode === 'branch';
    if (statusText) {
      statusText.textContent = mode === 'asymptote'
        ? 'Cliquez sur le graphe pour placer une asymptote.'
        : mode === 'tangent'
          ? 'Cliquez sur le graphe pour tracer une tangente.'
          : 'Cliquez sur le graphe pour utiliser le graphe.';
    }
    updateGraph();
  }

  if (plotFunctionButton) plotFunctionButton.addEventListener('click', () => {
    setMode('function');
    updateGraph();
    updateVariationTable();
  });

  if (plotLineButton) plotLineButton.addEventListener('click', () => {
    setMode('function');
    const expr = parseExpression();
    if (!expr) return;
    exprInput.value = expr;
    updateGraph();
    updateVariationTable();
  });

  if (plotBranchButton) plotBranchButton.addEventListener('click', () => {
    setMode('branch');
    updateGraph();
    updateVariationTable();
  });

  if (plotAsymptoteButton) plotAsymptoteButton.addEventListener('click', () => setMode('asymptote'));
  if (plotTangentButton) plotTangentButton.addEventListener('click', () => setMode('tangent'));

  if (zoomInButton) zoomInButton.addEventListener('click', () => {
    const dx = (state.xMax - state.xMin) * 0.18;
    const dy = (state.yMax - state.yMin) * 0.18;
    state.xMin += dx;
    state.xMax -= dx;
    state.yMin += dy;
    state.yMax -= dy;
    updateGraph();
  });

  if (zoomOutButton) zoomOutButton.addEventListener('click', () => {
    const dx = (state.xMax - state.xMin) * 0.2;
    const dy = (state.yMax - state.yMin) * 0.2;
    state.xMin -= dx;
    state.xMax += dx;
    state.yMin -= dy;
    state.yMax += dy;
    updateGraph();
  });

  if (resetViewButton) resetViewButton.addEventListener('click', () => {
    state.xMin = -10;
    state.xMax = 10;
    state.yMin = -6;
    state.yMax = 6;
    updateGraph();
  });

  if (toggleGridButton) toggleGridButton.addEventListener('click', () => {
    state.grid = !state.grid;
    toggleGridButton.textContent = state.grid ? 'Grille' : 'Grille off';
    updateGraph();
  });

  if (themeToggle) themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    themeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Mode clair' : 'Mode sombre';
  });

  if (toggleKeyboard) toggleKeyboard.addEventListener('click', () => {
    if (keyboard) keyboard.classList.toggle('hidden');
  });

  keyboardButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const insert = button.dataset.insert;
      const input = exprInput;
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const before = input.value.slice(0, start);
      const after = input.value.slice(end);
      input.value = `${before}${insert}${after}`;
      input.focus();
      input.setSelectionRange(start + insert.length, start + insert.length);
    });
  });

  canvas.addEventListener('mousemove', (event) => {
    const { x, y } = getMousePosition(event);
    const gx = toGraphX(x);
    const gy = toGraphY(y);
    if (cursorInfo) cursorInfo.textContent = `Curseur: x=${gx.toFixed(2)}, y=${gy.toFixed(2)}`;
  });

  canvas.addEventListener('click', (event) => {
    const { x } = getMousePosition(event);
    const graphX = toGraphX(x);
    const expr = parseExpression();
    if (!expr) return;
    if (state.mode === 'asymptote') {
      state.asymptotes.push({ x: graphX, type: 'vertical' });
      updateGraph();
      return;
    }
    if (state.mode === 'tangent') {
      const slope = evaluateExpression(math.derivative(expr, 'x').toString(), graphX);
      const y0 = evaluateExpression(expr, graphX);
      if (isFinite(slope) && isFinite(y0)) {
        state.tangents.push({ x0: graphX, slope, y0 });
        updateGraph();
      }
      return;
    }
  });

  if (exprInput) {
    exprInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        updateGraph();
        updateVariationTable();
      }
    });
    exprInput.addEventListener('input', () => {
      updateVariationTable();
    });
  }

  window.addEventListener('resize', () => {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    updateGraph();
  });

  function initialize() {
    updateGraph();
    updateVariationTable();
  }

  initialize();
}

const state = {
  xMin: -10,
  xMax: 10,
  yMin: -6,
  yMax: 6,
  grid: true,
  mode: 'function',
  asymptotes: [],
  tangents: [],
  branchMode: false,
};

const keyboardButtons = document.querySelectorAll('#mathKeyboard button');

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getMousePosition(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

function toGraphX(pixelX) {
  return state.xMin + (pixelX / canvas.width) * (state.xMax - state.xMin);
}

function toGraphY(pixelY) {
  return state.yMax - (pixelY / canvas.height) * (state.yMax - state.yMin);
}

function toPixelX(x) {
  return ((x - state.xMin) / (state.xMax - state.xMin)) * canvas.width;
}

function toPixelY(y) {
  return ((state.yMax - y) / (state.yMax - state.yMin)) * canvas.height;
}

function evaluateExpression(expr, xValue) {
  try {
    const compiled = math.compile(expr);
    const scope = { x: xValue, e: Math.E, pi: Math.PI };
    let value = compiled.evaluate(scope);
    if (typeof value === 'boolean') value = value ? 1 : 0;
    return Number(value);
  } catch (error) {
    return NaN;
  }
}

function parseExpression() {
  const raw = exprInput.value.trim();
  if (!raw) return null;
  if (raw.includes('=')) {
    const parts = raw.split('=');
    return parts.slice(1).join('=');
  }
  return raw;
}

function drawAxes() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  if (state.grid) {
    const xStep = Math.max(1, (state.xMax - state.xMin) / 20);
    const yStep = Math.max(1, (state.yMax - state.yMin) / 12);
    for (let x = Math.ceil(state.xMin / xStep) * xStep; x <= state.xMax; x += xStep) {
      const px = toPixelX(x);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
      ctx.stroke();
    }
    for (let y = Math.ceil(state.yMin / yStep) * yStep; y <= state.yMax; y += yStep) {
      const py = toPixelY(y);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  const yZero = toPixelY(0);
  const xZero = toPixelX(0);
  ctx.beginPath();
  ctx.moveTo(0, yZero);
  ctx.lineTo(canvas.width, yZero);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(xZero, 0);
  ctx.lineTo(xZero, canvas.height);
  ctx.stroke();

  ctx.fillStyle = '#ffb45c';
  ctx.font = '13px sans-serif';
  ctx.fillText('O', xZero + 6, yZero - 8);
  ctx.fillText('i', canvas.width - 24, yZero - 6);
  ctx.fillText('j', xZero + 6, 18);
}

function drawFunction() {
  const expr = parseExpression();
  if (!expr) return;
  ctx.strokeStyle = '#ff9f1c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  let firstPoint = true;
  const segment = state.branchMode ? 0.25 : 0.05;
  for (let pixelX = 0; pixelX <= canvas.width; pixelX += 1) {
    const x = toGraphX(pixelX);
    const y = evaluateExpression(expr, x);
    if (!isFinite(y) || Math.abs(y) > 1e5) {
      firstPoint = true;
      continue;
    }
    const py = toPixelY(y);
    if (firstPoint) {
      ctx.moveTo(pixelX, py);
      firstPoint = false;
    } else {
      ctx.lineTo(pixelX, py);
    }
  }
  ctx.stroke();
}

function drawAsymptotes() {
  if (!state.asymptotes.length) return;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 2;
  state.asymptotes.forEach(({ x, y, type }) => {
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    if (type === 'vertical') {
      const px = toPixelX(x);
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
      ctx.stroke();
      ctx.fillText(`x=${x.toFixed(2)}`, px + 6, 20);
    } else if (type === 'horizontal') {
      const py = toPixelY(y);
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
      ctx.stroke();
      ctx.fillText(`y=${y.toFixed(2)}`, 10, py - 8);
    }
    ctx.setLineDash([]);
  });
}

function drawTangents() {
  if (!state.tangents.length) return;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  state.tangents.forEach(({ x0, slope, y0 }) => {
    const range = (state.xMax - state.xMin) / 2;
    const yLeft = y0 + slope * (state.xMin - x0);
    const yRight = y0 + slope * (state.xMax - x0);
    ctx.beginPath();
    ctx.moveTo(toPixelX(state.xMin), toPixelY(yLeft));
    ctx.lineTo(toPixelX(state.xMax), toPixelY(yRight));
    ctx.stroke();
  });
}

function updateGraph() {
  drawAxes();
  drawAsymptotes();
  drawTangents();
  drawFunction();
}

function updateVariationTable() {
  const expr = parseExpression();
  if (!expr) {
    variationBody.innerHTML = '<tr><td colspan="5">Entrez une expression pour voir la table.</td></tr>';
    return;
  }

  const derivative = math.derivative(expr, 'x').toString();
  const secondDerivative = math.derivative(derivative, 'x').toString();
  const points = [-8, -5, -2, -1, 0, 1, 2, 4, 7];
  variationBody.innerHTML = '';
  points.forEach((x) => {
    const fx = evaluateExpression(expr, x);
    const fp = evaluateExpression(derivative, x);
    const fpp = evaluateExpression(secondDerivative, x);
    const variation = fp > 0 ? '⇧' : fp < 0 ? '⇩' : '0';
    const concavity = fpp > 0 ? 'Convexe' : fpp < 0 ? 'Concave' : 'Neutre';
    const row = document.createElement('tr');
    row.innerHTML = `<td>${x}</td><td>${Number.isFinite(fx) ? fx.toFixed(3) : '∞'}</td><td>${Number.isFinite(fp) ? fp.toFixed(3) : '∞'}</td><td>${variation}</td><td>${concavity}</td>`;
    variationBody.appendChild(row);
  });
}

function setMode(mode) {
  state.mode = mode;
  state.branchMode = mode === 'branch';
  statusText.textContent = mode === 'asymptote'
    ? 'Cliquez sur le graphe pour placer une asymptote.'
    : mode === 'tangent'
      ? 'Cliquez sur le graphe pour tracer une tangente.'
      : 'Cliquez sur le graphe pour utiliser le graphe.';
  updateGraph();
}

plotFunctionButton.addEventListener('click', () => {
  setMode('function');
  updateGraph();
  updateVariationTable();
});

plotLineButton.addEventListener('click', () => {
  setMode('function');
  const expr = parseExpression();
  if (!expr) return;
  exprInput.value = expr;
  updateGraph();
  updateVariationTable();
});

plotBranchButton.addEventListener('click', () => {
  setMode('branch');
  updateGraph();
  updateVariationTable();
});

plotAsymptoteButton.addEventListener('click', () => setMode('asymptote'));
plotTangentButton.addEventListener('click', () => setMode('tangent'));

zoomInButton.addEventListener('click', () => {
  const dx = (state.xMax - state.xMin) * 0.18;
  const dy = (state.yMax - state.yMin) * 0.18;
  state.xMin += dx;
  state.xMax -= dx;
  state.yMin += dy;
  state.yMax -= dy;
  updateGraph();
});

zoomOutButton.addEventListener('click', () => {
  const dx = (state.xMax - state.xMin) * 0.2;
  const dy = (state.yMax - state.yMin) * 0.2;
  state.xMin -= dx;
  state.xMax += dx;
  state.yMin -= dy;
  state.yMax += dy;
  updateGraph();
});

resetViewButton.addEventListener('click', () => {
  state.xMin = -10;
  state.xMax = 10;
  state.yMin = -6;
  state.yMax = 6;
  updateGraph();
});

toggleGridButton.addEventListener('click', () => {
  state.grid = !state.grid;
  toggleGridButton.textContent = state.grid ? 'Grille' : 'Grille off';
  updateGraph();
});

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  themeToggle.textContent = document.body.classList.contains('dark-mode') ? 'Mode clair' : 'Mode sombre';
});

toggleKeyboard.addEventListener('click', () => {
  keyboard.classList.toggle('hidden');
});

keyboardButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const insert = button.dataset.insert;
    const input = exprInput;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    input.value = `${before}${insert}${after}`;
    input.focus();
    input.setSelectionRange(start + insert.length, start + insert.length);
  });
});

canvas.addEventListener('mousemove', (event) => {
  const { x, y } = getMousePosition(event);
  const gx = toGraphX(x);
  const gy = toGraphY(y);
  cursorInfo.textContent = `Curseur: x=${gx.toFixed(2)}, y=${gy.toFixed(2)}`;
});

canvas.addEventListener('click', (event) => {
  const { x } = getMousePosition(event);
  const graphX = toGraphX(x);
  const expr = parseExpression();
  if (!expr) return;
  if (state.mode === 'asymptote') {
    state.asymptotes.push({ x: graphX, type: 'vertical' });
    updateGraph();
    return;
  }
  if (state.mode === 'tangent') {
    const slope = evaluateExpression(math.derivative(expr, 'x').toString(), graphX);
    const y0 = evaluateExpression(expr, graphX);
    if (isFinite(slope) && isFinite(y0)) {
      state.tangents.push({ x0: graphX, slope, y0 });
      updateGraph();
    }
    return;
  }
});

exprInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    updateGraph();
    updateVariationTable();
  }
});

exprInput.addEventListener('input', () => {
  updateVariationTable();
});

window.addEventListener('resize', () => {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  updateGraph();
});

function initialize() {
  updateGraph();
  updateVariationTable();
}

initialize();
<button class="btn" id="asymBtnHeader">➙ Tangente</button>
// Exemple pour une fonction définie sur ]0, +∞[ (ex: f(x) = x * ln(x))
const expr = "x * log(x)";

// 1. Limite en 0 par la droite (0+)
const limZero = LimitEngine.computeLimit(expr, 0, "right"); 
// Résultat exact : "0"

// 2. Limite en +∞
const limInf = LimitEngine.computeLimit(expr, "+inf"); 
// Résultat exact : "+∞"

// 3. Valeur exacte pour x = 1/5
const valPoint = LimitEngine.computeLimit("1/5 * log(1/5)", 0.2); 
// Résultat affiché : valeur/fraction propre sans 0.2 approximatif.
// Remplacez les appels directs dans updateVariationTable par :
function updateVariationTable() {
  if (!variationBody) return;
  const rawExpr = parseExpression();
  if (!rawExpr) {
    variationBody.innerHTML = '<tr><td colspan="5">Entrez une expression pour voir la table.</td></tr>';
    return;
  }

  // Auto-correction par l'IA
  const expr = MathAI.sanitize(rawExpr);

  // Exemple d'obtention de la valeur exacte (ex: 1/5 au lieu de 0.2)
  const fxExact = MathAI.formatExact(evaluateExpression(expr, x));
  
  // Limite exacte en 0 par la droite pour les domaines ]0, +∞[
  const limZero = MathAI.computeLimit(expr, 0, "right");
}