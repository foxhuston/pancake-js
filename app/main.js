var config = require('./config/config.js');
var Slack = require('slack-client');
var R = require('ramda');
var path = require('path');
var fs = require('fs');

var pluginDir = path.join(__dirname, 'plugins/');

var slack = new Slack(config.botKey, config.autoReconnect, config.autoMark);

slack.on('open', function () {
    
    var sChannels = slack.channels;

    var channels = [];
    var groups = [];
    var unreads = slack.getUnreadCount();

    channels = R.pluck('name', R.filter(function (c) {
            return c.is_member;
        }, R.values(sChannels)));

    var c = R.values(sChannels)[0];

    if(R.any(R.prop('initNeedsBacklog'), plugins)) {
        c._onFetchHistory = function (rawLog) {
            var ms = R.pluck('text', rawLog.messages);

            R.forEach(function (p) {
                p.init(ms);
            }, plugins);
        };
        
        c.fetchHistory();
    } else {
        R.forEach(function (p) {
            p.init();
        }, plugins);
    }
});

slack.on('message', function(message) {
    var channel = slack.getChannelGroupOrDMByID(message.channel);
    var user = slack.getUserByID(message.user);

    var replyFn = (function closeOver(channel) {
        return function (response) {
            channel.send(response);
        };
    })(channel);

    if(message.type === 'message' && message.text) {
        // Need to make this synchronous, so that only one plugin
        // responds

        var toMe = message.text.match(slack.self.id) 
                    || message.text.match(slack.self.name)
                    || channel.getType() === 'DM';

        R.forEach(function(p) {
            p.message(user, message.text, toMe, replyFn);
        }, plugins);
    }

});

slack.on('error', function (e) {
    console.error('slack error', e);
});

// Main

// Thanks to http://stackoverflow.com/questions/5364928/node-js-require-all-files-in-a-folder 
// for this one

var plugins = [];

fs.readdirSync(pluginDir).forEach(function (file) {
    var stat = fs.statSync(pluginDir + file);
    if(stat.isDirectory()) {
        plugins.push(require(pluginDir + file));
    }
});

console.log(plugins);

plugins = R.sortBy(R.prop('priority'), plugins);

slack.login();
