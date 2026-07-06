const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');
const config = require('./config');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware احراز هویت ساده
const authenticate = (req, res, next) => {
    const key = req.headers['authorization']?.replace('Bearer ', '') || req.query.key;
    if (key === config.ADMIN_PASSWORD) return next();
    return res.status(401).json({ error: 'Unauthorized' });
};

// --- API Routes ---

// دریافت لیست کاربران
app.get('/api/users', authenticate, (req, res) => {
    const users = db.prepare('SELECT * FROM users').all();
    res.json({ success: true, users });
});

// افزودن کاربر
app.post('/api/users', authenticate, (req, res) => {
    const { name, traffic_limit, expiry_days } = req.body;
    const id = uuidv4();
    const uuid = uuidv4();
    const expiry_date = expiry_days ? Date.now() + (expiry_days * 86400000) : null;
    
    try {
        db.prepare('INSERT INTO users (id, name, uuid, traffic_limit, expiry_date) VALUES (?, ?, ?, ?, ?)')
          .run(id, name, uuid, traffic_limit || 0, expiry_date);
        res.json({ success: true, id, uuid });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// حذف کاربر
app.delete('/api/users/:id', authenticate, (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
});

// تولید لینک سابسکریپشن (شبیه‌سازی ساده)
app.get(`/${config.SUB_PATH}/:uuid`, (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE uuid = ?').get(req.params.uuid);
    if (!user) return res.status(404).send('Not Found');

    // اینجا باید منطق تولید کانفیگ VLESS/TROJAN قرار بگیرد
    // برای نمونه یک لینک تست برمی‌گردانیم
    const fakeConfig = `vless://${user.uuid}@example.com:443?encryption=none&security=tls&sni=example.com&type=ws&path=/aipan#${user.name}`;
    
    res.set('Content-Type', 'text/plain');
    res.send(Buffer.from(fakeConfig).toString('base64'));
});

// صفحه داشبورد
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(config.PORT, () => {
    console.log(`🚀 AIPAN Panel running on port ${config.PORT}`);
});