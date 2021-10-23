**INTENDED FOR DEVELOPERS**<br><br>

<div align="center">

![Logo|200x200, 50%](https://github.com/Sam-Neale/ifc-evolved/raw/main/media/images/ifcEvolved720.png)
<h1>IFC Evolved</h1>
<a href="https://github.com/Sam-Neale/ifc-evolved">https://github.com/Sam-Neale/ifc-evolved/</a>
</div>

<h2>What is this?</h2>
<hr>
Infinite Flight Connect Evolved is a Javascript Client for the Infinite Flight Connect API. Infinite Flight Connect is a built-in API that allows you to send command to Infinite Flight. You must enable it in Infinite Flight Settings > General > "Enable Infinite Flight Connect".

<h2>Where can I get this?</h2>
<hr>

Using NPM: https://www.npmjs.com/package/ifc-evolved
<h2>Code Docs</h2>
<hr>
<h3>Initialization</h3>

`init(successCallback, errorCallback)`

* `successCallback` is the function to be executed after the connection has been established with Infinite Flight
* `errorCallback` is the function to be executed in case of Error (20 seconds with no IF found, or data lacking an address)

**Example:** 

```js
const IFC = require('ifc-evolved');

IFC.init(
  function() {
    console.log("IFC connected");
    IFC.sendCommand({ "Command": "Commands.FlapsDown", "Parameters": []});
  },
  function() {
    IFC.log("IFC connection error");
  }
)
```

<h3>Sending a Command</h3>

To send a command to Infinite Flight, you may use the shortcut function `IFC.cmd()` or the full function for complex commands. You'll find a full list of commands on the [API Docs repo](https://github.com/flyingdevelopmentstudio/infiniteflight-api)

**Examples:**
* Flaps Down : `IFC.cmd("FlapsDown")` will lower the flaps down. (Full Command equivalent is: `IFC.sendCommand({ "Command": "Commands.FlapsDown", "Parameters": []});`
* Camera Move : this one require params, so let's call the full command call : ` "Command": "NetworkJoystick.SetPOVState", "Parameters": [ { "Name": "X", "Value": 0 }, { "Name": "Y", "Value": 0 } ] }`

<h3>Connection to ForeFlight Link API</h3>

Fore Flight Link broadcasts various data about the player's plane and traffic planes around him. ForeFlight Link must be enabled from Infinite Flight Settings > General > Enable ForeFlight Link

You can use IFC to listen to ForeFlight Link messages : 

`initForeFlight(onForeFlightDataReceived)`

Received Data is formatted according to the official documentation : https://www.foreflight.com/support/network-gps/


<h2>Credits</h2>
<hr>
Almost all of the code is from Nicolas BARTHE-DEJEAN. I was unable to locate him on the IFC or by other means. If anyone knows how to contact him, please, please let me know so I can request ownership of the original. I am now maintaining this service due to 5 years of inactivity on Nicolas Barthe Dejean's part.


<h2>Projects</h2>
<hr>

**Projects that use IFC-Evolved**
* IFFMC Reborn
<p>Add yours by replying below</p>
