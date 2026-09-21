import '../style.css';

const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-input');
const taskList = document.querySelector('#task-list');
const emptyState = document.querySelector('#empty-state');
const remainingCount = document.querySelector('#remaining-count');

let tasks = [];

/**
 * Add a new task to the application.
 */
function addTask(title) {
    const newTask = {
        id: crypto.randomUUID(),
        title: title,
        completed: false
    };

    tasks.push(newTask);
    renderTasks();
}

/**
 * Find a task by its unique ID.
 */
function findTask(taskId) {
    return tasks.find((task) => task.id === taskId);
}

/**
 * Display all tasks currently stored in the array.
 */
function renderTasks() {
    taskList.replaceChildren();

    tasks.forEach((task) => {
        const listItem = document.createElement('li');
        listItem.className = 'task-item';
        listItem.dataset.taskId = task.id;
        listItem.classList.toggle('completed', task.completed);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.setAttribute(
            'aria-label',
            `Mark ${task.title} as ${task.completed ? 'active' : 'completed'}`
        );

        const taskTitle = document.createElement('span');
        taskTitle.className = 'task-title';
        taskTitle.textContent = task.title;

        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'edit-button';
        editButton.dataset.action = 'edit';
        editButton.textContent = 'Edit';
        editButton.setAttribute('aria-label', `Edit ${task.title}`);

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'delete-button';
        deleteButton.dataset.action = 'delete';
        deleteButton.textContent = 'Delete';
        deleteButton.setAttribute('aria-label', `Delete ${task.title}`);

        actions.append(editButton, deleteButton);
        listItem.append(checkbox, taskTitle, actions);
        taskList.append(listItem);
    });

    const activeTasks = tasks.filter((task) => !task.completed);

    emptyState.hidden = tasks.length > 0;
    remainingCount.textContent = activeTasks.length;
}

/**
 * Handle the add-task form.
 */
taskForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (title === '') {
        return;
    }

    addTask(title);

    taskForm.reset();
    taskInput.focus();
});

/**
 * Handle changes to task checkboxes.
 */
taskList.addEventListener('change', (event) => {
    if (!event.target.matches('.task-checkbox')) {
        return;
    }

    const taskItem = event.target.closest('.task-item');
    const task = findTask(taskItem.dataset.taskId);

    if (task) {
        task.completed = event.target.checked;
        renderTasks();
    }
});

/**
 * Handle Edit and Delete buttons using event delegation.
 */
taskList.addEventListener('click', (event) => {
    const actionButton = event.target.closest('button[data-action]');

    if (!actionButton) {
        return;
    }

    const taskItem = actionButton.closest('.task-item');
    const taskId = taskItem.dataset.taskId;
    const task = findTask(taskId);

    if (!task) {
        return;
    }

    if (actionButton.dataset.action === 'edit') {
        const updatedTitle = window.prompt('Edit the task:', task.title);

        // Cancel leaves the task unchanged.
        if (updatedTitle === null) {
            return;
        }

        const cleanTitle = updatedTitle.trim();

        if (cleanTitle !== '') {
            task.title = cleanTitle;
            renderTasks();
        }
    }

    if (actionButton.dataset.action === 'delete') {
        tasks = tasks.filter((currentTask) => currentTask.id !== taskId);
        renderTasks();
    }
});

renderTasks();