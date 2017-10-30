(function () {
    "use strict";

    // Add an event listener to call our initialization routine when the host is ready
    document.addEventListener('deviceready', checkAppForUpdate);

    document.addEventListener("resume", checkAppForUpdate);

   function checkAppForUpdate(){
       codePush.checkForUpdate(function (update) {
           if (!update) {
               console.log("The app is up to date.");
           } else {
               //codePush.sync();
           }
       });
    }

})();