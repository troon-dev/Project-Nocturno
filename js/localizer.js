let dictionary;
const defaultLanguage = "en";

Object.byString = function(o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, '');           // strip a leading dot
    var a = s.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
        var k = a[i];
        if (k in o) {
            o = o[k];
        } else {
            return;
        }
    }
    return o;
}

class HTMLLocalizer {
    constructor() {
        if (!customElements.get('localized-text')) {
            customElements.define('localized-text', LocalizedTextElement);
        }
    }
}

class LocalizedTextElement extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        var key = this.hasAttribute('key') ? this.getAttribute('key') : '';
        var lang = this.hasAttribute('lang') ? this.getAttribute('lang') : this.getLang();
        const translation = this.translate(key, lang);
        if (!translation) console.warn(`Translation not found for key: ${key}`);
        this.innerHTML = (translation || key).replace(/\n/g, "<br>");
    }

    getLang() {
        if (window.language && dictionary[window.language]) return window.language;
        var lang = (navigator.languages != undefined) ? navigator.languages[0] : navigator.language;
        return lang.split("-")[0];
    }

    translate(key, lang) {
        return (lang in dictionary) ? Object.byString(dictionary[lang], key) : Object.byString(dictionary[defaultLanguage], key);
    }
}

window.getTranslation = (key) => {
    var lang = (window.language && dictionary[window.language]) ? window.language : defaultLanguage;
    const translation = (lang in dictionary) ? Object.byString(dictionary[lang], key) : Object.byString(dictionary[defaultLanguage], key);
    if (!translation) console.warn(`Translation not found for key: ${key}`);
    return translation || key;
}

const init = async () => dictionary = await (await fetch("_lang.json")).json();
init();

document.addEventListener('DOMLoadLanguage', async () => {
    console.log("Language:", window.language);

    if (!dictionary) await init();
    new HTMLLocalizer();
 
    var langSelect = document.getElementById("lang-select");
    for (var lang in dictionary) {
        var option = document.createElement("option");
        option.value = lang;
        option.text = dictionary[lang]["language"];
        langSelect.add(option);
    }

    langSelect.value = window.language;

    var elements = document.querySelectorAll("[placeholder-localize]");
    elements.forEach(element => {
        var key = element.getAttribute("placeholder-localize");
        element.placeholder = window.getTranslation(key);
    });
});