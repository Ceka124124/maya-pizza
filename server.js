const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' }, pingTimeout: 60000 });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const rooms = {};

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function findOrCreateRoom() {
  for (const code in rooms) {
    if (rooms[code].status === 'waiting' && rooms[code].players.length === 1) return rooms[code];
  }
  let code;
  do { code = genCode(); } while (rooms[code]);
  rooms[code] = { code, players: [], status: 'waiting', state: null, chat: [] };
  return rooms[code];
}

function assignRoles(room) {
  const sellerIdx = Math.random() < 0.5 ? 0 : 1;
  room.players[sellerIdx].role = 'seller';
  room.players[1 - sellerIdx].role = 'baker';
}

const CUSTOMERS_PER_DAY = 12;
const MAX_DAYS = 3;
const CUSTOMER_TEMPLATES = [
  // Profesyoneller
  { name: 'Ahmet Bey', emoji: '👨‍💼' },
  { name: 'Ayşe Hanım', emoji: '👩‍🦰' },
  { name: 'Profesör', emoji: '🧑‍🏫' },
  { name: 'Kaptan Deniz', emoji: '🧑‍✈️' },
  { name: 'Doktor Hasan', emoji: '👨‍⚕️' },
  { name: 'Hemşire Selin', emoji: '👩‍⚕️' },
  { name: 'Avukat Meral', emoji: '👩‍⚖️' },
  { name: 'Hakim Bey', emoji: '👨‍⚖️' },
  { name: 'Mühendis Can', emoji: '👨‍🔧' },
  { name: 'Mimar Zeynep', emoji: '👩‍🎨' },
  { name: 'Şef Aşçı', emoji: '👨‍🍳' },
  { name: 'Fırıncı Hüseyin', emoji: '🧑‍🍳' },
  { name: 'Çiftçi Ramazan', emoji: '👨‍🌾' },
  { name: 'Bilim İnsanı', emoji: '🧑‍🔬' },
  { name: 'Programcı Kaan', emoji: '👨‍💻' },
  { name: 'Tasarımcı Lara', emoji: '👩‍💻' },
  { name: 'İtfaiyeci Bora', emoji: '👨‍🚒' },
  { name: 'Polis Memuru', emoji: '👮' },
  { name: 'Asker Tarık', emoji: '💂' },
  { name: 'Postacı Veli', emoji: '💌' },

  // Öğrenciler & Gençler
  { name: 'Öğrenci Elif', emoji: '👩‍🎓' },
  { name: 'Liseli Emre', emoji: '🎒' },
  { name: 'DJ Burak', emoji: '🧑‍🎤' },
  { name: 'Sporcu Ali', emoji: '🏃‍♂️' },
  { name: 'Gamer Cem', emoji: '🎮' },
  { name: 'Müzisyen İpek', emoji: '🎸' },
  { name: 'Dansçı Naz', emoji: '💃' },
  { name: 'Ressam Tuna', emoji: '🎨' },
  { name: 'Youtuber Mert', emoji: '📹' },
  { name: 'Streamer Yiğit', emoji: '🖥️' },

  // Aile & Yaş Grupları
  { name: 'Çocuk Kerem', emoji: '🧒' },
  { name: 'Yaşlı Dede', emoji: '👴' },
  { name: 'Anne Fatma', emoji: '👩' },
  { name: 'Baba Osman', emoji: '👨' },
  { name: 'Nine Hatice', emoji: '👵' },
  { name: 'Bebek Annesi', emoji: '🤱' },
  { name: 'Hamile Dilek', emoji: '🤰' },
  { name: 'İkiz Kardeş', emoji: '👯' },
  { name: 'Abla Seda', emoji: '👩‍👧' },
  { name: 'Ağabey Tolga', emoji: '👦' },

  // Turistler & Yabancılar
  { name: 'Turist Marie', emoji: '👩‍🦱' },
  { name: 'Turist John', emoji: '🧳' },
  { name: 'Turist Yuki', emoji: '🗺️' },
  { name: 'Turist Ahmed', emoji: '🧕' },
  { name: 'Backpacker', emoji: '🎒' },
  { name: 'Seyyah Kemal', emoji: '✈️' },

  // İşçiler & Esnaf
  { name: 'İşçi Mustafa', emoji: '👷' },
  { name: 'Kasap Rıfat', emoji: '🥩' },
  { name: 'Manav Recep', emoji: '🥦' },
  { name: 'Berber Serkan', emoji: '💈' },
  { name: 'Taksici Şahin', emoji: '🚕' },
  { name: 'Kamyoncu Fikret', emoji: '🚛' },
  { name: 'Balıkçı Hami', emoji: '🎣' },
  { name: 'Bahçıvan Necip', emoji: '🌿' },
  { name: 'Boyacı Faruk', emoji: '🖌️' },
  { name: 'Tamirci Necati', emoji: '🔧' },
  { name: 'Çiçekçi Güler', emoji: '💐' },
  { name: 'Terzî Nazmiye', emoji: '🧵' },
  { name: 'Sekreter Banu', emoji: '📋' },
  { name: 'Muhasebeci Orhan', emoji: '🧾' },
  { name: 'Eczacı Sevda', emoji: '💊' },
  { name: 'Veteriner Ulaş', emoji: '🐾' },
  { name: 'Rehber Tuğba', emoji: '🏛️' },
  { name: 'Garson Barış', emoji: '🍽️' },
  { name: 'Kasiyer Meltem', emoji: '🛒' },
  { name: 'Güvenlik Rıza', emoji: '🛡️' },

  // Hobiler & İlgi Alanları
  { name: 'Koşucu Sinan', emoji: '🏅' },
  { name: 'Yüzücü Deniz', emoji: '🏊' },
  { name: 'Dağcı Erhan', emoji: '🧗' },
  { name: 'Bisikletçi Selim', emoji: '🚴' },
  { name: 'Satranç Ustası', emoji: '♟️' },
  { name: 'Kitap Kurdu', emoji: '📚' },
  { name: 'Fotoğrafçı Aslı', emoji: '📷' },
  { name: 'Gazeteci Hande', emoji: '📰' },
  { name: 'Blogger Irem', emoji: '✍️' },
  { name: 'Aşçı Hobi', emoji: '🍳' },

  // Özel & Eğlenceli
  { name: 'Astronot Alp', emoji: '🧑‍🚀' },
  { name: 'Cadı Büyücü', emoji: '🧙' },
  { name: 'Süper Kahraman', emoji: '🦸' },
  { name: 'Korsanlar Reisi', emoji: '🏴‍☠️' },
  { name: 'Robot Arkadaş', emoji: '🤖' },
  { name: 'Uzaylı Misafir', emoji: '👽' },
  { name: 'Dedektif Berk', emoji: '🕵️' },
  { name: 'Sihirbaz Mete', emoji: '🎩' },
  { name: 'Palyaço Tonton', emoji: '🤡' },
  { name: 'Ninja Gölge', emoji: '🥷' },
  { name: 'Kovboy Haydar', emoji: '🤠' },
  { name: 'Viking Torvald', emoji: '⚔️' },
];

const INGREDIENTS = {
  sauce: { name: 'Sos', cost: 1 }, cheese: { name: 'Peynir', cost: 1 },
  sucuk: { name: 'Sucuk', cost: 1 }, sosis: { name: 'Sosis', cost: 1 },
};

function generateOrder(score) {
  const diff = Math.min(Math.floor(score / 20), 4);
  const all = ['sauce', 'cheese', 'sucuk', 'sosis'].sort(() => Math.random() - 0.5);
  const baseCount = 1 + Math.min(diff, 2);
  const wanted = all.slice(0, baseCount);
  const unwanted = [];
  for (let i = baseCount; i < all.length; i++) {
    if (diff >= 2 && Math.random() > 0.5) unwanted.push(all[i]);
  }
  const needsCut = Math.random() > (diff >= 1 ? 0.4 : 0.6);
  const explicitNoCut = diff >= 2 && !needsCut && Math.random() > 0.5;
  return { wanted, unwanted, needsCut, explicitNoCut };
}

function orderToText(order) {
  const wn = order.wanted.map(k => INGREDIENTS[k].name);
  const un = order.unwanted.map(k => INGREDIENTS[k].name);
  const phrases = ['Bana lütfen', 'Bir pizza istiyorum,', 'Acıktım! Bana', 'Şöyle bir pizza olsun:'];
  let t = phrases[Math.floor(Math.random() * phrases.length)] + ' ';
  t += wn.length === 1 ? `sadece ${wn[0]} olsun` : wn.slice(0, -1).join(', ') + ' ve ' + wn[wn.length - 1] + ' olsun';
  if (un.length) t += `, ama ${un.join(' ve ')} kesinlikle istemiyorum`;
  if (order.needsCut) t += ' ve kesilmiş olsun';
  else if (order.explicitNoCut) t += ' — kesme sakın!';
  return t + '!';
}

function initGameState(room) {
  const templ = CUSTOMER_TEMPLATES[Math.floor(Math.random() * CUSTOMER_TEMPLATES.length)];
  const order = generateOrder(0);
  room.state = {
    money: 100, score: 0, day: 1, customerIndex: 0,
    phase: 'seller',
    currentCustomer: templ, currentOrder: order, currentOrderText: orderToText(order),
    pizzaToppings: {}, isCut: false, evalResult: null,
    sellerSocketId: room.players.find(p => p.role === 'seller').id,
    bakerSocketId: room.players.find(p => p.role === 'baker').id,
  };
}

function broadcastRoom(room) {
  io.to(room.code).emit('room_update', {
    code: room.code, status: room.status,
    players: room.players.map(p => ({ id: p.id, name: p.name, role: p.role })),
    state: room.state,
  });
}

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
      // Send chat history
      socket.emit('chat_history', room.chat);
    }
    broadcastRoom(room);
    console.log(`Room ${room.code}: ${room.players.map(p=>p.name).join(' + ')} (${room.status})`);
  });

  socket.on('send_to_kitchen', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.sellerSocketId !== socket.id) return;
    room.state.phase = 'kitchen';
    room.state.pizzaToppings = {};
    room.state.isCut = false;
    broadcastRoom(room);
  });

  socket.on('add_ingredient', ({ ingredient }) => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.bakerSocketId !== socket.id) return;
    if (room.state.phase !== 'kitchen' || !INGREDIENTS[ingredient]) return;
    room.state.pizzaToppings[ingredient] = (room.state.pizzaToppings[ingredient] || 0) + 1;
    room.state.money -= INGREDIENTS[ingredient].cost;
    broadcastRoom(room);
  });

  socket.on('toggle_cut', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.bakerSocketId !== socket.id || room.state.phase !== 'kitchen') return;
    room.state.isCut = !room.state.isCut;
    broadcastRoom(room);
  });

  socket.on('reset_pizza', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.bakerSocketId !== socket.id || room.state.phase !== 'kitchen') return;
    const total = Object.values(room.state.pizzaToppings).reduce((a, b) => a + b, 0);
    room.state.money += Math.floor(total * 0.5);
    room.state.pizzaToppings = {};
    room.state.isCut = false;
    broadcastRoom(room);
  });

  socket.on('serve_pizza', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.bakerSocketId !== socket.id || room.state.phase !== 'kitchen') return;
    const st = room.state;
    const { wanted, unwanted, needsCut, explicitNoCut } = st.currentOrder;
    let correct = 0, total = 0;
    const errors = [];
    wanted.forEach(k => { total++; if (st.pizzaToppings[k] > 0) correct++; else errors.push(`${INGREDIENTS[k].name} eksik`); });
    unwanted.forEach(k => { total++; if (st.pizzaToppings[k] > 0) errors.push(`${INGREDIENTS[k].name} istemiyordum`); else correct++; });
    if (needsCut || explicitNoCut) {
      total++;
      if (needsCut) { if (st.isCut) correct++; else errors.push('Kesilmemiş'); }
      else { if (!st.isCut) correct++; else errors.push('Kesilmemesi lazımdı'); }
    }
    if (total === 0) total = 1;
    const acc = correct / total;
    const stars = acc >= 1 ? 3 : acc >= 0.6 ? 2 : acc >= 0.3 ? 1 : 0;
    const moneyChange = [0, 5, 12, 20][stars];
    const scoreChange = [-5, 0, 3, 10][stars] ?? 0;
    const feedbacks = {
      3: ['Mükemmel! Tam istediğim gibi! 🤩', 'Harika pizza! Aferin! 👏', 'Bayıldım buna!'],
      2: ['İdare eder... ama eksikler var.\n❌ ' + errors.join('\n❌ ')],
      1: ['Berbat olmuş!\n❌ ' + errors.join('\n❌ ')],
      0: ['Bu pizza değil bu!\n❌ ' + errors.join('\n❌ ')],
    };
    const fb = feedbacks[stars][Math.floor(Math.random() * feedbacks[stars].length)];
    st.money += moneyChange;
    st.score = Math.max(0, st.score + scoreChange);
    st.evalResult = { stars, moneyChange, feedback: fb, snapshotToppings: { ...st.pizzaToppings }, snapshotCut: st.isCut };
    st.phase = 'eval';
    broadcastRoom(room);
  });

  socket.on('next_customer', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.phase !== 'eval') return;
    const st = room.state;
    if (st.money <= 0) { st.phase = 'gameover'; broadcastRoom(room); return; }
    st.customerIndex++;
    if (st.customerIndex >= CUSTOMERS_PER_DAY) {
      if (st.day >= MAX_DAYS) { st.phase = 'win'; broadcastRoom(room); return; }
      st.day++; st.customerIndex = 0;
      const tmp = st.sellerSocketId; st.sellerSocketId = st.bakerSocketId; st.bakerSocketId = tmp;
      room.players.forEach(p => { p.role = p.id === st.sellerSocketId ? 'seller' : 'baker'; });
      st.phase = 'roleswitch'; broadcastRoom(room); return;
    }
    const templ = CUSTOMER_TEMPLATES[Math.floor(Math.random() * CUSTOMER_TEMPLATES.length)];
    const order = generateOrder(st.score);
    Object.assign(st, { currentCustomer: templ, currentOrder: order, currentOrderText: orderToText(order), pizzaToppings: {}, isCut: false, evalResult: null, phase: 'seller' });
    broadcastRoom(room);
  });

  socket.on('start_new_day', () => {
    const room = rooms[socket.roomCode];
    if (!room?.state || room.state.phase !== 'roleswitch') return;
    const st = room.state;
    const templ = CUSTOMER_TEMPLATES[Math.floor(Math.random() * CUSTOMER_TEMPLATES.length)];
    const order = generateOrder(st.score);
    Object.assign(st, { currentCustomer: templ, currentOrder: order, currentOrderText: orderToText(order), pizzaToppings: {}, isCut: false, evalResult: null, phase: 'seller' });
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

  // ── CHAT ──────────────────────────────────────
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
    console.log('- disconnect', socket.id);
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    const room = rooms[code];
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) { delete rooms[code]; return; }
    room.status = 'waiting';
    room.state = null;
    broadcastRoom(room);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🍕 Pizza Oyunu → http://localhost:${PORT}`));
