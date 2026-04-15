// ==UserScript==
// @name         Twitch to Youtube Upload Button
// @description  Add a bulk "Twitch to Youtube Export" button
// @namespace    http://tampermonkey.net/
// @version      2026-04-15
// @author       xurei
// @website      https://about.xurei.io
// @match        https://dashboard.twitch.tv/u/*/content/video-producer
// @updateURL    https://raw.githubusercontent.com/xurei/twitch-to-youtube-export-btn/refs/heads/main/userscript.js
// @downloadURL  https://raw.githubusercontent.com/xurei/twitch-to-youtube-export-btn/refs/heads/main/userscript.js
// @supportURL   https://github.com/xurei/twitch-to-youtube-export-btn/issues
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitch.tv
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    function log(...args) {
        console.log('[Twitch to Youtube Export Button]', ...args);
    }

    function queryByText(parentElement, selector /*string*/, text /*string*/) {
        return Array.from(parentElement.querySelectorAll(selector)).find((el) => {
            return el.textContent?.trim() === text;
        });
    }

    function upToParent(element, tag) {
        const targetTag = tag.toUpperCase();
        let current = element;

        while (current) {
            if (current.tagName === targetTag) {
                return current;
            }
            current = current.parentElement;
        }

        return null;
    }

    function duplicateBefore(element) {
        const clone = element.cloneNode(true);
        element.parentElement?.insertBefore(clone, element);
        return clone;
    }

    async function waitFor(selectorFn) {
        const publishBtn = selectorFn();
        if (!publishBtn) {
            log('Waiting for UI to load...');
            await (new Promise(r => setTimeout(r, 1000)));
            return waitFor(selectorFn);
        }
        else {
            return publishBtn;
        }
    }

    async function startUpload() {
        const video_cards = [...document.querySelectorAll('[data-a-target="video-card"]')].map(card => {
            let k = 20;
            while (k > 0 && card.nodeName !== 'A') {
                card = card.parentNode;
                k--;
            }
            return card;
        });

        const exportedTitles = [];

        for (const video_card of video_cards) {
            // Checkbox checked ? If not, skip
            const checkbox = video_card.querySelector('input[type="checkbox"]');
            if (!checkbox.checked) {
                continue;
            }

            const overlay = document.querySelector('.ReactModal__Overlay');
            if (overlay) {
                overlay.click();
            }
            await new Promise(r => setTimeout(r, 100));

            const date_label = video_card.querySelector('[data-test-selector="video-card-publish-date-selector"]').innerText;
            const button = video_card.querySelector('[data-a-target="video-card-menu-toggle-button"]');
            button.click();
            await new Promise(r => setTimeout(r, 100));
            document.querySelector('[data-test-selector="video-card-main-menu-export"]').click();
            await new Promise(r => setTimeout(r, 100));

            // -- Modal is open --

            const modal = document.querySelector('.export-youtube-modal');

            const title_input = modal.querySelector('input[aria-labelledby="ye-title-label"]');
            const title = title_input.value;

            // Define title of Youtube video
            const export_title = `${date_label} - ${title}`;

            // Hacking the React input
            var nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeTextAreaValueSetter.call(title_input, export_title);
            const event = new Event('input', { bubbles: true});
            title_input.dispatchEvent(event);

            modal.querySelector('input[name="video-manager-youtube-export-visibility-unlisted"]').click();

            log(date_label, title);
            await new Promise(r => setTimeout(r, 500));
            //queryByText(modal, 'button', 'Cancel').click();
            queryByText(modal, 'button', 'Start Export').click();
            await new Promise(r => setTimeout(r, 1000));

            exportedTitles.push(export_title);
        }
        return exportedTitles;
    }

    log('Loading...');

    const publishBtn = upToParent(await waitFor(() => queryByText(document, 'div[data-a-target="tw-core-button-label-text"]', 'Publish')), 'button');

    const publishBtnParent = publishBtn.parentElement;
    const exportBtnParent = duplicateBefore(publishBtnParent);
    //exportBtnParent.classList.remove(exportBtnParent.classList.item(exportBtnParent.classList.length - 1));
    const exportBtn = exportBtnParent.querySelector('button');
    exportBtn.disabled = false;
    exportBtn.classList.remove(exportBtn.classList.item(exportBtn.classList.length - 1));
    exportBtn.querySelector('div[data-a-target="tw-core-button-label-text"]').innerText = "Export to Youtube";
    exportBtn.querySelector('svg').parentNode.innerHTML = `<img src="https://www.google.com/s2/favicons?sz=24&domain=youtu.be">`;
    exportBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        exportBtn.disabled = true;
        if (confirm('This will automatically upload all the video you checked and upload them to your Youtube channel.\nVideos will be exported as unlisted.\n\nContinue ?', 'Ready to export')) {
            const exportedTitles = await startUpload();
            if (exportedTitles.length > 0) {
                alert(`Exported :\n${exportedTitles.join('\n')}`);
            }
            else {
                alert('No video selected, nothing has been exported');
            }
        }
        exportBtn.disabled = false;
    });


    // Copie des classes d'un autre bouton pour qu'il aie les bonnes classes
    const videoBtn = await waitFor(() => document.querySelector('[data-a-target="video-card-highlight"] > a'));
    const videoBtnParent = await waitFor(() => document.querySelector('[data-a-target="video-card-highlight"] > a'));
    const activeClassName = videoBtn.classList.item(videoBtn.classList.length - 1);
    exportBtn.classList.add(activeClassName);
    //exportBtnParent.classList.add(activeClassName);

    log('Ready !');
})();

