document.addEventListener('DOMContentLoaded', () => {
  // ══════════════════════════════════════
  // CONNECTION / BALANCE (shared pattern)
  // ══════════════════════════════════════
  let isConnected = localStorage.getItem('isConnected') === 'true';
  let userBalance = parseFloat(localStorage.getItem('userBalance')) || 0.00;

  const balanceAmount = document.getElementById('balanceAmount');
  const updateBalanceDisplay = () => {
    if (balanceAmount) balanceAmount.textContent = userBalance.toFixed(2);
  };
  updateBalanceDisplay();

  const connectBtn = document.getElementById('connectBtn');
  const demoConnectBtn = document.getElementById('demoConnectBtn');
  const headerPreConnect = document.getElementById('headerPreConnect');
  const headerPostConnect = document.getElementById('headerPostConnect');

  if (isConnected && headerPreConnect && headerPostConnect) {
    headerPreConnect.classList.add('hidden');
    headerPostConnect.classList.remove('hidden');
  }

  function doConnect(isDemo) {
    const btn = isDemo ? demoConnectBtn : connectBtn;
    if (!btn) return;
    btn.textContent = 'Connecting…';
    btn.disabled = true;
    setTimeout(() => {
      isConnected = true;
      localStorage.setItem('isConnected', 'true');
      if (userBalance === 0) {
        userBalance = 500.00;
        localStorage.setItem('userBalance', userBalance);
      }
      updateBalanceDisplay();
      if (headerPreConnect) headerPreConnect.classList.add('hidden');
      if (headerPostConnect) headerPostConnect.classList.remove('hidden');
    }, 1200);
  }

  if (connectBtn) connectBtn.addEventListener('click', () => doConnect(false));
  if (demoConnectBtn) demoConnectBtn.addEventListener('click', () => doConnect(true));

  // ══════════════════════════════════════
  // DECK & CARD UTILITIES
  // ══════════════════════════════════════
  const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const FACE_SYMBOLS = { J: '♞', Q: '♛', K: '♚' };

  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank });
      }
    }
    return deck;
  }

  function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function cardValue(card) {
    if (card.rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(card.rank)) return 10;
    return parseInt(card.rank);
  }

  function handValue(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
      total += cardValue(card);
      if (card.rank === 'A') aces++;
    }
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  function isBlackjack(hand) {
    return hand.length === 2 && handValue(hand) === 21;
  }

  // ══════════════════════════════════════
  // CARD DOM CREATION
  // ══════════════════════════════════════
  function createCardElement(card, faceDown = false) {
    const el = document.createElement('div');
    el.className = `bj-card suit-${card.suit}`;
    if (faceDown) el.classList.add('face-down');

    // Front
    const front = document.createElement('div');
    front.className = 'bj-card-front';

    // Top-left corner
    const topCorner = document.createElement('div');
    topCorner.className = 'bj-card-corner top-left';
    topCorner.innerHTML = `
      <span class="bj-card-rank">${card.rank}</span>
      <span class="bj-card-suit-small">${SUIT_SYMBOLS[card.suit]}</span>
    `;
    front.appendChild(topCorner);

    // Center suit
    const center = document.createElement('div');
    center.className = 'bj-card-center-suit';
    center.textContent = SUIT_SYMBOLS[card.suit];
    front.appendChild(center);

    // Face card overlay
    if (FACE_SYMBOLS[card.rank]) {
      const faceImg = document.createElement('div');
      faceImg.className = 'bj-card-face-img';
      faceImg.textContent = FACE_SYMBOLS[card.rank];
      front.appendChild(faceImg);
    }

    // Bottom-right corner
    const bottomCorner = document.createElement('div');
    bottomCorner.className = 'bj-card-corner bottom-right';
    bottomCorner.innerHTML = `
      <span class="bj-card-rank">${card.rank}</span>
      <span class="bj-card-suit-small">${SUIT_SYMBOLS[card.suit]}</span>
    `;
    front.appendChild(bottomCorner);

    // Back
    const back = document.createElement('div');
    back.className = 'bj-card-back';

    el.appendChild(front);
    el.appendChild(back);

    return el;
  }

  // ══════════════════════════════════════
  // GAME STATE
  // ══════════════════════════════════════
  let deck = [];
  let playerHand = [];
  let dealerHand = [];
  let betAmount = 1;
  let gameActive = false;
  let playerDone = false;

  // DOM refs
  const playerHandEl = document.getElementById('playerHand');
  const dealerHandEl = document.getElementById('dealerHand');
  const playerScoreEl = document.getElementById('playerScore');
  const dealerScoreEl = document.getElementById('dealerScore');
  const statusEl = document.getElementById('bjStatus');
  const actionsEl = document.getElementById('bjActions');
  const betPanelEl = document.getElementById('bjBetPanel');
  const newRoundEl = document.getElementById('bjNewRound');
  const dealBtn = document.getElementById('bjDealBtn');
  const hitBtn = document.getElementById('bjHitBtn');
  const standBtn = document.getElementById('bjStandBtn');
  const doubleBtn = document.getElementById('bjDoubleBtn');
  const newRoundBtn = document.getElementById('bjNewRoundBtn');

  // Bet tabs
  const betTabs = document.querySelectorAll('#bjBetTabs .bet-tab');
  betTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      betTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      betAmount = parseInt(tab.dataset.value);
    });
  });

  // ══════════════════════════════════════
  // RENDER HELPERS
  // ══════════════════════════════════════
  function renderPlayerScore() {
    const v = handValue(playerHand);
    playerScoreEl.textContent = v;
  }

  function renderDealerScore(showAll = false) {
    if (dealerHand.length === 0) {
      dealerScoreEl.textContent = '';
      return;
    }
    if (!showAll && dealerHand.length >= 2) {
      // Only show first card value + ?
      dealerScoreEl.textContent = cardValue(dealerHand[0]) + ' + ?';
    } else {
      dealerScoreEl.textContent = handValue(dealerHand);
    }
  }

  function clearTable() {
    playerHandEl.innerHTML = '';
    dealerHandEl.innerHTML = '';
    playerScoreEl.textContent = '';
    dealerScoreEl.textContent = '';
    statusEl.textContent = '';
    statusEl.className = 'bj-status';
  }

  function showActions(show) {
    if (show) {
      actionsEl.classList.remove('hidden');
    } else {
      actionsEl.classList.add('hidden');
    }
  }

  function showBetPanel(show) {
    if (show) {
      betPanelEl.classList.remove('hidden');
    } else {
      betPanelEl.classList.add('hidden');
    }
  }

  function showNewRound(show) {
    if (show) {
      newRoundEl.classList.remove('hidden');
    } else {
      newRoundEl.classList.add('hidden');
    }
  }

  // ══════════════════════════════════════
  // DEALING
  // ══════════════════════════════════════
  function drawCard() {
    if (deck.length < 15) {
      deck = shuffleDeck(createDeck());
    }
    return deck.pop();
  }

  async function dealCardToHand(hand, handEl, faceDown = false, delay = 0) {
    return new Promise(resolve => {
      setTimeout(() => {
        const card = drawCard();
        hand.push(card);
        const cardEl = createCardElement(card, faceDown);
        handEl.appendChild(cardEl);
        resolve(cardEl);
      }, delay);
    });
  }

  // ══════════════════════════════════════
  // DEAL NEW HAND
  // ══════════════════════════════════════
  async function deal() {
    if (!isConnected) {
      statusEl.textContent = 'Connect your wallet first!';
      statusEl.className = 'bj-status lose';
      return;
    }
    if (userBalance < betAmount) {
      statusEl.textContent = 'Insufficient balance!';
      statusEl.className = 'bj-status lose';
      return;
    }

    // Deduct bet
    userBalance -= betAmount;
    localStorage.setItem('userBalance', userBalance);
    updateBalanceDisplay();

    // Reset
    clearTable();
    playerHand = [];
    dealerHand = [];
    gameActive = true;
    playerDone = false;

    showBetPanel(false);
    showNewRound(false);
    statusEl.textContent = 'Dealing...';
    statusEl.className = 'bj-status';

    // Prepare deck if needed
    if (deck.length < 20) {
      deck = shuffleDeck(createDeck());
    }

    // Deal: player, dealer, player, dealer(face-down)
    await dealCardToHand(playerHand, playerHandEl, false, 200);
    renderPlayerScore();
    await dealCardToHand(dealerHand, dealerHandEl, false, 300);
    renderDealerScore(false);
    await dealCardToHand(playerHand, playerHandEl, false, 300);
    renderPlayerScore();
    await dealCardToHand(dealerHand, dealerHandEl, true, 300);

    // Check for blackjack
    if (isBlackjack(playerHand)) {
      // Reveal dealer
      revealDealerCard();
      renderDealerScore(true);

      if (isBlackjack(dealerHand)) {
        endRound('push');
      } else {
        endRound('blackjack');
      }
      return;
    }

    if (isBlackjack(dealerHand)) {
      revealDealerCard();
      renderDealerScore(true);
      endRound('dealer-blackjack');
      return;
    }

    statusEl.textContent = 'Your turn — Hit, Stand, or Double';
    statusEl.className = 'bj-status';

    // Enable double only if player can afford it
    if (userBalance >= betAmount) {
      doubleBtn.classList.remove('disabled');
    } else {
      doubleBtn.classList.add('disabled');
    }

    showActions(true);
  }

  // ══════════════════════════════════════
  // REVEAL DEALER HIDDEN CARD
  // ══════════════════════════════════════
  function revealDealerCard() {
    const hiddenCard = dealerHandEl.querySelector('.bj-card.face-down');
    if (hiddenCard) {
      hiddenCard.classList.remove('face-down');
      hiddenCard.classList.add('reveal');
    }
  }

  // ══════════════════════════════════════
  // PLAYER ACTIONS
  // ══════════════════════════════════════
  async function playerHit() {
    if (!gameActive || playerDone) return;
    await dealCardToHand(playerHand, playerHandEl, false, 0);
    renderPlayerScore();

    if (handValue(playerHand) > 21) {
      playerDone = true;
      showActions(false);
      // Mark the last card with bust glow
      const lastCard = playerHandEl.lastElementChild;
      if (lastCard) lastCard.classList.add('bust-glow');
      endRound('bust');
    } else if (handValue(playerHand) === 21) {
      playerStand();
    }

    // Disable double after first hit
    doubleBtn.classList.add('disabled');
  }

  async function playerStand() {
    if (!gameActive || playerDone) return;
    playerDone = true;
    showActions(false);
    await dealerPlay();
  }

  async function playerDouble() {
    if (!gameActive || playerDone) return;
    if (userBalance < betAmount) {
      statusEl.textContent = 'Not enough balance to double!';
      return;
    }

    // Deduct additional bet
    userBalance -= betAmount;
    betAmount *= 2; // Track doubled bet for payout
    localStorage.setItem('userBalance', userBalance);
    updateBalanceDisplay();

    statusEl.textContent = 'Doubled! One more card...';

    // Draw exactly one card then stand
    await dealCardToHand(playerHand, playerHandEl, false, 200);
    renderPlayerScore();

    if (handValue(playerHand) > 21) {
      playerDone = true;
      const lastCard = playerHandEl.lastElementChild;
      if (lastCard) lastCard.classList.add('bust-glow');
      endRound('bust');
      // Reset doubled bet after round
      return;
    }

    playerDone = true;
    showActions(false);
    await dealerPlay();
  }

  // ══════════════════════════════════════
  // DEALER PLAY
  // ══════════════════════════════════════
  async function dealerPlay() {
    revealDealerCard();
    renderDealerScore(true);
    statusEl.textContent = 'Dealer is drawing...';

    // Dealer draws until 17+
    const drawLoop = async () => {
      while (handValue(dealerHand) < 17) {
        await new Promise(r => setTimeout(r, 600));
        await dealCardToHand(dealerHand, dealerHandEl, false, 0);
        renderDealerScore(true);
      }
    };

    await new Promise(r => setTimeout(r, 500));
    await drawLoop();

    const dealerTotal = handValue(dealerHand);
    const playerTotal = handValue(playerHand);

    if (dealerTotal > 21) {
      endRound('dealer-bust');
    } else if (dealerTotal > playerTotal) {
      endRound('lose');
    } else if (playerTotal > dealerTotal) {
      endRound('win');
    } else {
      endRound('push');
    }
  }

  // ══════════════════════════════════════
  // END ROUND
  // ══════════════════════════════════════
  function endRound(result) {
    gameActive = false;
    showActions(false);

    let payout = 0;
    let statusText = '';
    let statusClass = '';
    let cardGlow = '';

    switch (result) {
      case 'blackjack':
        payout = betAmount * 2.5; // 3:2 payout
        statusText = '🃏 BLACKJACK! You win $' + payout.toFixed(2) + '!';
        statusClass = 'blackjack';
        cardGlow = 'blackjack-glow';
        break;
      case 'win':
        payout = betAmount * 2;
        statusText = '🎉 You win $' + payout.toFixed(2) + '!';
        statusClass = 'win';
        cardGlow = 'win-glow';
        break;
      case 'dealer-bust':
        payout = betAmount * 2;
        statusText = '💥 Dealer busts! You win $' + payout.toFixed(2) + '!';
        statusClass = 'win';
        cardGlow = 'win-glow';
        // Glow dealer's last card
        const dealerLastCard = dealerHandEl.lastElementChild;
        if (dealerLastCard) dealerLastCard.classList.add('bust-glow');
        break;
      case 'push':
        payout = betAmount; // Return bet
        statusText = '🤝 Push — Bet returned';
        statusClass = 'push';
        break;
      case 'bust':
        statusText = '💀 Bust! You lose $' + betAmount.toFixed(2);
        statusClass = 'lose';
        break;
      case 'lose':
        statusText = '😞 Dealer wins. You lose $' + betAmount.toFixed(2);
        statusClass = 'lose';
        break;
      case 'dealer-blackjack':
        statusText = '🃏 Dealer has Blackjack!';
        statusClass = 'lose';
        break;
    }

    // Apply card glow to player hand for wins
    if (cardGlow && result !== 'dealer-bust') {
      playerHandEl.querySelectorAll('.bj-card').forEach(c => c.classList.add(cardGlow));
    }

    // Update balance
    if (payout > 0) {
      userBalance += payout;
      localStorage.setItem('userBalance', userBalance);
      updateBalanceDisplay();
    }

    // If bet was doubled, reset the betAmount to original for the next hand
    // We need to track the original bet. For simplicity, recalculate from active tab.
    const activeTab = document.querySelector('#bjBetTabs .bet-tab.active');
    if (activeTab) betAmount = parseInt(activeTab.dataset.value);

    statusEl.textContent = statusText;
    statusEl.className = 'bj-status ' + statusClass;

    setTimeout(() => showNewRound(true), 600);
  }

  // ══════════════════════════════════════
  // EVENT LISTENERS
  // ══════════════════════════════════════
  dealBtn.addEventListener('click', deal);
  hitBtn.addEventListener('click', playerHit);
  standBtn.addEventListener('click', playerStand);
  doubleBtn.addEventListener('click', playerDouble);
  newRoundBtn.addEventListener('click', () => {
    showNewRound(false);
    showBetPanel(true);
    clearTable();
    statusEl.textContent = 'Place your bet to begin';
    statusEl.className = 'bj-status';
  });
});
