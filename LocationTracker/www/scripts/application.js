define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function initialize() {
        document.addEventListener('deviceready', onDeviceReady, false);
        document.addEventListener('pause', onPause, false);
        document.addEventListener('resume', onResume, false);
    }
    exports.initialize = initialize;
    var client;
    var currentUser = {};
    var isLoggedIn = false;
    var deviceUserID;
    var deviceFlag;
    var userTable;
    var deviceTable;
    var locationsTable;
    var userDevicesTable;
    var feedbackTable;
    var requestsTable;
    var locationsArray = [];
    var map;
    var admobId;
    var tracker;
    var tempTracker;
    function onDeviceReady() {
        checkTerms();
        client = new WindowsAzure.MobileServiceClient("https://blockertechlocationtracker.azurewebsites.net");
        userTable = client.getTable("Users");
        deviceTable = client.getTable("Devices");
        locationsTable = client.getTable("Locations");
        requestsTable = client.getTable("Requests");
        userDevicesTable = client.getTable("UserDevices");
        feedbackTable = client.getTable("Feedback");
        intializeDevice();
        initializeBackgroundMode();
        $('#signInWithGoogle').click(startLogin);
        $('#sendRequest').click(createDeviceRequest);
        $('#refreshButton').click(refreshDevice);
        $('#agreeButton').click(setTermsToAgreed);
        $('#dontAgreeButton').click(setTermsToDisagree);
        $('#sendFeedback').click(sendFeedback);
        $('#viewOnMapButton').click(showMap);
        $('#mapPageBack').click(hideMap);
        $('#navTermsPage').click(showTermsPageFromProfile);
        $('#navPrivacyPage').click(showPrivacyPageFromProfile);
        $('#removeDeviceButton').click(showRemovePage);
        $('#removePageBack').click(removeToProfile);
        $('#viewRequestsButton').click(showRequests);
        $('#requestsPageBack').click(requestToProfile);
        $('#locationsPageBack').click(locationToDevice);
        $('#devicesPageBack').click(devicesToProfile);
        $('#termsPageButton').click(showTermsPageFromMain);
        $('#termsPageBack').click(showMainPageFromTerms);
        $('#privacyPageBack').click(showMainPageFromPrivacy);
        $('#privacyPageButton').click(showPrivacyPageFromMain);
        $('#howToUse').click(showHowToUsePage);
        $('#howToUsePageBack').click(hideHowToUsePage);
        $('#supportButton').click(supportPrompt);
        $('#profileSupportButton').click(supportPrompt);
        $('#donateButton').click(showDonatePage);
        $('#donatePageBack').click(hideDonatePage);
        cordova.plugins.backgroundMode.on('activate', startTracking);
        navigator.geolocation.getCurrentPosition(function (success) { }, function (error) { });
        $('.loader').fadeOut(function () {
            initializePages();
            initializeAd();
        });
    }
    function checkTerms() {
        if (localStorage.getItem("terms") == null || localStorage.getItem("terms") == "false") {
            agreeToTerms();
            $('#termsPageBack').click(showMainPageFromTerms);
        }
        else {
            $('#terms-bottom-navbar').hide();
            $('#termsPageBack').click(showMainPageFromTerms);
        }
    }
    function setTermsToAgreed() {
        localStorage.setItem("terms", "true");
        showMainPageFromTerms();
        //$('#signInWithGoogle').show();
    }
    function setTermsToDisagree() {
        localStorage.setItem("terms", "false");
        showMainPageFromTerms();
        supportPrompt();
        messagePrompt("Please agree to the terms & conditions before signing in.");
        //$('#signInWithGoogle').hide();
    }
    function checkConnection() {
        var networkState = navigator.connection.type;
        var states = {};
        states[Connection.UNKNOWN] = 'Unknown connection';
        states[Connection.ETHERNET] = 'Ethernet connection';
        states[Connection.WIFI] = 'WiFi connection';
        states[Connection.CELL_2G] = 'Cell 2G connection';
        states[Connection.CELL_3G] = 'Cell 3G connection';
        states[Connection.CELL_4G] = 'Cell 4G connection';
        states[Connection.CELL] = 'Cell generic connection';
        states[Connection.NONE] = 'No network connection';
        if (states[networkState] == 'No network connection') {
            console.log("No network connection");
            return false;
        }
        else {
            console.log("Connected to network");
            return true;
        }
    }
    function initializeAd() {
        // select the right Ad Id according to platform
        if (/(android)/i.test(navigator.userAgent)) {
            admobId = {
                banner: 'ca-app-pub-4672297660394369/5324702239',
                interstitial: 'ca-app-pub-4672297660394369/9878190766'
            };
        }
        if (AdMob)
            AdMob.createBanner({
                adId: admobId.banner,
                position: AdMob.AD_POSITION.BOTTOM_CENTER,
                autoShow: true,
                isTesting: false
            });
    }
    function agreeToTerms() {
        navigator.notification.confirm("You must read and agree to the terms and conditions before using the Location Tracker.", function (buttonIndex) {
            if (buttonIndex == 1) {
                showTermsPageFromMain();
            }
            else {
                supportPrompt();
            }
        }, "Location Tracker", ["Ok", "Cancel"]);
    }
    function intializeDevice() {
        deviceTable
            .where({ uuid: device.uuid })
            .read()
            .then(function (results) {
            if (results.length > 0) {
                deviceUserID = results[0].UserID;
                deviceFlag = true;
            }
            else {
                deviceFlag = false;
            }
        });
    }
    function initializeBackgroundMode() {
        cordova.plugins.backgroundMode.enable();
        cordova.plugins.backgroundMode.overrideBackButton();
        cordova.plugins.backgroundMode.setDefaults({
            title: "Location Tracker",
            text: "Location tracking in background",
            icon: 'icon.png',
            color: '000',
            resume: true,
            hidden: true,
        });
    }
    function startLogin() {
        if (localStorage.getItem("terms") == null || localStorage.getItem("terms") == "false") {
            agreeToTerms();
            $('#termsPageBack').click(showMainPageFromTerms);
        }
        else {
            $('#terms-bottom-navbar').hide();
            $('#termsPageBack').click(showMainPageFromTerms);
            if (checkConnection() == true) {
                if (deviceFlag == false) {
                    navigator.notification.confirm("Once logged in, this device and all locations will be bound to your account. Do you wish to continue?", function (buttonIndex) {
                        if (buttonIndex == 1) {
                            loginGoogle();
                        }
                        else {
                            supportPrompt();
                        }
                    }, "Location Tracker", ["OK", "Cancel"]);
                }
                else {
                    loginGoogle();
                }
            }
            else {
                messagePrompt("Your celluar data or wifi must be on to use this app.");
            }
        }
    }
    function loginGoogle() {
        var lockedOut = false;
        client.login('google')
            .then(function () {
            callAuthMe(function (result) {
                currentUser.firstName = searchForGivenName(result);
                currentUser.lastName = searchForSurName(result);
                currentUser.email = result[0].user_id;
                currentUser.emailVerified = searchForEmailVerified(result);
                currentUser.picture = searchForPicture(result);
                userTable
                    .where({ userId: client.currentUser.userId })
                    .read()
                    .then(function (results) {
                    if (results.length <= 0) {
                        if (currentUser.emailVerified == false) {
                            messagePrompt("Please verify your email before you use the Location Tracker");
                        }
                        else {
                            userTable.insert({ userId: client.currentUser.userId, email: currentUser.email, firstName: currentUser.firstName, lastName: currentUser.lastName, lockedOut: false, emailVerified: currentUser.emailVerified });
                            onSuccessfulLogin();
                        }
                    }
                    else {
                        currentUser.id = results[0].id;
                        userTable.update(currentUser);
                        if (results[0].lockedOut == false) {
                            onSuccessfulLogin();
                        }
                        else {
                            messagePrompt("Your account has been locked. Please contact the support team at support@blockertech.com");
                        }
                    }
                }).done(function () {
                    if (deviceFlag == false) {
                        deviceTable
                            .insert({
                            uuid: device.uuid,
                            userId: client.currentUser.userId,
                            nickName: currentUser.firstName + "'s " + device.model
                        });
                    }
                });
            }, function (error) {
                console.log(error.message);
            });
        }, function (error) {
            console.log(error.message);
        });
    }
    function searchForPicture(result) {
        for (var i in result[0]["user_claims"]) {
            var pos = -1;
            var str = result[0]["user_claims"][i]["typ"];
            pos = str.search("picture");
            if (pos >= 0) {
                str = result[0]["user_claims"][i]["val"];
                var url = str.replace(/\\/g, "");
                console.log("Picture : " + url);
                return url;
            }
        }
    }
    function searchForEmailVerified(result) {
        for (var i in result[0]["user_claims"]) {
            var pos = -1;
            var str = result[0]["user_claims"][i]["typ"];
            pos = str.search("email_verified");
            if (pos >= 0) {
                if (result[0]["user_claims"][i]["val"] == "false") {
                    console.log("Email verified");
                    return false;
                }
                else {
                    console.log("Email not verified");
                    return true;
                }
            }
        }
    }
    function searchForGivenName(result) {
        for (var i in result[0]["user_claims"]) {
            var pos = -1;
            var str = result[0]["user_claims"][i]["typ"];
            pos = str.search("givenname");
            if (pos >= 0) {
                return result[0]["user_claims"][i]["val"];
            }
        }
    }
    function searchForSurName(result) {
        for (var i in result[0]["user_claims"]) {
            var pos = -1;
            var str = result[0]["user_claims"][i]["typ"];
            pos = str.search("surname");
            if (pos >= 0) {
                return result[0]["user_claims"][i]["val"];
            }
        }
    }
    function onSuccessfulLogin() {
        $("#mainPage").fadeOut(function () {
            if (AdMob)
                AdMob.prepareInterstitial({ adId: admobId.interstitial, autoShow: true, isTesting: false });
        });
        startTempTracker();
        isLoggedIn = true;
        setProfile();
        loadData();
    }
    function setProfile() {
        $('#profile-picture-container').empty();
        var img = document.createElement("img");
        img.setAttribute("src", currentUser.picture);
        img.className = "w3-center";
        $('#userWelcome').text("Welcome, " + currentUser.firstName);
        $('#profile-picture-container').append(img);
    }
    function callAuthMe(successCallback, failCallback) {
        var req = new XMLHttpRequest();
        req.open("GET", "https://blockertechlocationtracker.azurewebsites.net" + "/.auth/me", true);
        req.setRequestHeader('X-ZUMO-AUTH', client.currentUser.mobileServiceAuthenticationToken);
        req.onload = function (e) {
            if (e.target.status >= 200 && e.target.status < 300) {
                console.log(e.target.response);
                successCallback(JSON.parse(e.target.response));
                return;
            }
            failCallback('Data request failed. Status ' + e.target.status + ' ' + e.target.response);
        };
        req.onerror = function (e) {
            failCallback('Data request failed: ' + e.error);
        };
        req.send();
    }
    function loadData() {
        hidePages();
        $('.loader').fadeIn(function () {
            populateCurrentDevices();
            populateRequests();
            removeDeviceRequest();
        });
        setTimeout(function () {
            $('.loader').fadeOut(function () {
                $('#profilePage').fadeIn();
            });
        }, 2000);
    }
    function populateCurrentDevices() {
        $('#devicesTableBody').empty();
        var tdView = document.createElement("td");
        var tdPicture = document.createElement("td");
        var picture = document.createElement("img");
        var viewBtn = document.createElement("a");
        var viewGlyph = document.createElement("span");
        var tdUser = document.createElement("td");
        var tr = document.createElement("tr");
        viewGlyph.className = "glyphicon glyphicon-eye-open";
        viewGlyph.style.fontSize = "18px";
        userDevicesTable
            .where({ grantedUserId: currentUser.email, permission: true })
            .read()
            .then(function (results) {
            for (var i = 0; i < results.length; i++) {
                var user;
                var userId;
                var pictureUrl;
                userTable.where({ userId: results[i].userId })
                    .read()
                    .then(function (results) {
                    user = results[0].email;
                    userId = results[0].userId;
                    //////pictureUrl = results[0].picture;
                    tdUser.innerText = user;
                    //picture.setAttribute("src", pictureUrl);
                    //picture.style.width = "28px";
                    viewBtn.appendChild(viewGlyph);
                    viewBtn.onclick = function () {
                        loadUserDevices(userId);
                    };
                    //tdPicture.appendChild(picture);
                    tdView.appendChild(viewBtn);
                    //tr.appendChild(tdPicture);
                    tr.appendChild(tdUser);
                    tr.appendChild(tdView);
                    $('#devicesTableBody').append(tr);
                });
            }
        });
    }
    function populateRequests() {
        $('#requestsTableBody').empty();
        var i;
        var requestFrom;
        var requestID;
        var tr = document.createElement("tr");
        var tdUser = document.createElement("td");
        var tdApprove = document.createElement("td");
        var tdDeny = document.createElement("td");
        var approveBtn = document.createElement("button");
        var denyBtn = document.createElement("button");
        var okGlyph = document.createElement("span");
        var denyGlyph = document.createElement("span");
        okGlyph.className = "glyphicon glyphicon-ok-sign";
        okGlyph.style.color = "green";
        denyBtn.className = "btn btn-default";
        denyGlyph.className = "glyphicon glyphicon-remove-sign";
        denyGlyph.style.color = "red";
        requestsTable
            .where({ requestTo: currentUser.email, deleted: false })
            .read()
            .then(function (results) {
            $("#requestsCount").text(results.length);
            for (i = 0; i < results.length; i++) {
                requestFrom = results[i].requestFrom;
                requestID = results[i].id;
                tdUser.innerText = requestFrom;
                approveBtn.className = "btn btn-default";
                approveBtn.onclick = function () {
                    navigator.notification.confirm("Are you sure you want to grant " + requestFrom + " permission to monitor your locations?", function (buttonIndex) {
                        if (buttonIndex == 1) {
                            approveRequest(tr, requestID, requestFrom);
                        }
                    }, "Confirm", ["Yes", "No"]);
                };
                denyBtn.onclick = function () {
                    navigator.notification.confirm("Are you sure you want to deny " + requestFrom + " permission to monitor your locations?", function (buttonIndex) {
                        if (buttonIndex == 1) {
                            denyRequest(tr, requestID, requestFrom);
                        }
                    }, "Confirm", ["Yes", "No"]);
                };
                approveBtn.appendChild(okGlyph);
                denyBtn.appendChild(denyGlyph);
                tdApprove.appendChild(approveBtn);
                tdDeny.appendChild(denyBtn);
                tr.appendChild(tdUser);
                tr.appendChild(tdApprove);
                tr.appendChild(tdDeny);
                $('#requestsTableBody').append(tr);
            }
        });
    }
    function approveRequest(tr, requestId, requestFrom) {
        var request = { id: requestId, requestTo: currentUser.email, requestFrom: requestFrom, permission: true, deleted: true };
        requestsTable.update(request).then(function () {
            messagePrompt("Request Approved");
        }).done(function () {
            requestsTable.del({ id: requestId });
            $(tr).fadeOut(500, function () {
                $(tr).remove();
                var currentRequests = parseInt($("#requestsCount").text());
                if (currentRequests > 0) {
                    currentRequests--;
                }
                $("#requestsCount").text(currentRequests);
            });
        });
        deviceTable
            .where({ UserID: client.currentUser.userId })
            .read()
            .then(function (results) {
            for (var i = 0; i < results.length; i++) {
                userDevicesTable.insert({
                    UserID: client.currentUser.userId,
                    permission: true,
                    grantedUserId: requestFrom,
                    uuid: results[i].uuid
                });
            }
        });
    }
    function denyRequest(tr, requestId, requestFrom) {
        var request = { id: requestId, requestTo: currentUser.email, requestFrom: requestFrom, permission: false, deleted: true };
        requestsTable.update(request).then(function () {
            messagePrompt("Request Denied");
        }).done(function () {
            requestsTable.del({ id: requestId });
            $(tr).fadeOut(500, function () {
                $(tr).remove();
                var currentRequests = parseInt($("#requestsCount").text());
                if (currentRequests > 0) {
                    currentRequests--;
                }
                $("#requestsCount").text(currentRequests);
            });
        });
    }
    function createDeviceRequest() {
        var user = $('#requestedUserEmail').val();
        if (user == "") {
            messagePrompt("Field cannot be empty");
        }
        else {
            if (user == currentUser.email) {
                messagePrompt("You cannot send a request to yourself.");
            }
            else {
                requestsTable
                    .where({ requestFrom: currentUser.email, requestTo: user })
                    .read()
                    .then(function (results) {
                    if (results < 1) {
                        userTable
                            .where({ email: user })
                            .read()
                            .then(function (results) {
                            if (results.length > 0) {
                                requestsTable.insert({
                                    requestFrom: currentUser.email,
                                    requestTo: user,
                                    permission: false
                                }).then(function () {
                                    messagePrompt("Request Sent");
                                });
                            }
                            else {
                                messagePrompt("Email not found");
                            }
                        });
                    }
                    else {
                        messagePrompt("You already sent a request to this user.");
                    }
                });
            }
        }
    }
    function removeDeviceRequest() {
        $('#removeTableBody').empty();
        var i;
        var grantedUser;
        var permissionId;
        var tr = document.createElement("tr");
        var tdUser = document.createElement("td");
        var denyGlyph = document.createElement("span");
        var tdRemove = document.createElement("td");
        var removeBtn = document.createElement("button");
        denyGlyph.className = "glyphicon glyphicon-remove-sign";
        denyGlyph.style.color = "red";
        removeBtn.className = "btn btn-default";
        denyGlyph.className = "glyphicon glyphicon-remove-sign";
        denyGlyph.style.color = "red";
        userDevicesTable
            .where({ userId: client.currentUser.userId, permission: true, deleted: false })
            .read()
            .then(function (results) {
            for (i = 0; i < results.length; i++) {
                grantedUser = results[i].grantedUserId;
                permissionId = results[i].id;
                tdUser.innerText = grantedUser;
                removeBtn.onclick = function () {
                    navigator.notification.confirm("Are you sure you want to stop " + grantedUser + " from having access to your locations?", function (buttonIndex) {
                        if (buttonIndex == 1) {
                            removeUser(tr, permissionId, grantedUser);
                        }
                    }, "Confirm", ["Yes", "No"]);
                };
                removeBtn.appendChild(denyGlyph);
                tdRemove.appendChild(removeBtn);
                tr.appendChild(tdUser);
                tr.appendChild(tdRemove);
                $('#removeTableBody').append(tr);
            }
        });
    }
    function removeUser(tr, permissionId, grantedUser) {
        var permission = { id: permissionId, grantedUserId: grantedUser, permission: false };
        userDevicesTable.update(permission).then(function () {
            messagePrompt("User removed");
        }).done(function () {
            userDevicesTable.del({ id: permissionId });
            $(tr).fadeOut(500, function () {
                $(tr).remove();
            });
        });
    }
    function refreshDevice() {
        loadData();
    }
    function loadUserDevices(user) {
        $('#userDevicesTableBody').empty();
        var nickname;
        var uuid;
        var tr = document.createElement("tr");
        var tdDevice = document.createElement("td");
        var tdView = document.createElement("td");
        var viewBtn = document.createElement("a");
        var viewGlyph = document.createElement("span");
        var i;
        viewGlyph.className = "glyphicon glyphicon-eye-open";
        viewGlyph.style.fontSize = "18px";
        viewBtn.appendChild(viewGlyph);
        deviceTable.where({ userId: user })
            .read()
            .then(function (results) {
            if (results.length > 0) {
                for (i = 0; i < results.length; i++) {
                    nickname = results[i].nickName;
                    uuid = results[i].uuid;
                    tdDevice.innerText = nickname;
                    viewBtn.onclick = function () {
                        loadDeviceLocations(uuid);
                    };
                    tdView.appendChild(viewBtn);
                    tr.appendChild(tdDevice);
                    tr.appendChild(tdView);
                    $('#userDevicesTableBody').append(tr);
                }
                showDevicesPage();
            }
        });
    }
    function loadDeviceLocations(device) {
        $('#locationsTableBody').empty();
        locationsArray = [];
        var tdLocation = document.createElement("td");
        var tdTime = document.createElement("td");
        var tr = document.createElement("tr");
        var date;
        locationsTable.where({ uuid: device })
            .read()
            .then(function (results) {
            if (results.length > 0) {
                var length = results.length - 1;
                $('#viewOnMapButton').show();
                for (var i = length; i >= 0; i--) {
                    locationsArray.push(results[i]);
                    tdLocation.innerText = results[i].address;
                    date = new Date(results[i].createdAt);
                    tdTime.innerText = date.toLocaleString();
                    tr.appendChild(tdLocation);
                    tr.appendChild(tdTime);
                    $('#locationsTableBody').append(tr);
                }
            }
            else {
                $('#viewOnMapButton').hide();
            }
        })
            .done(showLocationsPage);
    }
    function initializeMap() {
        var location;
        var date;
        var contentString;
        var center = { lat: locationsArray[0].latitude, lng: locationsArray[0].longitude };
        map = new google.maps.Map(document.getElementById('googleMap'), {
            zoom: 4,
            center: center
        });
        if (locationsArray != []) {
            for (var i = 0; i < locationsArray.length; i++) {
                location = { lat: locationsArray[i].latitude, lng: locationsArray[i].longitude };
                date = new Date(locationsArray[i].createdAt);
                contentString = '<div id="content" style="color:#000;">' +
                    '<div id="siteNotice">' +
                    '</div>' +
                    '<h1 id="firstHeading" class="firstHeading">' + locationsArray[i].address + '</h1>' +
                    '<div id="bodyContent">' +
                    '<p><b>' + date.toLocaleString() + '</b></p>' +
                    '</div>' +
                    '</div>';
                var infoWindow = new google.maps.InfoWindow();
                var marker = new google.maps.Marker({
                    position: location,
                    map: map
                });
                google.maps.event.addListener(marker, 'click', (function (marker, contentString, infowindow) {
                    return function () {
                        infowindow.setContent(contentString);
                        infowindow.open(map, marker);
                    };
                })(marker, contentString, infoWindow));
            }
        }
    }
    function sendFeedback() {
        var feedback = $('#feedBackInput').val();
        if (feedback == "") {
            messagePrompt("Field cannot be empty");
        }
        else {
            feedbackTable.insert({ feedback: feedback, user: currentUser.email });
            messagePrompt("Thank you for your feedback!");
        }
    }
    function onPause() {
        // TODO: This application has been suspended. Save application state here.
    }
    function onResume() {
        if (checkConnection() == false) {
            initializePages();
            messagePrompt("Your celluar data or wifi must be on to use this app.");
        }
    }
    function startTracking() {
        clearTempTracker();
        var geocoder = new google.maps.Geocoder;
        var latlng;
        cordova.plugins.backgroundMode.disableWebViewOptimizations();
        tracker = setInterval(function () {
            if (checkConnection() == true) {
                if (isLoggedIn == true) {
                    navigator.geolocation.getCurrentPosition(function (position) {
                        latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                        geocoder.geocode({ 'location': latlng }, function (results, status) {
                            if (status == google.maps.GeocoderStatus.OK) {
                                locationsTable.insert({ Address: results[0].formatted_address, userId: currentUser.id, uuid: device.uuid, Latitude: position.coords.latitude, Longitude: position.coords.longitude });
                            }
                        });
                    }, function (e) { return console.log(e); }, { maximumAge: 3000, enableHighAccuracy: true });
                }
            }
        }, 180000);
    }
    function startTempTracker() {
        var geocoder = new google.maps.Geocoder;
        var latlng;
        tempTracker = setInterval(function () {
            if (checkConnection() == true) {
                if (isLoggedIn == true) {
                    navigator.geolocation.getCurrentPosition(function (position) {
                        latlng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                        geocoder.geocode({ 'location': latlng }, function (results, status) {
                            if (status == google.maps.GeocoderStatus.OK) {
                                locationsTable.insert({ Address: results[0].formatted_address, userId: client.currentUser.userId, uuid: device.uuid, Latitude: position.coords.latitude, Longitude: position.coords.longitude });
                            }
                        });
                    }, function (e) { return console.log(e); }, { maximumAge: 3000, enableHighAccuracy: true });
                }
            }
        }, 180000);
    }
    function clearTempTracker() {
        clearInterval(tempTracker);
    }
    //PAGE FUNCTIONS
    function showMap() {
        $("#locationsPage").fadeOut(function () {
            $("#mapPage").fadeIn(function () {
                initializeMap();
                if (AdMob)
                    AdMob.showInterstitial();
            });
        });
    }
    function hideMap() {
        $("#mapPage").fadeOut(function () {
            $("#locationsPage").fadeIn();
        });
    }
    function hidePages() {
        $("#mainPage").fadeOut(function () {
            document.getElementById("mainPage").style.visibility = "visible";
        });
        $("#profilePage").fadeOut(function () {
            document.getElementById("profilePage").style.visibility = "visible";
        });
        $("#settingsPage").fadeOut(function () {
            document.getElementById("settingsPage").style.visibility = "visible";
        });
        $("#termsPage").fadeOut(function () {
            document.getElementById("termsPage").style.visibility = "visible";
        });
        $("#privacyPage").fadeOut(function () {
            document.getElementById("privacyPage").style.visibility = "visible";
        });
        $("#requestsPage").fadeOut(function () {
            document.getElementById("requestsPage").style.visibility = "visible";
        });
        $("#locationsPage").fadeOut(function () {
            document.getElementById("locationsPage").style.visibility = "visible";
        });
        $("#devicesPage").fadeOut(function () {
            document.getElementById("devicesPage").style.visibility = "visible";
        });
        $("#mapPage").fadeOut(function () {
            document.getElementById("mapPage").style.visibility = "visible";
        });
        $("#removePage").fadeOut(function () {
            document.getElementById("removePage").style.visibility = "visible";
        });
        $("#howToUsePage").fadeOut(function () {
            document.getElementById("howToUsePage").style.visibility = "visible";
        });
        $("#donatePage").fadeOut(function () {
            document.getElementById("donatePage").style.visibility = "visible";
        });
    }
    function initializePages() {
        $("#mainPage").show(function () {
            document.getElementById("mainPage").style.visibility = "visible";
        });
        $("#profilePage").fadeOut(function () {
            document.getElementById("profilePage").style.visibility = "visible";
        });
        $("#settingsPage").fadeOut(function () {
            document.getElementById("settingsPage").style.visibility = "visible";
        });
        $("#termsPage").fadeOut(function () {
            document.getElementById("termsPage").style.visibility = "visible";
        });
        $("#privacyPage").fadeOut(function () {
            document.getElementById("privacyPage").style.visibility = "visible";
        });
        $("#requestsPage").fadeOut(function () {
            document.getElementById("requestsPage").style.visibility = "visible";
        });
        $("#locationsPage").fadeOut(function () {
            document.getElementById("locationsPage").style.visibility = "visible";
        });
        $("#devicesPage").fadeOut(function () {
            document.getElementById("devicesPage").style.visibility = "visible";
        });
        $("#mapPage").fadeOut(function () {
            document.getElementById("mapPage").style.visibility = "visible";
        });
        $("#removePage").fadeOut(function () {
            document.getElementById("removePage").style.visibility = "visible";
        });
        $("#howToUsePage").fadeOut(function () {
            document.getElementById("howToUsePage").style.visibility = "visible";
        });
        $("#donatePage").fadeOut(function () {
            document.getElementById("donatePage").style.visibility = "visible";
        });
    }
    function showRequests() {
        $("#profilePage").fadeOut(function () {
            $("#requestsPage").fadeIn();
        });
    }
    function requestToProfile() {
        $("#requestsPage").fadeOut(function () {
            $("#profilePage").fadeIn();
        });
    }
    function showLocationsPage() {
        $("#devicesPage").fadeOut(function () {
            $("#locationsPage").fadeIn();
        });
    }
    function locationToDevice() {
        $("#locationsPage").fadeOut(function () {
            $("#devicesPage").fadeIn();
        });
    }
    function showDevicesPage() {
        $("#profilePage").fadeOut(function () {
            $("#devicesPage").fadeIn();
        });
    }
    function devicesToProfile() {
        $("#devicesPage").fadeOut(function () {
            $("#profilePage").fadeIn();
        });
    }
    function showRemovePage() {
        $("#profilePage").fadeOut(function () {
            $("#removePage").fadeIn();
        });
    }
    function removeToProfile() {
        $("#removePage").fadeOut(function () {
            $("#profilePage").fadeIn();
        });
    }
    function showTermsPageFromMain() {
        $("#mainPage").fadeOut(function () {
            $("#termsPage").fadeIn();
        });
    }
    function showTermsPageFromProfile() {
        $("#profilePage").fadeOut(function () {
            $("#termsPage").fadeIn();
        });
    }
    function showMainPageFromTerms() {
        $("#termsPage").fadeOut(function () {
            $("#mainPage").fadeIn();
        });
    }
    function showPrivacyPageFromMain() {
        $("#mainPage").fadeOut(function () {
            $("#privacyPage").fadeIn();
        });
    }
    function showMainPageFromPrivacy() {
        $("#privacyPage").fadeOut(function () {
            $("#mainPage").fadeIn();
        });
    }
    function showPrivacyPageFromProfile() {
        $("#profilePage").fadeOut(function () {
            $("#privacyPage").fadeIn();
        });
    }
    function showProfilePageFromTerms() {
        $("#profilePage").fadeOut(function () {
            $("#mainPage").fadeIn();
        });
    }
    function showHowToUsePage() {
        $("#mainPage").fadeOut(function () {
            $("#howToUsePage").fadeIn();
        });
    }
    function hideHowToUsePage() {
        $("#howToUsePage").fadeOut(function () {
            $("#mainPage").fadeIn();
        });
    }
    function showDonatePage() {
        $("#profilePage").fadeOut(function () {
            $("#donatePage").fadeIn();
        });
    }
    function hideDonatePage() {
        $("#donatePage").fadeOut(function () {
            $("#profilePage").fadeIn();
        });
    }
    ///ALERTS
    function messagePrompt(message) {
        navigator.notification.alert(message, // message
        function () { }, // callback
        'Location Tracker', // title
        'Done' // buttonName
        );
    }
    function supportPrompt() {
        navigator.notification.alert("If you have any questions about the Location Tracker, please contact our support team support@blockertech.com", // message
        function () { }, // callback
        'Contact Us', // title
        'Done' // buttonName
        );
    }
});
//# sourceMappingURL=application.js.map