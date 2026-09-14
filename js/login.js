const globalEvent = window.__TAURI__.event;
const { invoke } = window.__TAURI__.core;
const { writeFile } = window.__TAURI__.fs;
const { message } = window.__TAURI_PLUGIN_DIALOG__;
const { fs } = window.__TAURI__;

const restoreInput = () => {
    const codeInput = document.getElementById("auth-code");
    const authBtn = document.getElementById("auth-btn");
    if (!codeInput || !authBtn) return;

    codeInput.removeAttribute("disabled");
    authBtn.removeAttribute("disabled");
    codeInput.value = "";
}

const submitCode = async () => {
    const codeInput = document.getElementById("auth-code");
    const authBtn = document.getElementById("auth-btn");
    if (!codeInput || !authBtn) return;
    if (authBtn.hasAttribute("disabled")) return

    authBtn.setAttribute("disabled", "disabled");
    codeInput.setAttribute("disabled", "disabled");

    const code = codeInput.value;
    if (!code || code.length !== 9) return;

    const response = await invoke("submit_code", { code });
    let json;

    try {
        json = JSON.parse(response);
    } catch (e) {
        await message(
            'Error occurred while authenticating: JSON parse error.',
            { title: 'Nocturno', kind: 'error' }
        );
        console.error(e);
        restoreInput();
        return;
    }

    if (json.errorCode) {
        await message(
            json.errorMessage,
            { title: 'Nocturno', kind: 'error' }
        );
        restoreInput();
        return;
    }
    
    if (!json.access_token) {
        await message(
            'Error occurred while authenticating: Access token not found.',
            { title: 'Nocturno', kind: 'error' }
        );
        restoreInput();
        return;
    }

    const appdata = await invoke("get_environment_variable", { name: "APPDATA" });
    await fs.writeTextFile(`${appdata}\\.nocturno\\user.json`, JSON.stringify(json));
    window.location.href = "/index.html";
};

// on load force authcode to be only numbers 0-9
document.addEventListener("DOMContentLoaded", () => {
    const authCode = document.getElementById("auth-code");
    if (!authCode) return;

    const authBtn = document.getElementById("auth-btn");
    if (!authBtn) return;

    authCode.addEventListener("keypress", (e) => {
        if (e.key.match(/[^0-9]/)) e.preventDefault();
        if (e.key === "Enter") submitCode();
    });
    
    authCode.addEventListener("keydown", (e) => {
        if (e.ctrlKey && ["c", "v", "x", "r"].includes(e.key)) return;
        if (e.key.match(/[^0-9]/)) e.preventDefault();
    });

    authCode.addEventListener("input", (e) => {
        if (e.target.value.length === 9) authBtn.removeAttribute("disabled");
        else authBtn.setAttribute("disabled", "disabled");
    });

    authCode.addEventListener("paste", (e) => {
        const pasted = e.clipboardData.getData("text");
        if (pasted.length === 9) {
            authBtn.removeAttribute("disabled");
            authCode.value = pasted;
            submitCode();
        }
    });

    authBtn.addEventListener("click", submitCode);
});