const mavlink = require('mavlink-2');

module.exports = function(RED) {
  function MavlinkNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    this.version = config.version;
	this.systemid = config.systemid;
	this.componentid = config.componentid;
    //TODO set the version of the protocol in the node...
    var myMAV = new mavlink(this.systemid, this.componentid, this.version, ["common","pixhawk"]);
    var messagesListened = []; // a list of message that we want to listen to

    this.on('input', function(msg) {
		      	//this.log('Parse mavlink');

      //if we get a buffer, we consider that the node is receiving UDP feed
      if (Buffer.isBuffer(msg.payload)){
      	//this.log('Parse mavlink raw');
	//listen for messages
	/*myMAV.on('message', function(message) {
		var msg = {payload:{}};
		msg.payload = message.payload;
		console.log(message);
		node.send(msg);
	});*/
	myMAV.on('parse_message', function(message_name, message, fields) {
		//console.log(fields);
		var msg = {payload:{}, name: ""};
		msg.name = message_name;
		msg.payload = fields;
		node.send(msg);
	});
	//listen for sequenceError
	myMAV.on('sequenceError', function(message) {
		//this.log('sequenceError');
		msg.payload = 'sequenceError';
		node.send(msg);
	});
	//listen for checksumFail
	myMAV.on('checksumFail', function(message) {
		//this.log('checksumFail');
		msg.payload = 'checksumFail';
		node.send(msg);
	});
        myMAV.parse(msg.payload);
		myMAV.removeAllListeners(['parse_message']);
        myMAV.removeAllListeners(['sequenceError']);
        myMAV.removeAllListeners(['checksumFail']);
      } else if (Array.isArray(msg.payload)) { //is not a buffer if its an array we store messages that MAVlink needs to listen to

        //detaching previous events
        for (var i=0 ; i < messagesListened.length ; i++){
            myMAV.on(messagesListened[i], function(){});
        }
        //updating the new messages to listen to
        messagesListened = msg.payload;
        for (var i=0 ; i < messagesListened.length ; i++){
            myMAV.on(messagesListened[i], function(message, fields) {
              msg.topic = myMAV.getMessageName(message.id);
              msg.payload = fields;
              node.send(msg);
            });
        }

      } else { //finally it should be a JSON input that has to be turned into MAVlink binary format...
      	this.log('Parse mavlink other');
      myMAV.createMessage(msg.payload.name, msg.payload.parameters,
        function(mavMessage) {
          msg.payload = mavMessage.buffer;
          node.send(msg);
        }
      );

    }

    });
  }
  RED.nodes.registerType("MAVlink", MavlinkNode);
}
