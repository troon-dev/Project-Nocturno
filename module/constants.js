// this should probably be using typescript but i dont wanna deal with vite rn
export const addClickListener = (query, callback, opts = {}) => {
    console.log("Adding click listener to: ", query);
    document.querySelectorAll(query).forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-disabled') || e.target.closest('.btn-disabled')) return;

            callback(e, el);
        }, opts);
    });
}


export const BtnFlags = {
    SHOW_VERSION: 0,
    SHOW_INSTALL_DATA: 1,
    DISABLED: 2,
    HIDE_SETTINGS: 3
};

export const BtnStates = {
    READY: { 
       text: "Launch",
        flags: [BtnFlags.SHOW_VERSION]
    },
    INSTALLING: {
        text: "Installing",
        bgOverride: "#2A3138",
        flags: [BtnFlags.SHOW_INSTALL_DATA, BtnFlags.HIDE_SETTINGS],
    },
    PLEASE_WAIT: {
        text: "Please Wait...",
        bgOverride: "#2A3138",
        textColor: "#FFFFFF",
        flags: [BtnFlags.DISABLED, BtnFlags.HIDE_SETTINGS]
    },
    BUSY: {
        text: "Busy",
        flags: [BtnFlags.DISABLED]
    },
    RUNNING: {
        text: "Running",
        flags: [BtnFlags.DISABLED]
    }
};

export const UserStatus = {
    ONLINE: "online",
    OFFLINE: "offline",
    AWAY: "away"
};

export const DefaultConfig = {
    width: 1200,
    height: 700,
    selectedVersion: null,
    settings: {
        hideLauncher: false
    },
    language: "en",
    versions: []
}