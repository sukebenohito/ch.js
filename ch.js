//made by agunq
//this lib suck :d
//you need to install ws and axios
//npm install ws
//npm install axios
const WebSocket = require('ws');
const EventEmitter = require('events');
const Axios = require('axios');

const _chatangoTagserver = {
    "sw": {
        "sv10": 110,
        "sv12": 116,
        "sv8": 101,
        "sv6": 104,
        "sv4": 110,
        "sv2": 95,
        "sv0": 75
    },
    "sm": [
        ["5", "sv0"], ["6", "sv0"], ["7", "sv0"], ["8", "sv0"], ["16", "sv0"], ["17", "sv0"], ["18", "sv0"], ["9", "sv2"], ["11", "sv2"], ["12", "sv2"], ["13", "sv2"], ["14", "sv2"], ["15", "sv2"], ["19", "sv4"], ["23", "sv4"], ["24", "sv4"], ["25", "sv4"], ["26", "sv4"], ["28", "sv6"], ["29", "sv6"], ["30", "sv6"], ["31", "sv6"], ["32", "sv6"], ["33", "sv6"], ["35", "sv8"], ["36", "sv8"], ["37", "sv8"], ["38", "sv8"], ["39", "sv8"], ["40", "sv8"], ["41", "sv8"], ["42", "sv8"], ["43", "sv8"], ["44", "sv8"], ["45", "sv8"], ["46", "sv8"], ["47", "sv8"], ["48", "sv8"], ["49", "sv8"], ["50", "sv8"], ["52", "sv10"], ["53", "sv10"], ["55", "sv10"], ["57", "sv10"], ["58", "sv10"], ["59", "sv10"], ["60", "sv10"], ["61", "sv10"], ["62", "sv10"], ["63", "sv10"], ["64", "sv10"], ["65", "sv10"], ["66", "sv10"], ["68", "sv2"], ["71", "sv12"], ["72", "sv12"], ["73", "sv12"], ["74", "sv12"], ["75", "sv12"], ["76", "sv12"], ["77", "sv12"], ["78", "sv12"], ["79", "sv12"], ["80", "sv12"], ["81", "sv12"], ["82", "sv12"], ["83", "sv12"], ["84", "sv12"]
        ]
    }


function _getServer(a) {
    a = a.split("_").join("q");
    a = a.split("-").join("q");
    var b = Math.min(5, a.length),
        b = parseInt(a.substr(0, b), 36);
    a = a.substr(6, Math.min(3, a.length - 5));
    a = parseInt(a, 36);
    a = isNaN(a) || 1E3 >= a || void 0 == a ? 1E3 : a;
    b = b % a / a;
    a = _chatangoTagserver.sm;
    var c = 0,
        f;
    for (f = 0; f < a.length; f++)
        c += _chatangoTagserver.sw[a[f][1]];
    var l = 0,
        m = {};
    for (f = 0; f < a.length; f++)
        l += _chatangoTagserver.sw[a[f][1]] / c,
        m[a[f][0]] = l;
    for (f = 0; f < a.length; f++)
        if (b <= m[a[f][0]]) {
            sNumber = a[f][0];
            break
        }
    return "s" + sNumber + ".chatango.com"
}

function _strip_html(msg) {
    msg = msg.replace(/<\/?[^>]*>/g, "");
    return msg;
}

function _clean_message(msg) {

    var n = msg.match(/<n(.*?)\/>/i);
    if (n !== null) {
        n = n[1]
    };
    var f = msg.match(/<f(.*?)>/i);
    if (f !== null) {
        f = f[1]
    };
    msg = msg.replace(/<n.*?\/>/g, "");
    msg = msg.replace(/<f.*?>/g, "");
    msg = _strip_html(msg);
    msg = msg.replace(/&lt;/g, "<");
    msg = msg.replace(/&gt;/g, ">");
    msg = msg.replace(/&quot;/g, "\"");
    msg = msg.replace(/&apos;/g, "'");
    msg = msg.replace(/&amp;/g, "&");
    return [msg, n, f];
}

function _parseFont(f) {
    if (f !== null) {
        var [sizecolor, fontface] = f.split("=", 2);

        sizecolor = sizecolor.trim();
        var size = sizecolor.match(/x(\d\d|\d)/i);
        if (size !== null) {
            size = parseInt(size[1]);
        } else {
            size = 0
        }
        var col = sizecolor.replace(/x(\d\d|\d)/i, "");
        if (col === "") {
            col = "000"
        };
        var face = fontface.slice(1, -1);
        if (face === "") {
            face = "0"
        };
        return [col, face, size];
    } else {
        return ["000", "0", "10"];
    }

}

function _genUid() {
    var min = Math.pow(10, 15)
    var max = Math.pow(10, 16)
    var num = Math.floor(Math.random() * (max - min + 1)) + min;
    return num.toString();
}

function _getAnonId(a, b) {
    if (!b || !a)
        return "";
    var c = b.substr(4, 4),
        f = "",
        l, m, n;
    for (n = 0; n < c.length; n++)
        l = Number(c.substr(n, 1)),
        m = Number(a.substr(n, 1)),
        l = String(l + m),
        f += l.substr(l.length - 1);
    return f
}

const _users = {};

function User(name) {
    if (name.toLowerCase() in _users) {
        return _users[name.toLowerCase()];
    } else {
        _users[name.toLowerCase()] = new _User(name);
        return _users[name.toLowerCase()];
    }
}

class _User {
    constructor(name) {
        this.name = name;
        this.puid = "";
        this.nameColor = "000";
        this.fontFace = "0";
        this.fontSize = "10";
    }
}

class Message {
    constructor(text, time, user, ip = "", channel = "", puid = "", msgid = "", unid = "") {
        this.time = time;
        this.text = text;
        this.user = user;
        this.channel = channel;
        this.ip = ip;
        this.puid = puid;
        this.msgid = msgid;
        this.unid = unid;
    }
}

class Room {

    constructor(mgr, name) {
        this.mgr = mgr;
        this.name = name;
        this.owner = "";
        this.server = _getServer(name);
        this.port = 8081; // 8080 for ws://
        this.ws = null;
        this.firstCommand = true;
        this.channel = "0"
        this.reconnectAttemptDelay = 5000;
        this.status = "not_ok";
        this.uid = _genUid();
        this.puid = this.uid.slice(0, 8);
        this.sids = {};
        this.history = [];
        this.log_i = [];
        this.mqueue = {};
        this.banlist = {};
    }

    connect() {
        var ws = new WebSocket(`wss://${this.server}:${this.port}`, {
            origin: 'https://st.chatango.com'
        });
        ws.on('open', () => {
            this._connected();
        });
        ws.on('error', (data) => {
            console.log(data);
        });
        ws.on('close', (code) => {
            console.log(code, this.status);
            if (code == 1006 && this.status == "ok") {
                this._disconnected();
                console.log(`${code} - Reconnecting in ${this.reconnectAttemptDelay}ms...`);
                setTimeout(() => {
                    this.status = "ok";
                    this.sids = {};
                    this.mqueue = {};
                    this.log_i = [];
                    this.connect();
                }, this.reconnectAttemptDelay);
            } else {
                this._disconnected();
            }

        });
        ws.on('message', (data) => this.feed(data.toString()));
        this.ws = ws
    }

    _auth() {
        if (this.mgr.username !== "" & this.mgr.password !== "") {
            this.sendCommand("bauth", this.name, this.uid, this.mgr.username, this.mgr.password);
        } else if (this.mgr.username !== "") {
            this.sendCommand("bauth", this.name, this.uid);
            this.sendCommand("blogin", this.mgr.username);
        } else {
            this.sendCommand("bauth", this.name, this.uid);
        }
    }
    _connected() {
        this.status = "ok"
        console.log('connected ' + this.name);
        this._auth();
        this._setPingInterval();
    }

    _setPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.status == "ok") {
                this.sendCommand("");
                //console.log(`Ping at ${this.name}`);
            }
        }, 10000);
    }

    _disconnected() {
        this.status = "not_ok"
        clearInterval(this.pingInterval);
        console.log('disconnected ' + this.name);
    }

    disconnect() {
        this.ws.close();
    }

    feed(food) {
        //console.log(food.toString());
        const [cmd, ...args] = food.split(":");
        const handler = this[`_rcmd_${cmd}`];
        if (handler === undefined) {
            //console.log(`Received command that has no handler from ${this.identifier}: <${cmd}>: ${args}`);
        } else {
            handler.apply(this, args);
        }
    }

    sendCommand(...args) {
        if (this.firstCommand === true) {
            var terminator = "\x00";
            this.firstCommand = false;
        } else {
            var terminator = "\r\n\x00";
        }
        this.ws.send(args.join(":") + terminator);
    }

    getLastMessage(username) {

        for (let i = this.history.length - 1; i >= 0; i--) {
            const msg = this.history[i];
            if (msg.user.name.toLowerCase() === username.toLowerCase()) {
                return msg;
            }
        }
    }
    clearAll() {
        this.sendCommand("clearall")
    }

    rawClearUser(username, unid, ip) {
        this.sendCommand("delallmsg", unid, ip, username.toLowerCase())
    }

    clearUser(username) {
        let msg = this.getLastMessage(username);
        if (msg) {
            if (["!", "#"].includes(username[0])) {
                username = ""
            }
            this.rawClearUser(username, msg.unid, msg.ip)
        }
    }

    rawBanUser(username, unid, ip) {
        this.sendCommand("block", unid, ip, username.toLowerCase())
    }

    ban(username) {
        let msg = this.getLastMessage(username);
        if (msg) {
            if (["!", "#"].includes(username[0])) {
                username = ""
            }
            this.rawBanUser(username, msg.unid, msg.ip)
        }
    }

    requestBanlist() {
        return new Promise((resolve, reject) => {
            this.sendCommand("blocklist", "block", "0", "next", "500", "anons", "1");
            //this.sendCommand("blocklist", "block", "", "next", "500");
            this._rcmd_blocklist = function(...args) {
                let sections = args.join(":").split(";")
                for (let i = 0; i < sections.length; i++) {
                    let params = sections[i].split(":")
                    if (params.length != 5) {
                        continue
                    }

                    let user = params[2].toLowerCase()
                    let time = parseInt(params[3]);
                    if (params[2] == "") {
                        user = "anon"
                    }

                    this.banlist[user] = {
                        "unid": params[0],
                        "ip": params[1],
                        "target": user,
                        "time": time,
                        "src": params[4],

                    }
                }
                resolve(this.banlist);
            };
        });
    }

    rawUnbanUser(unid, ip) {
        this.sendCommand("removeblock", unid, ip)
    }

    async unban(username) {
        await this.requestBanlist()
        let rec = this.banlist[username.toLowerCase()]
        if (rec) {
            this.rawUnbanUser(rec["unid"], rec["ip"])
        }
    }

    message(msg, html = false) {
        msg = String(msg);
        if (html === false) {
            msg = msg.replace(/</g, "&lt;");
            msg = msg.replace(/>/g, "&gt;");
        }
        msg = `<f x${this.mgr.fontSize}${this.mgr.fontColor}="${this.mgr.fontFace}">` + msg
        if (this.mgr.username !== "" & this.mgr.password !== "") {
            msg = `<n${this.mgr.nameColor}/>` + msg
        } else {
            msg = `<n${this.uid.slice(0, 4)}/>` + msg
        }
        msg = msg.replace(/\n/g, "\r");
        this.sendCommand("bm", "t12r", this.channel, msg);
    }

    setBgMode(mode) {
        this.sendCommand("msgbg", mode.toString());
    }

    addHistory(msg) {
        this.history.push(msg)
        if (this.history.length > 100) {
            this.history.pop()
        }
    }

    get userlist() {
        let newset = [];
        for (const [sid, userdata] of Object.entries(this.sids)) {
            newset.push(userdata[0]);
        }
        return newset;
    }

    _rcmd_ok(...args) {
        this.owner = args[0];
        this.mods = args[6].split(";").map(function(item) {
            const splitItem = item.split(",");
            const user = splitItem[0];
            const value = splitItem[1];
            return [user, value];
        });

    }

    _rcmd_inited(...args) {
        this.sendCommand("g_participants", "start")
        this.sendCommand("getpremium", "1");
        for (let i = this.log_i.length - 1; i >= 0; i--) {
            const msg = this.log_i[i];
            const user = msg.user;
            this.mgr.emit("HistoryMessage", this, user, msg);
            this.addHistory(msg);
        }
        this.log_i = [];
    }

    _rcmd_premium(...args) {
        let time = parseInt((new Date()).getTime() / 1000);
        if (parseInt(args[1]) > time || this.owner.toLowerCase() === this.mgr.user.name.toLowerCase()) {
            this.setBgMode(1)
        }
    }

    _rcmd_g_participants(...args) {
        var args = args.join(":")
        args = args.split(";")

        for (var i = 0; i < args.length; i++) {
            var data = args[i].split(":");
            var sid = data[0];
            var usertime = parseFloat(data[1]);
            var name = data[3];
            var puid = data[2];
            if (name.toLowerCase() === "none") {
                var n = String(parseInt(usertime)).slice(-4);
                if (data[4].toLowerCase() == "none") {
                    name = "!anon" + _getAnonId(n, puid);
                } else {
                    name = "#" + data[4];
                }
            }
            var user = User(name);
            user.puid = puid;
            this.sids[sid] = [name, usertime, puid];
        }
    }

    _rcmd_participant(...args) {
        var name = args[3];
        var sid = args[1];
        var usertime = parseFloat(args[6]);
        var puid = args[2];
        //console.log(name, sid, usertime, puid);
        if (name.toLowerCase() === "none") {
            var n = String(parseInt(usertime)).slice(-4);
            if (args[4].toLowerCase() == "none") {
                name = "!anon" + _getAnonId(n, puid);
            } else {
                name = "#" + args[4];
            }
        }
        var user = User(name);
        user.puid = puid;

        if (args[0] === "0") { //leave
            if (sid in this.sids) {
                delete this.sids[sid]
                this.mgr.emit('Leave', this, user, puid);
            }
        }

        if (args[0] === "1" || args[0] === "2") { //join
            this.mgr.emit('Join', this, user, puid);
            this.sids[sid] = [name, usertime, puid];
        }
    }

    _rcmd_i(...args) {
        let time = args[0];
        let name = args[1];
        let puid = args[3];
        let unid = args[4];
        let [msg, n, f] = _clean_message(args.slice(9).join(":"));
        let [color, face, size] = _parseFont(f);

        if (name === "") {
            name = "#" + args[2];
            if (name === "#") {
                name = "!anon" + _getAnonId(n, args[3]);
            }
        }
        let user = User(name);
        user.nameColor = n;
        user.fontFace = face;
        user.fontSize = size;
        user.fontColor = color;

        let msgid = args[5];
        let ip = args[6];
        let channel = args[7];

        msg = new Message(msg, time, user, ip, channel, puid, msgid, unid);
        this.log_i.push(msg)

    }

    _rcmd_b(...args) {
        let time = args[0];
        let name = args[1];
        let puid = args[3];
        let unid = args[4];
        let [msg, n, f] = _clean_message(args.slice(9).join(":"));
        let [color, face, size] = _parseFont(f);

        if (name === "") {
            name = "#" + args[2];
            if (name === "#") {
                name = "!anon" + _getAnonId(n, args[3]);
            }
        }
        let user = User(name);
        user.nameColor = n;
        user.fontFace = face;
        user.fontSize = size;
        user.fontColor = color;

        let ip = args[6];
        let channel = args[7];
        this.channel = channel;

        if (this.mgr.username === "" && name[0] === "!" && puid === this.puid) {
            this.mgr.user.name = name
        }

        msg = new Message(msg, time, user, ip, channel, puid, "", unid);
        this.mgr.emit('Message', this, msg.user, msg);
        this.mqueue[args[5]] = msg
        this.addHistory(msg);
    }

    _rcmd_u(...args) {
        if (this.mqueue.hasOwnProperty(args[0])) {
            let msg = this.mqueue[args[0]];
            msg.msgid = args[1];
            delete this.mqueue[args[0]];
        } else {
            console.log(this.name, "some secret");
        }
    }

}

class Private {

    constructor(mgr) {
        this.mgr = mgr;
        this.name = "PrivateMessage"
        this.server = "c1.chatango.com";
        this.port = 8081; // 8080 for ws://
        this.ws = null;
        this.firstCommand = true;
        this.reconnectAttemptDelay = 5000;
        this.status = "not_ok";
    }


    connect() {
        var ws = new WebSocket(`wss://${this.server}:${this.port}`, {
            origin: 'https://st.chatango.com'
        });
        ws.on('open', () => {
            this._connected();
        });
        ws.on('error', (data) => {
            console.log(data);
        });
        ws.on('close', (code) => {
            console.log(code, this.status);
            if (code == 1006 && this.status == "ok") {
                this._disconnected();
                //console.log(`${code} - Reconnecting in ${this.reconnectAttemptDelay}ms...`);
                setTimeout(() => {
                    this.status = "ok";
                    this.connect();
                }, this.reconnectAttemptDelay);
            } else {
                this._disconnected();
            }

        });
        ws.on('message', (data) => this.feed(data.toString()));
        this.ws = ws
    }


    _auth() {
        if (this.mgr.username !== "" & this.mgr.password !== "") {
            const response = Axios.get('https://chatango.com/login', {
                    params: {
                        user_id: this.mgr.username,
                        password: this.mgr.password,
                        storecookie: "on",
                        checkerrors: "yes"
                    }
                })

                .then((response) => {
                    try {
                        var token = response["headers"]["set-cookie"].toString();
                        token = token.match(/auth\.chatango\.com ?= ?([^;]*)/);

                        if (token !== null) {
                            token = token[1];
                            this.sendCommand("tlogin", token, "2");
                        }
                    } catch (err) {
                        this.disconnect();
                        console.log(err);
                    }
                })
        }
    }

    _connected() {
        this.status = "ok"
        console.log('connected ' + this.name);
        this._auth();
        this._setPingInterval();
    }

    _setPingInterval() {
        this.pingInterval = setInterval(() => {
            if (this.status == "ok") {
                this.sendCommand("");
                //console.log(`Ping at ${this.name}`);
            }
        }, 10000);
    }

    _disconnected() {
        this.status = "not_ok";
        clearInterval(this.pingInterval);
        console.log("disconnected " + this.name);
    }

    disconnect() {
        this.ws.close();
    }

    feed(food) {
        const [cmd, ...args] = food.replace("\r\n\u0000", "").split(":");

        const handler = this[`_rcmd_${cmd}`];
        if (handler === undefined) {
            //console.log(`Received command that has no handler from ${this.identifier}: <${cmd}>: ${args}`);
        } else {
            handler.apply(this, args);
        }
    }

    sendCommand(...args) {
        if (this.firstCommand === true) {
            var terminator = "\x00";
            this.firstCommand = false;
        } else {
            var terminator = "\r\n\x00";
        }
        this.ws.send(args.join(":") + terminator);
    }

    message(username, message) {
        if (username !== undefined || username !== null || message !== undefined || message !== null) {
            message = `<n${this.mgr.nameColor}/><m v="1"><g x${this.mgr.fontSize}s${this.mgr.fontColor}="${this.mgr.fontFace}">${message}</g></m>`
            this.sendCommand("msg", username, message)
        }
    }


    track(username) {
        return new Promise((resolve, reject) => {
            this.sendCommand("track", username);
            this._rcmd_track = function(...args) {
                resolve(args);
            };
        });
    }

    setBgMode(mode) {
        this.sendCommand("msgbg", mode.toString());
    }

    setIdle(mode) {
        this.sendCommand("idle", "0");
    }

    setActive(mode) {
        this.sendCommand("idle", "1");
    }

    _rcmd_OK(...args) {
        this.sendCommand("wl");
        this.sendCommand("getblock");
        this.sendCommand("getpremium", "1");
    }

    _rcmd_msg(...args) {
        var user = User(args[0]);
        var text = _strip_html(args.slice(5).join(":"));
        var time = args[3];
        var msg = new Message(text, time, user);
        this.mgr.emit("PrivateMessage", this, user, msg);
    }

    _rcmd_premium(...args) {
        let time = parseInt((new Date()).getTime() / 1000);
        if (parseInt(args[1]) > time) {
            this.setBgMode(1)
        }
    }

}

class Chatango extends EventEmitter {
    constructor() {
        super();
        this.username = null;
        this.password = null;
        this.user = null;

        this.nameColor = "000";
        this.fontSize = 12;
        this.fontFace = "0";
        this.fontColor = "000";

        this.rooms = {};
        //this.EV = new EventEmitter();
    }

    easy_start(user, password, rooms) {
        this.username = user;
        this.password = password;
        this.user = User(user);
        if (this.username !== "" & this.password !== "") {
            this.PM = new Private(this);
            this.PM.connect();
        }
        for (var i = 0; i < rooms.length; i++) {
            this.joinRoom(rooms[i]);
        }
    }

    joinRoom(room) {
        if (!this.rooms.hasOwnProperty(room)) {
            this.rooms[room] = new Room(this, room);
            this.rooms[room].connect();
        }
    }

    leaveRoom(room) {
        if (room in this.rooms) {
            let _room = this.rooms[room];
            _room.status = "not_ok";
            _room.disconnect();
        }
    }

    stop() {
        for (const [key, value] of Object.entries(this.rooms)) {
            value.status = "not_ok";
            value.disconnect();
        }
        this.PM.status = "not_ok";
        this.PM.disconnect();
    }
}

module.exports = {
    Chatango,
    User
};
