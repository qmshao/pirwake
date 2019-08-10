const Gpio = require('onoff').Gpio;
const exec = require('child_process').exec;
const fs = require('fs');
const request = require('request');

PIRWake = {

    start: function () {
        let rawdata = fs.readFileSync('config.json');
        this.config = JSON.parse(rawdata);

        this.started = false;
	
        // Setup for sensor pin
        this.pir = new Gpio(this.config.sensorPin, 'in', 'both');

        // Setup value which represent on and off
        const valueOn = this.config.sensorState;
        const valueOff = (this.config.sensorState + 1) % 2;

        // Detected movement
        this.pir.watch( (err, value)=> {
            if (value == valueOn) {
                if (this.config.powerSaving) {
                    clearTimeout(this.deactivateMonitorTimeout);
                    this.activateMonitor();
                }
            }
            else if (value == valueOff) {
                if (!this.config.powerSaving) {
                    return;
                }

                this.deactivateMonitorTimeout = setTimeout(()=> {
                    this.deactivateMonitor();
                }, this.config.powerSavingDelay * 1000);
            }
        });

        this.started = true;
    },

    activateMonitor: function () {
        // If always-off is enabled, keep monitor deactivated
        let alwaysOffTrigger = this.alwaysOff && (this.alwaysOff.readSync() === this.config.alwaysOffState)
        if (alwaysOffTrigger) {
            return;
        }
        // Check if hdmi output is already on
        exec("/usr/bin/vcgencmd display_power").stdout.on('data', function (data) {
            if (data.indexOf("display_power=0") === 0)
		this.switchScreen(true);
                exec("/usr/bin/vcgencmd display_power 1", null);
        });
    },

    deactivateMonitor: function () {
	this.switchScreen(false);
        // If always-on is enabled, keep monitor activated
        let alwaysOnTrigger = this.alwaysOn && (this.alwaysOn.readSync() === this.config.alwaysOnState)
        let alwaysOffTrigger = this.alwaysOff && (this.alwaysOff.readSync() === this.config.alwaysOffState)
        if (alwaysOnTrigger && !alwaysOffTrigger) {
            return;
        }
        exec("/usr/bin/vcgencmd display_power 0", null);
    },

    switchScreen: function(screenOn){
        request(this.config.screenURL + (screenOn?"ON":"OFF"), (err, res, body) => {
   	    if (err) { return console.log(err); }
	});
    }

};

PIRWake.start();
