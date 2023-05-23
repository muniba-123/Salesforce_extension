var pipelineStage = "Pipeline stage";
delayNumber = null;
delayType = "";
dateType = "";
oppName = null;
apiHost = "";
chrome.storage.sync.get(["authCode", "userId"], function (data) {
    if (data.authCode) {
        chrome.runtime.sendMessage({
            type: 'updateIcon',
            loggedIn: true
        });
    }
    else {
        chrome.runtime.sendMessage({
            type: 'updateIcon',
            loggedIn: false
        });
    }
});
var loader = document.createElement("div");
loader.classList.add("overlay");
loader.innerHTML = `<div class="loader-block">
        <img class="loader" src="chrome-extension://oehmgpkhbbgneekfeglaodobkphoplol/icons/loader.gif">
            <p class="text-block">
                 Verifying profile information<br>Please wait
            </p>
            </div>`;
var myDiv = document.createElement("div");
myDiv.classList.add('form-body');
// var isContact = true, isCust = true, hasOpp = false;//1
// var isContact = true, isCust = false, hasOpp = true;//2
// var isContact = true, isCust = false, hasOpp = false;//3
var isContact = false, isCust = false, hasOpp = false;//4
var prodName = "";
var salesrepName = "", oppStage = ""
var Jobs = [], memberId = "", contactId = "", headers, companyId = "", companyName = "", personInfo = {}, personConnectionCount = 0, status = "Contact";
var lastCallDate = "", contactCreated = "";
getTabContent = (node) => {
    let tabContent = '';
    let childNode = node.firstChild;
    while (childNode) {
        switch (childNode.nodeType) {
            case Node.ELEMENT_NODE:
                tabContent += childNode.outerHTML;
                break;
            case Node.TEXT_NODE:
                tabContent += childNode.nodeValue;
                break;
            case Node.CDATA_SECTION_NODE:
                tabContent += '<![CDATA[' + childNode.nodeValue + ']]>';
                break;
            case Node.COMMENT_NODE:
                tabContent += '<!--' + childNode.nodeValue + '-->';
                break;
            case Node.DOCUMENT_TYPE_NODE:
                tabContent += '<!DOCTYPE ' + childNode.name +
                    (childNode.publicId ? ' PUBLIC "' + childNode.publicId + '"' : '') +
                    (!childNode.publicId && childNode.systemId ? ' SYSTEM' : '') +
                    (childNode.systemId ? ' "' + childNode.systemId + '"' : '') + '>\n';
                break;
        }
        childNode = childNode.nextSibling;
    }
    return tabContent;
}
getMemberInfo = () => {
    var contentToScrap = getTabContent(document);
    debugger
    var lastIndexOfMemberId = contentToScrap.lastIndexOf('urn:li:member:') + 14;
    memberId = (lastIndexOfMemberId <= 13) ? null :
        contentToScrap.substr(lastIndexOfMemberId, 20).split(',')[0].split('&')[0].split('"')[0];
    // console.log("member ", memberId);
    chrome.runtime.sendMessage({
        type: 'parseHtml',
        contentToScrap: contentToScrap,
        memberId: memberId,
        url: window.location.href
    }, function (response) {
        if (response && response.data) {
            personInfo = response.data.person_info;
            personConnectionCount = response.data.network_info.connections;
            desc = response.data.person_info.short_description.slice(0, 99);
            Jobs = response.data.person_jobs;
        }
    });
}
validateForm = () => {
    if (document.getElementById('oppName').value.trim() !== '' && document.getElementById('prod-dropdown').value !== '' && document.getElementById('contact-date').value !== '' && document.getElementById('closed-date').value !== '' &&
        document.getElementById('prodStage').value !== '' && document.getElementById('latestJob').value !== '' &&
        document.getElementById('description').value.trim() !== '') {
        document.getElementById('submit-btn').value = "Finish";
        return true;
    }
    else {
        document.getElementById('submit-btn').value = "Create";
        return false;
    }
}
showTopBar = () => {
    if (isContact && isCust) {
        //blue bar
        myDiv.style.backgroundColor = "#43bce2";
        myDiv.innerHTML = `<div class="form-container">Already a customer 
   <span class="align-center">Product name: ${prodName} </span>
   </div>`;
    }
    else if (isContact && !isCust && hasOpp) {
        //yellow bar
        myDiv.style.backgroundColor = "#e2b643";
        myDiv.innerHTML = `<div class="form-container" style="font-weight: normal;">
    <span class="margin-right">Stage: ${oppStage} </span>
    <span class="margin-right">Full name: ${salesrepName} </span>
    <span class="margin-right">Product name: ${prodName} </span>
       <span class="margin-right">Last completed call date: ${lastCallDate}</span>
                        </div>`;
    }
    else if (isContact && !isCust && !hasOpp) {
        //green bar with update btn
        myDiv.style.backgroundColor = "#64b94f";
        myDiv.innerHTML = `<div class="form-container">
    <span>Contact created date: ${contactCreated} </span>
    <span class="align-center">No opportunity</span>
    <span id="update-btn">Create</span>
                     </div>`;
        setTimeout(() => {
            document.getElementById('update-btn').addEventListener("click", showForm);
        }, 200);
    }
    else if (!isContact) {
        //green bar with create btn
        myDiv.style.backgroundColor = "#64b94f";
        myDiv.innerHTML = `<div class="form-container"> 
    <span class="align-center">No contact in Salesforce</span>
    <span id="create-btn">Create</span>
                     </div>`;
        setTimeout(() => {
            document.getElementById('create-btn').addEventListener("click", showForm);
        }, 200);
    }
    document.getElementById('global-nav').style.padding = 0;
    document.getElementById('global-nav').prepend(myDiv);
    hideLoader();
}
getToken = () => {
    chrome.storage.sync.get("authCode", function (data) {
        if (data.authCode) {
            chrome.runtime.sendMessage({
                type: 'updateIcon',
                loggedIn: true
            });
        }
    })
    chrome.runtime.sendMessage({ type: "authorize" }, function (response) {
        // console.log(response);
        if (response && response.authCode) {
            init();
        }
    });
}
getLastContactdate = () => {
    fetch(`${apiHost}query?q=Select whoid,ActivityDate,Status,Subject,Type,Description from Task where whoid='${contactId}' AND Status='Completed' AND Subject='Call'`,
        {
            method: "GET",
            headers: headers
        })
        .then(response => {
            if (!response.ok) {
                throw response.statusText;
            }
            else
                return response.json();
        })
        .then(data => {
            // console.log(data);
            if (data.totalSize > 0) {
                lastCallDate = data.records[0].ActivityDate === null ? "" : data.records[0].ActivityDate;
                // lastCallDate = new Date(data.records[0].Log_Time__c).toLocaleDateString();
            }
            showTopBar();
        })
        .catch(error => {
            hideLoader();
            alert("Some error occured. Please try again");
            console.error("Error:", error);
        });
}
getFullname = (id) => {
    fetch(`${apiHost}query?q=Select Name from User where Id='${id}'`,
        {
            method: "GET",
            headers: headers
        })
        .then(response => {
            if (!response.ok) {
                throw response.statusText;
            }
            else
                return response.json();
        })
        .then(data => {
            // console.log(data);
            salesrepName = data.records[0].Name;
            getLastContactdate(id);
        })
        .catch(error => {
            hideLoader();
            alert("Some error occured. Please try again");
            console.error("Error:", error);
        });
}
getProductName = () => {
    //checking purchases
    fetch(`${apiHost}query?q=select id,Name,Purchase_Start__c,Purchase_Stop__c,F5_Product__r.Name,F5_Product__r.Product_Abbreviation__c,F5_Product__r.External_Id__c from Purchase__c WHERE Contact__r.LinkedIn_Member_Id__c='${memberId}' AND Active__c=true AND Purchase_Status__c in('Normal', 'Future') order by Purchase_Stop__c desc limit 1`,
        {
            method: "GET",
            headers: headers
        })
        .then(response => {
            if (!response.ok) {
                throw response.statusText;
            }
            else
                return response.json();
        })
        .then(data => {
            // console.log(data);
            if (data.totalSize !== 0) {
                isCust = true;
                hasOpp = true;
                prodName = data.records[0].F5_Product__r.Name;
                showTopBar();
            }
            else {
                //if user is a member but its latest purchase is not normal or future then let him create opportunity for this 
                isCust = false;
                hasOpp = false;
                getLastContactdate();
            }

        })
        .catch(error => {
            hideLoader();
            alert("Some error occured. Please try again");
            console.error("Error:", error);
        });
}
getStatus = () => {
    //checking isContact or not
    const query = "select Id, Name, Last_Scraped_Date__c,Status__c,(select Id,Name,CloseDate,StageName,F5_Product__r.Name,OwnerId from Opportunities__r order by CloseDate DESC LIMIT 1) from Contact WHERE LinkedIn_Member_Id__c=";
    fetch(`${apiHost}query?q=${query}'${memberId}'`,
        {
            method: "GET",
            headers: headers
        })
        .then(response => {
            if (!response.ok) {
                throw Error(response.status);
            }
            return response.json()
        })
        .then(data => {
            // console.log(data);
            isContact = (data.totalSize === 0) ? false : true;
            if (isContact) {
                oppStage = data.records[0].Opportunities__r !== null ? data.records[0].Opportunities__r.records[0].StageName : "";
                contactId = data.records[0].Id;
                if (oppStage === "Closed Lost") {
                    hasOpp = false
                }
                else if (oppStage === "Won") {
                    //checking active purchases
                    fetch(`${apiHost}query?q=select id,Name,Purchase_Start__c,Purchase_Stop__c,F5_Product__r.Name,F5_Product__r.Product_Abbreviation__c,F5_Product__r.External_Id__c from Purchase__c WHERE Contact__r.LinkedIn_Member_Id__c='${memberId}' AND Active__c=true AND Purchase_Status__c in('Normal', 'Future') order by Purchase_Stop__c desc limit 1`,
                        {
                            method: "GET",
                            headers: headers
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw response.statusText;
                            }
                            else
                                return response.json();
                        })
                        .then(purchasesData => {
                            // console.log(purchasesData);
                            if (purchasesData.totalSize !== 0) {
                                isCust = true;
                                hasOpp = true;
                                prodName = purchasesData.records[0].F5_Product__r === null ? '' : purchasesData.records[0].F5_Product__r.Name;
                            }
                            else {//no active purchases
                                //if user is a member but its latest purchase is not normal or future then let him create opportunity for this 
                                isCust = false;
                                hasOpp = false;
                            }
                            //
                            if (!isCust && hasOpp) {
                                if (data.records[0].Opportunities__r !== null) {
                                    prodName = data.records[0].Opportunities__r.records[0].F5_Product__r.Name;
                                    getFullname(data.records[0].Opportunities__r.records[0].OwnerId);
                                }
                                return;
                            }
                            if (!isCust && !hasOpp) {
                                length = data.records[0].Last_Scraped_Date__c.length;
                                //extracting date
                                var patt = /(20)\d\d(-)(0[1-9]|1[012])\2(0[1-9]|[12][0-9]|3[01])/g;
                                var result = data.records[0].Last_Scraped_Date__c.match(patt);
                                contactCreated = result === null ? '' : result[0];
                            }
                            //
                            showTopBar();
                            return;
                        })
                        .catch(error => {
                            hideLoader();
                            alert("Some error occured. Please try again");
                            console.error("Error:", error);
                        });
                }
                else if (oppStage !== "") {
                    hasOpp = true;
                }
                if (!isCust && hasOpp) {
                    if (data.records[0].Opportunities__r !== null) {

                        prodName = data.records[0].Opportunities__r.records[0].F5_Product__r.Name;
                        getFullname(data.records[0].Opportunities__r.records[0].OwnerId);
                    }
                    return;
                }
                if (!isCust && !hasOpp) {
                    length = data.records[0].Last_Scraped_Date__c.length;
                    //extracting date
                    var patt = /(20)\d\d(-)(0[1-9]|1[012])\2(0[1-9]|[12][0-9]|3[01])/g;
                    var result = data.records[0].Last_Scraped_Date__c.match(patt);
                    contactCreated = result === null ? '' : result[0];
                }
            }
            showTopBar();
        })
        .catch(error => {
            hideLoader();
            console.error("Error:", error);
            chrome.storage.sync.remove("authCode");
            chrome.runtime.sendMessage({
                type: 'updateIcon',
                loggedIn: false
            });
            // if (error.toString().search('401') !== -1) {
            // getToken();
            // }
        });
}
showForm = (e) => {
    myDiv.innerHTML = `
    <form id="info-form">
     <input type="text" class="form-element" id="oppName" placeholder="Opportunity name" maxlength="30" autocomplete="off" required/>
            <select class= "form-element" name = "prod-dropdown" id = "prod-dropdown" required>
            <option value="" selected disabled>Product name</option>
            </select>
            <input class="form-element" type="text" id="contact-date" placeholder="Next contact date" required/>
            <input class="form-element" type="text" id="closed-date" placeholder="Closed date" required/>
            <select class="form-element" id="prodStage" required>
                <option value="" selected disabled>${pipelineStage}</option>
            </select>
            <select class="form-element" id="latestJob" required>
                <option value="" selected disabled>Latest job</option>
            </select>
            <input type="text" class="form-element" id="description" placeholder="Description" maxlength="500" autocomplete="off" required/>
            <input type="submit" id="submit-btn">
        </form>`;
    setTimeout(() => {
        // document.getElementById('submit-btn').value = e.srcElement.id === "create-btn" ? "Create" : "Update";
        document.getElementById('closed-date').value = setClosedDate();
        document.getElementById('submit-btn').value = "Create";
    }, 100);
    setTimeout(() => {
        getProductList();
        getProdStage();
        getLatestjob();
        document.getElementById('oppName').addEventListener("change", validateForm);
        document.getElementById('prod-dropdown').addEventListener("change", validateForm);
        document.getElementById('contact-date').addEventListener("change", validateForm);
        document.getElementById('closed-date').addEventListener("change", validateForm);
        document.getElementById('prodStage').addEventListener("change", validateForm);
        document.getElementById('latestJob').addEventListener("change", validateForm);
        document.getElementById('description').addEventListener("keyup", validateForm);
        document.getElementById('description').addEventListener("keydown", validateForm);
        if ((new Date().getMonth() + 1) < 9) {
            month = `0${(new Date().getMonth() + 1)}`
        }
        var minDate = (new Date().getFullYear() + '-' + month + '-' + new Date().getDate()).toString();
        // console.log(minDate)
        document.getElementById('contact-date').setAttribute("min", minDate);
        document.getElementById('contact-date').addEventListener("focus",
            () => { document.getElementById('contact-date').type = 'date' }
        );
        document.getElementById('closed-date').addEventListener("focus",
            () => { document.getElementById('closed-date').type = 'date' }
        );
        document.addEventListener("keyup", hideForm);
        document.getElementById('info-form').addEventListener("submit", submitForm);
    }, 500);
}
createOpportunity = (companyId) => {
    fetch(`${apiHost}sobjects/Opportunity`,
        {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                "Name": document.getElementById('oppName').value,
                "StageName": document.getElementById('prodStage').value,
                "Start_Date__c": new Date().toISOString(),
                "CloseDate": document.getElementById('closed-date').value + `T${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`,
                "F5_Product__c": document.getElementById('prod-dropdown').value,
                "Contact__c": contactId,
                "Description": document.getElementById('description').value,
                "AccountId": companyId
            })
        })
        .then(response => {
            if (!response.ok) {
                throw response.statusText;
            }
            else
                return response.json();
        })
        .then(data => {
            if (data.id)
                init();
        })
        .catch(error => {
            hideLoader();
            alert("Some error occured. Please try again");
            console.error("Error:", error);
        });
}
createContact = (companyId) => {
    body = JSON.stringify({
        "firstName": personInfo.firstname,
        "lastName": personInfo.lastname,
        "LinkedIn_Member_Id__c": personInfo.member_id,
        "LinkedIn_Connection__c": personConnectionCount,
        "LinkedIn_Url__c": window.location.href,
        "Title": document.getElementById('latestJob').value,
        "Region__c": personInfo.region,
        "OtherCountryCode": personInfo.country,
        "Status__c": "opportunity",
        "AccountId": companyId,
        "Last_Scrap_Date_Time__c": new Date().toISOString()
    });
    fetch(`${apiHost}sobjects/Contact`,
        {
            method: "POST",
            headers: headers,
            body: body
        })
        .then(response => {
            if (!response.ok) {
                throw response.statusText;
            }
            else
                return response.json();
        })
        .then(data => {
            if (data.id) {
                contactId = data.id;
                createOpportunity(companyId);
            }
        })
        .catch(error => {
            hideLoader();
            alert("Some error occured. Please try again");
            console.error("Error:", error);
        });
}
setClosedDate = () => {
    var date = new Date(this.valueOf());
    if (delayType === "day") {
        date.setDate(date.getDate() + delayNumber);
        return date;
    }
    else if (delayType === "week") {
        date.setDate(date.getDate() + (delayNumber * 7));
        return date;
    }
    else if (delayType === "month") {
        date.setDate(date.getDate() + (delayNumber * 30));
        return date;
    }
}
createCompany = () => {
    fetch(`${apiHost}sobjects/Account`,
        {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                "Name": companyName,
                "LinkedIn_Company_ID__c": companyId
            })
        })
        .then(response => {
            if (!response.ok) {
                throw response.statusText;
            }
            else
                return response.json();
        })
        .then(data => {
            if (data.id)
                !isContact ? createContact(data.id) : createOpportunity(data.id);
        })
        .catch(error => {
            hideLoader();
            alert("Some error occured. Please try again");
            console.error("Error:", error);
        });
}
checkCompany = () => {
    companyName = document.getElementById('latestJob').value;
    var api = `${apiHost}query?q=SELECT Id,Name FROM Account WHERE Name='${encodeURIComponent(companyName)}'`;
    fetch(api, {
        method: "GET",
        headers: headers,
    })
        .then(response => {
            if (!response.ok) {
                throw response.statusText;
            }
            else
                return response.json();
        })
        .then(data => {
            // console.log(data);
            if (data.totalSize === 0) {
                //company doesn't exists
                createCompany();
            }
            else {//company already exists
                !isContact ? createContact(data.records[0].Id) : createOpportunity(data.records[0].Id);
            }
        })
        .catch(error => {
            hideLoader();
            alert("Some error occured. Please try again");
            console.error("Error:", error);
        });
}
submitForm = (e) => {
    if (Jobs.length !== 0) {
        companyName = document.getElementById('latestJob').value;
        index = Jobs(function (e) { return e.company_name; }).indexOf(companyName);
        companyId = Jobs[index].company_id;
    }
    e.preventDefault();
    showLoader();
    checkCompany();
}
hideForm = (e) => {
    if (e.key === "Escape") {
        if (isContact && !isCust && !hasOpp) {
            myDiv.innerHTML = `<div class="form-container">
          <span id="contactDate">  Contact created date: ${contactCreated} </span>
    <span class="align-center">No opportunity</span>
    <span id="update-btn">Create</span>
                     </div>`;
            setTimeout(() => {
                document.getElementById('update-btn').addEventListener("click", showForm);
            }, 200);
        }
        else {
            myDiv.innerHTML = `<div class="form-container"> 
    <span class="align-center">No contact in Salesforce</span>
    <span id="create-btn">Create</span>
                     </div>`;
            setTimeout(() => {
                document.getElementById('create-btn').addEventListener("click", showForm);
            }, 200);
        }
    }
}
getProductList = () => {
    fetch(`${apiHost}query?q=select Name,Id,Product_Abbreviation__c, Active_new__c from F5_Product__c where Active_new__c=true`,
        {
            method: "GET",
            headers: headers
        })
        .then(response => {
            if (!response.ok) {
                throw response.statusText;
            }
            else
                return response.json();
        })
        .then(data => {
            // console.log(data);
            var products = data.records;
            for (var i = 0; i < products.length; i++) {
                var option = document.createElement("option");
                option.value = products[i].Id;
                option.innerText = products[i].Name;
                document.getElementById('prod-dropdown').appendChild(option);
            }
        })
        .catch(error => {
            hideLoader();
            alert("Some error occured. Please try again");
            console.error("Error:", error);
        });
}
getProdStage = () => {
    fetch(`${apiHost}sobjects/Opportunity/describe`,
        {
            method: "GET",
            headers: headers
        })
        .then(response => {
            if (!response.ok) {
                throw response.statusText;
            }
            else
                return response.json();
        })
        .then(data => {
            // console.log(data);
            var stages = [];
            index = data.fields.map(function (e) { return e.name; }).indexOf('StageName');
            stages = data.fields[index].picklistValues.map((e) => ({
                id: e.label,
                name: e.value
            }))
            for (var i = 0; i < stages.length; i++) {
                var option = document.createElement("option");
                option.value = stages[i].id;
                option.innerText = stages[i].name;
                document.getElementById('prodStage').appendChild(option);
            }
        })
        .catch(error => {
            hideLoader();
            alert("Some error occured. Please try again");
            console.error("Error:", error);
        });
}
getLatestjob = () => {
    var temp = [];
    //filtering only current jobs
    for (let i = 0; i < Jobs.length; i++) {
        if (Jobs[i].end_date !== null) {
            if (Jobs[i].end_date.length === 0) {
                temp.push(Jobs[i])
            }
        }
        else if (Jobs[i].end_date === null && Jobs[i].start_date === null) {
            temp.push(Jobs[i])
        }
    }
    Jobs = temp;
    if (Jobs.length === 0) document.getElementById('latestJob').removeAttribute('required');
    //Jobs = Jobs.filter(job => job.end_date.length === 0);
    for (var i = 0; i < Jobs.length; i++) {
        var option = document.createElement("option");
        option.value = Jobs[i].company_name;
        option.innerText = Jobs[i].job_title.toString() + "--" + Jobs[i].company_name.toString();
        document.getElementById('latestJob').appendChild(option);
    }
    if (Jobs.length === 1) {
        document.getElementById('latestJob').value = Jobs[0].company_name;
        return;
    }
}
showLoader = () => {
    let overlay = document.querySelector('.overlay');
    overlay.style.display = "block";
}
hideLoader = () => {
    let overlay = document.querySelector('.overlay');
    overlay.style.display = "none";
}
isProfilepage = () => {
    return window.location.href.search("https://www.linkedin.com/in/") !== -1;
}
init = () => {
    if (!isProfilepage()) {
        return;
    }
    chrome.storage.sync.get(["flag", "authCode", "userId", "pipelineStage", "delayNumber", "delayType", "dateType", "oppName", "url"], function (data) {
        if (!data.flag) return;
        pipelineStage = data.pipelineStage;
        delayNumber = data.delayNumber;
        delayType = data.delayType;
        dateType = data.dateType;
        oppName = data.oppName;
        apiHost = data.url;
        if (data.authCode) {
            chrome.runtime.sendMessage({
                type: 'updateIcon',
                loggedIn: true
            });
            headers = {
                "Content-Type": "application/json; charset=utf-8",
                'Accept': "application/json",
                'Authorization': `Bearer ${data.authCode}`,
            }
            if (document.querySelector('.overlay') === null) {
                document.querySelector('.authentication-outlet').prepend(loader);
            }
            showLoader();
            setTimeout(() => {
                getMemberInfo();
                getStatus();
            }, 2000);
        }
    });
}
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type == "getStatus") {
        init();
    }
    if (message.type == "reloadPage") {
        window.location.reload();
    }
    return true;
});
window.addEventListener("load", () => {
    // chrome.storage.sync.remove("authCode");//tbr
    // chrome.runtime.sendMessage({
    //     type: 'updateIcon',
    //     loggedIn: false
    // });
    init();
});


