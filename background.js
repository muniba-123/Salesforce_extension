let linkedin_tabs = {};
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type == "authorize") {
    var redirectURL = chrome.identity.getRedirectURL();
    // const clientID = "3MVG9LlLrkcRhGHb33TuqCPuzS.5D5AtSyvmFNAQudoH4SiSfvDUzLjoYLPxGL1.WBL5byz.Za6M3PwA8FWh6";
    let authURL = `${domainUrl}authorize`;
    authURL += `?client_id=${clientID}`;
    authURL += `&response_type=token`;
    authURL += `&redirect_uri=${encodeURIComponent(redirectURL)}`;
    chrome.identity.launchWebAuthFlow(
      {
        interactive: true,
        url: authURL
      },
      function (response) {
        // console.log("OAuth Response: " + response);
        if (response) {
          authCode = decodeURIComponent(
            response.match(/\#(?:access_token)\=([\S\s]*?)\&/)[1]
          );
          //getting userid now
          fetch(`${domainUrl}userinfo`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json; charset=utf-8",
                'Accept': "application/json",
                'Authorization': `Bearer ${authCode}`,
              }
            })
            .then(response => response.json())
            .then(data => {

              chrome.storage.sync.set({ authCode: authCode, userId: data.user_id }, function () {
                // console.log("the auth code is:", authCode);
                chrome.browserAction.setIcon({ path: "/icons/logo16.png" });
              });
              sendResponse({ authCode: authCode });
            })
        }
      }
    );
  }
  else if (message.type == "parseHtml") {
    $.ajax({
      method: 'POST',
      url: 'http://data.insights-improve.com/api/parse/html',
      data: {
        url: message.url,
        member_id: message.memberId,
        source: message.contentToScrap,
        token: IItoken,
      },
    }).done((response) => {

      // console.log(response);
      sendResponse({ data: response });
    }).error((exception) => {
    });
  }
  else if (message.type === "updateIcon") {
    if (message.loggedIn) {
      chrome.browserAction.setIcon({ path: "/icons/logo16.png" });
    } else {
      chrome.browserAction.setIcon({ path: "/icons/icon16.png" });
    }
  }
  return true;
});
updateTabsArray = (tab) => {
  const tabId = tab.id || null;
  if (!tabId) return;
  if (tab.url.indexOf('linkedin') > -0x1 && !Object.keys(linkedin_tabs).includes(tab.id.toString())) linkedin_tabs[tab.id.toString()] = tab.url;
  else if (tab.url.indexOf('linkedin') === -0x1 && Object.keys(linkedin_tabs).includes(tab.id.toString())) delete linkedin_tabs[tab.id.toString()];
}
function sendMessage(tabId, type) {
  chrome.tabs.sendMessage(tabId, type, function () { });
}
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {

  if (changeInfo.status === 'complete') {
    updateTabsArray(tab);
    if (Object.keys(linkedin_tabs).includes(tabId.toString())) {
      // console.log(linkedin_tabs);
      if (linkedin_tabs[tabId.toString()] != tab.url) {
        if (Object.keys(linkedin_tabs).includes(tab.id.toString()) && linkedin_tabs[tab.id.toString()] != tab.url)
          linkedin_tabs[tab.id.toString()] = tab.url;

        sendMessage(tab.id, {
          'type': 'reloadPage'
        });
      }
    }
  }
});

