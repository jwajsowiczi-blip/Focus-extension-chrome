// keeps track of the current active tab and window
/*
console.log("background started");

// returns domain name of a website.
function getDomain(url) {
    if (!url || !url.startsWith("http"))
    {
        return null;
    }
    return new URL(url).hostname;
}

// you clicked on another tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    console.log("switched tab", getDomain(tab.url))
});

//url changes in a tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url && tab.active) {
        console.log("navigated ->", getDomain(changeInfo.url))
    }
});

// chrome window gained or lost focus
chrome.windows.onFocusChanged.addListener( async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE){
        console.log("chrome lost focus")
    }
    else {
        const tab = await chrome.tabs.query({ active: true, lastFocusedWindow: true});
        console.log("Chrome focused");
        console.log("current active tab ->", tab[0].url);
    }
})