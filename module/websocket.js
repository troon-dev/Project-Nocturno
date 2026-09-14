const { invoke } = window.__TAURI__.core;
const globalEvent = window.__TAURI__.event;

window.debugWebsocket = true;

export let wsClient = null;

// Cache - incase something reloads and needs data
const lastMessages = {};
globalEvent.listen("ws:request_last", (e) => {
    const type = e.payload.type;
    if (lastMessages[type]) {
        globalEvent.emit("ws:" + type, lastMessages[type]);
    }
});

globalEvent.listen("ws-send", (e) => {
    if (!wsClient || wsClient.readyState !== WebSocket.OPEN) return;
    wsClient.send(JSON.stringify(e.payload));
});

export const initWebsocket = async () => {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) return;
    const version = await invoke("get_version");
    const auth = await invoke("get_auth");

    wsClient = new WebSocket('wss://fn-api-prod.nocturno.cc/launcher/api/client?v=' + version)

    wsClient.onopen = () => {
        try {
            console.log('WebSocket connected!');
            wsClient.send(JSON.stringify({ type: 'auth', token: JSON.parse(auth).access_token }));
        } catch (e) {
            console.error('Error sending auth token:', e);
        }
    }

    wsClient.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const type = data.type;

        if (window.debugWebsocket) {
            console.log(`--- Received message of type ${type} ---`);
            console.log(data);
        }

        lastMessages[type] = data;

        globalEvent.emit("ws:" + type, data);
    }

    wsClient.onclose = () => {
        console.log('WebSocket closed, retrying in 5s...');

        setTimeout(() => {
            initWebsocket();
        }, 5000);
    }

    wsClient.onerror = (error) => {
        console.error('WebSocket error:', error);
    }
}

initWebsocket();