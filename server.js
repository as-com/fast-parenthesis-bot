const snoowrap = require("snoowrap");
const websocket = require("ws");
const _ = require("lodash");

const SOCKET_SERVER = process.env.SOCKET_SERVER || "ws://192.168.1.65:3210";
const SUBREDDITS = ["ProgrammerHumor", "parenthesisbot", "botsrights"];

const r = new snoowrap({
  user_agent: 'server:com.andrewsun.fastparenthesisbot:v0.1 (by /u/as-com)', // for more information, see: https://github.com/reddit/reddit/wiki/API
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  username: 'fast-parenthesis-bot',
  password: process.env.REDDIT_PASSWORD
});
r.config({
//     request_delay: 1001,
    continue_after_ratelimit_error: true,
    retry_error_codes: [500, 502, 503, 504, 522, 521, 520, 524, 523],
    max_retry_attempts: 5
});

let ws, ws_posts;
function connect() {
    ws = new websocket(SOCKET_SERVER);
    ws.on("open", function() {
        console.log("Connected!");
        ws.send(JSON.stringify({
            "channel": "comments",
            "include": {
                subreddit: SUBREDDITS
            },
            "exclude": {
                author: "fast-parenthesis-bot"
            }
        }));
        console.log("Sent subscription");
    });
    ws.on("message", function(data) {
        // console.log("Got comment " + model.id);
        let model = JSON.parse(data);
        processThing(model.body, model.id, model.name, model.subreddit);
    });
    ws.on("close", function(data) {
        console.warn("Connection closed!");
        connect(); // reconnect
    });

}
function connectPosts() {
	ws_posts = new websocket(SOCKET_SERVER);
    ws_posts.on("open", function() {
        console.log("Connected!");
        ws_posts.send(JSON.stringify({
            "channel": "posts",
            "include": {
                subreddit: SUBREDDITS
            },
            "exclude": {
                author: "fast-parenthesis-bot"
            }
        }));
        console.log("Sent subscription for posts");
    });
    ws_posts.on("message", function(data) {
        // console.log("Got comment " + model.id);
        let model = JSON.parse(data);
        processThing(model.title + " " + model.selftext, model.id, model.name, model.subreddit);
    });
    ws_posts.on("close", function(data) {
        console.warn("Connection posts closed!");
        connectPosts(); // reconnect
    });
}
connect();
connectPosts();

const closeMap = {
    "(": ")",
    "{": "}",
    "[": "]",
//     "<": ">"
};
const closeList = {
//     ":": true,
    "(": true,
    ")": true,
    "{": true,
    "}": true,
    "[": true,
    "]": true,
//    "<": true,
//    ">": true
};

const endingStatements = [
	"You're welcome.",
	"Bleep bloop.",
	"This is an auto-generated response.",
	"Meow.",
	"What should I write here?",
	"I am your Lisp coding helper."
];

const antiSpam = [
	"Please don't spam.",
	"MEEEOOOOOOWWW!!!",
	"You should probably learn to close your parenthesis properly.",
	"Try not to spam, alright?"
];

const extremeAntiSpam = [
	"ARRRRGH!",
	"Seriously, stop spamming.",
	"Friend Computer is not impressed with your spamming.",
	"Ouch, too many parenthesis!",
	"Stop trying to break my O(n^2) algorithm!"
];

function postReply(thing_id, text) {
	r.oauth_request({
        uri: "/api/comment",
        method: "POST",
        form: {
            text:
`${text}

---
${_.sample(endingStatements)} [source](https://github.com/as-com/fast-parenthesis-bot) | [contact](https://www.reddit.com/message/compose/?to=as-com)`,
            thing_id
        }
    }).then(console.log).catch(console.error);
}

function getBigResp(closers) {
	let bigresp = "";
	if (closers.indexOf(":") !== -1) {
		bigresp += "      ▀  ▀ \n";
	}
	if (closers.indexOf(")") !== -1) {
	    bigresp += "     ▀▄▄▄▄▀\n";
	}
	if (closers.indexOf("}") !== -1) {
		bigresp += "    ▚▂▞▚▞▚▂▞\n";
	}
	if (closers.indexOf("]") !== -1) {
	    bigresp += "     ▙▄▄▄▄▟\n";
	}
	return bigresp;
}

function processThing(body, id, fullname, subreddit) {
    console.log("Processing " + fullname);
    let closers = [];
    let b = [];
//     let b = body.split("").filter(x => closeList[x]);
    for (let i = 0; i < body.length; i++) {
    	if (closeList[body.charAt(i)]) {
    		if (i > 0 && body.charAt(i - 1) === ":") {
    			b.push(":");
    		}
    		b.push(body.charAt(i));
    	}
    }
    for (let i = 0; i < b.length; i++) {
        if (closeMap[b[i]]) {
            let j = b.indexOf(closeMap[b[i]], i);
            if (j === -1) {
                closers.push(closeMap[b[i]]);
                if (i > 0 && b[i - 1] === ":") {
                    closers.push(":");
                }
            } else {
                b.splice(i, 1);
                i--;
                b.splice(j - 1, 1);
            }
        }
    }
    if (closers.length > 0 && (closers.length <= 15 || subreddit === "parenthesisbot")) {
    	closers.reverse();
        // oh noes, must fix
        postReply(fullname, closers.join(""));
    } else if (closers.length > 50) {
    	
		postReply(fullname, `
${getBigResp(closers)}
${_.sample(extremeAntiSpam)}

If you have a need to fulfill your spamming desires, please do so in /r/parenthesisbot.`);
    } else if (closers.length > 15) {
    			postReply(fullname, `
${getBigResp(closers)}
${_.sample(antiSpam)}

If you have a need to fulfill your spamming desires, please do so in /r/parenthesisbot.`);
    }
    
}
