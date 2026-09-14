const { invoke } = window.__TAURI__.core;
const globalEvent = window.__TAURI__.event;

globalEvent.listen("ws:discord_rpc", (e) => updateDiscordRPC(e.payload.rpc));
globalEvent.emit("ws:request_last", { type: "discord_rpc" });

window.rpcProcess = async (data) => {
    let { status, isJoinable, isPlaying, customData, timestamp } = data;
    const fortBasicInfo = customData.find(data => data.key === "FortBasicInfo").value;
    
    let largeImage = "campaign";
    let state = isPlaying ? "In Game" : "In Menus";

    const isHomebase = status.startsWith("Homebase");
    if (isHomebase || isPlaying) {
        if (status.includes(",")) {
            state = status.split(", ")[1].replace(")", "");
        }

        const rating = fortBasicInfo.homeBaseRating;
        // Stonewood: Build the Radar Grid (Recommended Power) -> Stonewood: Build the Radar Grid
        status = isHomebase ? `Homebase (Rating ${rating})` : status.split(" (Recommended")[0];
        
        if (state.includes("Stonewood") || status.includes("Stonewood")) {
            largeImage = "stonewood";
        } else if (state.includes("Plankerton") || status.includes("Plankerton")) {
            largeImage = "plankerton";
        } else if (state.includes("Canny Valley") || status.includes("Canny Valley")) {
            largeImage = "canny";
        } else if (state.includes("Twine Peaks") || status.includes("Twine Peaks")) {
            largeImage = "twine";
        }
    } else if (status === "Playing Fortnite Battle Royale") {
        largeImage = "athena";
    }

    console.log({
        state: state,
        details: status,
        largeImage: largeImage,
        smallImage: "launcher",
        smallText: "Nocturno",
        timestamp: timestamp
    })


    await invoke("custom_rpc", {
        state: state,
        details: status,
        largeImage: largeImage,
        smallImage: "launcher",
        smallText: "Nocturno",
        timestamp: timestamp
    });
};

const updateDiscordRPC = async (data) => {
    if (data) await window.rpcProcess(data);
}