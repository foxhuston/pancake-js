function tok(str) {
    var toks = [];
    var currentTok = '';
    var matchingLink = false;
    var punctMatch = /[.?!, ]/;

    var tpush = function() {
        if(currentTok !== '') {
            toks.push(currentTok);
        }

        currentTok = '';
    };

    while(str !== '') {
        var currentChar = str[0];
        
        if(matchingLink) {
            var m = str.match(/(^[!, ])|(^\. )|(^\.$)/);
            if(m) { //no '.'
                matchingLink = false;
                tpush();
                if(m[0][0] !== ' ') {
                    toks.push(m[0][0]);
                }
            } else {
                currentTok += currentChar;
            }
        } else if(str.match(/^http/)) {
            currentTok += currentChar;
            matchingLink = true;
        } else if(currentChar === ' ') {
            tpush();
        } else if (currentChar.match(punctMatch)) {
            tpush();
            toks.push(currentChar);
        } else {
            currentTok += currentChar;
        }

        str = str.slice(1);
    };
    
    tpush();
    return toks;
}

function chunk(toks) {
    var currentSentence = [];
    var sentences = [];

    var stopMatch = /^(\.\.\.|[.!?])$/;

    while(toks.length > 0) {
        var currentTok = toks[0];
        currentSentence.push(currentTok);

        if(currentTok.match(stopMatch)) {
            sentences.push(currentSentence);
            currentSentence = [];
        }

        toks = toks.slice(1);
    }

    return sentences;
}

function parse(str) {
    return chunk(tok(str));
}

module.exports = parse;
