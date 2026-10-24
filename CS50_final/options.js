// options.js
// Options page: add and remove blocked sites, sort them into groups,
// and turn blocking on or off per group.
//
// AI assistance (CS50 citation): this file was cleaned up (indentation, comments)
// and bug-fixed with help from Claude (Anthropic). Fixes are marked with "AI-assisted".

// AI-assisted: shared functions now come from utils.js instead of being defined here
import { getDomain, addRule, removeRule, isStrictMode } from "./utils.js";


document.addEventListener("DOMContentLoaded", async () => {
    // show the groups and their blocked sites
    await showOptionsPage();

    // add a new blocked site to the selected group
    document.getElementById("add-blocked-site-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const blockedSiteInput = document.getElementById("blocked-site-input").value;
        const group = document.getElementById("group").value;
        await addUrlToStorage(blockedSiteInput, group);
        await showOptionsPage();
    });

    // add a new group
    document.getElementById("add-group-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const groupName = document.getElementById("group-name-input").value.trim();

        // AI-assisted: don't allow an empty group name
        if (groupName === "") {
            alert("Please enter a group name.");
            return;
        }

        const { groups = {} } = await chrome.storage.local.get("groups");
        if (groups[groupName]) {
            alert("This group already exists.");
            return;
        }
        groups[groupName] = { site: [], enabled: false };
        await chrome.storage.local.set({ groups });
        document.getElementById("group-name-input").value = "";
        await showOptionsPage();
    });

    // delete a group and unblock its sites
    document.getElementById("delete-group-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const groupName = document.getElementById("group-name-input-delete").value;

        // AI-assisted: deleting a group would unblock its sites, so not during strict mode
        if (await isStrictMode()) {
            alert("Strict mode is on. Finish your tasks first.");
            return;
        }

        const { groups = {} } = await chrome.storage.local.get("groups");
        if (groups[groupName] === undefined) {
            alert("This group does not exist.");
            return;
        }

        // removeRule does nothing for sites that have no rule, so no check is needed here
        for (const site of groups[groupName].site || []) {
            await removeRule(site);
        }
        delete groups[groupName];
        await chrome.storage.local.set({ groups });
        await showOptionsPage();
    });

    // remove a blocked site (the X button)
    document.getElementById("blocked-sites-list").addEventListener("click", async (event) => {
        const button = event.target.closest(".remove-button");
        if (!button) {
            return;
        }

        // AI-assisted: removing a site would unblock it, so not during strict mode
        if (await isStrictMode()) {
            alert("Strict mode is on. Finish your tasks first.");
            return;
        }

        // AI-assisted: the site and group are stored on the button itself (data- attributes),
        // instead of reading the <li> text and removing the "X"
        await removeUrlFromStorage(button.dataset.site, button.dataset.group);
        await showOptionsPage();
    });

    // turn a group on or off
    document.getElementById("blocked-sites-list").addEventListener("click", async (event) => {
        // AI-assisted: class renamed from "on/off" to "on-off" ("/" breaks CSS selectors)
        const button = event.target.closest(".on-off");
        if (!button) {
            return;
        }

        const group = button.dataset.group;
        const { groups = {} } = await chrome.storage.local.get("groups");

        // AI-assisted: switching a group off would unblock its sites, so not during strict mode
        if (groups[group].enabled && await isStrictMode()) {
            alert("Strict mode is on. Finish your tasks first.");
            return;
        }

        groups[group].enabled = !groups[group].enabled;
        await chrome.storage.local.set({ groups }); // AI-assisted: added the missing await

        // update the rules depending on the new state of the group
        if (groups[group].enabled) {
            button.textContent = "on";
            for (const site of groups[group].site) {
                await addRule(site);
            }
        }
        else {
            button.textContent = "off";
            for (const site of groups[group].site) {
                await removeRule(site);
            }
        }
    });
});


// shows all groups with their sites and on/off button, and fills both group dropdowns
async function showOptionsPage() {
    const { groups = {} } = await chrome.storage.local.get("groups");
    const blockedSitesList = document.getElementById("blocked-sites-list");
    const groupSelect = document.getElementById("group");
    const deleteSelect = document.getElementById("group-name-input-delete");

    // clear everything before drawing it again
    blockedSitesList.innerHTML = "";
    groupSelect.innerHTML = "";
    deleteSelect.innerHTML = "";

    for (const group of Object.keys(groups)) {
        // add the group to both dropdowns
        const option = document.createElement("option");
        option.value = group;
        option.textContent = group;
        groupSelect.appendChild(option);
        deleteSelect.appendChild(option.cloneNode(true));

        // AI-assisted: empty groups are shown too (before they were skipped,
        // so a new group seemed to disappear)
        const header = document.createElement("h3");
        header.textContent = group;
        blockedSitesList.appendChild(header);

        // AI-assisted: one <ul> per group instead of one <ul> per site,
        // and no id on it (several elements had the same id before)
        const list = document.createElement("ul");
        for (const site of groups[group].site || []) {
            const listItem = document.createElement("li");
            listItem.textContent = site;

            const removeButton = document.createElement("button");
            removeButton.textContent = "X";
            removeButton.classList.add("remove-button");
            // AI-assisted: store which site and group this button belongs to
            removeButton.dataset.site = site;
            removeButton.dataset.group = group;

            listItem.appendChild(removeButton);
            list.appendChild(listItem);
        }
        blockedSitesList.appendChild(list);

        // on/off button for this group
        const toggleButton = document.createElement("button");
        toggleButton.classList.add("on-off");
        toggleButton.dataset.group = group; // AI-assisted: data attribute instead of id
        toggleButton.textContent = groups[group].enabled ? "on" : "off";
        blockedSitesList.appendChild(toggleButton);
    }
}


// check if the input is a valid url and not blocked yet, then add it to the group
async function addUrlToStorage(blockedSiteInput, group) {
    const domain = getDomain(blockedSiteInput);
    if (!domain) {
        alert("Please enter a valid URL.");
        return;
    }

    // AI-assisted: a site must be added to a group (before, it was saved under a group named "")
    if (!group) {
        alert("Please create a group first.");
        return;
    }

    const { groups = {} } = await chrome.storage.local.get("groups");

    // a site can only be in one group
    for (const name of Object.keys(groups)) {
        if ((groups[name].site || []).includes(domain)) {
            alert("This site is already added.");
            return;
        }
    }

    groups[group] = groups[group] || {};
    groups[group].site = groups[group].site || [];
    groups[group].site.push(domain);
    groups[group].enabled = groups[group].enabled || false;
    await chrome.storage.local.set({ groups });

    // AI-assisted: check this group's own on/off setting (the old global "enabled" key
    // no longer exists, so new sites were never blocked). During strict mode the
    // site is blocked as well, just like the sites blocked by "Start Blocking".
    if (groups[group].enabled || await isStrictMode()) {
        await addRule(domain);
    }
}


// remove a site from its group and remove its blocking rule
async function removeUrlFromStorage(site, group) {
    const { groups = {} } = await chrome.storage.local.get("groups");
    groups[group].site = groups[group].site.filter(s => s !== site);
    await chrome.storage.local.set({ groups });

    // AI-assisted: always remove the rule. Before, this checked the old global "enabled"
    // key, so the rule stayed and the site was blocked forever.
    // removeRule does nothing if there is no rule.
    await removeRule(site);
}
