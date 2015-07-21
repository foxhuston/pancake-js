var config = require('./config/config.js');
var Slack = require('slack-client');
var R = require('ramda');

var slack = new Slack(config.botKey, config.autoReconnect, config.autoMark);

console.log('go!', config);

