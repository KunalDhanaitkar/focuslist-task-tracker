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
const exportButton = document.querySelector('#export-tasks');
const importButton = document.querySelector('#import-tasks');
const importFile = document.querySelector('#import-file');
const backupStatus = document.querySelector('#backup-status');

const STORAGE_KEY = 'focuslist-tasks';
const PRIORITIES = ['low', 'medium', 'high'];
const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

/**
 * Accept an empty date or a real calendar date in YYYY-MM-DD format.
 */
function isValidDate(value) {
    if (value === '') {
        return true;
    }

    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value.split('-').map(Number);

    if (year < 1000) {
        return false;
    }

    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

/**
 * Validate every task before accepting an entire backup.
 * Missing priority and due date fields support older backups.
 */
function validateTasks(value) {
    if (!Array.isArray(value)) {
        throw new Error('The backup must contain a task array.');
    }

    const ids = new Set();

    return value.map((task, index) => {
        const label = `Task ${index + 1}`;

        if (!task || typeof task !== 'object' || Array.isArray(task)) {
            throw new Error(`${label} is not a valid task.`);
        }

        if (typeof task.id !== 'string' || task.id.trim() === '') {
            throw new Error(`${label} has an invalid ID.`);
        }

        if (ids.has(task.id)) {
            throw new Error(`${label} has a duplicate ID.`);
        }

        ids.add(task.id);

        if (
            typeof task.title !== 'string' ||
            task.title.trim() === '' ||
            task.title.trim().length > 120
        ) {
            throw new Error(`${label} needs a title of 1–120 characters.`);
        }

        if (typeof task.completed !== 'boolean') {
            throw new Error(`${label} has an invalid completion status.`);
        }

        const priority = task.priority === undefined
            ? 'medium'
            : task.priority;

        if (!PRIORITIES.includes(priority)) {
            throw new Error(`${label} has an invalid priority.`);
        }

        const dueDate = task.dueDate === undefined ? '' : task.dueDate;

        if (!isValidDate(dueDate)) {
            throw new Error(`${label} has an invalid due date.`);
        }

        return {
            id: task.id,
            title: task.title.trim(),
            completed: task.completed,
            priority,
            dueDate
        };
    });
}

function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);
        return savedTasks === null
            ? []
            : validateTasks(JSON.parse(savedTasks));
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

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isOverdue(task) {
    return Boolean(
        task.dueDate && !task.completed && task.dueDate < getToday()
    );
}

function getDueDateMessage(task) {
    if (!task.dueDate) {
        return 'No due date';
    }

    const [year, month, day] = task.dueDate.split('-').map(Number);
    const formattedDate = new Date(year, month - 1, day)
        .toLocaleDateString(undefined, {
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
        priority,
        dueDate
    });

    saveTasks();
    renderTasks();
}

function findTask(taskId) {
    return tasks.find((task) => task.id === taskId);
}

function getVisibleTasks() {
    return tasks.filter((task) => {
        const matchesStatus =
            currentFilter === 'all' ||
            (currentFilter === 'active' && !task.completed) ||
            (currentFilter === 'completed' && task.completed);

        const matchesSearch = task.title.toLowerCase()
            .includes(searchTerm.trim().toLowerCase());

        return matchesStatus && matchesSearch;
    });
}

function renderTasks() {
    taskList.replaceChildren();
    const visibleTasks = getVisibleTasks();

    visibleTasks.forEach((task) => {
        const item = document.createElement('li');
        item.className = 'task-item';
        item.dataset.taskId = task.id;
        item.classList.toggle('completed', task.completed);
        item.classList.toggle('overdue', isOverdue(task));

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = task.completed;
        checkbox.setAttribute(
            'aria-label',
            `Mark ${task.title} as ${task.completed ? 'active' : 'completed'}`
        );

        const content = document.createElement('div');
        content.className = 'task-content';

        const title = document.createElement('span');
        title.className = 'task-title';
        title.textContent = task.title;

        const dueMessage = document.createElement('span');
        dueMessage.className = 'due-message';
        dueMessage.textContent = getDueDateMessage(task);
        content.append(title, dueMessage);

        const controls = document.createElement('div');
        controls.className = 'task-controls';

        const priority = document.createElement('select');
        priority.className = `task-priority priority-${task.priority}`;
        priority.setAttribute('aria-label', `Priority for ${task.title}`);

        PRIORITIES.forEach((value) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value.charAt(0).toUpperCase() + value.slice(1);
            priority.append(option);
        });

        priority.value = task.priority;

        const date = document.createElement('input');
        date.type = 'date';
        date.className = 'task-due-date';
        date.value = task.dueDate;
        date.setAttribute('aria-label', `Due date for ${task.title}`);
        controls.append(priority, date);

        const actions = document.createElement('div');
        actions.className = 'task-actions';

        ['edit', 'delete'].forEach((action) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `${action}-button`;
            button.dataset.action = action;
            button.textContent =
                action.charAt(0).toUpperCase() + action.slice(1);
            button.setAttribute('aria-label', `${button.textContent} ${task.title}`);
            actions.append(button);
        });

        item.append(checkbox, content, controls, actions);
        taskList.append(item);
    });

    remainingCount.textContent =
        tasks.filter((task) => !task.completed).length;
    clearCompletedButton.hidden = !tasks.some((task) => task.completed);
    emptyState.hidden = visibleTasks.length > 0;

    if (tasks.length === 0) {
        emptyStateMessage.textContent = 'No tasks yet. Add your first task above.';
    } else if (searchTerm.trim() !== '') {
        emptyStateMessage.textContent = `No tasks match "${searchTerm.trim()}".`;
    } else {
        emptyStateMessage.textContent = `No ${currentFilter} tasks to display.`;
    }
}

taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = taskInput.value.trim();

    if (!title || !isValidDate(dueDateInput.value)) {
        return;
    }

    addTask(title, priorityInput.value, dueDateInput.value);
    taskForm.reset();
    taskInput.focus();
});

taskList.addEventListener('change', (event) => {
    const control = event.target;
    const item = control.closest('.task-item');

    if (!item) {
        return;
    }

    const task = findTask(item.dataset.taskId);

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
        if (!isValidDate(control.value)) {
            control.value = task.dueDate;
            return;
        }

        task.dueDate = control.value;
        saveTasks();
        item.classList.toggle('overdue', isOverdue(task));
        item.querySelector('.due-message').textContent = getDueDateMessage(task);
    }
});

taskList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');

    if (!button) {
        return;
    }

    const taskId = button.closest('.task-item').dataset.taskId;
    const task = findTask(taskId);

    if (!task) {
        return;
    }

    if (button.dataset.action === 'edit') {
        const answer = window.prompt('Edit the task:', task.title);

        if (answer === null || answer.trim() === '') {
            return;
        }

        if (answer.trim().length > 120) {
            window.alert('Task descriptions must be 120 characters or fewer.');
            return;
        }

        task.title = answer.trim();
    } else if (button.dataset.action === 'delete') {
        tasks = tasks.filter((task) => task.id !== taskId);
    } else {
        return;
    }

    saveTasks();
    renderTasks();
});

filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;

        filterButtons.forEach((other) => {
            other.classList.toggle('active', other === button);
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

function setBackupStatus(message, isError = false) {
    backupStatus.textContent = message;
    backupStatus.classList.toggle('error', isError);
}

/**
 * Download all tasks, including tasks hidden by filters or search.
 */
exportButton.addEventListener('click', () => {
    let url;

    try {
        const backup = {
            version: 1,
            exportedAt: new Date().toISOString(),
            tasks
        };

        const blob = new Blob(
            [JSON.stringify(backup, null, 2)],
            { type: 'application/json' }
        );

        url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `focuslist-backup-${getToday()}.json`;
        document.body.append(link);
        link.click();
        link.remove();

        setBackupStatus(`Backup download started for ${tasks.length} tasks.`);
    } catch (error) {
        console.error('Export failed:', error);
        setBackupStatus('Unable to export tasks. Please try again.', true);
    } finally {
        if (url) {
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }
});

importButton.addEventListener('click', () => {
    importFile.click();
});

/**
 * Validate first, confirm replacement, then save before changing the UI.
 */
importFile.addEventListener('change', async () => {
    const file = importFile.files[0];

    if (!file) {
        return;
    }

    importButton.disabled = true;

    try {
        if (file.size > MAX_IMPORT_BYTES) {
            throw new Error('Please choose a JSON file smaller than 5 MB.');
        }

        let data;

        try {
            data = JSON.parse(await file.text());
        } catch {
            throw new Error('This file could not be read as valid JSON.');
        }

        // Accept our versioned backup format or an older plain task array.
        if (!Array.isArray(data)) {
            if (!data || typeof data !== 'object' || data.version !== 1) {
                throw new Error('This is not a supported FocusList backup.');
            }
        }

        const importedTasks = validateTasks(
            Array.isArray(data) ? data : data.tasks
        );

        const confirmed = window.confirm(
            `Replace your ${tasks.length} current tasks with ` +
            `${importedTasks.length} tasks from this backup? ` +
            'Export your current tasks first if you want to keep them.'
        );

        if (!confirmed) {
            setBackupStatus('Import cancelled. Your tasks were kept.');
            return;
        }

        // A failed storage write leaves the current task array unchanged.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(importedTasks));
        tasks = importedTasks;

        searchTerm = '';
        searchInput.value = '';
        currentFilter = 'all';

        filterButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.filter === 'all');
        });

        renderTasks();
        setBackupStatus(`Successfully imported ${tasks.length} tasks.`);
    } catch (error) {
        console.error('Import failed:', error);
        const message = error.name === 'QuotaExceededError'
            ? 'Browser storage is full. Unable to save this backup.'
            : error.message;

        setBackupStatus(`Import failed: ${message}`, true);
    } finally {
        importFile.value = '';
        importButton.disabled = false;
    }
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        renderTasks();
    }
});

let lastToday = getToday();

setInterval(() => {
    const today = getToday();

    if (today !== lastToday) {
        lastToday = today;
        renderTasks();
    }
}, 60000);

renderTasks();