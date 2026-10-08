import '../style.css';

const searchInput = document.querySelector('#search-input');
const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-input');
const priorityInput = document.querySelector('#priority-input');
const dueDateInput = document.querySelector('#due-date-input');
const taskList = document.querySelector('#task-list');
const emptyState = document.querySelector('#empty-state');
const emptyStateMessage = emptyState.querySelector('p');
const remainingCount = document.querySelector('#remaining-count');
const filterButtons = document.querySelectorAll('.filter-button');
const clearCompletedButton = document.querySelector('#clear-completed');

const STORAGE_KEY = 'focuslist-tasks';
const PRIORITIES = ['low', 'medium', 'high'];

/**
 * Read saved tasks while supporting tasks created before these features.
 */
function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);

        if (savedTasks === null) {
            return [];
        }

        const parsedTasks = JSON.parse(savedTasks);

        if (!Array.isArray(parsedTasks)) {
            return [];
        }

        return parsedTasks.map((task) => ({
            ...task,
            priority: PRIORITIES.includes(task.priority)
                ? task.priority
                : 'medium',
            dueDate: task.dueDate || ''
        }));
    } catch (error) {
        console.error('Unable to load saved tasks:', error);
        return [];
    }
}

let tasks = loadTasks();
let currentFilter = 'all';
let searchTerm = '';

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * Use the user's local calendar date rather than a UTC date.
 */
function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function isOverdue(task) {
    return Boolean(
        task.dueDate &&
        !task.completed &&
        task.dueDate < getToday()
    );
}

function getDueDateMessage(task) {
    if (!task.dueDate) {
        return 'No due date';
    }

    // Construct a local date to avoid shifting dates across time zones.
    const [year, month, day] = task.dueDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const formattedDate = date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    if (isOverdue(task)) {
        return `Overdue · ${formattedDate}`;
    }

    if (!task.completed && task.dueDate === getToday()) {
        return 'Due today';
    }

    return `Due ${formattedDate}`;
}

function addTask(title, priority, dueDate) {
    tasks.push({
        id: crypto.randomUUID(),
        title,
        completed: false,
        priority: PRIORITIES.includes(priority) ? priority : 'medium',
        dueDate
    });

    saveTasks();
    renderTasks();
}

function findTask(taskId) {
    return tasks.find((task) => task.id === taskId);
}

function getVisibleTasks() {
    let visibleTasks = tasks;

    if (currentFilter === 'active') {
        visibleTasks = visibleTasks.filter((task) => !task.completed);
    } else if (currentFilter === 'completed') {
        visibleTasks = visibleTasks.filter((task) => task.completed);
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (normalizedSearch !== '') {
        visibleTasks = visibleTasks.filter((task) =>
            task.title.toLowerCase().includes(normalizedSearch)
        );
    }

    return visibleTasks;
}

function renderTasks() {
    taskList.replaceChildren();

    const visibleTasks = getVisibleTasks();

    visibleTasks.forEach((task) => {
        const listItem = document.createElement('li');
        listItem.className = 'task-item';
        listItem.dataset.taskId = task.id;
        listItem.classList.toggle('completed', task.completed);
        listItem.classList.toggle('overdue', isOverdue(task));

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = Boolean(task.completed);
        checkbox.setAttribute(
            'aria-label',
            `Mark ${task.title} as ${task.completed ? 'active' : 'completed'}`
        );

        const content = document.createElement('div');
        content.className = 'task-content';

        const taskTitle = document.createElement('span');
        taskTitle.className = 'task-title';
        taskTitle.textContent = task.title;

        const dueMessage = document.createElement('span');
        dueMessage.className = 'due-message';
        dueMessage.textContent = getDueDateMessage(task);

        content.append(taskTitle, dueMessage);

        const controls = document.createElement('div');
        controls.className = 'task-controls';

        const prioritySelect = document.createElement('select');
        prioritySelect.className =
            `task-priority priority-${task.priority}`;
        prioritySelect.setAttribute(
            'aria-label',
            `Priority for ${task.title}`
        );

        PRIORITIES.forEach((priority) => {
            const option = document.createElement('option');
            option.value = priority;
            option.textContent =
                priority.charAt(0).toUpperCase() + priority.slice(1);
            prioritySelect.append(option);
        });

        prioritySelect.value = task.priority;

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'task-due-date';
        dateInput.value = task.dueDate;
        dateInput.setAttribute('aria-label', `Due date for ${task.title}`);

        controls.append(prioritySelect, dateInput);

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
        listItem.append(checkbox, content, controls, actions);
        taskList.append(listItem);
    });

    remainingCount.textContent =
        tasks.filter((task) => !task.completed).length;

    clearCompletedButton.hidden =
        !tasks.some((task) => task.completed);

    emptyState.hidden = visibleTasks.length > 0;

    if (tasks.length === 0) {
        emptyStateMessage.textContent =
            'No tasks yet. Add your first task above.';
    } else if (searchTerm.trim() !== '') {
        emptyStateMessage.textContent =
            `No tasks match "${searchTerm.trim()}".`;
    } else {
        emptyStateMessage.textContent =
            `No ${currentFilter} tasks to display.`;
    }
}

taskForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (title === '') {
        return;
    }

    addTask(title, priorityInput.value, dueDateInput.value);
    taskForm.reset();
    taskInput.focus();
});

/**
 * Update completion, priority, or due date using event delegation.
 */
taskList.addEventListener('change', (event) => {
    const control = event.target;
    const taskItem = control.closest('.task-item');

    if (!taskItem) {
        return;
    }

    const task = findTask(taskItem.dataset.taskId);

    if (!task) {
        return;
    }

    if (control.matches('.task-checkbox')) {
        task.completed = control.checked;
        saveTasks();
        renderTasks();
    } else if (control.matches('.task-priority')) {
        if (!PRIORITIES.includes(control.value)) {
            return;
        }

        task.priority = control.value;
        saveTasks();
        control.className = `task-priority priority-${task.priority}`;
    } else if (control.matches('.task-due-date')) {
        task.dueDate = control.value;
        saveTasks();

        // Update the message without interrupting the date control.
        taskItem.classList.toggle('overdue', isOverdue(task));
        taskItem.querySelector('.due-message').textContent =
            getDueDateMessage(task);
    }
});

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

        if (updatedTitle === null) {
            return;
        }

        const cleanTitle = updatedTitle.trim();

        if (cleanTitle === '') {
            return;
        }

        if (cleanTitle.length > 120) {
            window.alert('Task descriptions must be 120 characters or fewer.');
            return;
        }

        task.title = cleanTitle;
    } else if (actionButton.dataset.action === 'delete') {
        tasks = tasks.filter((currentTask) => currentTask.id !== taskId);
    } else {
        return;
    }

    saveTasks();
    renderTasks();
});

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;

        filterButtons.forEach((currentButton) => {
            currentButton.classList.toggle(
                'active',
                currentButton === button
            );
        });

        renderTasks();
    });
});

clearCompletedButton.addEventListener('click', () => {
    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    renderTasks();
});

searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value;
    renderTasks();
});

// Refresh date indicators when returning to the app.
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        renderTasks();
    }
});

// Keep overdue indicators current if the app stays open overnight.
let lastToday = getToday();

setInterval(() => {
    const today = getToday();

    if (today !== lastToday) {
        lastToday = today;
        renderTasks();
    }
}, 60000);

renderTasks();