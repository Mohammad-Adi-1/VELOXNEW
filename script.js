// ══════════════════════════════════════
// SPIN WHEEL — Full Implementation
// ══════════════════════════════════════

(function () {
  'use strict';

  // ── Slice Data (3 slices) ──
  const SLICES = [
    { label: '500', color: '#4169E1', text: '#fff' },
    { label: '25,000', color: '#FF1493', text: '#fff' },
    { label: '5,000', color: '#FFD700', text: '#333' },
  ];

  const SLICE_COUNT = SLICES.length;
  const SLICE_ANGLE = (2 * Math.PI) / SLICE_COUNT;

  // ── State ──
  let spinsLeft = 8;
  let isSpinning = false;
  let currentAngle = 0;
  let angularVelocity = 0;
  let lastSliceIndex = -1;
  let recentWins = [];
  let animFrameId = null;
  let lastTimestamp = null;


  // ── DOM refs ──
  const canvas = document.getElementById('wheelCanvas');
  const ctx = canvas.getContext('2d');
  const spinBtn = document.getElementById('spinBtn');
  const pointer = document.getElementById('wheelPointer');
  const pointerBall = pointer.querySelector('.pointer-ball');
  const rewardModal = document.getElementById('rewardModal');
  const rewardPrize = document.getElementById('rewardPrize');
  const claimBtn = document.getElementById('claimBtn');
  const winsList = document.getElementById('winsList');
  const confettiCanvas = document.getElementById('confettiCanvas');
  const confCtx = confettiCanvas.getContext('2d');

  // ── HiDPI Canvas Setup ──
  function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const size = 600;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
  }

  // ══════════════════════════════════════
  // DRAWING
  // ══════════════════════════════════════

  function drawWheel() {
    const cx = 300, cy = 300, r = 290;
    ctx.clearRect(0, 0, 600, 600);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(currentAngle);

    // Draw slices
    for (let i = 0; i < SLICE_COUNT; i++) {
      const startA = i * SLICE_ANGLE - Math.PI / 2;
      const endA = startA + SLICE_ANGLE;
      const slice = SLICES[i];

      // Slice fill
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startA, endA);
      ctx.closePath();

      // Slice fill — lighter shades of #F44786
      ctx.fillStyle = i % 2 === 0 ? 'rgba(244, 71, 134, 0.28)' : 'rgba(244, 71, 134, 0.14)';
      ctx.fill();

      // Reset alpha
      ctx.globalAlpha = 1.0;

      // Slice border — dark rose
      ctx.strokeStyle = '#6B0D2E';
      ctx.lineWidth = 2;
      ctx.stroke();

      // ── Shape only — orientation locked vertical ──
      ctx.save();
      const midAngle = startA + SLICE_ANGLE / 2;
      ctx.rotate(midAngle);

      const shapeR = r * 0.55;  // distance from hub to shape centre
      const shapeSize = 80;

      // Counter-rotate so shapes stay vertically fixed during spin
      ctx.translate(shapeR, 0);
      ctx.rotate(-(currentAngle + midAngle));

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      const half = shapeSize / 2;

      if (i === 0) {
        // Triangle — pointing upward
        const h = shapeSize * Math.sqrt(3) / 2;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.67);
        ctx.lineTo(half, h * 0.33);
        ctx.lineTo(-half, h * 0.33);
        ctx.closePath();
        ctx.stroke();
      } else if (i === 1) {
        // Circle
        ctx.beginPath();
        ctx.arc(0, 0, half, 0, 2 * Math.PI);
        ctx.stroke();
      } else {
        // Square
        ctx.strokeRect(-half, -half, shapeSize, shapeSize);
      }

      ctx.restore();
    }

    // ── Outer LED dots ──
    for (let i = 0; i < 36; i++) {
      const dotAngle = (i / 36) * 2 * Math.PI - Math.PI / 2;
      const dotR = r - 8;
      const dx = Math.cos(dotAngle) * dotR;
      const dy = Math.sin(dotAngle) * dotR;
      ctx.beginPath();
      ctx.arc(dx, dy, 3, 0, 2 * Math.PI);
      const glowing = isSpinning ? (Math.floor(Date.now() / 80) + i) % 4 === 0 : i % 2 === 0;
      ctx.fillStyle = glowing ? '#fff' : 'rgba(255,255,255,0.3)';
      ctx.fill();
    }

    // ── Inner ring ──
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, 2 * Math.PI);
    const innerGrd = ctx.createRadialGradient(0, 0, 10, 0, 0, 48);
    innerGrd.addColorStop(0, '#d4a76a');
    innerGrd.addColorStop(0.5, '#8b5e3c');
    innerGrd.addColorStop(1, '#5a3520');
    ctx.fillStyle = innerGrd;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner ring LED dots
    for (let i = 0; i < 16; i++) {
      const dotAngle = (i / 16) * 2 * Math.PI;
      const dx = Math.cos(dotAngle) * 42;
      const dy = Math.sin(dotAngle) * 42;
      ctx.beginPath();
      ctx.arc(dx, dy, 2, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    }

    ctx.restore();
  }

  // ══════════════════════════════════════
  // SPIN MECHANICS
  // ══════════════════════════════════════

  function startSpin() {
    if (isSpinning) return;
    isSpinning = true;
    lastTimestamp = null;
    angularVelocity = 10 + Math.random() * 4; // 10–14 rad/s start
    spinsLeft--;
    pointerBall.textContent = Math.max(0, spinsLeft);
    spinBtn.classList.add('disabled');
    animFrameId = requestAnimationFrame(animate);
  }

  function animate(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    // Single smooth exponential decay — no phase jumps
    const FRICTION = 0.991;
    angularVelocity *= Math.pow(FRICTION, dt * 60);
    currentAngle += angularVelocity * dt;
    currentAngle %= (2 * Math.PI);

    // Pointer bounce on slice crossing
    const pointerAngle = ((3 * Math.PI / 2 - currentAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const sliceIdx = Math.floor(pointerAngle / SLICE_ANGLE) % SLICE_COUNT;
    if (sliceIdx !== lastSliceIndex && angularVelocity > 0.3) {
      lastSliceIndex = sliceIdx;
      bouncePointer();
    }

    drawWheel();

    if (angularVelocity < 0.005) {
      angularVelocity = 0;
      isSpinning = false;
      spinBtn.classList.remove('disabled');
      resolveWin();
      return;
    }
    animFrameId = requestAnimationFrame(animate);
  }

  function bouncePointer() {
    pointer.classList.remove('bounce');
    void pointer.offsetWidth; // reflow
    pointer.classList.add('bounce');
  }

  function resolveWin() {
    const pointerAngle = ((3 * Math.PI / 2 - currentAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    const winIndex = Math.floor(pointerAngle / SLICE_ANGLE) % SLICE_COUNT;
    const prize = SLICES[winIndex];

    rewardPrize.textContent = prize.label.replace('\n', ' ');
    rewardModal.classList.add('show');
    launchConfetti();

    // Store win
    recentWins.unshift({
      prize: prize.label.replace('\n', ' '),
      color: prize.color,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    if (recentWins.length > 5) recentWins.pop();
    renderWins();
  }

  // ── UI Updates ──

  function renderWins() {
    winsList.innerHTML = '';
    if (recentWins.length === 0) {
      winsList.innerHTML = `
        <div class="win-item placeholder-win">
          <div class="win-icon"><i class="ti ti-trophy"></i></div>
          <div class="win-info">
            <span class="win-prize">Spin to win!</span>
            <span class="win-time">Your rewards appear here</span>
          </div>
        </div>`;
      return;
    }
    recentWins.forEach(w => {
      const el = document.createElement('div');
      el.className = 'win-item';
      el.innerHTML = `
        <div class="win-icon" style="background:linear-gradient(135deg, ${w.color}, ${darkenColor(w.color, 20)})">
          <i class="ti ti-gift"></i>
        </div>
        <div class="win-info">
          <span class="win-prize">${w.prize}</span>
          <span class="win-time">${w.time}</span>
        </div>`;
      winsList.appendChild(el);
    });
  }

  // ══════════════════════════════════════
  // CONFETTI
  // ══════════════════════════════════════

  let confettiParticles = [];
  let confettiAnimId = null;

  function launchConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiParticles = [];

    const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF69B4', '#FFD700', '#9B59B6', '#00CED1'];
    for (let i = 0; i < 120; i++) {
      confettiParticles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight / 2 - 100,
        vx: (Math.random() - 0.5) * 14,
        vy: -(Math.random() * 10 + 4),
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.18 + Math.random() * 0.08,
        opacity: 1
      });
    }
    confettiAnimId = requestAnimationFrame(animateConfetti);
  }

  function animateConfetti() {
    confCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;

    confettiParticles.forEach(p => {
      p.x += p.vx;
      p.vy += p.gravity;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.opacity -= 0.004;

      if (p.opacity > 0 && p.y < confettiCanvas.height + 20) {
        alive = true;
        confCtx.save();
        confCtx.translate(p.x, p.y);
        confCtx.rotate((p.rotation * Math.PI) / 180);
        confCtx.globalAlpha = Math.max(0, p.opacity);
        confCtx.fillStyle = p.color;
        confCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        confCtx.restore();
      }
    });

    if (alive) {
      confettiAnimId = requestAnimationFrame(animateConfetti);
    } else {
      confCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  // ══════════════════════════════════════
  // COLOR HELPERS
  // ══════════════════════════════════════

  function lightenColor(hex, amount) {
    return adjustColor(hex, amount);
  }
  function darkenColor(hex, amount) {
    return adjustColor(hex, -amount);
  }
  function adjustColor(hex, amount) {
    hex = hex.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    r = Math.min(255, Math.max(0, r + amount));
    g = Math.min(255, Math.max(0, g + amount));
    b = Math.min(255, Math.max(0, b + amount));
    return `rgb(${r},${g},${b})`;
  }

  // ── Hamburger Toggle ──
  document.getElementById('hamburger').addEventListener('click', function () {
    this.classList.toggle('open');
  });

  // ══════════════════════════════════════
  // EVENT LISTENERS
  // ══════════════════════════════════════

  spinBtn.addEventListener('click', startSpin);

  claimBtn.addEventListener('click', () => {
    rewardModal.classList.remove('show');
    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    confCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  });



  // ══════════════════════════════════════
  // INIT
  // ══════════════════════════════════════

  // ══════════════════════════════════════
  // CONNECT & DEPOSIT FLOW
  // ══════════════════════════════════════

  let isConnected = false;
  let userBalance = 0.00;

  const headerPreConnect = document.getElementById('headerPreConnect');
  const headerPostConnect = document.getElementById('headerPostConnect');
  const connectBtn = document.getElementById('connectBtn');
  const balanceBtn = document.getElementById('balanceBtn');
  const balanceAmount = document.getElementById('balanceAmount');
  const userAvatar = document.getElementById('userAvatar');
  const depositModal = document.getElementById('depositModal');
  const depositClose = document.getElementById('depositClose');
  const modalBalance = document.getElementById('modalBalance');
  const copyAddressBtn = document.getElementById('copyAddressBtn');
  const depositAddress = document.getElementById('depositAddress');

  // Simulate Telegram connect
  connectBtn.addEventListener('click', () => {
    connectBtn.textContent = 'Connecting…';
    connectBtn.disabled = true;

    // Simulate async Telegram auth (replace with real Telegram.WebApp.initData)
    setTimeout(() => {
      isConnected = true;
      userBalance = 0.00;

      // Swap header states
      headerPreConnect.classList.add('hidden');
      headerPostConnect.classList.remove('hidden');

      // Set avatar initials (from Telegram user in production)
      userAvatar.textContent = 'AK';
      updateBalanceDisplay();
    }, 1200);
  });

  function updateBalanceDisplay() {
    const formatted = userBalance.toFixed(2);
    balanceAmount.textContent = formatted;
    modalBalance.textContent = formatted;
  }

  // Open deposit modal
  balanceBtn.addEventListener('click', () => {
    updateBalanceDisplay();
    depositModal.classList.remove('hidden');
  });

  // Close deposit modal
  depositClose.addEventListener('click', () => {
    depositModal.classList.add('hidden');
  });

  depositModal.addEventListener('click', (e) => {
    if (e.target === depositModal) depositModal.classList.add('hidden');
  });

  // Network tabs
  document.querySelectorAll('.net-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.net-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Swap address per network (placeholder values)
      const addresses = {
        TRC20: 'TQnXmZ9k3fVpA8uYrB2wJcLeH1dMsNqP6',
        ERC20: '0x4f3A8d2b1c9E7aB56D0fC3e21F8A4bD7c6E9f23',
        BEP20: 'bnb1q8k4h2p7r3x6n5m9j0l1w2e4t8y7u6i5o3a'
      };
      depositAddress.textContent = addresses[tab.dataset.net] || '';
    });
  });

  // Copy address
  copyAddressBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(depositAddress.textContent).then(() => {
      const icon = copyAddressBtn.querySelector('i');
      icon.className = 'ti ti-check';
      copyAddressBtn.style.color = '#14784a';
      setTimeout(() => {
        icon.className = 'ti ti-copy';
        copyAddressBtn.style.color = '';
      }, 1800);
    });
  });
  // ══════════════════════════════════════
  // CAROUSEL LOGIC (Infinite Loop)
  // ══════════════════════════════════════
  const carouselContainer = document.getElementById('teamCarousel');
  if (carouselContainer) {
    let originalItems = Array.from(carouselContainer.querySelectorAll('.carousel-item'));
    
    // Clone first and last items
    const firstClone = originalItems[0].cloneNode(true);
    const lastClone = originalItems[originalItems.length - 1].cloneNode(true);
    
    firstClone.classList.remove('active');
    lastClone.classList.remove('active');
    // Mark clones so liquid simulation skips them
    firstClone.querySelectorAll('.liquid-canvas').forEach(c => c.dataset.skip = '1');
    lastClone.querySelectorAll('.liquid-canvas').forEach(c => c.dataset.skip = '1');
    
    carouselContainer.appendChild(firstClone);
    carouselContainer.insertBefore(lastClone, originalItems[0]);
    
    const allItems = Array.from(carouselContainer.querySelectorAll('.carousel-item'));
    
    // Initialize position to the real first item
    setTimeout(() => {
      carouselContainer.style.scrollSnapType = 'none';
      const realFirstItem = allItems[1];
      const targetLeft = realFirstItem.getBoundingClientRect().left;
      const containerLeft = carouselContainer.getBoundingClientRect().left;
      const centerOffset = (carouselContainer.offsetWidth - realFirstItem.offsetWidth) / 2;
      carouselContainer.scrollLeft += ((targetLeft - containerLeft) - centerOffset);
      
      setTimeout(() => {
        carouselContainer.style.scrollSnapType = 'x mandatory';
      }, 50);
    }, 100);

    let scrollTimeout;

    const updateActiveItem = () => {
      const containerRect = carouselContainer.getBoundingClientRect();
      const containerCenter = containerRect.width / 2;
      let minDistance = Infinity;
      let activeIndex = -1;

      allItems.forEach((item, index) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenter = (itemRect.left - containerRect.left) + (itemRect.width / 2);
        const distance = Math.abs(containerCenter - itemCenter);

        if (distance < minDistance) {
          minDistance = distance;
          activeIndex = index;
        }
      });

      allItems.forEach((item, index) => {
        if (index === activeIndex) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (activeIndex === 0) {
          // Snapped to first clone (clone of last) -> jump to real last item
          carouselContainer.style.scrollSnapType = 'none';
          const realLastItem = allItems[allItems.length - 2];
          const targetLeft = realLastItem.getBoundingClientRect().left;
          const offset = targetLeft - containerRect.left;
          const centerOffset = (containerRect.width - realLastItem.offsetWidth) / 2;
          carouselContainer.scrollLeft += (offset - centerOffset);
          setTimeout(() => { carouselContainer.style.scrollSnapType = 'x mandatory'; }, 50);
        } else if (activeIndex === allItems.length - 1) {
          // Snapped to last clone (clone of first) -> jump to real first item
          carouselContainer.style.scrollSnapType = 'none';
          const realFirstItem = allItems[1];
          const targetLeft = realFirstItem.getBoundingClientRect().left;
          const offset = targetLeft - containerRect.left;
          const centerOffset = (containerRect.width - realFirstItem.offsetWidth) / 2;
          carouselContainer.scrollLeft += (offset - centerOffset);
          setTimeout(() => { carouselContainer.style.scrollSnapType = 'x mandatory'; }, 50);
        }
      }, 150); // wait for snap finish
    };

    let isScrolling = false;
    carouselContainer.addEventListener('scroll', () => {
      if (!isScrolling) {
        window.requestAnimationFrame(() => {
          updateActiveItem();
          isScrolling = false;
        });
        isScrolling = true;
      }
    }, { passive: true });
    // Give it a tiny delay on init so layout finishes painting
    setTimeout(updateActiveItem, 150);
  }

  // ── INIT ──
  const initApp = () => {
    setupCanvas();
    drawWheel();
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(initApp);
  } else {
    setTimeout(initApp, 1);
  }

})();

// Removed scroll-driven video script as per user request (video will just autoplay normally now).


// ══════════════════════════════════════
// RED LIQUID WATERFALL SIMULATION
// ══════════════════════════════════════
(function () {
  'use strict';

  const DPR = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x — 3x retina triples GPU work

  function createWaterfall(canvas, isWhite = false, loop = false, isPink = false) {
    const ctx = canvas.getContext('2d');
    let W, H;
    let time = 0;

    // Column-based fluid: each column tracks how far the liquid front has reached
    const COL_WIDTH = 5; // Wider cols = fewer calculations (was 3)
    let columns = [];
    let ripples = [];

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      initColumns();
    }

    function initColumns() {
      const numCols = Math.ceil(W / COL_WIDTH) + 1;
      columns = [];
      for (let i = 0; i < numCols; i++) {
        columns.push({
          front: -10 - Math.random() * 30,
          speed: 55 + Math.random() * 25,
          phase: Math.random() * Math.PI * 2,
          waveAmp: 3 + Math.random() * 6,
        });
      }
      ripples = [];
    }

    function spawnRipple() {
      ripples.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.8,
        radius: 0,
        maxRadius: 8 + Math.random() * 15,
        speed: 20 + Math.random() * 30,
        opacity: 0.15 + Math.random() * 0.1,
      });
    }

    function update(dt) {
      time += dt;

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const waveSpeed = Math.sin(time * 1.5 + col.phase) * 8;
        const left = i > 0 ? columns[i - 1].front : col.front;
        const right = i < columns.length - 1 ? columns[i + 1].front : col.front;
        const avgNeighbor = (left + right) / 2;
        const viscosityPull = (avgNeighbor - col.front) * 2.0 * dt;

        col.front += (col.speed + waveSpeed) * dt + viscosityPull;

        if (col.front > H + 20) {
          col.front = H + 20;
        }
      }

      if (Math.random() < 0.15) spawnRipple();
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.radius += r.speed * dt;
        r.opacity -= dt * 0.08;
        if (r.radius > r.maxRadius || r.opacity <= 0) {
          ripples.splice(i, 1);
        }
      }

      // Continuous loop for background canvas: reset when all columns filled
      if (loop && columns.every(col => col.front >= H + 20)) {
        initColumns();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // ── Build liquid body path ──
      ctx.beginPath();
      ctx.moveTo(-5, -5);

      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const x = i * COL_WIDTH;
        const edgeWave = Math.sin(time * 3 + i * 0.3) * col.waveAmp
                       + Math.sin(time * 1.7 + i * 0.15) * col.waveAmp * 0.5
                       + Math.sin(time * 5.3 + i * 0.6) * 2;
        const y = Math.min(col.front + edgeWave, H + 5);

        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          const prevCol = columns[i - 1];
          const prevX = (i - 1) * COL_WIDTH;
          const prevWave = Math.sin(time * 3 + (i - 1) * 0.3) * prevCol.waveAmp
                         + Math.sin(time * 1.7 + (i - 1) * 0.15) * prevCol.waveAmp * 0.5
                         + Math.sin(time * 5.3 + (i - 1) * 0.6) * 2;
          const prevY = Math.min(prevCol.front + prevWave, H + 5);
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }

      const lastFront = columns.length > 0 ? Math.min(columns[columns.length - 1].front, H + 5) : 0;
      ctx.lineTo(W + 5, lastFront);
      ctx.lineTo(W + 5, -5);
      ctx.closePath();

      // ── Liquid fill gradient ──
      const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
      if (isWhite) {
        fillGrad.addColorStop(0, 'rgba(180, 180, 180, 1)');
        fillGrad.addColorStop(0.3, 'rgba(215, 215, 215, 1)');
        fillGrad.addColorStop(0.6, 'rgba(235, 235, 235, 1)');
        fillGrad.addColorStop(0.85, 'rgba(248, 248, 248, 1)');
        fillGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
      } else if (isPink) {
        fillGrad.addColorStop(0, 'rgba(120, 15, 55, 1)');
        fillGrad.addColorStop(0.3, 'rgba(180, 35, 85, 1)');
        fillGrad.addColorStop(0.6, 'rgba(220, 55, 110, 1)');
        fillGrad.addColorStop(0.85, 'rgba(244, 71, 134, 1)');
        fillGrad.addColorStop(1, 'rgba(244, 71, 134, 1)');
      } else {
        fillGrad.addColorStop(0, 'rgba(130, 0, 0, 1)');
        fillGrad.addColorStop(0.3, 'rgba(180, 0, 0, 1)');
        fillGrad.addColorStop(0.6, 'rgba(220, 0, 10, 1)');
        fillGrad.addColorStop(0.85, 'rgba(255, 10, 20, 1)');
        fillGrad.addColorStop(1, 'rgba(255, 0, 0, 1)');
      }
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // ── Vertical flow streaks ──
      const streakCount = 10; // Reduced from 18
      for (let s = 0; s < streakCount; s++) {
        const sx = (W / streakCount) * s + Math.sin(time * 2 + s) * 4;
        const colIdx = Math.floor(sx / COL_WIDTH);
        if (colIdx < 0 || colIdx >= columns.length) continue;
        const frontY = columns[colIdx].front;
        if (frontY < 0) continue;

        const streakH = Math.min(frontY, H);
        const sGrad = ctx.createLinearGradient(sx, 0, sx, streakH);
        const phase = Math.sin(time * 1.5 + s * 0.7);
        const brightness = phase > 0 ? 0.15 : 0.05;
        if (isWhite) {
          sGrad.addColorStop(0, `rgba(255, 255, 255, ${brightness * 0.5})`);
          sGrad.addColorStop(0.5, `rgba(255, 255, 255, ${brightness * 0.8})`);
          sGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else if (isPink) {
          sGrad.addColorStop(0, `rgba(244, 71, 134, ${brightness})`);
          sGrad.addColorStop(0.5, `rgba(255, 130, 175, ${brightness * 1.5})`);
          sGrad.addColorStop(1, 'rgba(244, 71, 134, 0)');
        } else {
          sGrad.addColorStop(0, `rgba(255, 80, 80, ${brightness})`);
          sGrad.addColorStop(0.5, `rgba(255, 120, 120, ${brightness * 1.5})`);
          sGrad.addColorStop(1, 'rgba(255, 80, 80, 0)');
        }

        ctx.beginPath();
        ctx.moveTo(sx - 1.5, 0);
        ctx.lineTo(sx + 1.5, 0);
        ctx.lineTo(sx + 1 + Math.sin(time * 3 + s) * 0.5, streakH);
        ctx.lineTo(sx - 1 + Math.sin(time * 3 + s) * 0.5, streakH);
        ctx.closePath();
        ctx.fillStyle = sGrad;
        ctx.fill();
      }

      // ── Horizontal sheen bands ──
      for (let b = 0; b < 3; b++) { // Reduced from 5
        const by = (H / 6) * (b + 0.5) + Math.sin(time * 0.8 + b * 1.2) * 10;
        const colIdx = Math.floor(W / 2 / COL_WIDTH);
        if (colIdx >= 0 && colIdx < columns.length && columns[colIdx].front < by) continue;

        const sheenGrad = ctx.createLinearGradient(0, by - 4, 0, by + 4);
        if (isWhite) {
          sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          sheenGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.05 + Math.sin(time + b) * 0.03})`);
          sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        } else if (isPink) {
          sheenGrad.addColorStop(0, 'rgba(244, 71, 134, 0)');
          sheenGrad.addColorStop(0.5, `rgba(255, 150, 190, ${0.1 + Math.sin(time + b) * 0.05})`);
          sheenGrad.addColorStop(1, 'rgba(244, 71, 134, 0)');
        } else {
          sheenGrad.addColorStop(0, 'rgba(255, 100, 100, 0)');
          sheenGrad.addColorStop(0.5, `rgba(255, 100, 100, ${0.1 + Math.sin(time + b) * 0.05})`);
          sheenGrad.addColorStop(1, 'rgba(255, 100, 100, 0)');
        }
        ctx.fillStyle = sheenGrad;
        ctx.fillRect(0, by - 4, W, 8);
      }

      // ── Surface ripples ──
      ripples.forEach(r => {
        const colIdx = Math.floor(r.x / COL_WIDTH);
        if (colIdx < 0 || colIdx >= columns.length) return;
        if (columns[colIdx].front < r.y) return;

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        if (isWhite) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${r.opacity * 0.5})`;
        } else if (isPink) {
          ctx.strokeStyle = `rgba(255, 150, 190, ${r.opacity})`;
        } else {
          ctx.strokeStyle = `rgba(255, 80, 80, ${r.opacity})`;
        }
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // ── Leading edge highlight ──
      ctx.beginPath();
      for (let i = 0; i < columns.length; i++) {
        const x = i * COL_WIDTH;
        const col = columns[i];
        const edgeWave = Math.sin(time * 3 + i * 0.3) * col.waveAmp
                       + Math.sin(time * 1.7 + i * 0.15) * col.waveAmp * 0.5
                       + Math.sin(time * 5.3 + i * 0.6) * 2;
        const y = Math.min(col.front + edgeWave, H + 5);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      if (isWhite) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 6;
      } else if (isPink) {
        ctx.strokeStyle = 'rgba(255, 150, 190, 0.95)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(244, 71, 134, 0.8)';
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255, 0, 0, 0.7)';
        ctx.shadowBlur = 8;
      }
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // ── Animation loop (throttled to ~30fps) ──
    let lastTime = 0;
    let animId = null;
    const FRAME_MS = 1000 / 30; // 30fps target

    function tick(timestamp) {
      if (timestamp - lastTime < FRAME_MS) {
        animId = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      update(dt);
      draw();
      animId = requestAnimationFrame(tick);
    }

    function start() {
      resize();
      lastTime = performance.now();
      animId = requestAnimationFrame(tick);
    }

    function stop() {
      if (animId) cancelAnimationFrame(animId);
      animId = null;
    }

    return { start, stop, resize };
  }

  // ── Attach to each carousel card ──
  const simulations = new Map();

  function initAllCanvases() {
    document.querySelectorAll('.liquid-canvas').forEach(canvas => {
      if (simulations.has(canvas)) return;
      if (canvas.dataset.skip) return; // Skip cloned carousel items
      const isWhite = false;
      const loop = false;
      const sim = createWaterfall(canvas, isWhite, loop);
      simulations.set(canvas, sim);
      sim.start();
    });
  }

  window.addEventListener('resize', () => {
    simulations.forEach(sim => sim.resize());
  });

  // Pause liquid simulations when carousel is off-screen (saves CPU)
  const carouselViewport = document.querySelector('.vp2-carousel');
  if (carouselViewport) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        simulations.forEach((sim, canvas) => {
          if (carouselViewport.contains(canvas)) {
            entry.isIntersecting ? sim.start() : sim.stop();
          }
        });
      });
    }, { threshold: 0.1 });
    io.observe(carouselViewport);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initAllCanvases, 1500));
  } else {
    setTimeout(initAllCanvases, 1500);
  }

})();

// ══════════════════════════════════════
// TEAM INFO POPUP
// ══════════════════════════════════════
(function () {
  const overlay  = document.getElementById('teamInfoOverlay');
  const openBtn  = document.getElementById('teamInfoBtn');
  const closeBtn = document.getElementById('teamInfoClose');
  const popup    = document.getElementById('teamInfoPopup');

  if (!overlay || !openBtn || !closeBtn || !popup) return;

  function openPopup() {
    overlay.classList.add('show');
  }

  function closePopup() {
    overlay.classList.remove('show');
  }

  openBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openPopup();
  });

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closePopup();
  });

  // Click anywhere on backdrop (outside the popup card) to close
  overlay.addEventListener('click', (e) => {
    if (!popup.contains(e.target)) {
      closePopup();
    }
  });
})();

