'use strict';
var SELECT_FROM_BELOW = 'Select a link from the below list to click it.',
    LOADING_SUGGESTIONS = 'Loading suggestions. Please wait till the page is fully loaded';

var ANY_TEXT = '(.*)',
    suggessions = [],
    currentTab = 0;

function getCurrentTab(callback) {
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        if (_.isEmpty(tabs)) {
            console.error("No tab is selected");
        } else {
            var currentTabId = tabs[0].id;
            tabChanged(currentTabId);
            if (callback)
                callback(currentTabId);
        }
    });
}

function tabChanged(tabId) {
    console.debug('Tab changed', tabId);
    if (_.isEmpty(suggessions[tabId]))
        setDefaultSuggestion(LOADING_SUGGESTIONS);
    else
        setDefaultSuggestion(SELECT_FROM_BELOW);
    currentTab = tabId;
}

function setDefaultSuggestion(suggestion) {
    chrome.omnibox.setDefaultSuggestion({
        description: suggestion
    });
}

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
        suggessions[sender.tab.id] = request.data;
    });

chrome.omnibox.onInputChanged.addListener(
    function (text, suggest) {
        var sug;
        if (currentTab) {
            var textChars = text.split('');
            var regexBody = ANY_TEXT + _.map(textChars,function (c) {
                return c + ANY_TEXT;
            }).join('');
            var regex = new RegExp(regexBody, 'i');

            sug = _(suggessions[currentTab])
                .filter(function (link) {
                    return regex.test(link.title);
                })
                .map(function (link) {

                    var matches = link.title.match(regex);
                    var startPhrase = matches[1];
                    var description = startPhrase + _(matches).slice(2).reduce(function (desc, title, index) {
                        desc += '<match>' + textChars[index] + '</match>' + title;
                        return desc;
                    }, '');
                    var descriptionWithURL = description + ' <url>' + _.escape(link.url) + '</url>';

                    var rank = _(matches).compact().size() - _(matches).size();

                    return {
                        content: link.title,
                        description: descriptionWithURL,
                        rank: rank
                    }
                })
                .sortBy('rank')
                .map(function (sub) {
                    return _.omit(sub, 'rank');
                })
                .take(5).value();
            if (_.isEmpty(sug)) {
                var message = "No links found in this page";
                sug = [
                    {content: message, description: message}
                ];
            }
            console.debug('Suggestions for %s ', text, sug);
        } else {
            sug = [];
            console.error('No tab is selected');
        }

        suggest(sug);
    });

chrome.omnibox.onInputEntered.addListener(
    function (text) {
        console.debug('Selected : ' + text);
        chrome.tabs.sendMessage(currentTab, {data: text});
    });

chrome.tabs.onActiveChanged.addListener(tabChanged);
chrome.tabs.onUpdated.addListener(tabChanged);
chrome.tabs.onRemoved.addListener(function (tabId) {
    if (suggessions[tabId])
        delete suggessions[tabId];
});



getCurrentTab();
setDefaultSuggestion(LOADING_SUGGESTIONS);
