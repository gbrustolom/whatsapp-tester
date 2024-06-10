/****************************************** Messages ******************************************/

function showMessage(message, messageType) {

    if (!document.getElementById("snackbar")) {
        let sb = document.createElement("div");
        sb.id = "snackbar";
        document.querySelector('footer').prepend(sb);
    }

    const sb = document.getElementById("snackbar");
    sb.className = messageType;
    sb.innerText = message;

    setTimeout(function () { sb.className = sb.className.replace(messageType, ""); }, 3000);

}


/****************************************** Buttons ******************************************/

function recordClick(element) {

    if (isReady()) {

        if (element.innerText === '🔴 Record Test') {
            element.innerText = "🟥 Stop Recording";
            startRecording();
        }
        else {
            element.innerText = "🔴 Record Test";
            stopRecording();
        }
    }

}

function loadClick(element) {

    if (isReady()) {

        openTestFile();

        setTimeout(() => {

            if(!document.getElementById("run"))
            {
                let runBtn = document.createElement('a');
                runBtn.id = "run";
                runBtn.innerText = "▶️ Run Test";
                runBtn.addEventListener('click', function () { runClick(this); });
                document.getElementById("actions").appendChild(runBtn);
            }
            
        },2000);

    }

}

function runClick(element)
{
    if(element.innerText === '▶️ Run Test')
    {
        element.innerText = "⏹️ Stop Test";
        startTesting();
    }
    else
    {
        document.getElementById("actions").removeChild(element);
        stopTesting();
        showMessage("Test Stopped", "info");
    }

}


function isReady() {
    return document.querySelector('[role="application"]') !== null;
}


function mouseOverMainButton()
{
    if (isReady()) {

        //avoid trying to run when there is no file.
        let element = document.getElementById("run");
        // handle forced stops
        let recordBtn = document.getElementById("record");

        if(!IS_RECORDING && recordBtn.innerText == "🟥 Stop Recording")
        {
            recordBtn.innerText = "🔴 Record Test";
        }

        if (CURRENT_TEST_FILE.length == 0 && element) {
            document.getElementById("actions").removeChild(element);
        }

    }

}

function AddButton(element) {
    let menuHtmlString = `
    <div class="dropdown">
        <div id="mainButton" class="dropdown-button">🧪</div>
        <div id="actions" class="dropdown-content">
        <a id="record">🔴 Record Test</a>
        <a id="load">📁 Load Test File</a>
        </div>
    </div>
  `;
    let menuHtml = document.createRange()
        .createContextualFragment(menuHtmlString);
    element.prepend(menuHtml);

    document.getElementById("mainButton").addEventListener('mouseover', function () { mouseOverMainButton(); });
    document.getElementById("record").addEventListener('click', function () { recordClick(this); });
    document.getElementById("load").addEventListener('click', function () { loadClick(this); });

}


