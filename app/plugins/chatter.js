var fs = require('fs');
var R = require('ramda');

var Stop = function () { 
    this.isStop = true;
};

var chatData = {
    start: { stop: { count: 0 }, words: { } },
    words: { }
};

/*
 * Chain data like:
 * {
 *      "word": {"next": {count: 10, currentProb: 0.01}}
 *      ...
 * }
 */

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
    var sentences = R.map(R.trim, R.filter(R.compose(R.not, R.isEmpty), dat.split(/[.\n]/)));

    R.forEach(function(sentence) {
        var words = sentence.split(/[ ]/);
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
        return ".";
    }

    return (fromWord ? ' ' : '') + w + generateSentence(w);
};

generateChain('this is a test.');
// console.log(JSON.stringify(chatData, null, 2));

console.log(generateSentence());

/*
export.priority = 10000;

export.initNeedsBacklog = !fs.existsSync('chatter.json');

export.init = function(dat) {
    if(dat) {
        chatData = dat;
    } else {
        chatData = require('chatter.json');
    }
};

export.message = function(who, message, replyFn) {
    return message;
}
*/
