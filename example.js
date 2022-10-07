const express = require('express')
const app = express()
app.all('/', (req, res) => {
    console.log("Just got a request!")
    res.send('Yo!')
   
})

var ch = require('./ch');
var Bot = new ch.Chatango();
//Bot.easy_start("uwuUserName", "uwuPassword", ["nico-nico", "desertofdead"]);
Bot.easy_start("uwuUserName", "", ["nico-nico", "desertofdead"]);// run as anon check nico-nico.chatango.com   
Bot.nameColor = "f00";

var owner = "agung"
var prefix = "!"

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
        var [cmd, args] = message.text.slice(1).split(" ", 2);
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

app.listen(process.env.PORT || 3000)
