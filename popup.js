let authenticate = document.getElementById("authenticate-btn");
authenticate.onclick = function () {
    authenticate.disabled = true;
    chrome.storage.sync.get("authCode", function (data) {
        if (data.authCode) {
            window.close();
        }
        else {
            // authenticate.setAttribute("backgroundImage", "icons/btn-loader.svg");
            chrome.runtime.sendMessage({ type: "authorize" }, function (response) {
                authenticate.disabled = false;
                // console.log("Popup.js", chrome.runtime.lastError);
                // console.log("Popup.js", response);
                if (response && response.authCode) {
                    get_data_from_salesforce();
                    setTimeout(() => {
                        window.close();
                    }, 1000);

                }
            });
        }
    });
}
// chrome.storage.sync.remove("authCode");
chrome.storage.sync.get("authCode", function (data) {
    if (data.authCode) {
        window.close();
        // document.getElementById("authenticate-btn").style.display = "none";
    }
});
get_data_from_salesforce = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "getStatus" }, function (response) {
            // console.log("getStatusErr", chrome.runtime.lastError);
            // console.log("getStatus", response);
            // window.close();
        });
    });
}

