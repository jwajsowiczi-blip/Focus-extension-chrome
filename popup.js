// import the functions from options.js
import {getDomain, addRule, removeRule} from "./options.js";

// global variables
let strictMode = false;

document.addEventListener("DOMContentLoaded", async () => {
    await showTasks();
    // add tasks
    document.getElementById("task-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const taskInput = document.getElementById("task-input").value;
        if (taskInput.trim() === "") {
            alert("Please enter a task.");
            return;
        }
        let { tasks = [] } = await chrome.storage.local.get("tasks");
        tasks.push(taskInput);
        await chrome.storage.local.set({tasks: tasks});
        document.getElementById("task-input").value = "";
        await showTasks();
    });

    //remove tasks
    document.getElementById("task-list").addEventListener("click", async (event) => {
        if (event.target.tagName === "BUTTON") {
            const task = event.target.closest("li").textContent.replace("X", "").trim();
            let { tasks = [] } = await chrome.storage.local.get("tasks");
            tasks = tasks.filter(t => t !== task);
            await chrome.storage.local.set({tasks: tasks});
            await showTasks();
        }
        // check if all tasks are completed. then can the user unblock.
        let { tasks = [] } = await chrome.storage.local.get("tasks");
        if (tasks.length === 0) {
             let rules = await chrome.declarativeNetRequest.getDynamicRules();
            strictMode = false;
            console.log("strictmode: ", strictMode)
            rules = rules.map(rule => rule.condition.urlFilter);
            let { groups = {} } = await chrome.storage.local.get("groups");
            for (const group of Object.keys(groups)) {
                for (const site of groups[group]["site"]) {
                    if (rules.includes(`||${site}`)) {
                        if (!groups[group]["enabled"]) {
                            await removeRule(site);
                        }
                    }
                }
            }
        }
    });

    // start blocking
    document.getElementById("start-blocking").addEventListener("click", async () => {
        const {groups = {}} = await chrome.storage.local.get("groups");
        let rules = await chrome.declarativeNetRequest.getDynamicRules();
        if (document.getElementById("task-list").textContent === "you have no tasks left") {
            alert("you have no tasks")
            return;
        }
        strictMode = true;
        console.log("strictmode: ", strictMode)
        rules = rules.map(rule => rule.condition.urlFilter);
        for (const group of Object.keys(groups)) {
            for (const site of groups[group]["site"]) {
                if (!rules.includes(`||${site}`)) {
                    await addRule(site);
                }
            }
        }
    });

    // strict block is over when finishing all tasks
});

async function showTasks() {
    const { tasks = [] } = await chrome.storage.local.get("tasks");
    const taskList = document.getElementById("task-list");
    taskList.innerHTML = "";
    if (tasks.length === 0) {
        const listItem = document.createElement("li");
        listItem.textContent = "you have no tasks left";
        taskList.appendChild(listItem);
    }
    for (const task of tasks) {
        const listItem = document.createElement("li");
        listItem.textContent = task;
        const removeButton = document.createElement("button");
        removeButton.textContent = "X";
        listItem.appendChild(removeButton);
        taskList.appendChild(listItem);
    }
}