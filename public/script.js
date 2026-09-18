let currentProjectId = null;

const statusMap = {
    todo: "جديد",
    progress: "قيد العمل",
    completed: "منتهي"
};

/* تشغيل الكود بعد تحميل الصفحة */
document.addEventListener("DOMContentLoaded", function () {

    const projectInput = document.getElementById("projectInput");

    if (!projectInput) {
        alert("لم يتم العثور على خانة المشروع");
        return;
    }

    projectInput.addEventListener("change", function () {

        if (this.value === "") {
            currentProjectId = null;
            clearBoard();
            return;
        }

        currentProjectId = Number(this.value);

        loadTasks();
    });

    loadProjects();
    loadUsers();
});


/* تحميل المشاريع */
async function loadProjects() {

    try {

        const response = await fetch("/api/projects");

        if (!response.ok) {
            throw new Error("فشل تحميل المشاريع");
        }

        const projects = await response.json();

        const projectInput =
            document.getElementById("projectInput");

        projectInput.innerHTML =
            '<option value="">اختر المشروع</option>';

        projects.forEach(function (project) {

            const option =
                document.createElement("option");

            option.value = project.id;
            option.textContent = project.name;

            projectInput.appendChild(option);
        });

    } catch (error) {

        console.error(error);

        alert("لم يتم تحميل المشاريع");
    }
}


/* تحميل المستخدمين */
async function loadUsers() {

    try {

        const response = await fetch("/api/users");

        if (!response.ok) {
            throw new Error("فشل تحميل المستخدمين");
        }

        const users = await response.json();

        const assigneeInput =
            document.getElementById("assigneeInput");

        assigneeInput.innerHTML =
            '<option value="">اختر المسؤول</option>';

        users.forEach(function (user) {

            const option =
                document.createElement("option");

            option.value = user.id;
            option.textContent = user.name;

            assigneeInput.appendChild(option);
        });

    } catch (error) {

        console.error(error);

        alert("لم يتم تحميل المستخدمين");
    }
}


/* إضافة مهمة */
async function addTask() {

    const projectInput =
        document.getElementById("projectInput");

    const taskInput =
        document.getElementById("taskInput");

    const priorityInput =
        document.getElementById("priorityInput");

    const assigneeInput =
        document.getElementById("assigneeInput");


    const projectId = projectInput.value;
    const title = taskInput.value.trim();
    const priority = priorityInput.value;
    const assignedTo = assigneeInput.value;


    /* التأكد من المشروع */
    if (!projectId) {

        alert("اختر المشروع أولاً");

        projectInput.focus();

        return;
    }


    /* التأكد من اسم المهمة */
    if (!title) {

        alert("اكتب اسم المهمة");

        taskInput.focus();

        return;
    }


    try {

        const response = await fetch("/api/tasks", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                project_id: Number(projectId),

                title: title,

                description: "",

                priority: priority,

                parent_id: null,

                assigned_to:
                    assignedTo
                        ? Number(assignedTo)
                        : null
            })
        });


        const data = await response.json();


        if (!response.ok) {

            alert(data.error || "حدث خطأ أثناء إضافة المهمة");

            return;
        }


        /* تثبيت المشروع الحالي */
        currentProjectId = Number(projectId);


        /* تنظيف الحقول */
        taskInput.value = "";

        assigneeInput.value = "";


        /* إعادة تحميل المهام */
        await loadTasks();

    } catch (error) {

        console.error(error);

        alert("حدث خطأ في الاتصال بالسيرفر");
    }
}


/* تحميل المهام */
async function loadTasks() {

    if (!currentProjectId) {
        return;
    }

    try {

        const response = await fetch(
            `/api/projects/${currentProjectId}/tasks`
        );

        if (!response.ok) {
            throw new Error("فشل تحميل المهام");
        }

        const tasks = await response.json();

        clearBoard();

        tasks.forEach(function (task) {

            addTaskToBoard(task);
        });

        updateCounts();

        loadActivity();

    } catch (error) {

        console.error(error);

        alert("لم يتم تحميل المهام");
    }
}


/* إضافة المهمة إلى لوحة Kanban */
