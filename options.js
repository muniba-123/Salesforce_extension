document.getElementById("save-button").onclick = () => {
    var obj = {
        pipelineStage: document.getElementById("pipelineStage").value,
        delayNumber: document.getElementById("delayNumber").value,
        delayType: document.getElementById("delayType").value,
        dateType: document.getElementById("dateType").value,
        oppName: document.getElementById("oppName").value,
        url: document.getElementById("url").value,
        flag: true
    }
    if (validateForm()) {
        chrome.storage.sync.set(obj, function () {
            console.log("url", obj.url);
        });
    }
    else
        alert("Fill the required fields first")
}
validateForm = () => {
    if (document.getElementById('url').value.trim() !== '') {
        return true;
    }
    else {
        return false;
    }
}