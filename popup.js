// import the functions from options.js
import {getDomain, addRule, removeRule} from "./options.js";

document.addEventListener("DOMContentLoaded", async () => {
    // show blocked urls:
    await listBlockedSites();

    // add event listener to the on/off buttons
    document.getElementById("blocked-sites-list").addEventListener("click", async (event) => {
        if (event.target.tagName === "BUTTON") {
            const group = event.target.id;
            // Handle on/off button click
            const { groups = {} } = await chrome.storage.local.get("groups");
            groups[group]["enabled"] = !groups[group]["enabled"];
            chrome.storage.local.set({groups})

            // update rules depending on the new state of the group
            if (groups[group]["enabled"]) {
                event.target.textContent = "on";
                for (const site of groups[group]["site"]) {
                    await addRule(site);
                }
            } else {
                event.target.textContent = "off";
                for (const site of groups[group]["site"]) {
                    await removeRule(site);
                }
            }
                
        }
    });
});

// show the blocked urls and the groups
async function listBlockedSites() {
    const { groups = {} } = await chrome.storage.local.get("groups");
    document.getElementById("blocked-sites-list").innerHTML = ""; // clear the list
    for (const group of Object.keys(groups)) {
        if (groups[group]["site"] === undefined || groups[group]["site"].length === 0) {
            continue; // skip empty groups
        }
        const header = document.createElement("h3");
        header.textContent = group
        document.getElementById("blocked-sites-list").appendChild(header);
        for (const site of groups[group]["site"]) {
            const listItem = document.createElement("li");
            listItem.textContent = site;
            let list = document.createElement("ul");
            list.id = group;
            list.appendChild(listItem);
            document.getElementById("blocked-sites-list").appendChild(list);
        }
        let button = document.createElement("button");
        if (groups[group]["enabled"]) {
            button.textContent = "on";
        } else {
            button.textContent = "off";
        }
        button.id = group;
        document.getElementById("blocked-sites-list").appendChild(button);
    }
}