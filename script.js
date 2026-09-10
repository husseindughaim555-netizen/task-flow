function addTask() {

    const taskInput = document.getElementById("taskInput");
    const priorityInput = document.getElementById("priorityInput");
    const assigneeInput = document.getElementById("assigneeInput");
    const dateInput = document.getElementById("dateInput");

    const taskText = taskInput.value.trim();
    const priority = priorityInput.value;
    const assignee = assigneeInput.value.trim() || "Unassigned";
    const date = dateInput.value || "No date";

    if (taskText === "") {
        alert("Please enter a task name.");
        return;
    }

    const task = document.createElement("div");
    task.className = "task";

    task.innerHTML = `
        <div class="task-info">

            <strong>${taskText}</strong>

            <div class="task-details">

                <span class="priority ${priority}">
                    ${priority.toUpperCase()}
                </span>

                <span class="assignee">
                    👤 ${assignee}
                </span>

                <span class="due-date">
                    📅 ${date}
                </span>

                <select class="task-status" onchange="changeTaskStatus(this)">
                    <option value="todo">To Do</option>
                    <option value="progress">In Progress</option>
                    <option value="completed">Completed</option>
                </select>

            </div>

        </div>

        <button class="delete-task" onclick="deleteTask(this)">
            Delete
        </button>
    `;

    document.querySelector(".todo .tasks").appendChild(task);

    taskInput.value = "";
    assigneeInput.value = "";
    dateInput.value = "";
    priorityInput.value = "low";

    updateCounts();
    updateMemberFilter();
    applyFilters();
    saveTasks();
        addActivity(
        `New task "${taskText}" was added`
    );
}

function deleteTask(button) {

    const task = button.closest(".task");

    if (!task) {
        return;
    }

    const taskName =
        task.querySelector("strong").textContent;

    task.remove();

    updateCounts();
    updateMemberFilter();
    applyFilters();
    saveTasks();

    addActivity(
        `Task "${taskName}" was deleted`
    );
}

function changeTaskStatus(select) {

    const task = select.closest(".task");

    if (!task) {
        return;
    }

    const taskName =
        task.querySelector("strong").textContent;

    let targetColumn;
    let statusText = "";

    if (select.value === "todo") {
        targetColumn = document.querySelector(".todo .tasks");
        statusText = "To Do";
    }

    if (select.value === "progress") {
        targetColumn = document.querySelector(".progress .tasks");
        statusText = "In Progress";
    }

    if (select.value === "completed") {
        targetColumn = document.querySelector(".completed .tasks");
        statusText = "Completed";
    }

    if (targetColumn) {
        targetColumn.appendChild(task);
    }

    updateCounts();
    applyFilters();
    saveTasks();

    addActivity(
        `Task "${taskName}" moved to ${statusText}`
    );
}



function updateCounts() {

    const todoTasks =
        document.querySelectorAll(".todo .task").length;

    const progressTasks =
        document.querySelectorAll(".progress .task").length;

    const completedTasks =
        document.querySelectorAll(".completed .task").length;

    const totalTasks =
        todoTasks + progressTasks + completedTasks;


    document.getElementById("totalTasks").textContent =
        totalTasks;

    document.getElementById("progressTasks").textContent =
        progressTasks;

    document.getElementById("completedTasks").textContent =
        completedTasks;


    let completion = 0;

    if (totalTasks > 0) {
        completion =
            Math.round((completedTasks / totalTasks) * 100);
    }

    document.getElementById("completionPercent").textContent =
        completion + "%";


    document.querySelector(".todo .count").textContent =
        todoTasks;

    document.querySelector(".progress .count").textContent =
        progressTasks;

    document.querySelector(".completed .count").textContent =
        completedTasks;
}


const searchInput =
    document.getElementById("searchInput");

const priorityFilter =
    document.getElementById("priorityFilter");

const memberFilter =
    document.getElementById("memberFilter");


function updateMemberFilter() {

    const members = new Set();

    const tasks =
        document.querySelectorAll(".task");

    tasks.forEach(function(task) {

        const assignee =
            task.querySelector(".assignee");

        if (!assignee) {
            return;
        }

        const name =
            assignee.textContent
                .replace("👤", "")
                .trim();

        if (name && name !== "Unassigned") {
            members.add(name);
        }

    });


    memberFilter.innerHTML =
        '<option value="all">All Members</option>';


    members.forEach(function(member) {

        const option =
            document.createElement("option");

        option.value = member;
        option.textContent = member;

        memberFilter.appendChild(option);

    });
}


function applyFilters() {

    const searchText =
        searchInput.value.toLowerCase().trim();

    const selectedPriority =
        priorityFilter.value;

    const selectedMember =
        memberFilter.value;


    const tasks =
        document.querySelectorAll(".task");


    tasks.forEach(function(task) {

        const taskName =
            task.querySelector("strong")
                .textContent
                .toLowerCase();


        const priorityElement =
            task.querySelector(".priority");

        const priority =
            priorityElement.classList[1];


        const memberElement =
            task.querySelector(".assignee");

        const member =
            memberElement.textContent
                .replace("👤", "")
                .trim();


        const matchesSearch =
            taskName.includes(searchText);

        const matchesPriority =
            selectedPriority === "all" ||
            priority === selectedPriority;

        const matchesMember =
            selectedMember === "all" ||
            member === selectedMember;


        if (
            matchesSearch &&
            matchesPriority &&
            matchesMember
        ) {
            task.style.display = "";
        } else {
            task.style.display = "none";
        }

    });
}


searchInput.addEventListener(
    "input",
    applyFilters
);


priorityFilter.addEventListener(
    "change",
    applyFilters
);


memberFilter.addEventListener(
    "change",
    applyFilters
);


updateCounts();
updateMemberFilter();
function addActivity(message) {

    const activityLog =
        document.getElementById("activityLog");

    const emptyMessage =
        activityLog.querySelector(".activity-empty");

    if (emptyMessage) {
        emptyMessage.remove();
    }

    const activity =
        document.createElement("div");

    activity.className = "activity-item";

    const time =
        new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

    activity.innerHTML = `
        <div class="activity-icon">
            ✓
        </div>

        <div class="activity-text">
            ${message}
        </div>

        <div class="activity-time">
            ${time}
        </div>
    `;

    activityLog.prepend(activity);
}
function saveTasks() {

    const tasks = [];

    document.querySelectorAll(".task").forEach(function(task) {

        tasks.push({
            name: task.querySelector("strong").textContent,

            priority:
                task.querySelector(".priority").classList[1],

            assignee:
                task.querySelector(".assignee")
                    .textContent
                    .replace("👤", "")
                    .trim(),

            date:
                task.querySelector(".due-date")
                    .textContent
                    .replace("📅", "")
                    .trim(),

            status:
                task.querySelector(".task-status").value
        });

    });

    localStorage.setItem(
        "taskflow_tasks",
        JSON.stringify(tasks)
    );
}
function loadTasks() {

    const savedTasks =
        JSON.parse(localStorage.getItem("taskflow_tasks")) || [];

    savedTasks.forEach(function(data) {

        const task = document.createElement("div");
        task.className = "task";

        task.innerHTML = `
            <div class="task-info">

                <strong>${data.name}</strong>

                <div class="task-details">

                    <span class="priority ${data.priority}">
                        ${data.priority.toUpperCase()}
                    </span>

                    <span class="assignee">
                        👤 ${data.assignee}
                    </span>

                    <span class="due-date">
                        📅 ${data.date}
                    </span>

                    <select class="task-status" onchange="changeTaskStatus(this)">
                        <option value="todo">To Do</option>
                        <option value="progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>

                </div>

            </div>

            <button class="delete-task" onclick="deleteTask(this)">
                Delete
            </button>
        `;

        task.querySelector(".task-status").value = data.status;

        document
            .querySelector(`.${data.status} .tasks`)
            .appendChild(task);
    });

    updateCounts();
    updateMemberFilter();
    applyFilters();
}
loadTasks();