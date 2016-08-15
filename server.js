const snoowrap = require("snoowrap");
const websocket = require("ws");

const SOCKET_SERVER = process.env.SOCKET_SERVER || "ws://192.168.1.65:3210";
const SUBREDDITS = ["ProgrammerHumor", "parenthesisbot"];

const r = new snoowrap({
  user_agent: 'server:com.andrewsun.fastparenthesisbot:v0.1 (by /u/as-com)', // for more information, see: https://github.com/reddit/reddit/wiki/API
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  username: 'fast-parenthesis-bot',
  password: process.env.REDDIT_PASSWORD
});
r.config({
    request_delay: 1001,
    continue_after_ratelimit_error: true,
    retry_error_codes: [500, 502, 503, 504, 522, 521, 520, 524, 523],
    max_retry_attempts: 5
});

let ws;
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
        processThing(model.body, model.id, model.name);
    });
    ws.on("close", function(data) {
        console.warn("Connection closed!");
        connect(); // reconnect
    });

}
connect();

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

function processThing(body, id, fullname) {
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
    if (closers.length > 0 && closers.length < 20) {
    	closers.reverse();
        // oh noes, must fix
        r.oauth_request({
            uri: "/api/comment",
            method: "POST",
            form: {
                text: /*"\\" + */closers.join("") + "\n\n---\nThis is an auto-generated response. [source](https://github.com/as-com/fast-parenthesis-bot) | [contact](https://www.reddit.com/message/compose/?to=as-com)",
                thing_id: fullname
            }
        }).then(console.log).catch(console.error);
    }
    
}
