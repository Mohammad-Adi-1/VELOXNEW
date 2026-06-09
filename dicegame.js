document.addEventListener('DOMContentLoaded', () => {
  // Navigation elements
  const balanceAmount = document.getElementById('balanceAmount');
  let userBalance = 1000.00; // Start with 1000 for testing
  balanceAmount.textContent = userBalance.toFixed(2);

  // Connection
  const connectBtn = document.getElementById('connectBtn');
  const headerPreConnect = document.getElementById('headerPreConnect');
  const headerPostConnect = document.getElementById('headerPostConnect');
  
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      headerPreConnect.classList.add('hidden');
      headerPostConnect.classList.remove('hidden');
    });
  }

  // Team Carousel Popup Logic
  const enterSeasonBtn = document.getElementById('enterSeasonBtn');
  const teamCarouselOverlay = document.getElementById('teamCarouselOverlay');
  const carouselCloseBtn = document.getElementById('carouselClose');

  if (enterSeasonBtn && teamCarouselOverlay) {
    enterSeasonBtn.addEventListener('click', () => {
      teamCarouselOverlay.classList.remove('hidden');
      setTimeout(() => teamCarouselOverlay.classList.add('show'), 10);
    });
  }

  if (carouselCloseBtn && teamCarouselOverlay) {
    carouselCloseBtn.addEventListener('click', () => {
      teamCarouselOverlay.classList.remove('show');
      setTimeout(() => teamCarouselOverlay.classList.add('hidden'), 300);
    });
  }

  if (teamCarouselOverlay) {
    teamCarouselOverlay.addEventListener('click', (e) => {
      if (e.target === teamCarouselOverlay) {
        teamCarouselOverlay.classList.remove('show');
        setTimeout(() => teamCarouselOverlay.classList.add('hidden'), 300);
      }
    });
  }

  // ══════════════════════════════════════
  // CAROUSEL LOGIC (Standard, No Infinite Loop)
  // ══════════════════════════════════════
  const carouselContainer = document.getElementById('teamCarousel');
  if (carouselContainer) {
    const allItems = Array.from(carouselContainer.querySelectorAll('.carousel-item'));
    
    // Initialize position to the first item
    setTimeout(() => {
      carouselContainer.style.scrollSnapType = 'none';
      const firstItem = allItems[0];
      if(firstItem) {
        const targetLeft = firstItem.getBoundingClientRect().left;
        const containerLeft = carouselContainer.getBoundingClientRect().left;
        const centerOffset = (carouselContainer.offsetWidth - firstItem.offsetWidth) / 2;
        carouselContainer.scrollLeft += ((targetLeft - containerLeft) - centerOffset);
      }
      setTimeout(() => {
        carouselContainer.style.scrollSnapType = 'x mandatory';
      }, 50);
    }, 100);

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
    
    // Listen for modal opening to recalculate layout if it was initially hidden
    if (enterSeasonBtn && teamCarouselOverlay) {
      enterSeasonBtn.addEventListener('click', () => {
        setTimeout(updateActiveItem, 50); // Small delay to let modal appear
      });
    }

    setTimeout(updateActiveItem, 150);
  }

  // Betting state
  let betAmount = 1;
  let betTarget = null; // can be a number (2-12) or string ('even', 'odd')

  // Bet Amount Selection
  const betTabs = document.querySelectorAll('#diceBetAmountTabs .bet-tab');
  betTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      betTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      betAmount = parseInt(tab.dataset.value);
    });
  });

  // Bet Target Selection
  const betBtns = document.querySelectorAll('.dice-bet-btn, .dice-bet-type-btn');
  betBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      betBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.target;
      betTarget = isNaN(target) ? target : parseInt(target);
    });
  });

  // Roll Logic
  const rollDiceBtn = document.getElementById('rollDiceBtn');
  const dice1 = document.getElementById('dice1');
  const dice2 = document.getElementById('dice2');
  const diceResultText = document.getElementById('diceResult');
  
  let isRolling = false;

  rollDiceBtn.addEventListener('click', () => {
    if (isRolling) return;
    
    if (betTarget === null) {
      diceResultText.textContent = "Please select a bet first!";
      diceResultText.style.color = "#ff4d4d";
      return;
    }

    if (userBalance < betAmount) {
      diceResultText.textContent = "Insufficient balance!";
      diceResultText.style.color = "#ff4d4d";
      return;
    }

    // Deduct bet amount
    userBalance -= betAmount;
    balanceAmount.textContent = userBalance.toFixed(2);
    
    isRolling = true;
    rollDiceBtn.classList.add('disabled');
    diceResultText.style.color = "#fff";
    diceResultText.textContent = "Rolling...";

    // Randomize
    const d1Result = Math.floor(Math.random() * 6) + 1;
    const d2Result = Math.floor(Math.random() * 6) + 1;
    const total = d1Result + d2Result;

    // Apply random rotation animation first to simulate rolling
    const rx1 = Math.floor(Math.random() * 4 + 2) * 360;
    const ry1 = Math.floor(Math.random() * 4 + 2) * 360;
    const rz1 = Math.floor(Math.random() * 4 + 2) * 360;
    
    const rx2 = Math.floor(Math.random() * 4 + 2) * 360;
    const ry2 = Math.floor(Math.random() * 4 + 2) * 360;
    const rz2 = Math.floor(Math.random() * 4 + 2) * 360;

    // Clear previous explicit transforms if any
    dice1.className = 'dice';
    dice2.className = 'dice';
    
    // Set rolling animation transforms
    dice1.style.transform = `rotateX(${rx1}deg) rotateY(${ry1}deg) rotateZ(${rz1}deg)`;
    dice2.style.transform = `rotateX(${rx2}deg) rotateY(${ry2}deg) rotateZ(${rz2}deg)`;

    // Wait for the random tumbling to finish, then snap to the actual result face
    setTimeout(() => {
      // Remove inline transform to allow classes to apply
      dice1.style.transform = '';
      dice2.style.transform = '';
      
      // Add the final face class
      dice1.classList.add(`show-${d1Result}`);
      dice2.classList.add(`show-${d2Result}`);

      // Calculate win/loss
      let won = false;
      let payout = 0;

      if (typeof betTarget === 'number' && betTarget === total) {
        won = true;
        payout = betAmount * 10; // High payout for exact number
      } else if (betTarget === 'even' && total % 2 === 0) {
        won = true;
        payout = betAmount * 2;
      } else if (betTarget === 'odd' && total % 2 !== 0) {
        won = true;
        payout = betAmount * 2;
      }

      if (won) {
        userBalance += payout;
        balanceAmount.textContent = userBalance.toFixed(2);
        diceResultText.textContent = `Rolled ${total}. You Won $${payout}!`;
        diceResultText.style.color = "#4ade80"; // Green
      } else {
        diceResultText.textContent = `Rolled ${total}. You Lost.`;
        diceResultText.style.color = "#f44786"; // Pink
      }

      isRolling = false;
      rollDiceBtn.classList.remove('disabled');
      
    }, 2500); // 2.5s matches the CSS transition time
  });
});


// ══════════════════════════════════════
// RED LIQUID WATERFALL SIMULATION
// ══════════════════════════════════════
(function () {
  'use strict';

  const DPR = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x — 3x retina triples GPU work

  function createWaterfall(canvas, isBlue = false, loop = false, isPink = false) {
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

      // ── Solid opaque base fill (prevents background bleed-through) ──
      ctx.globalAlpha = 1;
      ctx.fillStyle = isBlue ? '#002244' : isPink ? '#3a0016' : '#ffffff';
      ctx.fill();

      // ── Liquid fill gradient (layered on top) ──
      const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
      if (isBlue) {
        fillGrad.addColorStop(0, 'rgba(0, 40, 90, 1)');
        fillGrad.addColorStop(0.3, 'rgba(0, 80, 150, 1)');
        fillGrad.addColorStop(0.6, 'rgba(0, 120, 210, 1)');
        fillGrad.addColorStop(0.85, 'rgba(0, 160, 255, 1)');
        fillGrad.addColorStop(1, 'rgba(100, 200, 255, 1)');
      } else if (isPink) {
        fillGrad.addColorStop(0, 'rgba(120, 15, 55, 1)');
        fillGrad.addColorStop(0.3, 'rgba(180, 35, 85, 1)');
        fillGrad.addColorStop(0.6, 'rgba(220, 55, 110, 1)');
        fillGrad.addColorStop(0.85, 'rgba(244, 71, 134, 1)');
        fillGrad.addColorStop(1, 'rgba(244, 71, 134, 1)');
      } else {
        fillGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        fillGrad.addColorStop(0.3, 'rgba(255, 255, 255, 1)');
        fillGrad.addColorStop(0.6, 'rgba(255, 255, 255, 1)');
        fillGrad.addColorStop(0.85, 'rgba(255, 255, 255, 1)');
        fillGrad.addColorStop(1, 'rgba(255, 255, 255, 1)');
      }
      ctx.fillStyle = fillGrad;
      ctx.fill();





      // ── Surface ripples ──
      ripples.forEach(r => {
        const colIdx = Math.floor(r.x / COL_WIDTH);
        if (colIdx < 0 || colIdx >= columns.length) return;
        if (columns[colIdx].front < r.y) return;

        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        if (isBlue) {
          ctx.strokeStyle = `rgba(100, 200, 255, ${r.opacity * 0.6})`;
        } else if (isPink) {
          ctx.strokeStyle = `rgba(255, 150, 190, ${r.opacity})`;
        } else {
          ctx.strokeStyle = `rgba(220, 220, 220, ${r.opacity})`;
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
      if (isBlue) {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 160, 255, 0.6)';
        ctx.shadowBlur = 8;
      } else if (isPink) {
        ctx.strokeStyle = 'rgba(255, 150, 190, 0.95)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(244, 71, 134, 0.8)';
        ctx.shadowBlur = 10;
      } else {
        ctx.strokeStyle = 'rgba(220, 220, 220, 0.95)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(200, 200, 200, 0.7)';
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
      stop();
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
      
      const isBlue = false;
      const loop = false;
      const isPink = false;
      
      const sim = createWaterfall(canvas, isBlue, loop, isPink);
      simulations.set(canvas, sim);
      sim.start();
    });
  }

  window.addEventListener('resize', () => {
    simulations.forEach(sim => sim.resize());
  });

  // Pause liquid simulations when carousel is off-screen (saves CPU)
  const carouselViewport = document.querySelector('.team-carousel-overlay');
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

