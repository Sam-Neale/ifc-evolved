var dgram = require('dgram');
var net = require('net');


var IFC = {

  host: null,
  port: null,
  enableLog: false,
  name: "IF Connect",
  isConnected: false,

  foreFlight: {
    socket: false,
    broadcastPort: 49002,
    dataModels: {
      // GPS
      "XGPSInfinite Flight": {
        "name": "GPS",
        "fields": ["lat", "lng", "alt", "hdg", "gs"]
      },
      // Attitude
      "XATTInfinite Flight": {
        "name": "attitude",
        "fields": ["hdg", "pitch", "roll"]
      },
      // Traffic
      "XTRAFFICInfinite Flight": {
        "name": "traffic",
        "fields": ["icao", "lat", "lng", "alt", "vs", "gnd", "hdg", "spd", "callsign"]
      }
    }
  },

  infiniteFlight: {
    broadcastPort: 15000,
    serverPort: 0,
    discoverSocket: false,
    clientSocket: false,
    initData: null,
  },

  initSocketOnHostDiscovered: true,
  closeUDPSocketOnHostDiscovered: true,

  log: function(msg) { if (IFC.enableLog) console.log(IFC.name, msg); },

  beforeInitSocket: function() { IFC.log("Connecting..."); },
  onHostUndefined: function() { IFC.log("Host Undefined"); },
  onHostSearchStarted: function() { IFC.log("Searching for host"); },
  onSocketConnected: function () { IFC.log("Connected"); },
  onSocketConnectionError: function() { IFC.log("Connection error"); },
  onHostDiscovered: function(host, port, callback) { IFC.log("Host Discovered"); },
  onDataReceived: function(data) {
    console.log(data)
  },
  onHostSearchFailed: function() {},

  // SHORTCUTS FUNCTIONS //
  init: function(successCallback, errorCallback) {
    if (successCallback) IFC.onSocketConnected = successCallback;
    if (errorCallback) IFC.onSocketConnectionError = errorCallback;
    IFC.searchHost(successCallback, errorCallback);
  },

  initForeFlight: function(onForeFlightDataReceived) {
    IFC.initForeFlightReceiver(onForeFlightDataReceived);
  },

  // FORE FLIGHT //
  onForeFlightDataReceived: function(data) { IFC.log(data); },

  initForeFlightReceiver: function(onForeFlightDataReceived) {

    if (onForeFlightDataReceived) IFC.onForeFlightDataReceived = onForeFlightDataReceived;
    if (IFC.foreFlight.socket) IFC.foreFlight.socket.close(function() {
      IFC.foreFlight.socket = false;
    });

    IFC.foreFlight.socket = dgram.createSocket('udp4');
    IFC.foreFlight.socket.on('message', function (msg, info){

      msg = IFC._ab2str(msg);
      var data = {};
      var dataParts = msg.split(",");
      var dataType = dataParts.shift();
      var dataModel = IFC.foreFlight.dataModels[dataType];

      if (!dataModel) return IFC.log("No format found for ", dataType);
      var name = dataModel.name;
      var fields = dataModel.fields;

      var log = [name];
      data._name = name;
      for (var i = 0; i < fields.length; i++) {
        log.push(fields[i] + ' : ' + dataParts[i]);
        data[fields[i]] = dataParts[i];
        IFC.onForeFlightDataReceived(data);
      }

      //IFC.log(log.join(' '));
    });

    IFC.foreFlight.socket.on('listening', function() {
      var address = IFC.foreFlight.socket.address();
      IFC.log("listening on :", address.address, ":" , address.port);
    });

    IFC.foreFlight.socket.bind(IFC.foreFlight.broadcastPort);
  },

  searchHost: function(successCallback, errorCallback) {
    if (IFC.infiniteFlight.discoverSocket) return;

    IFC.infiniteFlight.discoverSocket = dgram.createSocket('udp4');
    IFC.infiniteFlight.discoverSocket.on('message', function (info){
      IFC.log("Discover socket : data received");
      var dataStr = info;
      IFC.log(dataStr);
      var data = {};
      try {
        data = JSON.parse(IFC._ab2str(dataStr));
        IFC.log(data);
        IFC.infiniteFlight.initData = data;
      } catch(e) {
        IFC.log("Discover socket : parsing error");
      } 
      if (data.Addresses[1] && data.Port) {
        IFC.log("Host Discovered");
        IFC.isConnected = true;
        IFC.infiniteFlight.serverAddress = data.Addresses[1];
        IFC.infiniteFlight.serverPort = data.Port;

        IFC.initIFClient(data.Addresses[1], data.Port);
        IFC.infiniteFlight.discoverSocket.close(function() {
          IFC.infiniteFlight.discoverSocket = false;
        });
      } else {
        IFC.onDataReceived(data);
      }
    });

    IFC.infiniteFlight.discoverSocket.on('listening', function(){
      var address = IFC.infiniteFlight.discoverSocket.address();
      IFC.log("IF discoverer listening on :" + address.address + ":" + address.port);
      setTimeout(() =>{
        if (IFC.isConnected == false){
          errorCallback();
        }
      }, 20000);
    });

    IFC.infiniteFlight.discoverSocket.bind(IFC.infiniteFlight.broadcastPort);

  },

  initIFClient: function(host, port) {
    IFC.log('initializing socket');

    if (IFC.infiniteFlight.clientSocket) IFC.infiniteFlight.clientSocket.close();

    IFC.beforeInitSocket();
    if (!host) { return IFC.onHostUndefined(); }

    IFC.infiniteFlight.clientSocket = new net.Socket();
    IFC.infiniteFlight.clientSocket.connect(port, host, function() {
    	IFC.log('Connected to IF server');
      IFC.onSocketConnected(IFC.infiniteFlight.initData);
    });

    IFC.infiniteFlight.clientSocket.on('data', function(data) {
    	IFC.log('Received: ' + data);
      try {
        let StringedData = (IFC._ab2str(data));
        while (StringedData[0] != "{") {
          StringedData = StringedData.slice(1, StringedData.length)
        }

        IFC.onDataReceived(JSON.parse(StringedData));
      } catch(e) {
        IFC.log(e);
      }
    });

    IFC.infiniteFlight.clientSocket.on('close', function() {
    	IFC.infiniteFlight.clientSocket = false;
    });

  },

  cmd: function(cmd) {
    IFC.sendCommand({
      "Command": "Commands." + cmd,
      "Parameters": []
    })
  },

  getAirplaneState: function(onDataReceived) {
    if (onDataReceived) IFC.onDataReceived = onDataReceived;
    IFC.sendCommand({ "Command": "Airplane.GetState", "Parameters": []});
  },

  sendCommand: function(cmd) {

    try {
      var jsonStr = JSON.stringify(cmd);
      var data = new Uint8Array(jsonStr.length + 4);
      data[0] = jsonStr.length;

      for (var i = 0; i < jsonStr.length; i++) {
        data[i+4] = jsonStr.charCodeAt(i);
      }
      
      var buffer = Buffer.from(data);
      IFC.infiniteFlight.clientSocket.write(buffer);

    } catch(e) {
        IFC.log(e);
    }
  },


  // Converters from https://developer.chrome.com/trunk/apps/app_hardware.html
  // String to ArrayBuffer
  _str2ab: function(str) {
    var buf=new ArrayBuffer(str.length);
    var bufView=new Uint8Array(buf);
    for (var i=0; i<str.length; i++) {
      bufView[i]=str.charCodeAt(i);
    }
    return buf;
  },

  // ArrayBuffer to String
  _ab2str: function(buf) {
    function Utf8ArrayToStr(array) {
      var out, i, len, c;
      var char2, char3;

      out = "";
      len = array.length;
      i = 0;
      while (i < len) {
        c = array[i++];
        switch (c >> 4) {
          case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
            // 0xxxxxxx
            out += String.fromCharCode(c);
            break;
          case 12: case 13:
            // 110x xxxx   10xx xxxx
            char2 = array[i++];
            out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
            break;
          case 14:
            // 1110 xxxx  10xx xxxx  10xx xxxx
            char2 = array[i++];
            char3 = array[i++];
            out += String.fromCharCode(((c & 0x0F) << 12) |
              ((char2 & 0x3F) << 6) |
              ((char3 & 0x3F) << 0));
            break;
        }
      }

      return out;
    }
    return (Utf8ArrayToStr(buf));
  },



};

module.exports = IFC;
