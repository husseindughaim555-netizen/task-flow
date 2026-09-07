const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/projects', (req, res) => {
    db.all('SELECT * FROM projects ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/projects', (req, res) => {
    const { name, description, start_date, expected_end_date } = req.body;
    if (!name || !start_date || !expected_end_date) {
        return res.status(400).json({ error: 'يرجى ملء جميع الحقول المطلوبة' });
    }

    const sql = `INSERT INTO projects (name, description, start_date, expected_end_date) VALUES (?, ?, ?, ?)`;
    db.run(sql, [name, description, start_date, expected_end_date], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'تم حفظ المشروع بنجاح' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});