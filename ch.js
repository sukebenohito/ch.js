//made by agunq
//this lib suck :d
//you need to install ws and axios
//npm install ws
//npm install axios
const WebSocket = require('ws');
const EventEmitter = require('events');
const Axios = require('axios');

const tsweights = [['5', 75], ['6', 75], ['7', 75], ['8', 75], ['16', 75], ['17', 75], ['18', 75], 
                       ['9', 95], ['11', 95], ['12', 95], ['13', 95], ['14', 95], ['15', 95], ['19', 110],
                       ['23', 110], ['24', 110], ['25', 110], ['26', 110], ['28', 104], ['29', 104],
                       ['30', 104], ['31', 104], ['32', 104], ['33', 104], ['35', 101], ['36', 101], 
                       ['37', 101], ['38', 101], ['39', 101], ['40', 101], ['41', 101], ['42', 101], 
                       ['43', 101], ['44', 101], ['45', 101], ['46', 101], ['47', 101], ['48', 101], 
                       ['49', 101], ['50', 101], ['52', 110], ['53', 110], ['55', 110], ['57', 110], 
                       ['58', 110], ['59', 110], ['60', 110], ['61', 110], ['62', 110], ['63', 110], 
                       ['64', 110], ['65', 110], ['66', 110], ['68', 95], ['71', 116], ['72', 116], 
                       ['73', 116], ['74', 116], ['75', 116], ['76', 116], ['77', 116], ['78', 116], 
                       ['79', 116], ['80', 116], ['81', 116], ['82', 116], ['83', 116], ['84', 116]];

function _getServer(group) {

    group = group.replace('_', 'q').replace('-', 'q');

    const fnv = parseInt(group.slice(0, Math.min(group.length, 5)), 36);
    let lnv = group.slice(6, 6 + Math.min(group.length - 5, 3));
    if (lnv) {
        lnv = parseInt(lnv, 36);
        if (lnv < 1000) {
            lnv = 1000;
        }
    }
    else {
        lnv = 1000;
    }

    const num = (fnv % lnv) / lnv;
    const sum = (arr=[]) => arr.reduce((total, val) => total + val);
    const maxnum = sum(tsweights.map((n) => { return n[1]; }));
    let cumfreq = 0;
    for (let i = 0; i < tsweights.length; i++) {
        const weight = tsweights[i];
        cumfreq += weight[1] / maxnum;
        if (num <= cumfreq) {
            return `s${weight[0]}.chatango.com`;
        }
    }
    const err_message = `Couldn't find host server for room ${group}`;
    error(err_message);
    throw new Error(err_message);
}

function _strip_html(msg){
    msg = msg.replace(/<\/?[^>]*>/g, "");
    return msg;
}

function _clean_message(msg){
    
    var n = msg.match(/<n(.*?)\/>/i);
    if (n !== null){n = n[1]};
    var f = msg.match(/<f(.*?)>/i);
    if (f !== null){f = f[1]};
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

function _parseFont(f){
    if (f !== null){
        var [sizecolor, fontface] = f.split("=", 2);
       
        sizecolor = sizecolor.trim();
        var size = sizecolor.match(/x(\d\d|\d)/i);
        if (size !== null){
            size = parseInt(size[1]);
        }
        else{size = 0}
        var col = sizecolor.replace(/x(\d\d|\d)/i, "");
        if (col === ""){col = "000"};
        var face = fontface.slice(1,-1);
        if (face === ""){face = "0"};
        return [col, face, size];
    }
    else {
        return ["000", "0", "10"];
    }
    
}

function _genUid(){
    var min = Math.pow(10, 15)
    var max = Math.pow(10, 16)
    var num = Math.floor(Math.random() * (max - min + 1)) + min;
    return num.toString();
}

function _getAnonId (a, b) { 
	if (!b || !a)
		return "";
        var c = b.substr(4, 4), f = "", l, m, n;
        for (n = 0; n < c.length; n++)
		l = Number(c.substr(n, 1)),
		m = Number(a.substr(n, 1)),
                l = String(l + m),
                f += l.substr(l.length - 1);
        return f
}

const _users = {};

function User(name){
    if (name.toLowerCase() in _users){
        return _users[name.toLowerCase()];
    }
    else{
        _users[name.toLowerCase()] = new _User(name);
        return _users[name.toLowerCase()];
    }
}

class _User{
    constructor(name) {
        this.name = name;
	this.puid = "";
	this.nameColor = "000";
	this.fontFace = "0";
	this.fontSize = "10";
    }
}

class Message{
    constructor(text, time, user, ip = "", channel = "", puid, msgid = "") {
        this.time = time;
        this.text = text;
        this.user = user;
        this.channel = channel;
        this.ip = ip;
	this.puid = puid;
	this.msgid = msgid;
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
    }
    
    connect(){
        var ws = new WebSocket(`wss://${this.server}:${this.port}`, {
            origin: 'https://st.chatango.com'
        });
        ws.on('open', () => {this._connected();});
	ws.on('error', (data) => {console.log(data);});
        ws.on('close', (code) => {
		console.log(code, this.status);
		if (code == 1006 && this.status == "ok"){
			this._disconnected();
			console.log(`${code} - Reconnecting in ${this.reconnectAttemptDelay}ms...`);
			setTimeout(() => {
				this.status = "ok";
				this.sids = {};
				this.mqueue = {};
				this.log_i = [];
				this.connect();
			}, this.reconnectAttemptDelay);
		}
		else{
			this._disconnected();
		}
		
	});
        ws.on('message', (data) => this.feed(data.toString()));
        this.ws = ws
    }

    _auth(){
        if (this.mgr.username !== "" & this.mgr.password !== ""){
		this.sendCommand("bauth", this.name, this.uid, this.mgr.username, this.mgr.password);
        }
	else if (this.mgr.username !== ""){
		this.sendCommand("bauth", this.name, this.uid);
		this.sendCommand("blogin", this.mgr.username);
        }
        else{
		this.sendCommand("bauth", this.name, this.uid);
        }
    }
    _connected () {
	this.status = "ok"
        console.log('connected ' + this.name);
        this._auth();
        this._setPingInterval();
    }
    
    _setPingInterval(){
        this.pingInterval = setInterval(() => {
            if (this.status == "ok"){
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
    
    disconnect(){
        this.ws.close();
    }
    
    feed(food){
        //console.log(food.toString());
        const [cmd, ...args] = food.split(":");   
        const handler = this[`_rcmd_${cmd}`];
        if (handler === undefined) {
            //console.log(`Received command that has no handler from ${this.identifier}: <${cmd}>: ${args}`);
        }
        else {
            handler.apply(this, args);
        }
    }
    
    sendCommand(...args){
	if (this.firstCommand === true){
		var terminator = "\x00";
		this.firstCommand = false;
        }
	else {
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
    
    message(msg, html = false){
        msg = String(msg);
        if (html === false){
                msg = msg.replace(/</g, "&lt;");
                msg = msg.replace(/>/g, "&gt;");
        }
	msg = `<f x${this.mgr.fontSize}${this.mgr.fontColor}="${this.mgr.fontFace}">` + msg
	if (this.mgr.username !== "" & this.mgr.password !== ""){
        	msg = `<n${this.mgr.nameColor}/>` + msg
	}
	else{
		msg = `<n${this.uid.slice(0, 4)}/>` + msg
	}
        msg = msg.replace(/\n/g, "\r");
        this.sendCommand("bm", "t12r", this.channel, msg);
    }
    
    setBgMode(mode){
        this.sendCommand("msgbg", mode.toString());
    }
	
    addHistory(msg){
	this.history.push(msg)
	if (this.history.length > 100){this.history.pop()}
    }

    get userlist(){
	let newset = [];
	for (const [sid, userdata] of Object.entries(this.sids)) {
		newset.push(userdata[0]);
	}
	return newset;
    }

    _rcmd_ok(...args){
	this.owner = args[0];
	this.mods = args[6].split(";").map(function(item) {
		const splitItem = item.split(",");
		const user = splitItem[0];
		const value = splitItem[1];
		return [user, value];
	});

    }
	
    _rcmd_inited(...args){
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

    _rcmd_premium(...args){
	let time = parseInt((new Date()).getTime() / 1000);
	if (parseInt(args[1]) > time || this.owner.toLowerCase() === this.mgr.user.name.toLowerCase()){
		this.setBgMode(1)
	}
    }

    _rcmd_g_participants(...args){
	var args = args.join(":")
	args = args.split(";")
	
	for (var i = 0; i < args.length; i++) {
		var data = args[i].split(":");
		var sid = data[0];
		var usertime = parseFloat(data[1]);
		var name = data[3];
		var puid = data[2];
		if (name.toLowerCase() === "none"){
 			var n = String(parseInt(usertime)).slice(-4);
			if (data[4].toLowerCase() == "none"){
				name = "!anon" + _getAnonId(n, puid);
			}
			else {
				name = "#" + data[4];
			}
		}
		var user = User(name);
		user.puid = puid;
		this.sids[sid] = [name, usertime, puid];
	}
    }

    _rcmd_participant(...args){
	var name = args[3];
	var sid = args[1];
	var usertime = parseFloat(args[6]);
	var puid = args[2];
	//console.log(name, sid, usertime, puid);
	if (name.toLowerCase() === "none"){
 		var n = String(parseInt(usertime)).slice(-4);
		if (args[4].toLowerCase() == "none"){
			name = "!anon" + _getAnonId(n, puid);
		}
		else {
			name = "#" + args[4];
		}
	}
	var user = User(name);
	user.puid = puid;

	if (args[0] === "0") { //leave
		if(sid in this.sids){
			delete this.sids[sid]
			this.mgr.emit('onLeave', this, user, puid);
		}
	}

	if (args[0] === "1" || args[0] === "2"){ //join
		this.mgr.emit('onJoin', this, user, puid);
		this.sids[sid] = [name, usertime, puid];
	}
    }

    _rcmd_i(...args){
        let time = args[0];
        let name = args[1];
	let puid = args[3];
        let [msg, n, f] = _clean_message(args.slice(9).join(":"));
        let [color, face, size] = _parseFont(f);

	if (name === ""){
            name = "#" + args[2];
            if (name === "#"){
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

	msg = new Message(msg, time, user, ip, channel, puid, msgid);
	this.log_i.push(msg)
	
    }
    
    _rcmd_b(...args){
        let time = args[0];
        let name = args[1];
	let puid = args[3];
        let [msg, n, f] = _clean_message(args.slice(9).join(":"));
        let [color, face, size] = _parseFont(f);
        
        if (name === ""){
            name = "#" + args[2];
            if (name === "#"){
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
        
	if (this.mgr.username === "" && name[0] === "!" && puid === this.puid){
		this.mgr.user.name = name
	}

        msg = new Message(msg, time, user, ip, channel, puid, "");

	this.mqueue[args[5]] = msg
        
    }
    
    _rcmd_u(...args){
	if (this.mqueue.hasOwnProperty(args[0])) {
		let msg = this.mqueue[args[0]];
		msg.msgid = args[1];
		delete this.mqueue[args[0]];
		this.addHistory(msg);
		this.mgr.emit('Message', this, msg.user, msg);
	}
	else{
		console.log(this.name, "some secret");
	}
    }

}

class Private{
    
    constructor (mgr) {
        this.mgr = mgr;
	this.name = "PrivateMessage"
        this.server = "c1.chatango.com";
        this.port = 8081; // 8080 for ws://
        this.ws = null;
        this.firstCommand = true;
	this.reconnectAttemptDelay = 5000;
	this.status = "not_ok";
    }
    

    connect(){
        var ws = new WebSocket(`wss://${this.server}:${this.port}`, {
            origin: 'https://st.chatango.com'
        });
        ws.on('open', () => {this._connected();});
	ws.on('error', (data) => {console.log(data);});
        ws.on('close', (code) => {
		console.log(code, this.status);
		if (code == 1006 && this.status == "ok"){
			this._disconnected();
			//console.log(`${code} - Reconnecting in ${this.reconnectAttemptDelay}ms...`);
			setTimeout(() => {this.status = "ok"; this.connect();}, this.reconnectAttemptDelay);
		}
		else{
			this._disconnected();
		}
		
	});
        ws.on('message', (data) => this.feed(data.toString()));
        this.ws = ws
    }
   
    
    _auth(){
        if (this.mgr.username !== "" & this.mgr.password !== ""){
            const response = Axios.get('https://chatango.com/login', {
                params: {
                    user_id: this.mgr.username,
                    password: this.mgr.password,
                    storecookie: "on",
                    checkerrors: "yes"
                }
            })
            
            .then( (response) => {
		try{
			var token = response["headers"]["set-cookie"].toString();
                	token = token.match(/auth\.chatango\.com ?= ?([^;]*)/);
			
                	if (token !== null){
                    		token = token[1];
                    		this.sendCommand("tlogin", token, "2");
                	}
		}
		catch(err){
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
    
    _setPingInterval(){
        this.pingInterval = setInterval(() => {
            if (this.status == "ok"){
		this.sendCommand("");
            	//console.log(`Ping at ${this.name}`);
            }
        }, 10000);
    }
    
    _disconnected(){
	this.status = "not_ok";
        clearInterval(this.pingInterval);
        console.log("disconnected " + this.name);
    }
    
    disconnect(){
        this.ws.close();
    }
    
    feed(food){
        const [cmd, ...args] = food.replace("\r\n\u0000", "").split(":");
        
        const handler = this[`_rcmd_${cmd}`];
        if (handler === undefined) {
            //console.log(`Received command that has no handler from ${this.identifier}: <${cmd}>: ${args}`);
        }
        else {
            handler.apply(this, args);
        }
    }
    
    sendCommand(...args){
        if (this.firstCommand === true){
            var terminator = "\x00";
            this.firstCommand = false;
        }
        else {
            var terminator = "\r\n\x00";
        }
        this.ws.send(args.join(":") + terminator);
    }
    
    message(username, message){
        if (username !== undefined || username !== null || message !== undefined || message !== null){
            message = `<n${this.mgr.nameColor}/><m v="1"><g x${this.mgr.fontSize}s${this.mgr.fontColor}="${this.mgr.fontFace}">${message}</g></m>`
            this.sendCommand("msg", username, message)
        } 
    }
	

	track(username) {
		return new Promise((resolve, reject) => {
			this.sendCommand("track", username);
			this._rcmd_track = function (...args) {
				resolve(args);
			};
		});
	}

    
    _rcmd_OK(...args){

        this.sendCommand("wl");
        this.sendCommand("getblock");
        this.sendCommand("getpremium", "1");
    }
    
    _rcmd_msg(...args){
        var user = User(args[0]);
        var text = _strip_html(args.slice(5).join(":"));
        var time = args[3];
        var msg = new Message(text, time, user);
        this.mgr.emit("PrivateMessage", this, user, msg);
    }
    
    //_rcmd_seller_name(...args){
    //    console.log(args);
    //}
    
}

class Chatango  extends EventEmitter {
    constructor () {
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
    
    easy_start(user, password, rooms){
        this.username = user;
        this.password = password;
	this.user = User(user);
	if (this.username !== "" & this.password !== ""){
		this.PM = new Private(this);
		this.PM.connect();
        }
        for (var i = 0; i < rooms.length; i++) {
            this.joinRoom(rooms[i]);
        }
    }
    
    joinRoom(room){
	if (!this.rooms.hasOwnProperty(room)){
		this.rooms[room] = new Room(this, room);
		this.rooms[room].connect();
	}
    }
    
    leaveRoom(room){
        if (room in this.rooms){
		let _room = this.rooms[room];
		_room.status = "not_ok";
		_room.disconnect();
        }
    }
    
    stop(){
        for (const [ key, value ] of Object.entries(this.rooms)) {
            value.status = "not_ok";
            value.disconnect();
        }
	this.PM.status = "not_ok";
        this.PM.disconnect();
    }
}

module.exports = {Chatango, User};
