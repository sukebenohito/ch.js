const { Chatango } = require('./ch');
const Bot = new Chatango();

//require('dotenv').config()

//Bot.easy_start("uwuUserName", "uwuPassword", ["nico-nico", "tango-hyoo"]);

//run as anon check nico-nico.chatango.com
Bot.easy_start("", "", ["nico-nico", "tango-hyoo"]);   
Bot.nameColor = "f00";

var owner = "agung" //replace this with your own chatango ID
var prefix = "!" //try type !rooms

Bot.on('PrivateMessage', (pm, user, message) => {
    console.log("PM", user.name, message.text, message.time);
    pm.message(user.name, message.text);
});
    
Bot.on('Message', (room, user, message) => {
    
    console.log(room.name, user.name, message.text)
    if (message.text==="selamat pagi"){
      room.message(`selamat pagi juga <u>UWU</u> ${user.name}`, true)
    }
        
    if (message.text[0] === prefix){
        var [cmd, ...args] = message.text.slice(1).split(" ");
        args = args.join(" ");
    }
  
    if (cmd==="rooms"){
        var orl = Object.keys(Bot.rooms),
        rl = orl.join(', '),
        sz = orl.length;
        room.message(`im in ${sz} room(s): ${rl}`)
       };
    
    if (user.name.toLowerCase() === owner){
      
      if (cmd==="leave"){room.disconnect()};
      if (cmd==="stop"){Bot.stop()};
      
      if (cmd === "e"){ 
            try{
                var ret = eval(args);
                room.message(ret);
            }
            catch(err){
                err = err.stack.trim();
                err = err.split("\n");
                err = err.slice(0, 3);
                room.message(err.join("\r"));
            }
       }
    }
});
