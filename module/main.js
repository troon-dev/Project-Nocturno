const { process, app, fs, shell, deepLink } = window.__TAURI__;
const { message } = window.__TAURI_PLUGIN_DIALOG__;
const globalEvent = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;
const { check } = window.__TAURI__.updater;
const LogicalSize = __TAURI__.window.LogicalSize;

import { addClickListener, BtnFlags, BtnStates, DefaultConfig, UserStatus } from '/module/constants.js';
import { closeSettings, openSettings } from '/js/settings.js';
import { startVersionImport, saveVersionEditor, goVersionManager, setSelectedVersion, startGame, trashVersion, startGameServer } from './version.js';

const appdata = await invoke("get_environment_variable", { name: "APPDATA" });
export let user = null;
export let nocturnoDirectory = `${appdata}\\.nocturno`;
export let config = DefaultConfig;
export let userStatus = UserStatus.OFFLINE;
export let isOfflineMode = false;
export const saveConfig = async () => { await fs.writeTextFile(`${nocturnoDirectory}\\config.json`, JSON.stringify(config, null, 4)); }

const blogsContainer = document.querySelector('.blogs-container');
try {
    const blogs = await invoke("secure_fetch", { method: "GET", path: "/api/blogs", body: "" });
    const blogData = JSON.parse(blogs);

    if (!blogData || blogData.errorMessage || blogData.length === 0) throw new Error("No blogs found.");

    console.log("Blogs: ", blogData);

    blogData.forEach((blog) => {
        const element = 
        `<div class="blog-post" style="background-image: url(${blog.banner_url})" data-href="${blog.url}">
                <h3>${blog.title}</h3>
                <span>Read More</span>
        </div>`;
        blogsContainer.innerHTML += element;
    });
} catch (e) {
    console.error("Failed to fetch blogs: ", e);
    blogsContainer.remove();
}

/* Play Button */
addClickListener('.play-btn', async () => {
    try {
        startGame();
    } catch (e) {
        console.error("Failed to start game: ", e);
        setLaunchBtnState(BtnStates.READY);
    }
});

/* Generic Overlay */
addClickListener('[data-open-overlay]', openOverlay);
addClickListener('[data-close-overlay]', closeOverlay);

/* Settings Button, Top Bar */
addClickListener('.download-btn', async () => {
    await message(
        "Downloading versions is currently disabled.\n\nNocturno does not intend to distribute Fortnite versions, you will have to source them yourself.",
        { title: 'Nocturno', kind: 'error' }
    );
});
addClickListener(".signout-btn", async () => {
    await invoke("delete_auth");
    window.location.href = "/login.html";
})
addClickListener('.settings-btn', openSettings);
addClickListener('.close-settings', closeSettings);
addClickListener('.open-dev-tools', async () => { globalEvent.emit('open_dev_tools') });
addClickListener('.hide-launcher', async (event, el) => {
    config.settings.hideLauncher = el.checked;
    console.log("Hide Launcher: ", config.settings.hideLauncher);
    await saveConfig();
});

// Settings
addClickListener(".open-noc-dir", () => { shell.open(nocturnoDirectory) });
addClickListener(".start-gs-btn", startGameServer);

// Add Version Button
addClickListener(".version-editor .save-version-btn", saveVersionEditor);
addClickListener(".version-editor .trash-version-btn", trashVersion);
addClickListener(".version-manager .add-btn", startVersionImport);

// on element click, if the element has a data-href attribute, open the link in the browser
document.addEventListener('click', (e) => {
    const target = e.target;
    if (target.dataset.href) {
        console.log("Opening: ", target.dataset.href);
        shell.open(target.dataset.href);
    }
});


document.querySelector('.hide-launcher').checked = config.settings.hideLauncher;
document.getElementById("lang-select").onchange = async (e) => {
    config.language = e.target.value;
    await saveConfig();
    location.reload()
}



// KEEP FUNCTIONS UNDER HERE.
function updateUser(userData) {
    user = userData;

    document.getElementById('user-name').textContent = user?.username || "Offline";

    const branchSelector = document.getElementById('edit-ver-branch');
    user.branches.forEach((branch) => {
        const option = document.createElement('option');
        option.value = branch;
        option.textContent = branch;
        branchSelector.appendChild(option);
    });

    if (user.admin) {
        document.querySelector('.admin-menu').style = '';
    }

    setStatus(UserStatus.ONLINE);

    document.querySelector('.loading-container').style = 'display: none';
    
    document.querySelector('main').style = '';
    document.querySelectorAll('.show-on-login').forEach((el) => {
        el.style = '';
    });
};

// these are old functions for scope reasons
export function openOverlay() {
    const overlay = document.querySelector('.overlay');
    overlay.style.display = 'flex';

    goVersionManager();
};

export function closeOverlay() {
    const overlay = document.querySelector('.overlay');
    overlay.style.display = 'none';
};


export const setOverlayPage = (className) => {
    const overlayContent = document.querySelector('.overlay-content');

    overlayContent.childNodes.forEach((node) => {
        node.style = 'display: none';
    });

    if (className) {
        const page = document.querySelector(`.${className}`);
        page.style = '';
    } else {
        overlayContent
    }
}

globalEvent.listen("set_status", (e) => setStatus(e.payload.status));
export const setStatus = (status) => {
    if (isOfflineMode) status = UserStatus.OFFLINE;
    userStatus = status;

    const statusEl = document.querySelector('.user-status');
    statusEl.classList.remove('user-offline', 'user-away', 'user-online');
    statusEl.classList.add(`user-${status}`);
}

addClickListener('.set-status-btn', async (event, element) => {
    const status = element.dataset.status;
    globalEvent.emit("set_status", { status });
});

let buttonState = BtnStates.READY;
export const setLaunchBtnState = (state) => {
    const gameButtonDiv = document.querySelector('.game-button');
    const playBtn = gameButtonDiv.querySelector('.play-btn');
    const settingsBtn = gameButtonDiv.querySelector('.game-settings-btn');

    const playVersion = document.getElementById('play-version');
    const playText = document.getElementById('play-text');
    playText.textContent = state.text || "";

    if (state.bgOverride || state.textColor) {
        playBtn.style = `background-color: ${state.bgOverride} !important; color: ${state.textColor} !important`;
    } else {
        playBtn.removeAttribute('style');
    }

    if (state.flags.includes(BtnFlags.DISABLED)) {
        gameButtonDiv.classList.add('btn-disabled');
    } else {
        gameButtonDiv.classList.remove('btn-disabled');
    }

    if (state.flags.includes(BtnFlags.HIDE_SETTINGS)) {
        settingsBtn.style.display = 'none';
    } else {
        settingsBtn.style.display = 'block';
    }

    if (state.flags.includes(BtnFlags.SHOW_VERSION)) {
        playVersion.style.display = 'block';
    } else {
        playVersion.style.display = 'none';
    }

    if (state.flags.includes(BtnFlags.SHOW_INSTALL_DATA)) {
        // todo
    }

    buttonState = state;
};

export const getLaunchBtnState = () => {
    return buttonState;
};

setTimeout(async () => {
    document.querySelector('.launcher-version').textContent = `Nocturno Launcher ${await invoke("get_version")}`;
}, 100);

window.addEventListener('resize', async () => {
    config.width = Math.min(window.innerWidth, 1200);
    config.height = Math.min(window.innerHeight, 700);
    await saveConfig();
});

// on scroll if the .version-manager is visible scroll the version list horizontally
const versionList = document.querySelector('.version-list');
const versionManager = document.querySelector('.version-manager');

console.log("Version Manager: ", versionManager);
console.log("Version List: ", versionList);

// on window scroll
window.scrollEvent = (e) => {
    if (versionManager.style.display !=='none') {
        versionList.scrollLeft += (e.deltaY * 0.2);
    }
};

try {
    const update = await check();

    console.log("Update", update);

    if (update?.available) {
        message('An update is available! The launcher will now update.', { title: 'Nocturno', type: 'info' });
        await update.downloadAndInstall();
    }
} catch (e) {
    console.error("Error checking for updates");
    console.error(e);
}

try {
    console.log("Nocturno Directory: ", nocturnoDirectory);
if (!await fs.exists(nocturnoDirectory)) await fs.createDir(nocturnoDirectory);
} catch (e) {
    console.error("Failed to create Nocturno Directory: ")
    console.error(e);
}

// Ensure Config
if (await fs.exists(`${nocturnoDirectory}\\config.json`)) {
    try {
        const configData = await fs.readTextFile(`${nocturnoDirectory}\\config.json`);
        config = JSON.parse(configData);

        if (config.path) {
            console.log("Detected old config, resetting...");
            config = DefaultConfig;
        }
    } catch (e) {
        console.error("Failed to load config: ", e);
        console.error("Resetting config...");
        config = DefaultConfig;
    }
}

window.language = config.language || "en";
document.dispatchEvent(new Event('DOMLoadLanguage'));
globalEvent.emit('DOMLoadLanguage', { language: window.language });

if (config.width !== window.innerWidth || config.height !== window.innerHeight) {
    __TAURI__.window.getCurrentWindow().setSize(new LogicalSize(config.width, config.height));
    __TAURI__.window.getCurrentWindow().center();
}

if (config.selectedVersion) {
    const version = config.versions.find(v => v.uuid === config.selectedVersion);
    if (!version) {
        config.selectedVersion = null;
    } else {
        setSelectedVersion(version, false);
    }
}

console.log("Loaded Config: ", config);

globalEvent.emit('tryAuth');

// Listeners Under Here
globalEvent.listen('auth', async (event) => {
    let authData;

    try {
        authData = JSON.parse(event.payload.message)
    } catch (err) {}

    if (authData && !authData.error && authData.username) {
        console.log("Logged in as: ", authData);
        updateUser(authData);
    } else {
        console.log("Not logged in.")
        window.location.href = "/login.html";
    }
});

window.offlineMode = async () => {
    isOfflineMode = true;

    const dllDir = `${nocturnoDirectory}\\dll`;
    const files = await fs.readDir(dllDir);
    const names = files.filter(file => file.name.endsWith('.json')).map(file => file.name.replace('.json', ''));

    updateUser({ username: "Offline", branches: names });
}

setTimeout(() => {
    if (!user) {
        document.querySelector('.beacon').classList = 'beacon-error';
        document.querySelector('.load-text').innerHTML = window.getTranslation('error.long-loading');
        document.querySelector('.retry-btn').style = '';
        document.querySelector('.offline-btn').style = '';
    }
}, 5 * 1000);