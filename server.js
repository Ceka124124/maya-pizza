const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, pingTimeout: 60000 });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const CPD = 10; // customers per day
const MAX_DAYS = 3;
const ORDER_TIMEOUT = 45; // seconds before customer gets angry

const FOOD_TYPES = {
  pizza:  { name: 'Pizza',  emoji: '🍕', basePrice: 25, icon: 'pizza-slice' },
  doner:  { name: 'Döner',  emoji: '🌯', basePrice: 30, icon: 'bread-slice' },
  burger: { name: 'Burger', emoji: '🍔', basePrice: 28, icon: 'burger'      },
};

const DRINKS = {
  cola:   { name: 'Kola',    emoji: '🥤', price: 8,  cost: 2 },
  water:  { name: 'Su',      emoji: '💧', price: 4,  cost: 1 },
  ayran:  { name: 'Ayran',   emoji: '🥛', price: 6,  cost: 2 },
  juice:  { name: 'Meyve Suyu', emoji: '🧃', price: 10, cost: 3 },
};

// All possible ingredients per food type + their cost & sell value
const INGREDIENTS = {
  // Shared / pizza
  sauce:    { name: 'Sos',       emoji:'🍅', cost: 2,  priceAdd: 3,  foods:['pizza','doner','burger'] },
  cheese:   { name: 'Peynir',    emoji:'🧀', cost: 3,  priceAdd: 5,  foods:['pizza','doner','burger'] },
  sucuk:    { name: 'Sucuk',     emoji:'🥩', cost: 4,  priceAdd: 7,  foods:['pizza','doner'] },
  sosis:    { name: 'Sosis',     emoji:'🌭', cost: 3,  priceAdd: 6,  foods:['pizza','burger'] },
  mushroom: { name: 'Mantar',    emoji:'🍄', cost: 2,  priceAdd: 4,  foods:['pizza','burger'] },
  olive:    { name: 'Zeytin',    emoji:'🫒', cost: 2,  priceAdd: 4,  foods:['pizza','doner'] },
  // Doner specific
  meat:     { name: 'Et',        emoji:'🥙', cost: 5,  priceAdd: 9,  foods:['doner'] },
  cabbage:  { name: 'Lahana',    emoji:'🥬', cost: 1,  priceAdd: 2,  foods:['doner'] },
  tomato:   { name: 'Domates',   emoji:'🍅', cost: 1,  priceAdd: 2,  foods:['doner','burger'] },
  // Burger specific
  patty:    { name: 'Köfte',     emoji:'🥩', cost: 5,  priceAdd: 9,  foods:['burger'] },
  lettuce:  { name: 'Marul',     emoji:'🥗', cost: 1,  priceAdd: 2,  foods:['burger'] },
  pickle:   { name: 'Turşu',     emoji:'🥒', cost: 1,  priceAdd: 2,  foods:['burger'] },
  onion:    { name: 'Soğan',     emoji:'🧅', cost: 1,  priceAdd: 2,  foods:['burger','doner'] },
};

const CUSTOMER_TEMPLATES = [
  { name: 'Ahmet Bey',    emoji:'👨‍💼', patience: 40, tipBonus: 1.0 },
  { name: 'Ayşe Hanım',  emoji:'👩‍🦰', patience: 35, tipBonus: 1.1 },
  { name: 'Kerem',        emoji:'🧒',   patience: 50, tipBonus: 0.8 },
  { name: 'Yaşlı Dede',  emoji:'👴',   patience: 55, tipBonus: 0.9 },
  { name: 'Elif',         emoji:'👩‍🎓', patience: 30, tipBonus: 1.2 },
  { name: 'Sporcu Ali',   emoji:'🏃‍♂️', patience: 25, tipBonus: 1.3 },
  { name: 'Turist Marie', emoji:'👩‍🦱', patience: 45, tipBonus: 1.4 },
  { name: 'İşçi Mustafa',emoji:'👷',   patience: 35, tipBonus: 1.0 },
  { name: 'Profesör',     emoji:'🧑‍🏫', patience: 30, tipBonus: 1.5 },
  { name: 'DJ Burak',     emoji:'🧑‍🎤', patience: 28, tipBonus: 1.6 },
  { name: 'Anne Fatma',   emoji:'👩',   patience: 40, tipBonus: 1.1 },
  { name: 'Kaptan Deniz', emoji:'🧑‍✈️', patience: 35, tipBonus: 1.2 },
  { name: 'Milyoner Vip', emoji:'🤵',   patience: 20, tipBonus: 2.5 },
  { name: 'Ünlü Şef',    emoji:'👨‍🍳', patience: 20, tipBonus: 2.0 },
  { name: 'Belediye Başkanı', emoji:'👔', patience: 15, tipBonus: 3.0 },
];

const POPULARITY_LEVELS = [
  { min:0,   max:19,  label:'Bilinmez',     emoji:'👻', color:'#666',   customerRate: 0.6 },
  { min:20,  max:49,  label:'Sıradan',      emoji:'😐', color:'#888',   customerRate: 0.8 },
  { min:50,  max:99,  label:'Tanınan',      emoji:'🙂', color:'#f59e0b',customerRate: 1.0 },
  { min:100, max:199, label:'Popüler',      emoji:'😊', color:'#f97316',customerRate: 1.2 },
  { min:200, max:349, label:'Çok Popüler',  emoji:'😍', color:'#ef4444',customerRate: 1.4 },
  { min:350, max:499, label:'Ünlü',         emoji:'🌟', color:'#a855f7',customerRate: 1.6 },
  { min:500, max:999, label:'Efsane',       emoji:'🔥', color:'#FFD23F',customerRate: 2.0 },
  { min:1000,max:Infinity,label:'Tanrısal', emoji:'👑', color:'#00f5ff',customerRate: 3.0 },
];

function getPopLevel(score) {
  return POPULARITY_LEVELS.find(l => score >= l.min && score <= l.max) || POPULARITY_LEVELS[0];
}

function getIngrForFood(foodType) {
  return Object.entries(INGREDIENTS)
    .filter(([,v]) => v.foods.includes(foodType))
    .map(([k]) => k);
}

function generateOrder(score) {
  const diff = Math.min(Math.floor(score / 30), 5);
  // Pick food type
  const foodKeys = Object.keys(FOOD_TYPES);
  const foodType = foodKeys[Math.floor(Math.random() * foodKeys.length)];
  const availIngr = getIngrForFood(foodType);
  const shuffled = [...availIngr].sort(() => Math.random() - 0.5);
  const baseCount = Math.min(1 + Math.min(diff, 3), shuffled.length);
  const wanted = shuffled.slice(0, baseCount);
  const unwanted = [];
  for (let i = baseCount; i < shuffled.length; i++) {
    if (diff >= 2 && Math.random() > 0.6) unwanted.push(shuffled[i]);
  }
  // Drink order
  const wantsDrink = Math.random() > (diff >= 1 ? 0.3 : 0.5);
  let drinkKey = null;
  if (wantsDrink) {
    const dkeys = Object.keys(DRINKS);
    drinkKey = dkeys[Math.floor(Math.random() * dkeys.length)];
  }
  const needsCut = (foodType === 'pizza') && Math.random() > (diff >= 1 ? 0.4 : 0.6);
  const explicitNoCut = (foodType === 'pizza') && diff >= 2 && !needsCut && Math.random() > 0.5;
  // Wanted drink quantities (for burgers/döner - extra topping counts matter)
  const wantedQty = {};
  wanted.forEach(k => {
    wantedQty[k] = (diff >= 3 && Math.random() > 0.5) ? Math.floor(Math.random()*2)+2 : 1;
  });
  return { foodType, wanted, unwanted, wantedQty, drinkKey, needsCut, explicitNoCut };
}

function orderToText(order) {
  const ft = FOOD_TYPES[order.foodType];
  const phrases = [
    `Merhaba, ${ft.emoji} ${ft.name} yemek istiyorum.`,
    `${ft.name} alacağım,`,
    `${ft.emoji} bir ${ft.name} söyler misiniz,`,
    `Acıktım! Bana ${ft.name} verir misiniz,`,
  ];
  let t = phrases[Math.floor(Math.random() * phrases.length)] + ' ';
  const wnames = order.wanted.map(k => {
    const q = order.wantedQty[k];
    return q > 1 ? `${q} kat ${INGREDIENTS[k].name}` : INGREDIENTS[k].name;
  });
  t += wnames.length === 1 ? `sadece ${wnames[0]} olsun` :
       wnames.slice(0,-1).join(', ') + ' ve ' + wnames[wnames.length-1] + ' olsun';
  if (order.unwanted.length) {
    const un = order.unwanted.map(k => INGREDIENTS[k].name);
    t += `, ama ${un.join(' ve ')} istemiyorum kesinlikle`;
  }
  if (order.drinkKey) t += `. ${DRINKS[order.drinkKey].emoji} ${DRINKS[order.drinkKey].name} de ekleyin`;
  if (order.needsCut) t += '. Ve kesilmiş olsun';
  else if (order.explicitNoCut) t += '. Kesme sakın';
  return t + '!';
}

function calcOrderPrice(order, toppings, hasDrink, isCut, timeBonus, popularityMult, customerTipBonus) {
  const ft = FOOD_TYPES[order.foodType];
  let price = ft.basePrice;
  // Add price per ingredient placed (dynamic pricing)
  for (const [k, count] of Object.entries(toppings)) {
    if (INGREDIENTS[k]) price += INGREDIENTS[k].priceAdd * count;
  }
  if (hasDrink && order.drinkKey) price += DRINKS[order.drinkKey].price;
  // Time bonus: faster = more tip
  price += timeBonus; // 0-10 extra
  price = Math.round(price * popularityMult * customerTipBonus);
  return price;
}

function evaluateOrder(order, toppings, hasDrink, isCut) {
  let correct = 0, total = 0;
  const errors = [];
  order.wanted.forEach(k => {
    const needed = order.wantedQty[k] || 1;
    const have = toppings[k] || 0;
    total++;
    if (have >= needed) correct++;
    else if (have > 0) { correct += 0.5; errors.push(`${INGREDIENTS[k].name} az kondu (${have}/${needed})`); }
    else errors.push(`${INGREDIENTS[k].name} eksik`);
  });
  order.unwanted.forEach(k => {
    total++;
    if ((toppings[k] || 0) > 0) errors.push(`${INGREDIENTS[k].name} istemiyordum`);
    else correct++;
  });
  if (order.drinkKey) {
    total++;
    if (hasDrink) correct++; else errors.push(`${DRINKS[order.drinkKey].name} unuttun`);
  }
  if (order.needsCut || order.explicitNoCut) {
    total++;
    if (order.needsCut) { if (isCut) correct++; else errors.push('Kesilmemiş'); }
    else { if (!isCut) correct++; else errors.push('Kesilmemesi lazımdı'); }
  }
  if (total === 0) total = 1;
  const acc = correct / total;
  const stars = acc >= 1 ? 3 : acc >= 0.65 ? 2 : acc >= 0.35 ? 1 : 0;
  return { stars, accuracy: acc, errors };
}

function calcCost(toppings, hasDrink, drinkKey) {
  let cost = 0;
  for (const [k, count] of Object.entries(toppings)) {
    if (INGREDIENTS[k]) cost += INGREDIENTS[k].cost * count;
  }
  if (hasDrink && drinkKey) cost += DRINKS[drinkKey].cost;
  return cost;
}

function initGameState(room) {
  const templ = CUSTOMER_TEMPLATES[Math.floor(Math.random() * CUSTOMER_TEMPLATES.length)];
  const order = generateOrder(0);
  room.state = {
    money: 150, score: 0, popularity: 10,
    day: 1, customerIndex: 0,
    phase: 'seller',
    currentCustomer: templ,
    currentOrder: order,
    currentOrderText: orderToText(order),
    orderStartTime: Date.now(),
    toppings: {}, hasDrink: false, isCut: false,
    evalResult: null,
    sellerSocketId: room.players.find(p => p.role === 'seller').id,
    bakerSocketId:  room.players.find(p => p.role === 'baker').id,
    stats: { totalEarned: 0, totalServed: 0, perfect: 0, failed: 0 },
  };
}

function broadcastRoom(room) {
  io.to(room.code).emit('room_update', {
    code: room.code, status: room.status,
    players: room.players.map(p => ({ id: p.id, name: p.name, role: p.role })),
    state: room.state,
    meta: { FOOD_TYPES, INGREDIENTS, DRINKS, POPULARITY_LEVELS },
  });
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = ''; for (let i=0;i<4;i++) c += chars[Math.floor(Math.random()*chars.length)]; return c;
}
function findOrCreateRoom() {
  for (const code in rooms) {
    if (rooms[code].status==='waiting' && rooms[code].players.length===1) return rooms[code];
  }
  let code; do { code = genCode(); } while (rooms[code]);
  rooms[code] = { code, players:[], status:'waiting', state:null, chat:[] };
  return rooms[code];
}
function assignRoles(room) {
  const i = Math.random()<0.5?0:1;
  room.players[i].role='seller';
  room.players[1-i].role='baker';
}

const rooms = {};

/* ═══════════════════════════════════════════
   TIMER TICKS — broadcast timer every second
═══════════════════════════════════════════ */
setInterval(() => {
  for (const code in rooms) {
    const room = rooms[code];
    if (!room.state || room.state.phase !== 'kitchen') continue;
    const elapsed = Math.floor((Date.now() - room.state.orderStartTime) / 1000);
    const remaining = Math.max(0, ORDER_TIMEOUT - elapsed);
    const angry = remaining <= 10;
    const veryAngry = remaining <= 5;
    io.to(code).emit('timer_tick', { remaining, angry, veryAngry });
    if (remaining === 0 && !room.state._timedOut) {
      room.state._timedOut = true;
      // Auto serve with what's there but penalize
      const st = room.state;
      const ev = evaluateOrder(st.currentOrder, st.toppings, st.hasDrink, st.isCut);
      const timeBonus = 0;
      const popLevel = getPopLevel(st.popularity);
      const customer = st.currentCustomer;
      // stars forced to max 1 when timed out
      const cappedStars = Math.min(ev.stars, 1);
      const earned = cappedStars > 0 ? calcOrderPrice(st.currentOrder, st.toppings, st.hasDrink, st.isCut, timeBonus, 1 + (st.popularity / 500), customer.tipBonus) * 0.4 : 0;
      const cost = calcCost(st.toppings, st.hasDrink, st.currentOrder.drinkKey);
      st.money -= cost;
      st.money += Math.round(earned);
      const scoreChange = cappedStars === 0 ? -15 : -5;
      st.score = Math.max(0, st.score + scoreChange);
      st.popularity = Math.max(0, st.popularity - 10);
      st.evalResult = {
        stars: cappedStars, earned: Math.round(earned), cost,
        feedback: `⏰ Süre doldu! Müşteri çok kızdı!\n❌ ${ev.errors.join('\n❌ ')||'Sipariş geç geldi'}`,
        snapshotToppings: {...st.toppings}, snapshotCut: st.isCut,
        snapshotDrink: st.hasDrink, timedOut: true,
        scoreChange, popularityChange: -10,
      };
      st.stats.failed++;
      st.phase = 'eval';
      broadcastRoom(room);
    }
  }
}, 1000);

/* ═══════════════════════════════════════════
   SOCKET EVENTS
═══════════════════════════════════════════ */
io.on('connection', (socket) => {
  console.log('+ connect', socket.id);

  socket.on('join_lobby', ({ name }) => {
    name = String(name).trim().slice(0, 20) || 'Anonim';
    const room = findOrCreateRoom();
    room.players.push({ id: socket.id, name, role: null });
    socket.join(room.code);
    socket.roomCode = room.code;
    if (room.players.length === 2) {
      room.status = 'playing';
      assignRoles(room);
      initGameState(room);
      socket.emit('chat_history', room.chat);
    }
    broadcastRoom(room);
  });

  socket.on('send_to_kitchen', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.sellerSocketId !== socket.id) return;
    room.state.phase = 'kitchen';
    room.state.toppings = {};
    room.state.hasDrink = false;
    room.state.isCut = false;
    room.state.orderStartTime = Date.now();
    room.state._timedOut = false;
    broadcastRoom(room);
  });

  socket.on('add_ingredient', ({ ingredient }) => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.bakerSocketId !== socket.id) return;
    if (room.state.phase !== 'kitchen' || !INGREDIENTS[ingredient]) return;
    room.state.toppings[ingredient] = (room.state.toppings[ingredient] || 0) + 1;
    broadcastRoom(room);
  });

  socket.on('remove_ingredient', ({ ingredient }) => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.bakerSocketId !== socket.id || room.state.phase !== 'kitchen') return;
    if (room.state.toppings[ingredient] > 0) {
      room.state.toppings[ingredient]--;
      if (room.state.toppings[ingredient] === 0) delete room.state.toppings[ingredient];
    }
    broadcastRoom(room);
  });

  socket.on('toggle_drink', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.bakerSocketId !== socket.id || room.state.phase !== 'kitchen') return;
    room.state.hasDrink = !room.state.hasDrink;
    broadcastRoom(room);
  });

  socket.on('toggle_cut', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.bakerSocketId !== socket.id || room.state.phase !== 'kitchen') return;
    room.state.isCut = !room.state.isCut;
    broadcastRoom(room);
  });

  socket.on('reset_food', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.bakerSocketId !== socket.id || room.state.phase !== 'kitchen') return;
    room.state.toppings = {};
    room.state.hasDrink = false;
    room.state.isCut = false;
    broadcastRoom(room);
  });

  socket.on('serve_food', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.bakerSocketId !== socket.id || room.state.phase !== 'kitchen') return;
    if (room.state._timedOut) return;
    const st = room.state;
    const elapsed = Math.floor((Date.now() - st.orderStartTime) / 1000);
    const remaining = Math.max(0, ORDER_TIMEOUT - elapsed);
    const timeBonus = Math.round((remaining / ORDER_TIMEOUT) * 10); // 0-10 bonus
    const ev = evaluateOrder(st.currentOrder, st.toppings, st.hasDrink, st.isCut);
    const popMult = 1 + (st.popularity / 500);
    const customer = st.currentCustomer;
    let earned = 0;
    if (ev.stars > 0) {
      earned = calcOrderPrice(st.currentOrder, st.toppings, st.hasDrink, st.isCut, timeBonus, popMult, customer.tipBonus);
      // Scale by stars
      const starMult = [0, 0.4, 0.75, 1.0][ev.stars];
      earned = Math.round(earned * starMult);
    }
    const cost = calcCost(st.toppings, st.hasDrink, st.currentOrder.drinkKey);
    const net = earned - cost;
    st.money += net;
    const scoreMap = [0, 5, 15, 30][ev.stars]; // base
    const bonus = ev.stars === 3 ? (timeBonus > 7 ? 10 : 0) : 0; // speed bonus
    const scoreChange = ev.stars === 0 ? -20 : scoreMap + bonus;
    st.score = Math.max(0, st.score + scoreChange);
    const popChange = ev.stars === 3 ? (15 + bonus) : ev.stars === 2 ? 5 : ev.stars === 1 ? -5 : -20;
    st.popularity = Math.max(0, st.popularity + popChange);
    // Stats
    st.stats.totalEarned += Math.max(0, earned);
    st.stats.totalServed++;
    if (ev.stars === 3) st.stats.perfect++;
    if (ev.stars === 0) st.stats.failed++;
    const feedbacks = {
      3: [`Mükemmel! Harika ${FOOD_TYPES[st.currentOrder.foodType].name}! 🤩`, `Yaşasın! Tam istediğim gibi! 👏`, `Bayıldım, teşekkürler! 🥰`],
      2: [`İdare eder... eksikler var.\n❌ ` + ev.errors.slice(0,2).join('\n❌ ')],
      1: [`Berbat olmuş!\n❌ ` + ev.errors.join('\n❌ ')],
      0: [`Bu ne ya! Hiç olmamış!\n❌ ` + ev.errors.join('\n❌ ')],
    };
    const fb = feedbacks[ev.stars][Math.floor(Math.random() * feedbacks[ev.stars].length)];
    st.evalResult = {
      stars: ev.stars, earned, cost, net, timeBonus,
      feedback: fb,
      snapshotToppings: {...st.toppings},
      snapshotCut: st.isCut,
      snapshotDrink: st.hasDrink,
      scoreChange, popularityChange: popChange,
      timedOut: false,
    };
    st.phase = 'eval';
    broadcastRoom(room);
  });

  socket.on('next_customer', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.phase !== 'eval') return;
    const st = room.state;
    if (st.money <= 0) { st.phase = 'gameover'; broadcastRoom(room); return; }
    st.customerIndex++;
    if (st.customerIndex >= CPD) {
      if (st.day >= MAX_DAYS) { st.phase = 'win'; broadcastRoom(room); return; }
      st.day++; st.customerIndex = 0;
      const tmp = st.sellerSocketId; st.sellerSocketId = st.bakerSocketId; st.bakerSocketId = tmp;
      room.players.forEach(p => { p.role = p.id === st.sellerSocketId ? 'seller' : 'baker'; });
      st.phase = 'roleswitch'; broadcastRoom(room); return;
    }
    // Popularity might bring VIP customer
    const pop = getPopLevel(st.popularity);
    let pool = [...CUSTOMER_TEMPLATES];
    if (pop.customerRate >= 1.6) pool.push(...CUSTOMER_TEMPLATES.slice(-3)); // more chance for VIP
    const templ = pool[Math.floor(Math.random() * pool.length)];
    const order = generateOrder(st.score);
    Object.assign(st, {
      currentCustomer: templ, currentOrder: order,
      currentOrderText: orderToText(order),
      orderStartTime: Date.now(), _timedOut: false,
      toppings: {}, hasDrink: false, isCut: false, evalResult: null, phase: 'seller'
    });
    broadcastRoom(room);
  });

  socket.on('start_new_day', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.phase !== 'roleswitch') return;
    const st = room.state;
    const templ = CUSTOMER_TEMPLATES[Math.floor(Math.random() * CUSTOMER_TEMPLATES.length)];
    const order = generateOrder(st.score);
    Object.assign(st, {
      currentCustomer: templ, currentOrder: order,
      currentOrderText: orderToText(order),
      orderStartTime: Date.now(), _timedOut: false,
      toppings: {}, hasDrink: false, isCut: false, evalResult: null, phase: 'seller'
    });
    broadcastRoom(room);
  });

  socket.on('restart_game', () => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    assignRoles(room);
    initGameState(room);
    room.status = 'playing';
    broadcastRoom(room);
  });

  socket.on('chat_msg', ({ text }) => {
    const room = rooms[socket.roomCode];
    if (!room) return;
    text = String(text).trim().slice(0, 120);
    if (!text) return;
    const sender = room.players.find(p => p.id === socket.id);
    if (!sender) return;
    const msg = { name: sender.name, text, ts: Date.now(), id: socket.id };
    room.chat.push(msg);
    if (room.chat.length > 100) room.chat.shift();
    io.to(room.code).emit('chat_msg', msg);
  });

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) { delete rooms[code]; return; }
    room.status = 'waiting'; room.state = null;
    broadcastRoom(room);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🍕 Güzel Pizza Dükkanı v4 → http://localhost:${PORT}`));
