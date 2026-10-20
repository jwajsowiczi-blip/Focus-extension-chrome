
// grab the rules from the declarativeNetRequest API
document.addEventListener("DOMContentLoaded", async () => {
    chrome.storage.local.set({enabled: true}); // set the default value of enabled to true
    let rules = await chrome.storage.local.get("blockedSites");
    rules = rules.blockedSites || [];
    // show blocked urls:
    listBlockedSites(rules);

    // add a new blocked url
    document.getElementById("add-blocked-site-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const blockedSiteInput = document.getElementById("blocked-site-input").value;

        // check if it is valid url and if it is already blocked, if not add it to the list of blocked urls
        await addUrlToStorage(blockedSiteInput);
        console.log("in storage: ", await chrome.storage.local.get("blockedSites"));
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
            }
        }
        else {
            let { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
            for (const site of blockedSites) {
                await removeRule(site);
            }
        }
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
        let rules = await chrome.storage.local.get("blockedSites");
        rules = rules.blockedSites || [];
        listBlockedSites(rules);
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
function listBlockedSites(rules) {
    document.getElementById("blocked-sites-list").innerHTML = ""; // clear the list
    for (let i = 0; i < rules.length; i++) {
        const listItem = document.createElement("li");
        const removeButton = document.createElement("button");
        removeButton.textContent = "X";
        removeButton.classList.add("remove-button");
        listItem.textContent = rules[i];
        listItem.appendChild(removeButton);
        document.getElementById("blocked-sites-list").appendChild(listItem);
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
async function addUrlToStorage(blockedSiteInput) {
    if (!getDomain(blockedSiteInput)) {
        alert("Please enter a valid URL.");
        return;
    }
    else {
        let { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
        if (blockedSites.includes(getDomain(blockedSiteInput))) {
            alert("This site is already added.");
            return;
        }
        blockedSites.push(getDomain(blockedSiteInput));
        await chrome.storage.local.set({blockedSites: blockedSites});;
        listBlockedSites(blockedSites);
    }

    if (await chrome.storage.local.get("enabled")) {
        await addRule(getDomain(blockedSiteInput));
    }
}

// remove a url from storage and remove the corresponding rule from the declarativeNetRequest API
async function removeUrlFromStorage(url) {
    let { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
    blockedSites = blockedSites.filter(site => site !== url);
    await chrome.storage.local.set({blockedSites: blockedSites});
    if (await chrome.storage.local.get("enabled")) {
        await removeRule(url);
    }
    listBlockedSites(blockedSites);
}
