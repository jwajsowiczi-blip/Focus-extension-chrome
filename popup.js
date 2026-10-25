// popup.js
// Popup: a to-do list and a "Start Blocking" button for strict mode.
// Strict mode blocks the sites of all groups, and only ends when every task is done.
//
// AI assistance (CS50 citation): this file was cleaned up (indentation, comments)
// and bug-fixed with help from Claude (Anthropic). Fixes are marked with "AI-assisted".

// AI-assisted: import from utils.js instead of options.js, because importing
// options.js also ran the options page's code inside the popup
import { addRule, removeRule, isStrictMode } from "./utils.js";


document.addEventListener("DOMContentLoaded", async () => {
    await showTasks();
    await showStrictStatus();

    // add a task
    document.getElementById("task-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const taskInput = document.getElementById("task-input").value.trim();
        if (taskInput === "") {
            alert("Please enter a task.");
            return;
        }
        const { tasks = [] } = await chrome.storage.local.get("tasks");
        tasks.push(taskInput);
        await chrome.storage.local.set({ tasks });
        document.getElementById("task-input").value = "";
        await showTasks();
    });

    // remove a task (= the task is done)
    document.getElementById("task-list").addEventListener("click", async (event) => {
        const button = event.target.closest(".remove-button");
        if (!button) {
            return;
        }

        // AI-assisted: remove the task by its position, stored on the button.
        // Before, the "X" was removed from the <li> text, which broke tasks that
        // contain a capital X (they could never be removed, so strict mode never ended).
        const { tasks = [] } = await chrome.storage.local.get("tasks");
        tasks.splice(Number(button.dataset.index), 1);
        await chrome.storage.local.set({ tasks });
        await showTasks();

        // when all tasks are done, strict mode is over
        if (tasks.length === 0 && await isStrictMode()) {
            await endStrictMode();
        }
    });

    // start strict mode: block the sites of all groups
    document.getElementById("start-blocking").addEventListener("click", async () => {
        // AI-assisted: check the tasks in storage instead of the text in the list
        const { tasks = [] } = await chrome.storage.local.get("tasks");
        if (tasks.length === 0) {
            alert("You have no tasks.");
            return;
        }

        // AI-assisted: strict mode is saved in storage, so the options page can see it
        // and it stays on after the popup closes
        await chrome.storage.local.set({ strictMode: true });

        const { groups = {} } = await chrome.storage.local.get("groups");
        for (const group of Object.keys(groups)) {
            for (const site of groups[group].site || []) {
                await addRule(site); // addRule skips sites that already have a rule
            }
        }
        await showStrictStatus();
    });
});


// end strict mode: unblock the sites of groups that are switched off.
// Sites of groups that are switched on stay blocked.
async function endStrictMode() {
    await chrome.storage.local.set({ strictMode: false });

    const { groups = {} } = await chrome.storage.local.get("groups");
    for (const group of Object.keys(groups)) {
        if (!groups[group].enabled) {
            for (const site of groups[group].site || []) {
                await removeRule(site);
            }
        }
    }
    await showStrictStatus();
}


// shows the tasks with an X button next to each one
async function showTasks() {
    const { tasks = [] } = await chrome.storage.local.get("tasks");
    const taskList = document.getElementById("task-list");
    taskList.innerHTML = "";

    if (tasks.length === 0) {
        const listItem = document.createElement("li");
        listItem.textContent = "you have no tasks left";
        taskList.appendChild(listItem);
    }

    for (let i = 0; i < tasks.length; i++) {
        const listItem = document.createElement("li");
        listItem.textContent = tasks[i];

        const removeButton = document.createElement("button");
        removeButton.textContent = "X";
        removeButton.classList.add("remove-button");
        removeButton.dataset.index = i; // AI-assisted: remember which task this button removes

        listItem.appendChild(removeButton);
        taskList.appendChild(listItem);
    }
}


// AI-assisted: show whether strict mode is on, so the user can see it after reopening the popup
async function showStrictStatus() {
    const status = document.getElementById("strict-status");
    if (await isStrictMode()) {
        status.textContent = "Strict mode is on. Finish your tasks to unblock.";
    }
    else {
        status.textContent = "";
    }
}
