
chrome.storage.local.set({enabled: true}); // set the default value of enabled to true

// grab the rules from the declarativeNetRequest API
document.addEventListener("DOMContentLoaded", async () => {
    // show blocked urls:
    listBlockedSites();

    // add a new blocked url
    document.getElementById("add-blocked-site-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const blockedSiteInput = document.getElementById("blocked-site-input").value;
        const group = document.getElementById("group").value;
        // check if it is valid url and if it is already blocked, if not add it to the list of blocked urls
        await addUrlToStorage(blockedSiteInput, group);
        console.log("in rules: ", await chrome.declarativeNetRequest.getDynamicRules());
        console.log("in storage: ", await chrome.storage.local.get());
        listBlockedSites()
    });

    // toggle the blocking on/off
    document.getElementById("on/off").addEventListener("click", async () => {
        let { enabled } = await chrome.storage.local.get("enabled");
        enabled = !enabled;
        await chrome.storage.local.set({enabled: enabled});
        if (enabled) {
            let { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
            for (const site of blockedSites) {
                await addRule(site);
                console.log("Added rule for:", site);
            }
        }
        else {
            let { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
            for (const site of blockedSites) {
                await removeRule(site);
                console.log("Removed rule for:", site);
            }
        }
        listBlockedSites()
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
        listBlockedSites();
    });
});



// get the domain from a url
function getDomain(url) {
    if (!url || !url.startsWith("http"))
    {
        return null;
    }
    return new URL(url).hostname;
}
// shows blocked urls in the popup
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
            const removeButton = document.createElement("button");
            removeButton.textContent = "X";
            removeButton.classList.add("remove-button");
            listItem.textContent = site;
            listItem.appendChild(removeButton);
            list = document.createElement("ul");
            list.id = group;
            list.appendChild(listItem);
            document.getElementById("blocked-sites-list").appendChild(list);
        }
    }
}

// add a rule to the declarativeNetRequest API
async function addRule(url) {
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
async function removeRule(url) {
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
        groups[group]["enabled"] = groups[group]["enabled"] || true;
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
