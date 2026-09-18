const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* =========================================================
   تجهيز البيانات الافتراضية الأولية (Auto-Seed)
   ========================================================= */
db.serialize(() => {
    // التأكد من وجود مشروع افتراضي
    db.get('SELECT COUNT(*) AS count FROM projects', (err, row) => {
        if (!err && row && row.count === 0) {
            db.run(
                `INSERT INTO projects (name, description, start_date, expected_end_date)
                 VALUES ('المشروع الافتراضي', 'مشروع أولي لإدارة المهام', '2026-01-01', '2026-12-31')`
            );
            console.log('✓ تم إنشاء مشروع افتراضي بنجاح.');
        }
    });

    // التأكد من وجود مستخدمين افتراضيين
    db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
        if (!err && row && row.count === 0) {
            db.run(`INSERT INTO users (name, email) VALUES ('حسين دغيم', 'hussein@taskflow.local')`);
            db.run(`INSERT INTO users (name, email) VALUES ('أنس', 'anas@taskflow.local')`);
            db.run(`INSERT INTO users (name, email) VALUES ('محمد عرابي', 'orabi@taskflow.local')`);
            console.log('✓ تم إضافة أعضاء الفريق الافتراضيين بنجاح.');
        }
    });
});

/* =========================================================
   PROJECTS
   ========================================================= */

// جلب جميع المشاريع
app.get('/api/projects', (req, res) => {
    const query = `
        SELECT *
        FROM projects
        ORDER BY id DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('خطأ في جلب المشاريع:', err.message);
            return res.status(500).json({
                error: 'حدث خطأ أثناء جلب المشاريع'
            });
        }

        res.json(rows);
    });
});

// إنشاء مشروع جديد
app.post('/api/projects', (req, res) => {
    const {
        name,
        description,
        start_date,
        expected_end_date
    } = req.body;

    if (!name || !start_date || !expected_end_date) {
        return res.status(400).json({
            error: 'اسم المشروع وتاريخ البداية وتاريخ النهاية مطلوبة'
        });
    }

    const query = `
        INSERT INTO projects
        (name, description, start_date, expected_end_date)
        VALUES (?, ?, ?, ?)
    `;

    db.run(
        query,
        [
            name,
            description || '',
            start_date,
            expected_end_date
        ],
        function (err) {
            if (err) {
                console.error('خطأ في إنشاء المشروع:', err.message);
                return res.status(500).json({
                    error: 'حدث خطأ أثناء إنشاء المشروع'
                });
            }

            res.status(201).json({
                id: this.lastID,
                name,
                description: description || '',
                start_date,
                expected_end_date
            });
        }
    );
});

// حذف مشروع
app.delete('/api/projects/:id', (req, res) => {
    const projectId = Number(req.params.id);

    if (!Number.isInteger(projectId)) {
        return res.status(400).json({
            error: 'معرّف المشروع غير صالح'
        });
    }

    db.run(
        `DELETE FROM projects WHERE id = ?`,
        [projectId],
        function (err) {
            if (err) {
                console.error('خطأ في حذف المشروع:', err.message);
                return res.status(500).json({
                    error: 'حدث خطأ أثناء حذف المشروع'
                });
            }

            if (this.changes === 0) {
                return res.status(404).json({
                    error: 'المشروع غير موجود'
                });
            }

            res.json({
                message: 'تم حذف المشروع بنجاح'
            });
        }
    );
});

/* =========================================================
   USERS
   ========================================================= */

// جلب أعضاء الفريق
app.get('/api/users', (req, res) => {
    const query = `
        SELECT id, name, email
        FROM users
        ORDER BY name ASC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('خطأ في جلب المستخدمين:', err.message);
            return res.status(500).json({
                error: 'حدث خطأ أثناء جلب أعضاء الفريق'
            });
        }

        res.json(rows);
    });
});

/* =========================================================
   TASKS
   ========================================================= */

// جلب جميع المهام (عام للوحة الكانبان)
app.get('/api/tasks', (req, res) => {
    const query = `
        SELECT
            tasks.*,
            users.name AS assigned_to_name,
            users.email AS assigned_to_email
        FROM tasks
        LEFT JOIN users
            ON tasks.assigned_to = users.id
        ORDER BY tasks.id ASC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('خطأ في جلب المهام:', err.message);
            return res.status(500).json({
                error: 'حدث خطأ أثناء جلب المهام'
            });
        }

        res.json(rows);
    });
});

// جلب مهام مشروع معيّن
app.get('/api/projects/:projectId/tasks', (req, res) => {
    const projectId = Number(req.params.projectId);

    if (!Number.isInteger(projectId)) {
        return res.status(400).json({
            error: 'معرّف المشروع غير صالح'
        });
    }

    const query = `
        SELECT
            tasks.*,
            users.name AS assigned_to_name,
            users.email AS assigned_to_email
        FROM tasks
        LEFT JOIN users
            ON tasks.assigned_to = users.id
        WHERE tasks.project_id = ?
        ORDER BY tasks.id ASC
    `;

    db.all(query, [projectId], (err, rows) => {
        if (err) {
            console.error('خطأ في جلب المهام:', err.message);
            return res.status(500).json({
                error: 'حدث خطأ أثناء جلب المهام'
            });
        }

        res.json(rows);
    });
});

// إنشاء مهمة جديدة
app.post('/api/tasks', (req, res) => {
    const {
        project_id,
        title,
        description,
        priority,
        parent_id,
        assigned_to
    } = req.body;

    const projectId = Number(project_id);

    if (!project_id || !title) {
        return res.status(400).json({
            error: 'المشروع وعنوان المهمة مطلوبان'
        });
    }

    if (!Number.isInteger(projectId)) {
        return res.status(400).json({
            error: 'معرّف المشروع غير صالح'
        });
    }

    const taskPriority = priority || 'متوسطة';
    const parentTaskId =
        parent_id === null || parent_id === undefined || parent_id === ''
            ? null
            : Number(parent_id);

    const assignedUserId =
        assigned_to === null || assigned_to === undefined || assigned_to === ''
            ? null
            : Number(assigned_to);

    const validPriorities = ['منخفضة', 'متوسطة', 'عالية'];

    if (!validPriorities.includes(taskPriority)) {
        return res.status(400).json({
            error: 'الأولوية غير صالحة'
        });
    }

    db.get(
        `SELECT id FROM projects WHERE id = ?`,
        [projectId],
        (projectErr, project) => {
            if (projectErr) {
                console.error('خطأ في التحقق من المشروع:', projectErr.message);
                return res.status(500).json({
                    error: 'حدث خطأ أثناء التحقق من المشروع'
                });
            }

            if (!project) {
                return res.status(404).json({
                    error: 'المشروع غير موجود'
                });
            }

            const insertTask = () => {
                const query = `
                    INSERT INTO tasks
                    (
                        project_id,
                        title,
                        description,
                        priority,
                        status,
                        parent_id,
                        assigned_to
                    )
                    VALUES (?, ?, ?, ?, 'جديد', ?, ?)
                `;

                db.run(
                    query,
                    [
                        projectId,
                        title,
                        description || '',
                        taskPriority,
                        parentTaskId,
                        assignedUserId
                    ],
                    function (err) {
                        if (err) {
                            console.error('خطأ في إنشاء المهمة:', err.message);
                            return res.status(500).json({
                                error: 'حدث خطأ أثناء إنشاء المهمة'
                            });
                        }

                        res.status(201).json({
                            id: this.lastID,
                            project_id: projectId,
                            title,
                            description: description || '',
                            priority: taskPriority,
                            status: 'جديد',
                            parent_id: parentTaskId,
                            assigned_to: assignedUserId
                        });
                    }
                );
            };

            if (assignedUserId === null) {
                insertTask();
                return;
            }

            db.get(
                `SELECT id FROM users WHERE id = ?`,
                [assignedUserId],
                (userErr, user) => {
                    if (userErr || !user) {
                        return res.status(400).json({
                            error: 'العضو المحدد غير موجود'
                        });
                    }
                    insertTask();
                }
            );
        }
    );
});

/* =========================================================
   TASK ASSIGNMENT & UPDATE
   ========================================================= */

// إسناد مهمة لعضو (ميزة العضو رقم 3)
app.put('/api/tasks/:id/assign', (req, res) => {
    const taskId = Number(req.params.id);
    const { assigned_to } = req.body;

    const assignedUserId =
        assigned_to === null || assigned_to === undefined || assigned_to === ''
            ? null
            : Number(assigned_to);

    db.run(
        'UPDATE tasks SET assigned_to = ? WHERE id = ?',
        [assignedUserId, taskId],
        function (err) {
            if (err) {
                console.error('خطأ في إسناد المهمة:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'تم إسناد المهمة بنجاح', changes: this.changes });
        }
    );
});

// تعديل المهمة
app.put('/api/tasks/:id', (req, res) => {
    const taskId = Number(req.params.id);
    const { title, description, priority, assigned_to } = req.body;

    if (!Number.isInteger(taskId)) {
        return res.status(400).json({ error: 'معرّف المهمة غير صالح' });
    }

    if (!title) {
        return res.status(400).json({ error: 'عنوان المهمة مطلوب' });
    }

    const taskPriority = priority || 'متوسطة';
    const assignedUserId =
        assigned_to === null || assigned_to === undefined || assigned_to === ''
            ? null
            : Number(assigned_to);

    const query = `
        UPDATE tasks
        SET title = ?, description = ?, priority = ?, assigned_to = ?
        WHERE id = ?
    `;

    db.run(
        query,
        [title, description || '', taskPriority, assignedUserId, taskId],
        function (err) {
            if (err) {
                console.error('خطأ في تعديل المهمة:', err.message);
                return res.status(500).json({ error: 'حدث خطأ أثناء تعديل المهمة' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'المهمة غير موجودة' });
            }

            res.json({ message: 'تم تعديل المهمة بنجاح' });
        }
    );
});

/* =========================================================
   KANBAN STATUS
   ========================================================= */

// تغيير حالة المهمة من لوحة Kanban
app.patch('/api/tasks/:id', (req, res) => {
    const taskId = Number(req.params.id);
    const { status } = req.body;

    const validStatuses = ['جديد', 'قيد العمل', 'منتهي'];

    if (!Number.isInteger(taskId)) {
        return res.status(400).json({ error: 'معرّف المهمة غير صالح' });
    }

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'حالة المهمة غير صالحة' });
    }

    db.get('SELECT id, status FROM tasks WHERE id = ?', [taskId], (err, task) => {
        if (err || !task) {
            return res.status(404).json({ error: 'المهمة غير موجودة' });
        }

        if (task.status === status) {
            return res.json({ message: 'الحالة لم تتغير', id: taskId, status });
        }

        db.run(
            'UPDATE tasks SET status = ? WHERE id = ?',
            [status, taskId],
            function (updateErr) {
                if (updateErr) {
                    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث حالة المهمة' });
                }

                // تسجيل الحدث في النشاطات
                db.run(
                    `INSERT INTO activity_log (task_id, old_status, new_status) VALUES (?, ?, ?)`,
                    [taskId, task.status, status]
                );

                res.json({
                    message: 'تم تحديث حالة المهمة بنجاح',
                    id: taskId,
                    old_status: task.status,
                    status
                });
            }
        );
    });
});

/* =========================================================
   DELETE TASK
   ========================================================= */

app.delete('/api/tasks/:id', (req, res) => {
    const taskId = Number(req.params.id);

    if (!Number.isInteger(taskId)) {
        return res.status(400).json({ error: 'معرّف المهمة غير صالح' });
    }

    db.run(
        'DELETE FROM tasks WHERE id = ? OR parent_id = ?',
        [taskId, taskId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: 'حدث خطأ أثناء حذف المهمة' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'المهمة غير موجودة' });
            }

            res.json({ message: 'تم حذف المهمة بنجاح' });
        }
    );
});

/* =========================================================
   ACTIVITY LOG
   ========================================================= */

app.get('/api/projects/:projectId/activity', (req, res) => {
    const projectId = Number(req.params.projectId);

    if (!Number.isInteger(projectId)) {
        return res.status(400).json({ error: 'معرّف المشروع غير صالح' });
    }

    const query = `
        SELECT
            activity_log.id,
            activity_log.task_id,
            activity_log.old_status,
            activity_log.new_status,
            activity_log.changed_at,
            tasks.title AS task_title
        FROM activity_log
        INNER JOIN tasks ON activity_log.task_id = tasks.id
        WHERE tasks.project_id = ?
        ORDER BY activity_log.id DESC
    `;

    db.all(query, [projectId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'حدث خطأ أثناء جلب سجل النشاط' });
        }
        res.json(rows);
    });
});

/* =========================================================
   START SERVER
   ========================================================= */

app.listen(PORT, () => {
    console.log(`TaskFlow server running on http://localhost:${PORT}`);
});