slack.on('open', function () {
    channels = [];
    groups = [];
    unreads = slack.getUnreadCount();

    console.log('open!');

    channels = R.pluck('name', R.filter(function (c) {
            return c.is_member;
        }, R.values(slack.channels)));

    console.log(channels);
    
});

slack.on('message', function(message) {
    var channel = slack.getChannelGroupOrDMById(message.channel);
    var user = slack.getUserByID(message.user);
    response = '';



});

slack.on('error', function (e) {
    console.error('slack error', e);
});
