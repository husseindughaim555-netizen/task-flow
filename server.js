const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// مسار جلب جميع المشاريع مرتبة تنازلياً حسب تاريخ الإنشاء
app.get('/api/projects', (req, res) => {
    const query = 'SELECT * FROM projects ORDER BY id DESC';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database query error:', err.message);
            return res.status(500).json({ error: 'حدث خطأ في قاعدة البيانات أثناء جلب المشاريع.' });
        }
        res.json(rows);
    });
});

// مسار إضافة مشروع جديد مع تحقق برمجي صارم
app.post('/api/projects', (req, res) => {
    const { name, description, start_date, expected_end_date } = req.body;

    // 1. التحقق من وجود الحقول الأساسية
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'اسم المشروع حقل إجباري ولا يمكن أن يكون فارغاً.' });
    }

    if (!start_date || !expected_end_date) {
        return res.status(400).json({ error: 'تاريخ البداية وتاريخ النهاية المتوقع كلاهما مطلوبان.' });
    }

    // 2. التحقق من صحة التسلسل الزمني للتواريخ
    if (new Date(expected_end_date) < new Date(start_date)) {
        return res.status(400).json({ error: 'تاريخ النهاية المتوقع يجب أن يكون بعد تاريخ البداية.' });
    }

    // 3. الإدخال الآمن عبر Prepared Statements للحماية من SQL Injection
    const insertQuery = `
        INSERT INTO projects (name, description, start_date, expected_end_date)
        VALUES (?, ?, ?, ?)
    `;
    const params = [name.trim(), description ? description.trim() : null, start_date, expected_end_date];

    db.run(insertQuery, params, function(err) {
        if (err) {
            console.error('Insert error:', err.message);
            return res.status(500).json({ error: 'فشل حفظ المشروع في قاعدة البيانات.' });
        }
        res.status(201).json({
            message: 'تم إنشاء المشروع بنجاح',
            project: {
                id: this.lastID,
                name: name.trim(),
                description,
                start_date,
                expected_end_date
            }
        });
    });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});