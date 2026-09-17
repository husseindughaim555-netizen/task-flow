const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// مسار جلب المشاريع (العضو 1)
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

// ==========================================
// مسارات إدارة المهام والتسلسل الهرمي (العضو 2)
// ==========================================

// 1. جلب مهام مشروع معين
app.get('/api/projects/:projectId/tasks', (req, res) => {
    const { projectId } = req.params;
    const query = 'SELECT * FROM tasks WHERE project_id = ? ORDER BY id ASC';

    db.all(query, [projectId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'خطأ أثناء جلب المهام.' });
        }
        res.json(rows);
    });
});

// 2. إنشاء مهمة (رئيسية أو فرعية تابعة لـ parent_id مع تحديد الأولوية)
app.post('/api/tasks', (req, res) => {
    const { project_id, title, description, priority, parent_id } = req.body;

    if (!project_id || !title) {
        return res.status(400).json({ error: 'المشروع وعنوان المهمة مطلوبان.' });
    }

    const taskPriority = priority || 'متوسطة';
    const parentTaskId = parent_id || null;

    const query = `
        INSERT INTO tasks (project_id, title, description, priority, status, parent_id)
        VALUES (?, ?, ?, ?, 'جديد', ?)
    `;

    db.run(query, [project_id, title, description, taskPriority, parentTaskId], function (err) {
        if (err) {
            return res.status(500).json({ error: 'فشل في حفظ المهمة: ' + err.message });
        }
        res.status(201).json({
            id: this.lastID,
            project_id,
            title,
            description,
            priority: taskPriority,
            status: 'جديد',
            parent_id: parentTaskId
        });
    });
});

// 3. تعديل مهمة موجودة
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, priority } = req.body;

    const query = `
        UPDATE tasks 
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            priority = COALESCE(?, priority)
        WHERE id = ?
    `;

    db.run(query, [title, description, priority, id], function (err) {
        if (err) {
            return res.status(500).json({ error: 'فشل في تعديل المهمة.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'المهمة غير موجودة.' });
        }
        res.json({ message: 'تم تعديل المهمة بنجاح.' });
    });
});

// 4. حذف مهمة (تحذف تلقائياً مهامها الفرعية)
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM tasks WHERE id = ?';

    db.run(query, [id], function (err) {
        if (err) {
            return res.status(500).json({ error: 'فشل في حذف المهمة.' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'المهمة غير موجودة.' });
        }
        res.json({ message: 'تم حذف المهمة بنجاح.' });
    });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});