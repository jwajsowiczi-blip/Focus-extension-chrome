// utils.js
// Shared helper functions, imported by both popup.js and options.js.
//
// AI assistance (CS50 citation): this file was made with help from Claude (Anthropic).
// getDomain, addRule and removeRule were moved here from options.js, because
// importing options.js into the popup also ran the options page's own code.
// Fixes made by AI are marked with "AI-assisted" below.


// get the domain from a url, e.g. "https://www.youtube.com/watch" -> "youtube.com"
// returns null if the input is not a valid url
export function getDomain(url) {
    if (!url) {
        return null;
    }
    url = url.trim();

    // AI-assisted: also accept a plain domain like "youtube.com" by adding https:// in front
    if (!url.startsWith("http")) {
        url = "https://" + url;
    }

    // AI-assisted: new URL() throws an error on invalid input (e.g. a space),
    // so catch that and return null instead of crashing
    let hostname;
    try {
        hostname = new URL(url).hostname;
    }
    catch {
        return null;
    }

    // AI-assisted: a real domain has at least one dot ("youtube.com", not "hello")
    if (!hostname.includes(".")) {
        return null;
    }

    // AI-assisted: remove "www." so "www.youtube.com" and "youtube.com" are the same site
    return hostname.replace(/^www\./, "");
}


// add a blocking rule for a site to the declarativeNetRequest API
export async function addRule(site) {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();

    // AI-assisted: if this site already has a rule, don't add a second one.
    // Duplicate rules made sites stay blocked after their group was switched off,
    // because removeRule only removes one rule at a time.
    if (rules.some(rule => rule.condition.urlFilter === `||${site}`)) {
        return;
    }

    // generate a new unique ID: the highest existing ID + 1
    const newId = Math.max(0, ...rules.map(rule => rule.id)) + 1;

    await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [
            {
                id: newId,
                priority: 1,
                action: { type: "block" },
                condition: {
                    urlFilter: `||${site}`,
                    resourceTypes: ["main_frame"]
                }
            }
        ]
    });
}


// remove the blocking rule for a site from the declarativeNetRequest API
export async function removeRule(site) {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    const rule = rules.find(rule => rule.condition.urlFilter === `||${site}`);

    // AI-assisted: if there is no rule for this site, stop here.
    // Before, the id was undefined -> NaN, which made Chrome throw an error.
    if (!rule) {
        return;
    }

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [rule.id]
    });
}


// AI-assisted: strict mode is saved in storage, so the popup and the options page
// both know whether it is on (a normal variable only exists on one page)
export async function isStrictMode() {
    const { strictMode = false } = await chrome.storage.local.get("strictMode");
    return strictMode;
}
