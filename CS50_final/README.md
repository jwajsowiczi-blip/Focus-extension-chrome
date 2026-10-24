# Focus

## Video

Video URL: 

## Description

My Chrome extension Focus allows the user to block distracting sites. The user can right-click the extension and click on Options. There the user can add and remove groups and add URLs to the groups. Each group has an on/off button to enable and disable the blocking of its URLs.

If the user left-clicks the extension, the popup opens, which gives the user another way to block URLs. The user can add tasks and remove them with the X button. Once the user has added all the tasks he wants to do, he can click on "Start Blocking". This turns on strict mode, which blocks every URL, whether its group is enabled or disabled. The user can only end strict mode by finishing all the tasks that he wrote for himself. This forces the user to finish what he has to do before he can procrastinate.

It is not foolproof, of course. During strict mode the options page does not allow the user to remove URLs, delete groups or switch groups off, but the user can still disable the whole extension to unblock everything. Tabs that are already open are also not blocked until they are reloaded. The extension is meant to help the user focus by blocking distracting sites, and if the user decides to still use them through roundabout methods, that is the user's own choice.

## Files

**manifest.json** contains the information that Chrome and the user can read. It provides the name, description and version of the extension for the user. The rest of the information is needed for the extension to work properly: the HTML file that shows up when left-clicking the icon, which is popup.html, and the HTML file for the options, which is options.html. It also contains the permissions that I asked from the browser: storage, which is used to store the groups, URLs and tasks, and declarativeNetRequest, which is used to create the rules that block the URLs. The last part points to rules.json.

**rules.json** is an empty list of static rules. It is not actually used, because all blocking rules are dynamic rules that the browser stores by itself. They are added and removed by the JavaScript files.

**utils.js** contains the functions that both pages need: getDomain, which turns the input of the user into a clean domain name (for example "https://www.youtube.com/watch" becomes "youtube.com"), addRule and removeRule, which add or remove a blocking rule for a URL, and isStrictMode, which checks in the storage whether strict mode is on. Both options.js and popup.js import these functions.

**options.js** contains the functions that add or remove URLs from the storage, and it is the file responsible for making and deleting groups and for turning groups on and off. It is also responsible for showing the groups and URLs on the options page, so the user can see which URLs are stored, which groups are active and which groups there are.

**options.html** has the basic structure for the JavaScript file. It contains the forms and the container in which the stored URLs are shown.

**popup.html** and **popup.js** together show which tasks there are and contain the buttons to add tasks and to start blocking. The JavaScript file then checks whether strict mode is over by seeing if all tasks are gone. The popup also shows a message while strict mode is on.

**popup.css** and **options.css** style the two pages. They were fully made by AI. I asked for a minimalistic blue design, because blue is associated with focus, and it is minimalistic because the extension is meant to look simple. A complex design would only be distracting rather than help the user focus.

## Use of AI

I used AI as a tutor throughout the project to explain JavaScript and the Chrome APIs. At the end I also used it to find and fix problems with the storage and the rules in the JavaScript files, to create utils.js and to clean up the code. The idea is that a URL is always stored in the Chrome storage, and only then can a rule be added or removed for it, but sometimes the two did not match, which caused errors. An example was that the code sometimes tried to remove rules that did not exist. The places where AI was used are marked with comments in the code.

## Design choices

The Chrome storage looks like this:

```
{
    groups: {
        groupname: {
            site: [],
            enabled: true/false
        }
    },
    tasks: [],
    strictMode: true/false
}
```

I chose to keep groups and tasks as separate objects, because they are separate things that do different things in the code, so I didn't want to accidentally mix them up. Each group name became its own object with the sites and the on/off setting inside it. If I had stored the setting outside of the group, for example as a separate object called groupname_enabled, this would have made the loops in the code more complicated, because I would have to skip that object every time I looped through all the groups. So in conclusion, this design made the code the easiest and most readable. Strict mode is also saved in the storage, so that both the popup and the options page know whether it is on.

The last thing I will talk about is why I decided to store the URLs separately from the rules. The reason is that this allowed me to have URLs that are not always being blocked. Users do not always want everything blocked, which is also why I decided to put URLs into groups, so that users can decide which URLs they want permanently blocked and which not. This gives the users more freedom and control.
