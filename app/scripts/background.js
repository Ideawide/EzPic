'use strict';

chrome.runtime.onInstalled.addListener(function (details) {
  console.log('previousVersion', details.previousVersion);
});


chrome.runtime.onMessage.addListener(function(request, sender){
   console.debug('Links updated ', sender, request);
});
