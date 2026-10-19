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
        const urlFilter = rules[i].condition.urlFilter.replace("||", "").replace(/\/$/, ""); // remove leading "||" and trailing "/"
        const listItem = document.createElement("li");
        const removeButton = document.createElement("button");
        removeButton.textContent = "X";
        removeButton.classList.add("remove-button");
        removeButton.id = rules[i].id;
        listItem.textContent = urlFilter;
        listItem.appendChild(removeButton);
        document.getElementById("blocked-sites-list").appendChild(listItem);
    }
}

// grab the rules from the declarativeNetRequest API
document.addEventListener("DOMContentLoaded", async () => {
    let rules = await chrome.declarativeNetRequest.getDynamicRules();
    // show blocked urls:
    listBlockedSites(rules);

    // add a new blocked url
    document.getElementById("add-blocked-site-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const blockedSiteInput = document.getElementById("blocked-site-input").value;

        // check if it is valid url and if it is already blocked, if not add it to the list of blocked urls
        if (!getDomain(blockedSiteInput)) {
            alert("Please enter a valid URL.");
            return;
        }
        else {
            if (rules.some(rule => rule.condition.urlFilter.replace(/^www\./, "") === `||${getDomain(blockedSiteInput)}`)) {
                alert("This site is already blocked.");
                return;
            }
            const newId = Math.max(0, ...rules.map(rule => rule.id)) + 1; // generate a new unique ID by unpacking the list and finding the highest number and adding 1 to it.
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: [
                    {
                        "id": newId, 
                        "priority": 1,
                        "action": {"type": "block"},
                        "condition": {
                            "urlFilter": `||${getDomain(blockedSiteInput)}`, resourceTypes: ["main_frame"]
                        }
                    }
                ]
            });
            rules = await chrome.declarativeNetRequest.getDynamicRules();
            listBlockedSites(rules);
        }
    });

    // remove a blocked url
    document.getElementById("blocked-sites-list").addEventListener("click", async (event) => {
        if (event.target.closest(".remove-button")) {
            const ruleId = document.getElementById(event.target.id).id;
            console.log("Removing rule with ID:", ruleId);
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: [parseInt(ruleId)]
            });
        }
        else {
            return;
        }
        rules = await chrome.declarativeNetRequest.getDynamicRules();
        listBlockedSites(rules);
    });
});