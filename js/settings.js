/* Settings Button, Top Bar */
const settingsAnimationLength = 200; // ms
let isAnimatingSettings = false;

export const closeSettings = () => {
    if (isAnimatingSettings) return;
    isAnimatingSettings = true;
    const settingsTab = document.querySelector('.settings-tab');
    const settingsOverlay = document.querySelector('.settings-overlay');
    console.log(settingsTab);
    console.log(settingsOverlay);
    
    TweenLite.to(settingsTab, settingsAnimationLength / 1000, { x: 475, ease: Power2.easeInOut });

    setTimeout(() => {
        settingsOverlay.style.display = 'none';
        isAnimatingSettings = false;
    }, settingsAnimationLength);
};

export const openSettings = () => {
    if (isAnimatingSettings) return;
    if (document.querySelector('.settings-overlay').style.display === 'block') {
        document.querySelector('.close-settings').click();
        return;
    };

    isAnimatingSettings = true;
    const settingsTab = document.querySelector('.settings-tab');
    const settingsOverlay = document.querySelector('.settings-overlay');

    settingsOverlay.style.display = 'block';
    TweenLite.to(settingsTab, settingsAnimationLength / 1000, { x: 0, ease: Power2.easeInOut });

    setTimeout(() => {
        isAnimatingSettings = false;
    }, settingsAnimationLength);
};