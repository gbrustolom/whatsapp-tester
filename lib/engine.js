let IS_RUNNING = false;
let IS_RECORDING = false;
let IS_TESTING = false;
let CURRENT_RECORDING = [];
let CURRENT_TEST_FILE = [];
let ERROR_LOG = [];
let OBSERVER;
let LAST_CONTACT_INPUT;
let KEEP_AWAKE;

//Document Selectors
let OBSERVER_TARGET = '[role="application"]';
let SEND_TARGET = '[data-icon="send"]';
let TEXT_BOX_TARGET = '#main .copyable-area [contenteditable="true"][role="textbox"]';
let MODAL_TARGET = '[data-animate-modal-popup="true"]';
let MENU_LIST_TARGET = '._ak8q, ._ak8k';
let MODAL_CLOSE_TARGET = '[data-icon=x]';
let CHAT_CONTENT_TARGET = 'img, span, [role="button"],[data-icon="msg-video"]';
let IGNORE_CLASSES_TARGET = ['quoted-mention _11JPr', '_3FuDI _11JPr', 'p0s8B','x1rg5ohu x16dsc37', '_amk7'];
let IGNORE_DATA_ICON = ['msg-time', 'list-msg-icon'];
let UNSUPPORTED_CONTENTS = ['FILE', 'AUDIO'];
let KEEP_AWAKE_TARGET = 'div.x3psx0u.xwib8y2.xkhd6sd.xrmvbpv';


/************************************* Extension Observer *************************************/
const observerCallback = async function (mutationsList) {

    for (let mutation of mutationsList) {

        if (mutation.type === 'childList') {

            if (mutation.addedNodes.length > 0 && mutation.addedNodes[0].role === 'row') {
                await getMessageAsync(mutation.addedNodes[0]);
            }

        }
    }
};

function startObserver() {

    OBSERVER = new MutationObserver(observerCallback);

    const targetNode = document.querySelector(OBSERVER_TARGET);
    const config = { attributes: true, childList: true, subtree: true };

    OBSERVER.observe(targetNode, config);
    console.log("Running.");

};

function stopObserver() {

    OBSERVER.disconnect();
    console.log("Disconnected.");

};


/************************************* Core Functions *************************************/


function startRecording() {

    startObserver();
    IS_RECORDING = true;
    showMessage("Recording", "error");

}

function stopRecording() {

    stopObserver();
    IS_RECORDING = false;
    showMessage("Recording Stopped", "info");
    if (CURRENT_RECORDING.length > 0) {
        saveData(CURRENT_RECORDING, "test");
        CURRENT_RECORDING = [];
    }

}

async function startTesting() {

    startObserver();
    IS_TESTING = true;
    showMessage("Testing", "process");

   // KEEP_AWAKE = setInterval(keepAwake, 5000);
    
    await sendMessage();

}

function stopTesting() {

    clearInterval(KEEP_AWAKE);
    stopObserver();
    IS_TESTING = false;
    CURRENT_TEST_FILE = [];

}

const saveData = (function () {
    var a = document.createElement("a");
    return function (data, fileName) {
        var json = JSON.stringify(data),
            blob = new Blob([json], { type: "octet/stream" }),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = `${fileName} ${getFormatDate()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());


async function getMessageAsync(mutationNode) {

    let getMessageContent = new Promise(function (resolve) {

        //Get All Potential Chat Content

        let targetNodes = [...mutationNode.querySelectorAll(CHAT_CONTENT_TARGET)];

        let source = getSource(targetNodes);

        //Ignore empty elements and response elements
        let messageText = targetNodes
            .filter(x => !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](\s(AM|PM))?$/gmi.test(x.textContent) &&
                !IGNORE_CLASSES_TARGET.includes(x.className) && !IGNORE_DATA_ICON.includes(x.getAttribute("data-icon"))

            ).map((x) => {

                try {
                    if (x.nodeName === "SPAN") {

                        if (x.getAttribute("data-icon") === 'msg-video') {
                            return "VIDEO";
                        }

                        if (x.getAttribute("data-icon") === 'audio-play') {
                            return "AUDIO";
                        }

                        if (x.getAttribute("data-meta-key") === 'type') {
                            return "FILE";
                        }

                        if (x.parentNode.dir === 'auto')  //response from list menu, remove extra content
                        {
                            return x.textContent.split('\n')[0];
                        }

                        if (x.dir === 'auto') {
                            return '';
                        }


                        return x.textContent;
                    }
                    else {
                        if (x.nodeName === "IMG") {

                            if (/emoji/gm.test(x.src) || /emoji/gm.test(x.className)) {
                                return x.classList.contains('selectable-text')? x.alt : '';
                            }

                            return x.nodeName;
                        }
                        if (x.role === "button") {
                            //If list menu, open it to get content
                            if (x.childNodes[0].childNodes[0].getAttribute('data-icon') === 'list-msg-icon') {
                                x.click();
                                return x;
                            }
                        }
                        return x;
                    }
                }
                catch (e) {
                    return x;
                }

            }).filter(x => x != '');

        resolve({ 'messages': messageText, 'source': source });

    });

    const result = await getMessageContent.then(function (data) { return getModalData(data); });

    if (IS_TESTING || IS_RECORDING) {
        handleResult(result);
    }

}

function getModalData(data) {

    let mappedData = data.messages.map((x) => {

        try {
            //should run only for menu list
            if (x.role === "button" && x.childNodes[0].childNodes[0].getAttribute('data-icon') == 'list-msg-icon') {
                let modal = [...document.querySelectorAll(MODAL_TARGET)[0].querySelectorAll(MENU_LIST_TARGET)].map(x => x.textContent);
                document.querySelectorAll(MODAL_CLOSE_TARGET)[0].click();
                return { "buttonTitle": x.title, "buttonContent": modal };
            }
            else {
                // regular text message
                return x;
            }

        }
        catch (e) {
            return x;
        }

    }).filter(x => x.nodeName != 'DIV');

    return { "source": data.source, "messages": Array.from(new Set(mappedData)) };
}

async function handleResult(result) {

    if (IS_TESTING && result.source === 'contato') {
        LAST_CONTACT_INPUT = result;
    }

    if (IS_TESTING && result.source === 'bot') {
        let expectedResponse = CURRENT_TEST_FILE.shift();

        //if result doesn't match expected content, throw 
        if (JSON.stringify(expectedResponse) !== JSON.stringify(result)) {

            showMessage("Test Failed", "error");
            ERROR_LOG.push({ 'input': LAST_CONTACT_INPUT, 'expected': expectedResponse, 'result': result });
            saveData(ERROR_LOG, 'error-log');
            ERROR_LOG = [];
            CURRENT_TEST_FILE = [];

            stopTesting();
        }
        else {
            //if content is ok, check if test is done
            if (IS_TESTING && CURRENT_TEST_FILE.length == 0) {

                showMessage("Test Passed", "success");
                stopTesting();
            }
            else {
                //If test not done, proceed to send next message 
                await sendMessage();
            }
        }

    }

    if (IS_RECORDING) {

        if (hasUnsupportedData(result) || result.messages.length == 0) {
            showMessage("Unsupported Content", "error");
            CURRENT_RECORDING = [];

            setTimeout(() => {
                stopRecording();

            }, 3000);


        }
        else {
            CURRENT_RECORDING.push(result);
        }


    }

}

function hasUnsupportedData(result) {
    return UNSUPPORTED_CONTENTS.some(x => result.messages.includes(x));
}

/*************************************** Sending Message **************************************/

async function sendMessage() {

    if (CURRENT_TEST_FILE[0].source === "contato") {

        let nextInput = CURRENT_TEST_FILE.shift().messages[0];

        if (nextInput === 'IMG') {
            await sendImage();
        }
        else {
            if (nextInput === 'VIDEO') {
                await sendVideo();
            }
            else {
                await sendText(nextInput);
            }
        }

    }
}

async function sendText(message) {
    await setupTextContent(message)
    document.querySelectorAll(SEND_TARGET)[0].click();
}

async function sendImage() {
    await setupImageContent();
    document.querySelectorAll(SEND_TARGET)[0].click();
}

async function sendVideo() {
    await setupVideoContent();
    document.querySelectorAll(SEND_TARGET)[0].click();
}

async function dispatchCustomEvent(event) {
    let el = document.querySelector(TEXT_BOX_TARGET);
    el.focus()
    document.execCommand("selectall");
    el.dispatchEvent(event)
    return await waitForPastedData(el, 0)
}

async function setupTextContent(text) {
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text', text);
    const event = new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true
    });
    await dispatchCustomEvent(event);
}

async function setupImageContent() {

    let file = dataURLtoFile(MOCK_IMG, 'img-sample.png');

    let dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const event = new ClipboardEvent('paste', {
        clipboardData: dataTransfer
    });

    await dispatchCustomEvent(event);
}

async function setupVideoContent() {

    let file = dataURLtoFile(MOCK_VIDEO, 'video-sample.mp4');

    let dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const event = new ClipboardEvent('paste', {
        clipboardData: dataTransfer
    });

    await dispatchCustomEvent(event);
}

function waitForPastedData(elem, old) {
    if (elem.childNodes && elem.childNodes.length == old) {
        return true
    }
    else {
        old = elem.childNodes.length
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(waitForPastedData(elem, old));
            }, 2000);
        });

    }
}

function dataURLtoFile(dataurl, filename) {
    var arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[arr.length - 1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

/******************************************* Utils ***********************************************/

function keepAwake()
{
    const event = new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'End',
        key: 'End',
        cancelable: true,
        composed: true,
        keyCode: 35,
        returnValue: true,
        which: 35
    });

    let el = document.querySelector(KEEP_AWAKE_TARGET);
    el.focus()
    document.execCommand("selectall");
    el.dispatchEvent(event);
}

function onReaderLoad(event) {
    try {
        var obj = JSON.parse(event.target.result);
        if (obj.length > 0) {
            CURRENT_TEST_FILE = obj;
            showMessage("File loaded successfully.", "info");
        }
    }
    catch (e) {
        CURRENT_TEST_FILE = [];
        showMessage("File is empty or invalid.", "info");
    }
}

function openTestFile() {
    try {
        var input = document.createElement("input");
        input.type = 'file';
        input.click();
        input.addEventListener('change', (event) => {
            const reader = new FileReader();
            reader.onload = onReaderLoad;
            reader.readAsText(event.target.files[0]);
        });
    }
    catch (e) {
        console.log("File loaded failed.\n", e);
    }
}

function getFormatDate() {
    let date = new Date();
    let dateStr =
        ("00" + date.getDate()).slice(-2) + "-" +
        ("00" + (date.getMonth() + 1)).slice(-2) + "-" +
        date.getFullYear() + " " +
        ("00" + date.getHours()).slice(-2) + ":" +
        ("00" + date.getMinutes()).slice(-2) + ":" +
        ("00" + date.getSeconds()).slice(-2);

    return dateStr;
}

function getSource(targetNodes) {

    let isContactMessage = targetNodes.some((x) => {
        try {
            let ariaLabel = x.getAttribute('aria-label');
            return ariaLabel === 'Você:' || ariaLabel === 'Eu:';
        }
        catch (e) {
            return false;
        }
    });

    return isContactMessage ? "contato" : "bot";
}

/**********************************************************************************************/