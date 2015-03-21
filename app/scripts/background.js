'use strict';

var suggessions = [];

chrome.runtime.onInstalled.addListener(
    function (details) {
        console.log('previousVersion', details.previousVersion);
    });

chrome.runtime.onMessage.addListener(
    function (request, sender) {
        //Search iframe ignore
        if (sender.tab.index === -1)
            return;

        console.debug('Links updated ', sender, request);
        suggessions = request.data;
    });

chrome.omnibox.onInputChanged.addListener(
    function (text, suggest) {
        var sug = _(suggessions)
            .map(function (link) {
                return {
                    content: link.title,
                    description: link.url
                }
            }).take(10).value();
        console.debug('Suggestions for %s ', text, sug);
        suggest(sug);
    });

chrome.omnibox.onInputEntered.addListener(
    function (text) {
        console.debug('Selected : ' + text);
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {data: text});
        });

    });