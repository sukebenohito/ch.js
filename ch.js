//made by agunq
//this lib suck :d
//you need to install ws and axios
//npm install ws
//npm install axios
const WebSocket = require('ws');
const EventEmitter = require('events');
const Axios = require('axios');

function _getServer(group) {
    
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

function _getAnonId (n, ssid) { 
	if(!n || !ssid) return "";
	var id = "";
	for(var i=0; i<4; i++){
		var a = parseInt(n.substr(i, 1)) + parseInt(ssid.substr(i+4, 1));
		id += String(a>9 ? a-10 : a);
	}
	return id;
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
    }
}

class Message{
    constructor(text, time, user, ip = "", channel = "") {
        this.time = time;
        this.text = text;
        this.user = user;
        this.channel = channel;
        this.ip = ip;
    }
}

class Room {
    
    constructor(mgr, name) {
        this.mgr = mgr;
        this.name = name;
        this.server = _getServer(name);
        this.port = 8081; // 8080 for ws://
        this.ws = null;
        this.firstCommand = true;
        this.channel = "0"
    }
    
    connect(){
        const ws = new WebSocket(`wss://${this.server}:${this.port}`, {
            origin: 'https://st.chatango.com'
        });
        ws.on('open', () => (this._connected()));
        ws.on('close', () => (this._disconnected()));
        ws.on('message', (data) => this.feed(data.toString()));
        this.ws = ws
    }
    _auth(){
        if (this.mgr.username !== "" & this.mgr.password !== ""){
            this.sendCommand("bauth", this.name, _genUid(), this.mgr.username, this.mgr.password);
        }
        else{
          
            this.sendCommand("bauth", this.name, _genUid());
        }
    }
    _connected () {
        console.log('connected ' + this.name);
        this._auth();
        this._setPingInterval();
    }
    
    _setPingInterval(){
        this.pingInterval = setInterval(() => {
            this.sendCommand("");
            //console.log(`Ping at ${this.name}`);
            }, 10000);
    }
    
    _disconnected () {
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
    
    message(msg, html = false){
        msg = String(msg);
        if (html === false){
                msg = msg.replace(/</g, "&lt;");
                msg = msg.replace(/>/g, "&gt;");
        }
        msg = `<n${this.mgr.nameColor}/>` + msg
        msg = `<f x${this.mgr.fontSize}${this.mgr.fontColor}="${this.mgr.fontFace}">` + msg
        msg = msg.replace(/\n/g, "\r");
        this.sendCommand("bm", "t12r", this.channel, msg);
    }
    
    setBgMode(mode){
        this.sendCommand("msgbg", mode.toString());
    }
    
    _rcmd_i(...args){
        var user = args[1];
        var [msg, n, f] = _clean_message(args.slice(9).join(":"));
        var [color, face, size] = _parseFont(f);
    }
    
    _rcmd_b(...args){
        //console.log(args);
        var time = args[0];
        var name = args[1];
        var [msg, n, f] = _clean_message(args.slice(9).join(":"));
        var [color, face, size] = _parseFont(f);
        
        if (name === ""){
            name = "#" + args[2];
            if (name === "#"){
                name = "!anon" + _getAnonId(n, args[3]);
            }
        }
        
        var user = User(name);
        var ip = args[6];
        var channel = args[7];
        this.channel = channel;
        
        msg = new Message(msg, time, user, ip, channel);
        this.mgr.emit('Message', this, user, msg);
    }
    
    _rcmd_u(...args){
        
    }
}

class Private{
    
    constructor (mgr) {
        this.mgr = mgr;
        this.server = "c1.chatango.com";
        this.port = 8081; // 8080 for ws://
        this.ws = null;
        this.firstCommand = true;
    }
    
    connect(){
        const ws = new WebSocket(`wss://${this.server}:${this.port}`, {
            origin: 'https://st.chatango.com'
        });
        ws.on('open', () => (this._connected()));
        ws.on('close', () => (this._disconnected()));
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
                var token = response["headers"]["set-cookie"];
                token = token.match(/auth\.chatango\.com ?= ?([^;]*)/);
                if (token !== null){
                    token = token[1];
                    this.sendCommand("tlogin", token, "2");
                }
            })   
        }
    }
    
    _connected () {
        console.log('connected PM');
        this._auth();
        this._setPingInterval();
    }
    
    _setPingInterval(){
        this.pingInterval = setInterval(() => {
            this.sendCommand("");
            //console.log("Ping at PM");
            }, 10000);
    }
    
    _disconnected () {
        clearInterval(this.pingInterval);
        console.log("disconnected PM");
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
    
    _rcmd_seller_name(...args){
        //console.log(args);
    }
    
}

class Chatango  extends EventEmitter {
    constructor () {
        super();
        this.username = null;
        this.password = null;
      
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
        this.PM = new Private(this);
        this.PM.connect();
        for (var i = 0; i < rooms.length; i++) {
            this.joinRoom(rooms[i]);
        }
    }
    
    joinRoom(room){
        this.rooms[room] = new Room(this, room);
        this.rooms[room].connect();
    }
    
    leaveRoom(room){
        var room = this.rooms[room];
        if (room !== undefined || room !== null){
            room.disconnect();
        }
    }
    
    stop(){
        for (const [ key, value ] of Object.entries(this.rooms)) {
            value.disconnect();
        }
        this.PM.disconnect();
    }
}

exports.Chatango = Chatango;
