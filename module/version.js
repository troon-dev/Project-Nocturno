import { BtnStates } from "./constants.js";
import { closeOverlay, config, saveConfig, setLaunchBtnState, setOverlayPage, nocturnoDirectory, getLaunchBtnState, user, isOfflineMode } from "./main.js";

const globalEvent = window.__TAURI__.event;
const { fs } = window.__TAURI__;
const { open, message, confirm } = window.__TAURI_PLUGIN_DIALOG__;
const { invoke } = window.__TAURI__.core;

export const UnknownVersion = {
    versionId: "Unknown",
    branch: "singleplayer",
    build: "Unknown",
    cover: "unknown"
}

export const getSelectedVersion = () => {
    if (!config.selectedVersion) return null;
    return config.versions.find(v => v.uuid === config.selectedVersion) || null;
}

export const setSelectedVersion = (version, save = true) => {
    config.selectedVersion = version.uuid;
    document.getElementById("play-version").innerText = version.name;

    if (save) {
        closeOverlay();
        saveConfig();
    }
}

export const getKnownVersion = (versionString) => {
    const version = KnownVersions.find(v => versionString.includes(v.build));

    return version || UnknownVersion;
}

const getVersionFromId = (id) => {
    if (id === "Unknown") return UnknownVersion;
    return KnownVersions.find(v => v.versionId === id);
}

export const getVersionInfo = async (path) => {
    if (!path) return null;
    if (!await fs.exists(path)) return null;

    const res = await invoke("scan_fortnite_version", {
        path: path
    });

    const bytes = new TextEncoder().encode(res);
    return new TextDecoder().decode(bytes.filter(byte => byte !== 0));
}

export const lookForFortniteBinary = async (path) => {
    if (!path) return null;
    if (!await fs.exists(path)) return null;


    // walk_fortnite_binary
    const res = await invoke("walk_fortnite_binary", {
        path: path
    });

    return JSON.parse(res);
}

export const setVersionEditor = (version) => {
    console.log("Setting version editor to: ", version);

    document.getElementById("edit-ver-uuid").value = version.uuid;
    document.getElementById("edit-ver-id").value = version.id;
    document.getElementById("edit-ver-name").value = version.name;
    document.getElementById("edit-ver-path").value = version.path;
    document.getElementById("edit-ver-image").src = `./img/Game/${version.image}.png`;
    document.getElementById("edit-ver-branch").value = version.branch;
    document.getElementById("edit-ver-args").value = version.args;
}

export const saveVersionEditor = async () => {
    console.log("Saving version editor...");

    const uuid = document.getElementById("edit-ver-uuid").value;
    const id = document.getElementById("edit-ver-id").value;
    const name = document.getElementById("edit-ver-name").value;
    const path = document.getElementById("edit-ver-path").value;
    const branch = document.getElementById("edit-ver-branch").value;
    const args = document.getElementById("edit-ver-args").value;

    const version = {
        uuid: uuid,
        id: id,
        name: name,
        versionId: id,
        branch: branch,
        binary: path,
        args: args,
    }

    const index = config.versions.findIndex(v => v.uuid === version.uuid);
    if (index !== -1) {
        config.versions[index] = version;
    } else {
        config.versions.push(version);
    }

    if (config.selectedVersion === version.uuid) {
        setSelectedVersion(version, false);
    }

    saveConfig();
    goVersionManager();
}

export const trashVersion = async () => {
    const confirmation = await confirm(
        window.getTranslation("version.confirm-delete"),
        { title: 'Nocturno', kind: 'warning' }
    );
    if (!confirmation) return;

    const uuid = document.getElementById("edit-ver-uuid").value;
    const index = config.versions.findIndex(v => v.uuid === uuid);
    if (index !== -1) {
        config.versions.splice(index, 1);
        saveConfig();
    }

    goVersionManager();
}

export const refreshVersionList = () => {
    const list = document.querySelector(".version-list");
    list.innerHTML = "";

    if (!config.versions || config.versions.length === 0) {
        document.querySelector(".no-versions-text").style.display = "flex";
        return;
    } else {
        document.querySelector(".no-versions-text").style.display = "none";
    }

    config.versions.forEach(version => {
        const versionData = getVersionFromId(version.versionId);
        if (!versionData) return;

        const item = document.createElement("div");

        item.classList.add("version-item");
        item.classList.add(versionData.cover || "season1");

        item.innerHTML = `
            <button class="version-settings-btn"></button>
            <span class="version-name">
                ${version.name}
            </span>
        `;

        item.querySelector(".version-settings-btn").addEventListener("click", (e) => {
            setVersionEditor({
                uuid: version.uuid,
                name: version.name,
                id: version.versionId,
                image: versionData.cover,
                branch: version.branch,
                path: version.binary,
                args: version.args,
            })
            setOverlayPage("version-editor");
        });

        item.addEventListener("click", (e) => {
            if (e.target.classList.contains("version-settings-btn")) return;
            setSelectedVersion(version);
        });

        list.appendChild(item);
    });
}

export const goVersionManager = () => {
    refreshVersionList();
    setOverlayPage("version-manager");
};

export const startVersionImport = async () => {
    console.log("Starting version import...");
    const path = await open({
        multiple: false,
        directory: true,
        title: window.getTranslation("version.select-version-dialog")
    });

    if (!path) return;

    setOverlayPage("loading-overlay");

    const binaries = await lookForFortniteBinary(path);
    if (!binaries || binaries.length === 0) {
        console.error("Failed to find Fortnite binary in directory: ", path);
        await error('error.failed-locate-binary');
        return goVersionManager();
    }

    if (binaries.length > 1) {
        console.error("Found multiple Fortnite binaries in directory: ", path);
        await error('error.found-multiple-binaries')
        return goVersionManager();
    }

    const binary = binaries[0];

    const versionBuildData = await getVersionInfo(binary);
    if (!versionBuildData) {
        console.error("Failed to find valid Fortnite version in directory: ", path);
        await error('error.failed-locate-binary')
        return goVersionManager();
    }
    console.log("Version Build Data: ", versionBuildData);

    if (versionBuildData.startsWith("ERR:")) {
        console.error("Failed to find valid Fortnite version in directory with error: ", versionBuildData);
        await message(versionBuildData.split("ERR:")[1], { title: 'Nocturno', kind: 'error' });
        return goVersionManager();
    }

    const version = getKnownVersion(versionBuildData);
    console.log("Importing version: ", version);

    setVersionEditor({
        uuid: crypto.randomUUID(),
        name: version.versionId,
        path: binary,
        image: version.cover,
        branch: version.branch,
        args: "",
        id: version.versionId
    });

    setOverlayPage("version-editor");
}

const error = async (error, context = "") => {
    console.error("Error: ", error);
    await message(window.getTranslation(error) + context, { title: 'Nocturno', kind: 'error' });
    setLaunchBtnState(BtnStates.READY);
}

const initBranch = async (branch, binary) => {
    let json;

    
    if (isOfflineMode) {
        try {
            const body = await fs.readTextFile(`${nocturnoDirectory}\\dll\\${branch}.json`);
            json = JSON.parse(body);
        } catch (e) {
            error("error.failed-json", e);
            return;
        }
    } else {
        try {
            const body = await invoke("secure_fetch", { method: "GET", path: "/api/branch/" + branch, body: "" });
            json = JSON.parse(body);
        } catch (e) {
            error("error.failed-json", e);
            return;
        }
    }

    // branch cache for offline mode

    if (json.error) {
        error("error.dlls", json.error);
        return;
    }

    let files = json.files;
    if (!files || files.length === 0) {
        error("error.dlls", "No files found in branch: " + branch);
        return;
    }

    const dllPath = `${nocturnoDirectory}\\dll\\${branch}`;
    if (!await fs.exists(dllPath)) await fs.mkdir(dllPath);

    await fs.writeTextFile(`${nocturnoDirectory}\\dll\\${branch}.json`, JSON.stringify(json, null, 4));

    // Ex: E:\Nocturno\FortniteVersions\1.8\Fortnite\FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe
    // -> E:\Nocturno\FortniteVersions\1.8\Fortnite\FortniteGame\Content\Paks

    const paksPath = binary.split("\\Binaries\\Win")[0] + "\\Content\\Paks";
    if (!await fs.exists(paksPath)) {
        error("Failed to find Paks folder. Checked: ", paksPath);
        return;
    }

    if (json.rename) {
        const paks = await fs.readDir(paksPath);

        for (const pak of paks) {
            for (const rename of json.rename) {
                if (pak.name === rename.oldName) {
                    console.log(`Renaming ${paksPath}\\${pak.name} to ${paksPath}\\${rename.newName}`);
                    await fs.rename(`${paksPath}\\${pak.name}`, `${paksPath}\\${rename.newName}`);
                    break;
                }
            }
        }
    }

    files = await Promise.all(files.map(async (file) => {
        const { name, hash } = file;
        const isPak = name.toLowerCase().endsWith(".pak");

        const path = isPak ? `${paksPath}\\${name}` : `${nocturnoDirectory}\\dll\\${branch}\\${name}`;

        const exists = await fs.exists(path);
        const fileSHA1 = exists ? await invoke("get_sha1", { path: path }) : null;

        console.log(`${path} - ${hash} - ${fileSHA1} - ${exists}`);

        if (!exists || hash !== fileSHA1) {
            await invoke("download_url", { url: `/api/branch/${branch}/file/${hash}`, path });

            if (isPak) {
                const pakName = name.split(".")[0];
                const sigs = await fs.readDir(paksPath);

                for (const sig of sigs) {
                    if (!sig.name.endsWith(".sig")) continue;
                    console.log(`Copying ${paksPath}\\${sig.name} to ${paksPath}\\${pakName}.sig`);
                    await fs.copyFile(`${paksPath}\\${sig.name}`, `${paksPath}\\${pakName}.sig`);
                    break;
                }
            }
        }

        // TODO: admin controller for dlls
        return {
            name: name,
            hash: hash,
            injectAt: file.injectAt || null,
            disabled: false,
            path: path
        }
    }));

    // only do this after all paks are downloaded
    const dlls = files.filter(file => !file.name.toLowerCase().endsWith(".pak"));

    return dlls;
}


export const startGame = async () => {
    setLaunchBtnState(BtnStates.BUSY);

    const version = getSelectedVersion();
    if (!version) return error('error.no-version');
    if (!await fs.exists(version.binary)) return error('error.no-path');

    const branch = version.branch;
    if (!branch) return error('error.no-version');
    const dlls = await initBranch(branch, version.binary);
    if (!dlls) return;

    console.log("DLLs: ", dlls);

    const exchangeCode = await invoke("secure_fetch", { method: "GET", path: "/api/account/exchange-code", body: "" });
    const exchange = JSON.parse(exchangeCode);
    if (exchange.error) return error("error.exchange-code-failed");

    if (config.settings.hideLauncher) globalEvent.emit('hide');

    const override = document.querySelector(".override-exchange").value;
    if (override && override.length > 0) exchange.exchange_code = override;

    console.log("Exchange Code: ", exchange.exchange_code);
    console.log("Starting game with version: ", version);

    setLaunchBtnState(BtnStates.RUNNING);
    globalEvent.emit('launch-fortnite', {
        path: version.binary,
        exchangeCode: exchange.exchange_code,
        dllData: JSON.stringify(dlls),
        runtimeArgs: version.args
    });
};

export const startGameServer = async () => {
    // this is up here to prevent double clicking
    const gameServerDLL = await open({
        multiple: false,
        directory: false,
        title: "Select GS dll",
        filters: [{ name: 'DLL', extensions: ['dll'] }]
    });
    if (!gameServerDLL) return;
    console.log("Selected GS DLL: ", gameServerDLL);

    const version = getSelectedVersion();
    if (!version) return error('error.no-version');
    if (!await fs.exists(version.binary)) return error('error.no-path');

    let dlls = (await initBranch(version.branch, version.binary));
    if (!dlls) return;
    dlls = dlls.filter(dll => dll.name === "redirect.dll");

    dlls.push({
        disabled: false,
        hash: "0",
        injectAt: window.GAMESERVER.injectAt,
        delay: window.GAMESERVER.delay || 0,
        name: "gameserver.dll",
        path: gameServerDLL,
    });

    console.log("DLLs: ", dlls);

    const { exchangeCode, port } = JSON.parse(await invoke("get_gameserver_data"))
    console.log("Starting game server with port", port);

    let args = [];

    if (version.args) args.push(version.args);
    if (window.GAMESERVER.args) args.push(window.GAMESERVER.args.join(" "));
    args.push(`-port=${port}`);

    globalEvent.emit('launch-fortnite', {
        path: version.binary,
        exchangeCode: exchangeCode,
        dllData: JSON.stringify(dlls),
        runtimeArgs: args.join(" "),
        isGameServer: true
    });
};

globalEvent.listen('fortnite-close', async (event) => {
    if (getLaunchBtnState() !== BtnStates.READY) {
        setLaunchBtnState(BtnStates.READY);
    }
});

export const KnownVersions = [
    { versionId: "OT6.5", branch: "singleplayer", build: "D:\\BuildFarm\\buildmachine", cover: "season0" },
    { versionId: "Cert", branch: "cert", build: "Release-Cert", cover: "season1" },
    { versionId: "1.2", branch: "singleplayer", build: "3541083", cover: "season1" },
    { versionId: "1.7.2", branch: "singleplayer", build: "3700114", cover: "season1" },
    { versionId: "1.8", branch: "singleplayer", build: "3724489", cover: "season1" },
    { versionId: "1.8.1", branch: "singleplayer", build: "3729133", cover: "season1" },
    { versionId: "1.8.2", branch: "singleplayer", build: "3741772", cover: "season1" },
    { versionId: "1.9", branch: "singleplayer", build: "3757339", cover: "season1" },
    { versionId: "1.9.1", branch: "singleplayer", build: "3775276", cover: "season1" },
    { versionId: "1.10", branch: "singleplayer", build: "3790078", cover: "season1" },
    { versionId: "1.11", branch: "singleplayer", build: "3807424", cover: "season2" },
    { versionId: "2.1.0", branch: "singleplayer", build: "3825894", cover: "season2" },
    { versionId: "2.2.0", branch: "singleplayer", build: "3841827", cover: "season2" },
    { versionId: "2.3.0", branch: "singleplayer", build: "3847564", cover: "season2" },
    { versionId: "2.4.0", branch: "singleplayer", build: "3858292", cover: "season2" },
    { versionId: "2.4.2", branch: "singleplayer", build: "3870737", cover: "season2" },
    { versionId: "2.5.0", branch: "singleplayer", build: "3889387", cover: "season2" },
    { versionId: "3.0", branch: "singleplayer", build: "3901517", cover: "season3" },
    { versionId: "3.1", branch: "singleplayer", build: "3915963", cover: "season3" },
    { versionId: "3.1.1", branch: "singleplayer", build: "3917250", cover: "season3" },
    { versionId: "3.2", branch: "singleplayer", build: "3935073", cover: "season3" },
    { versionId: "3.3", branch: "singleplayer", build: "3942182", cover: "season3" },
    { versionId: "3.5", branch: "singleplayer", build: "4008490", cover: "season3" },
    { versionId: "3.6", branch: "singleplayer", build: "4019403", cover: "season3" },
    { versionId: "4.0", branch: "singleplayer", build: "4039451", cover: "season4" },
    { versionId: "4.1", branch: "singleplayer", build: "4053532", cover: "season4" },
    { versionId: "4.2", branch: "singleplayer", build: "4072250", cover: "season4" },
    { versionId: "4.4", branch: "singleplayer", build: "4117433", cover: "season4" },
    { versionId: "4.4.1", branch: "singleplayer", build: "4127312", cover: "season4" },
    { versionId: "4.5", branch: "singleplayer", build: "4159770", cover: "season4" },
    { versionId: "5.00", branch: "singleplayer", build: "4204761", cover: "season5" },
    { versionId: "5.10", branch: "singleplayer", build: "4240749", cover: "season5" },
    { versionId: "5.21", branch: "singleplayer", build: "4288479", cover: "season5" },
    { versionId: "5.30", branch: "singleplayer", build: "4305896", cover: "season5" },
    { versionId: "5.40", branch: "singleplayer", build: "4352937", cover: "season5" },
    { versionId: "5.41", branch: "singleplayer", build: "4363240", cover: "season5" },
    { versionId: "6.00", branch: "singleplayer", build: "4395664", cover: "season6" },
    { versionId: "6.01", branch: "singleplayer", build: "4417689", cover: "season6" },
    { versionId: "6.02", branch: "singleplayer", build: "4442095", cover: "season6" },
    { versionId: "6.10", branch: "singleplayer", build: "4464155", cover: "season6" },
    { versionId: "6.21", branch: "singleplayer", build: "4526925", cover: "season6" },
    { versionId: "6.22", branch: "singleplayer", build: "4543176", cover: "season6" },
    { versionId: "6.30", branch: "singleplayer", build: "4573096", cover: "season6" },
    { versionId: "6.31", branch: "singleplayer", build: "4573279", cover: "season6" },
    { versionId: "7.00", branch: "singleplayer", build: "4629139", cover: "season7" },
    { versionId: "7.10", branch: "singleplayer", build: "4667333", cover: "season7" },
    { versionId: "7.20", branch: "singleplayer", build: "4727874", cover: "season7" },
    { versionId: "7.30", branch: "singleplayer", build: "4834550", cover: "season7" },
    { versionId: "7.40", branch: "singleplayer", build: "5046157", cover: "season7" },
    { versionId: "8.00", branch: "singleplayer", build: "5203069", cover: "season8" },
    { versionId: "8.20", branch: "singleplayer", build: "5203069", cover: "season8" },
    { versionId: "8.30", branch: "singleplayer", build: "5203069", cover: "season8" },
    { versionId: "8.40", branch: "singleplayer", build: "5203069", cover: "season8" },
    { versionId: "8.50", branch: "singleplayer", build: "6058028", cover: "season8" },
    { versionId: "9.00", branch: "singleplayer", build: "6337466", cover: "season9" },
    { versionId: "9.01", branch: "singleplayer", build: "6428087", cover: "season9" },
    { versionId: "9.10", branch: "singleplayer", build: "6639283", cover: "season9" },
    { versionId: "9.21", branch: "singleplayer", build: "6922310", cover: "season9" },
    { versionId: "9.30", branch: "singleplayer", build: "7095426", cover: "season9" },
    { versionId: "9.40", branch: "singleplayer", build: "7315705", cover: "season9" },
    { versionId: "9.41", branch: "singleplayer", build: "7609292", cover: "season9" },
    { versionId: "10.00", branch: "singleplayer", build: "7704164", cover: "season10" },
    { versionId: "10.10", branch: "singleplayer", build: "7955722", cover: "season10" },
    { versionId: "10.20", branch: "singleplayer", build: "8456527", cover: "season10" },
    { versionId: "10.31", branch: "singleplayer", build: "8723043", cover: "season10" },
    { versionId: "10.40", branch: "singleplayer", build: "9380822", cover: "season10" }
];
