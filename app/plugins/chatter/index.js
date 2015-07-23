var fs = require('fs');
var R = require('ramda');
var parse = require('./parse');

var chatterFile = require('path').join(__dirname, 'chatter.json');

var Stop = function (stopChar) { 
    this.isStop = true;
    this.stopChar = stopChar;
    this.getStopChar = function () {
        return '';
    }
};

var chatData = {
    start: { stop: { count: 0 }, words: { } },
    words: { }
};


var updateChain = function(fromWordOrStart, toWordOrStop) {
    var balanceProbabilities = function(entry) {
        var total = entry.stop && entry.stop.count ? entry.stop.count : 0;
        total += R.sum(R.pluck('count', R.values(entry.words)));

        if(entry.stop) {
            entry.stop.probability = entry.stop.count / total;
        }

        R.forEach(function (w) {
            w.probability = w.count / total;
        }, R.values(entry.words));
    };

    var updateEntry = function(entry, word) {
        if(word.isStop) {
            if(entry.stop) {
                entry.stop.count++;
            } else {
                entry.stop = { count: 1, probability: 0 };
            }
        } else {
            if(entry.words[word]) {
                entry.words[word].count++;
            } else {
                entry.words[word] = { count: 1, probability: 0 };
            }
        }

        balanceProbabilities(entry);
    };

    if(typeof fromWordOrStart === 'boolean' && fromWordOrStart) {
        updateEntry(chatData.start, toWordOrStop);
    } else {
        if(!(fromWordOrStart in chatData.words)) {
            chatData.words[fromWordOrStart] = { words: { }, stop: { count: 0, probability: 0 } };
        }
        
        updateEntry(chatData.words[fromWordOrStart], toWordOrStop);
    }
}

var generateChain = function (dat) {
    dat = dat.replace(/[\n"()]/g, ' ');

    var sentences = R.filter(function (x) { return x.length > 1; }, parse(dat));

    R.forEach(function(words) {
        words.push(new Stop());

        updateChain(true, words[0]);

        var wpairs = R.zip(words, R.drop(1, words));

        R.forEach(function (word) {
            updateChain(word[0], word[1]);
        }, wpairs);

    }, sentences);
};

var generateSentence = function (fromWord) {
    var cadr = R.lensIndex(1);

    var genWord = function(entry) {
        var wordProbs = R.map(R.over(cadr, R.prop('probability')), R.toPairs(entry.words));
        var stopProb = entry.stop && entry.stop.probability ? entry.stop.probability : 0;

        wordProbs.push([new Stop(), stopProb]);

        wordProbs = R.reverse(R.sortBy(R.view(cadr), R.filter(function (x) {
            return R.view(cadr, x) > 0;
        }, wordProbs)));

        var i = Math.random();
        var wp = new Stop();

        while(i > 0) {
            wp = wordProbs.pop();
            if(!wp) {
                return new Stop();
            }
            i -= wp[1];
        }

        return wp[0];
    }

    var w;

    if(!fromWord) {
        w = genWord(chatData.start);
    } else {
        w = genWord(chatData.words[fromWord]);
    }

    if(w.isStop) {
        return w.getStopChar();
    }

    var shouldPrevSpace = fromWord && !(w.match(/^[.?!,]/))

    return (shouldPrevSpace ? ' ' : '') + w + generateSentence(w);
};

// Bot connectors

exports.priority = 10000;

exports.initNeedsBacklog = !fs.existsSync(chatterFile);

exports.init = function(dat) {
    if(dat) {
        R.forEach(function(d) { generateChain(d); }, dat);
        fs.writeFile(chatterFile, JSON.stringify(chatData));
    } else {
        chatData = require(chatterFile);
    }
};

exports.message = function(who, message, toMe, replyFn) {
    generateChain(message);
    fs.writeFile(chatterFile, JSON.stringify(chatData));
    
    var chance = Math.random();

    if(toMe || chance > 0.90) {
        replyFn(generateSentence());
    }
}
