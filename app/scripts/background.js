'use strict';
var ANY_TEXT = '(.*)';

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
        var textChars = text.split('');
        var regexBody = ANY_TEXT + _.map(textChars,function (c) {
            return c + ANY_TEXT;
        }).join('');
        var regex = new RegExp(regexBody, 'i');


        var sug = _(suggessions)
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

                var rank = _(matches).compact().size() - _(matches).size() ;

                return {
                    content: link.title,
                    description: descriptionWithURL,
                    rank: rank
                }
            })
            .sortBy('rank')
            .map(function(sub){
                return _.omit(sub, 'rank');
            })
            .take(5).value();
        console.debug('Suggestions for %s ', text, sug);
        suggest(sug);
    });

chrome.omnibox.onInputEntered.addListener(
    function (text) {
        console.debug('Selected : ' + text);
        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {data: text});
        });

    });