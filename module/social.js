const { invoke } = window.__TAURI__.core;
const globalEvent = window.__TAURI__.event;

let text = { online: "Online", offline: "Offline", pending: "Pending" };
let cachedFriends = [];

window.language = "en";
window.__TAURI__.event.listen('DOMLoadLanguage', (e) => {
    window.language = e.payload.language;
});

__TAURI__.window.getCurrentWindow().onCloseRequested(async (event) => {
    event.preventDefault();
    window.tauriWindow.setVisible('social', false);
});

document.querySelectorAll('.list-header').forEach(header => {
    header.addEventListener('click', () => {
        const list = header.nextElementSibling;
        const isActive = header.classList.contains('active');

        document.querySelectorAll('.list-header').forEach(header => {
            header.classList.remove('active');
            header.nextElementSibling.classList.add('collapsed');
        });
        
        if (isActive) {
            header.classList.remove('active');
            list.classList.add('collapsed');
        } else {
            header.classList.add('active');
            list.classList.remove('collapsed');
        }
    });
});

globalEvent.listen("ws:social_init", (e) => loadFriends(e.payload.friends));
globalEvent.listen("ws:social_presence_update", (e) => updateFriend(e.payload.accountId, e.payload.session));
globalEvent.emit("ws:request_last", { type: "social_init" });
globalEvent.listen("set_status", (e) => setStatus(e.payload.status));

const setStatus = async (status) => {
    const statusEl = document.querySelector('.social-status .status');
    statusEl.classList.remove('offline', 'away', 'online');
    statusEl.classList.add(status);

    globalEvent.emit("ws-send", { type: "set_status", status });
}
        

const updateFriend = async (accountId, session) => {
    console.log(accountId, session);
    const list = document.querySelectorAll('.list-entry');
    list.forEach(entry => {
        if (entry.dataset.accountId === accountId) {
            const status = entry.querySelector('.social-status');
            const orb = entry.querySelector('.social-orb');

            switch (session.status) {
                case "offline":
                    status.innerText = "Offline";
                    orb.classList.remove('online');
                    orb.classList.add('offline');
                    break;
                case "online":
                    status.innerText = "Online";
                    orb.classList.remove('offline');
                    orb.classList.add('online');
                    break;
                case "ingame":
                    try {
                        const data = JSON.parse(session.data);
                        status.innerText = data.Status;
                        if (status.innerText.length === 0) status.innerText = "Playing Fortnite";
                    } catch (error) {
                        status.innerText = "Online";
                    }
                    orb.classList.remove('offline');
                    orb.classList.add('online');
                    break;
            }
        }
    });
}

const loadFriends = async (friends) => {
    cachedFriends = ['accepted', 'blocked', 'incoming', 'outgoing'].flatMap(type => 
        friends[type].map(friend => ({ ...friend, type }))
    );

    const onlineDropdown = document.querySelector('[data-dropdown="online"]');
    const incomingDropdown = document.querySelector('[data-dropdown="incoming"]');
    const outgoingDropdown = document.querySelector('[data-dropdown="outgoing"]');

    if (friends.accepted.length > 0) {
        const onlineFriends = friends.accepted.filter(friend => friend.session.status !== "offline");
        const offlineFriends = friends.accepted.filter(friend => friend.session.status === "offline");

        onlineFriends.sort((a, b) => {
            if (a.session.type === "ingame") return -1;
            if (b.session.type === "ingame") return 1;
            return 0;
        });

        onlineDropdown.innerText = `${window.getTranslation("account.online")} (${onlineFriends.length}/${friends.accepted.length})`;
        onlineDropdown.classList.remove('hidden');

        const list = document.getElementById('online');
        list.innerHTML = '';
        onlineFriends.forEach(friend => {
            let status = window.getTranslation("account.online");
            let state = friend.session.status || status;
            
            switch (friend.session.type) {
                case "ingame":
                    try {
                        const data = JSON.parse(friend.session.data);
                        status = data.Status;
                        if (status.length === 0) status = "Playing Fortnite";
                    } catch (error) {
                        status = window.getTranslation("account.online");
                    }
                    break;
                case "launcher":
                    status = window.getTranslation("account.in-launcher");
                    break;
            }

            list.innerHTML += createListEntry(state.toLowerCase(), friend.username, status, friend.accountId);
        });

        const offlineDiv = document.createElement('div');

        offlineFriends.sort((a, b) => a.username.localeCompare(b.username));
        offlineFriends.forEach(friend => {
            offlineDiv.innerHTML += createListEntry("offline", friend.username, window.getTranslation("account.offline"), friend.accountId);
        });

        list.appendChild(offlineDiv);
    } else {
        onlineDropdown.classList.add('hidden');
    }

    if (friends.incoming.length > 0) {
        incomingDropdown.innerText = `${window.getTranslation("account.incoming")} (${friends.incoming.length})`;
        incomingDropdown.classList.remove('hidden');

        const list = document.getElementById('incoming');
        list.innerHTML = '';
        friends.incoming.forEach(friend => {
            list.innerHTML += createListEntry("offline", friend.username, window.getTranslation("account.pending"), friend.accountId);
        });
    } else {
        incomingDropdown.classList.add('hidden');
    }

    if (friends.outgoing.length > 0) {
        outgoingDropdown.innerText = `${window.getTranslation("account.outgoing")} (${friends.outgoing.length})`;
        outgoingDropdown.classList.remove('hidden');

        const list = document.getElementById('outgoing');
        list.innerHTML = '';
        friends.outgoing.forEach(friend => {
            list.innerHTML += createListEntry("offline", friend.username, window.getTranslation("account.pending"), friend.accountId);
        });
    } else {
        outgoingDropdown.classList.add('hidden');
    }

    document.querySelectorAll('.social-status').forEach(status => {
        if (status.offsetWidth < status.scrollWidth) {
            status.classList.add('marquee');
        }
    });
}

const createListEntry = (state, username, status, accountId) => {
    return `
        <div class="list-entry" data-account-id="${accountId}">
            <div class="social-entry">
                <div class="social-orb ${state.toLowerCase()}"></div>
                <div class="social-user">
                    <span class="username">${username}</span>
                    <span class="social-status">${status}</span>
                </div>
            </div>

            <!-- Epic logo would be here -->
        </div>
    `;
}


// Custom context menu
const contextMenu = document.querySelector('.context-menu');

// left click
document.addEventListener('click', (e) => {
    const target = e.target;
    const accountId = target.closest('.list-entry')?.dataset.accountId;
    if (!accountId) return;
    if (e.button === 0) showContext(accountId, e);
});

// right click
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const target = e.target;
    const accountId = target.closest('.list-entry')?.dataset.accountId;
    if (!accountId) return;
    showContext(accountId, e);
});

const showContext = (accountId, event) => {
    const friend = cachedFriends.find(friend => friend.accountId === accountId);
    if (!friend) return;

    console.log(friend);

    switch (friend.type) {
        case "accepted":
            contextMenu.innerHTML = `
                <div class="context-menu-item" data-action="remove">Remove Friend</div>
                <div class="context-menu-item" data-action="block">Block</div>
            `;
            break;
        case "outgoing":
            contextMenu.innerHTML = `
                <div class="context-menu-item" data-action="cancel">Cancel</div>
                <div class="context-menu-item" data-action="block">Block</div>
                <div class="context-menu-item" data-action="mute">Mute</div>
            `;
            break;
        case "incoming":
            contextMenu.innerHTML = `
                <div class="context-menu-item" data-action="accept">Accept</div>
                <div class="context-menu-item" data-action="block">Block</div>
            `;
            break;
    }

    // Show context menu
    let top = event.clientY;
    let left = event.clientX;
    contextMenu.classList.add('active');
    const rect = contextMenu.getBoundingClientRect();
    if (top + rect.height > window.innerHeight) {
        top = window.innerHeight - rect.height;
    }
    if (left + rect.width > window.innerWidth) {
        left = window.innerWidth - rect.width;
    }
    contextMenu.style.top = `${top}px`;
    contextMenu.style.left = `${left}px`;
}

const handleClick = (event) => {
    const action = event.target.dataset.action;
    if (!action) return;
}

// if the user clicks anywhere else or scrolls, hide the context menu
document.addEventListener('click', (e) => {
    if (e.target.closest('.context-menu')) {
        handleClick(e);
    }
    
    contextMenu.classList.remove('active');
});

document.addEventListener('scroll', () => {
    contextMenu.classList.remove('active');
});