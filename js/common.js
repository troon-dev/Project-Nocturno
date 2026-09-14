Sentry.onLoad(function () {
    Sentry.init({});
});

const checkMaximizeIcon = async () => {
    const window = __TAURI__.window.getCurrentWindow();
    const maximizeButton = document.querySelector('.maximize');
    if (!maximizeButton) return;

    setTimeout(async () => {
        const isMaximized = await window.isMaximized();

        if (isMaximized) {
            maximizeButton.classList.add("restore");
        } else {
            maximizeButton.classList.remove("restore");
        }
    }, 10);
}


// disable right clicking, printing, etc
document.addEventListener('contextmenu', e => e.preventDefault());

const disabledKeys = ["f", "p", "s", "o", "i", "u", "x", "j", "k", "l", "n", "r", "t", "w"];
window.onkeydown = function (e) {
    if (e.ctrlKey && disabledKeys.includes(e.key)) {
        e.preventDefault();
    }
};

const rendererLog = (message) => {
    window.__TAURI__.event.emit('log', message);
}

window.tauriWindow = {
    close: () => window.__TAURI__.process.exit(1),
    closeWindow: () => window.__TAURI__.event.emit('exitWindow'),
    minimize: () => __TAURI__.window.getCurrentWindow().minimize(),
    setVisible: async (label, visible, focus = false) => {
        const allWindows = await __TAURI__.window.getAllWindows();
        const window = allWindows.find(w => w.label === label);
        if (window) {
            visible ? window.show() : window.hide();
            if (focus) window.setFocus();
        }
    },
    openExternal: (url) => __TAURI__.shell.open(url),
    maximize: async () => {
        __TAURI__.window.getCurrentWindow().toggleMaximize();
        checkMaximizeIcon();
    },
};

// on a href click with target="_blank" open in default browser
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.target === '_blank') {
        e.preventDefault();
        window.tauriWindow.openExternal(e.target.href);
    }
});

function SmoothScroll(target, speed, smooth) {
    if (target === document)
        target = (document.scrollingElement
            || document.documentElement
            || document.body.parentNode
            || document.body) // cross browser support for document scrolling

    var moving = false
    var pos = target.scrollTop
    var frame = target === document.body
        && document.documentElement
        ? document.documentElement
        : target // safari is the new IE

    target.addEventListener('mousewheel', scrolled, { passive: false })
    target.addEventListener('DOMMouseScroll', scrolled, { passive: false })

    function scrolled(e) {
        if (window.scrollEvent) window.scrollEvent(e);
        e.preventDefault();
        if (document.querySelector('.overlay').style.display !== 'none') return;
        if (document.querySelector('.settings-overlay').style.display !== 'none') return;

        var delta = normalizeWheelDelta(e)

        pos += -delta * speed
        pos = Math.max(0, Math.min(pos, target.scrollHeight - frame.clientHeight)) // limit scrolling

        if (!moving) update()
    }

    function normalizeWheelDelta(e) {
        if (e.detail) {
            if (e.wheelDelta)
                return e.wheelDelta / e.detail / 40 * (e.detail > 0 ? 1 : -1) // Opera
            else
                return -e.detail / 3 // Firefox
        } else
            return e.wheelDelta / 120 // IE,Safari,Chrome
    }

    function update() {
        moving = true

        var delta = (pos - target.scrollTop) / smooth

        target.scrollTop += delta

        if (Math.abs(delta) > 0.5)
            requestFrame(update)
        else
            moving = false
    }

    var requestFrame = function () { // requestAnimationFrame cross browser
        return (
            window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (func) {
                window.setTimeout(func, 1000 / 50);
            }
        );
    }()
}

// if button with .btn-disabled class is clicked (or the parent has the class), prevent default action
// also cancel the event so listeners don't pick it up
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-disabled') || e.target.closest('.btn-disabled')) {
        e.preventDefault();
    }
});


// disable arrow keys from scrolling the page
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
    }
});

// if mouse is moved out of .user-dropdown-content and it was inside it before, close the dropdown
document.addEventListener('mouseover', (e) => {
    const dropdown = document.querySelector('.user-dropdown');
    const dropdownContent = document.querySelector('.user-dropdown-content');
    if (!dropdown || !dropdownContent) return;

    if (!e.target.closest('.user-dropdown-content') && !e.target.closest('.user-dropdown')) {
        const rect = dropdown.getBoundingClientRect();
        if (e.clientY > rect.top + 25) {
            dropdownContent.style = 'display: none;';
            document.querySelector('.user-dropdown').classList.remove('active');
        }
    }
});

// if a button is clicked inside .user-dropdown-content, close the dropdown
document.addEventListener('click', (e) => {
    const dropdownContent = document.querySelector('.user-dropdown-content');
    if (!dropdownContent) return;

    if (e.target.closest('.user-dropdown-content')) {
        dropdownContent.style = 'display: none;';
        document.querySelector('.user-dropdown').classList.remove('active');
    }
});

window.__TAURI__.event.listen('DOMLoadLanguage', (e) => {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        document.getElementById('user-dropdown').addEventListener('click', () => {
            const dropdown = document.querySelector('.user-dropdown-content');
            dropdown.style = dropdown.style.display === 'none' ? '' : 'display: none;';
            document.querySelector('.user-dropdown').classList.toggle('active');
        });
    }
});