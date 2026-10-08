import '../style.css';

const searchInput = document.querySelector('#search-input');
const taskForm = document.querySelector('#task-form');
const taskInput = document.querySelector('#task-input');
const priorityInput = document.querySelector('#priority-input');
const PRIORITIES = ['low', 'medium', 'high'];
const taskList = document.querySelector('#task-list');
const emptyState = document.querySelector('#empty-state');
const remainingCount = document.querySelector('#remaining-count');
const filterButtons = document.querySelectorAll('.filter-button');
const clearCompletedButton = document.querySelector('#clear-completed');
const emptyStateMessage = emptyState.querySelector('p');

const STORAGE_KEY = 'focuslist-tasks';

/**
 * Load previously saved tasks from the browser.
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

        // Tasks saved before priority support default to Medium.
        return parsedTasks.map((task) => ({
            ...task,
            priority: PRIORITIES.includes(task.priority)
                ? task.priority
                : 'medium'
        }));

    } catch (error) {
        console.error('Unable to load saved tasks:', error);
        return [];
    }
}

/**
 * Save the current task array in the browser.
 */
function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

let tasks = loadTasks();
let currentFilter = 'all';
let searchTerm = '';

/**
 * Add a new task to the application.
 */
function addTask(title, priority) {
    const newTask = {
        id: crypto.randomUUID(),
        title: title,
        completed: false,
        priority: PRIORITIES.includes(priority) ? priority : 'medium'
    };

    tasks.push(newTask);
    saveTasks();
    renderTasks();
}

/**
 * Find a task by its unique ID.
 */
function findTask(taskId) {
    return tasks.find((task) => task.id === taskId);
}

/**
 * Return tasks that match both the selected status and search term.
 */
function getVisibleTasks() {
    let visibleTasks = tasks;

    if (currentFilter === 'active') {
        visibleTasks = visibleTasks.filter((task) => !task.completed);
    }

    if (currentFilter === 'completed') {
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

/**
 * Display all tasks currently stored in the array.
 */
function renderTasks() {
    taskList.replaceChildren();

    const visibleTasks = getVisibleTasks();

    visibleTasks.forEach((task) => {
        const listItem = document.createElement('li');
        listItem.className = 'task-item';
        listItem.dataset.taskId = task.id;
        listItem.classList.toggle('completed', task.completed);

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-checkbox';
        checkbox.checked = Boolean(task.completed);
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
        
        const prioritySelect = document.createElement('select');
        prioritySelect.className = `task-priority priority-${task.priority}`;
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

        actions.append(editButton, deleteButton);
        listItem.append(checkbox, taskTitle, prioritySelect, actions);
        taskList.append(listItem);
    });

    const activeTasks = tasks.filter((task) => !task.completed);
    const completedTasks = tasks.filter((task) => task.completed);

    remainingCount.textContent = activeTasks.length;
    clearCompletedButton.hidden = completedTasks.length === 0;
    emptyState.hidden = visibleTasks.length > 0;

    if (tasks.length === 0) {
        emptyStateMessage.textContent = 'No tasks yet. Add your first task above.';
    } else if (searchTerm.trim() !== '') {
        emptyStateMessage.textContent =
            `No tasks match "${searchTerm.trim()}".`;
    } else {
        emptyStateMessage.textContent =
            `No ${currentFilter} tasks to display.`;
    }
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

    addTask(title, priorityInput.value);

    taskForm.reset();
    taskInput.focus();
});

/**
 * Handle changes to task checkboxes.
 */
/**
 * Save changes to task completion or priority.
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
    } else if (control.matches('.task-priority')) {
        if (!PRIORITIES.includes(control.value)) {
            return;
        }

        task.priority = control.value;
    } else {
        return;
    }

    saveTasks();

    // Keep focus on the priority dropdown when changing its value.
    if (control.matches('.task-priority')) {
        control.className = `task-priority priority-${task.priority}`;
    } else {
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
            saveTasks();
            renderTasks();
        }
    }

    if (actionButton.dataset.action === 'delete') {
        tasks = tasks.filter((currentTask) => currentTask.id !== taskId);  
        saveTasks();
        renderTasks();
    }
});

/**
 * Change the visible task filter.
 */
filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;

        filterButtons.forEach((currentButton) => {
            currentButton.classList.remove('active');
        });

        button.classList.add('active');
        renderTasks();
    });
});

/**
 * Remove every completed task.
 */
clearCompletedButton.addEventListener('click', () => {
    tasks = tasks.filter((task) => !task.completed);
    saveTasks();
    renderTasks();
});

/**
 * Filter tasks while the user types in the search field.
 */
searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value;
    renderTasks();
});

renderTasks();