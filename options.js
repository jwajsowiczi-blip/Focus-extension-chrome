
// grab the rules from the declarativeNetRequest API
document.addEventListener("DOMContentLoaded", async () => {
    // show blocked urls:
    await showOptionsPage();

    // add a new blocked url
    document.getElementById("add-blocked-site-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const blockedSiteInput = document.getElementById("blocked-site-input").value;
        const group = document.getElementById("group").value;
        // check if it is valid url and if it is already blocked, if not add it to the list of blocked urls
        await addUrlToStorage(blockedSiteInput, group);
        console.log("in rules: ", await chrome.declarativeNetRequest.getDynamicRules());
        console.log("in storage: ", await chrome.storage.local.get());
        await showOptionsPage();
    });

    // add a new group
    document.getElementById("add-group-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const groupNameInput = document.getElementById("group-name-input").value;
        let { groups = {} } = await chrome.storage.local.get("groups");
        if (groups[groupNameInput]) {
            alert("This group already exists.");
            return;
        }
        groups[groupNameInput] = { site: [], enabled: false };
        await chrome.storage.local.set({groups: groups});
        await showOptionsPage();
    });

    //delete a group
    document.getElementById("delete-group-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const groupNameInput = document.getElementById("group-name-input-delete").value;
        let { groups = {} } = await chrome.storage.local.get("groups");
        if (groups[groupNameInput] === undefined) {
            alert("This group does not exist.");
            return;
        }
        for (const site of groups[groupNameInput]["site"] || []) {
            let rules = await chrome.declarativeNetRequest.getDynamicRules();
            rules = rules.map(rule => rule.condition.urlFilter);
            if (rules.includes(`||${site}`)){
                await removeRule(site);
                console.log("Removed rule for:", site);
            }
        }
        delete groups[groupNameInput];
        await chrome.storage.local.set({groups: groups});
        await showOptionsPage();
    });

    // remove a blocked url
    document.getElementById("blocked-sites-list").addEventListener("click", async (event) => {
        if (event.target.closest(".remove-button")) {
            const url = event.target.closest("li").textContent.replace("X", "").trim();
            await removeUrlFromStorage(url);
        }
        else {
            return;
        }
        await showOptionsPage();
    });

    // add event listener to the on/off buttons
    document.getElementById("blocked-sites-list").addEventListener("click", async (event) => {
        if (event.target.classList.contains("on/off")) {
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



// get the domain from a url
export function getDomain(url) {
    if (!url || !url.startsWith("http"))
    {
        return null;
    }
    return new URL(url).hostname;
}

// shows the options page
async function showOptionsPage() {
    const { groups = {} } = await chrome.storage.local.get("groups");
    document.getElementById("blocked-sites-list").innerHTML = ""; // clear the list
    document.getElementById("group").innerHTML = ""; // clear the group select
    document.getElementById("group-name-input-delete").innerHTML = ""; // clear the group select in delete form
    for (const group of Object.keys(groups)) {
        const option = document.createElement("option");
        option.value = group;
        option.textContent = group;
        document.getElementById("group").appendChild(option);
        document.getElementById("group-name-input-delete").appendChild(option.cloneNode(true));
        if (groups[group]["site"] === undefined || groups[group]["site"].length === 0) {
            continue; // skip empty groups
        }
        const header = document.createElement("h3");
        header.textContent = group
        document.getElementById("blocked-sites-list").appendChild(header);
        for (const site of groups[group]["site"]) {
            const listItem = document.createElement("li");
            const removeButton = document.createElement("button");
            removeButton.textContent = "X";
            removeButton.classList.add("remove-button");
            listItem.textContent = site;
            listItem.appendChild(removeButton);
            let list = document.createElement("ul");
            list.id = group;
            list.appendChild(listItem);
            document.getElementById("blocked-sites-list").appendChild(list);
        }
        let button = document.createElement("button");
        button.classList.add("on/off")
        if (groups[group]["enabled"]) {
            button.textContent = "on";
        } else {
            button.textContent = "off";
        }
        button.id = group;
        document.getElementById("blocked-sites-list").appendChild(button);
        }
}

// add a rule to the declarativeNetRequest API
export async function addRule(url) {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const newId = Math.max(0, ...rules.map(rule => rule.id)) + 1; // generate a new unique ID by unpacking the list and finding the highest number and adding 1 to it.
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: [
                    {
                        "id": newId, 
                        "priority": 1,
                        "action": {"type": "block"},
                        "condition": {
                            "urlFilter": `||${url}`, resourceTypes: ["main_frame"]
                        }
                    }
                ]
            });
    console.log("Added rule for:", url);
}

// remove a rule from the declarativeNetRequest API
export async function removeRule(url) {
    console.log("looking for:", `||${url}`);
    console.log("existing rules:", await chrome.declarativeNetRequest.getDynamicRules());
    const ruleId = (await chrome.declarativeNetRequest.getDynamicRules()).find(rule => rule.condition.urlFilter.replace(/^www\./, "") === `||${url}`)?.id;
    console.log("Removing rule with ID:", ruleId);
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [parseInt(ruleId)]
        });
}

// check if it is valid url and if it is already blocked, if not add it to the list of blocked urls
async function addUrlToStorage(blockedSiteInput, group) {
    if (!getDomain(blockedSiteInput)) {
        alert("Please enter a valid URL.");
        return;
    }
    else {
        let { groups = {} } = await chrome.storage.local.get("groups");
        for (const group of Object.keys(groups)) {
           for (const site of groups[group]["site"] || []) {
                if (site === getDomain(blockedSiteInput)) {
                    alert("This site is already added.");
                    return;
                }
            }
        }
        groups[group] = groups[group] || {};
        groups[group]["site"] = groups[group]["site"] || [];
        groups[group]["site"].push(getDomain(blockedSiteInput));
        groups[group]["enabled"] = groups[group]["enabled"] || false;
        await chrome.storage.local.set({groups: groups});
        console.log("in storage group ", group, ": ", await chrome.storage.local.get(group));
    }

    if ((await chrome.storage.local.get("enabled")).enabled) {
        await addRule(getDomain(blockedSiteInput));
    }
}

// remove a url from storage and remove the corresponding rule from the declarativeNetRequest API
async function removeUrlFromStorage(url) {
    let { groups = {} } = await chrome.storage.local.get("groups");
    for (const group of Object.keys(groups)) {
        groups[group]["site"] = groups[group]["site"]?.filter(site => site !== url) || [];
        await chrome.storage.local.set({groups: groups});
        console.log("in storage ", await chrome.storage.local.get(groups));
    }
    if ((await chrome.storage.local.get("enabled")).enabled) {
        console.log("Removing rule for:", url);
        await removeRule(url);
    }
}
