"use strict";

var async = require('async');
var KiNET = require('../kinet.js');

var pds = new KiNET();
var devices = [];
var foundDevices = [];

module.exports.init = function(devices_data, callback) {
    async.forEachSeries(devices_data, function(device_data, next) {
        devices.push(device_data);
        next();
    }, function() {
        callback();
    });
}

module.exports.pair = function(socket) {
    socket.on("list_devices", function(data, callback) {
        foundDevices = [];

        pds.Discover(function(devices) {
            async.forEachSeries(devices, function(device, next) {
                var add_device = {
                    name: device.name + ' (' + device.serial + ')',
                    data: {
                        id: device.serial,
                        channel: device.channel,
                        ip: device.ip,
                        state: false,
                        dim: 1,
                        hue: 1,
                        saturation: 1
                    }
                };

                foundDevices.push(add_device);
                next();
            }, function() {
                callback(null, foundDevices);
            });
        });
    });

    socket.on("add_device", function(device, callback) {
        foundDevices.forEach(function(found_device) {
            if (found_device.id === device.id) {
                devices.push({
                    id: device.data.id,
                    channel: device.data.channel,
                    ip: device.data.ip,
                    state: false,
                    dim: 1,
                    hue: 1,
                    saturation: 1
                });
            }
        });
    });
}

module.exports.capabilities = {
    onoff: {
        get: function(device_data, callback) {
            devices.forEach(function(device) {
                if (device_data.id == device.id) {
                    callback(null, device.state);
                }
            });
        },
        set: function(device_data, onoff, callback) {
            devices.forEach(function(device) {
                if (device_data.id == device.id) {
                    if (onoff) {
                        device.state = true;

                        var colors = hsv_to_rgb(device.hue, device.saturation, device.dim);
                        pds.rgb(device.channel, colors[0], colors[1], colors[2]);
                        pds.send(device.ip);

                        module.exports.realtime(device, 'onoff', device.state);
                        callback(null, true);
                    } else {
                        device.state = false;

                        pds.rgb(device.channel, 0, 0, 0);
                        pds.send(device.ip);

                        module.exports.realtime(device, 'onoff', device.state);
                        callback(null, false);
                    }
                }
            });
        }
    },
    dim: {
        get: function(device_data, callback) {
            devices.forEach(function(device) {
                if (device_data.id == device.id) {
                    module.exports.realtime(device, 'dim', device.dim);
                    callback(null, device.dim);
                }
            });
        },
        set: function(device_data, dim, callback) {
            devices.forEach(function(device) {
                if (device_data.id == device.id) {
                    device.dim = dim;

                    var colors = hsv_to_rgb(device.hue, device.saturation, dim);
                    pds.rgb(device.channel, colors[0], colors[1], colors[2]);
                    pds.send(device.ip);

                    module.exports.realtime(device, 'dim', device.dim);
                    callback(null, device.dim);
                }
            });
        }
    },
    light_hue: {
        get: function(device_data, callback) {
            devices.forEach(function(device) {
                if (device_data.id == device.id) {
                    module.exports.realtime(device, 'light_hue', device.hue);
                    callback(null, device.hue);
                }
            });
        },
        set: function(device_data, hue, callback) {
            devices.forEach(function(device) {
                if (device_data.id == device.id) {
                    device.hue = hue;

                    var colors = hsv_to_rgb(hue, device.saturation, device.dim);
                    pds.rgb(device.channel, colors[0], colors[1], colors[2]);
                    pds.send(device.ip);

                    module.exports.realtime(device, 'light_hue', device.hue);
                    callback(null, device.hue);
                }
            });
        }
    },
    light_saturation: {
        get: function(device_data, callback) {
            devices.forEach(function(device) {
                if (device_data.id == device.id) {
                    module.exports.realtime(device, 'light_saturation', device.saturation);
                    callback(null, device.saturation);
                }
            });
        },
        set: function(device_data, saturation, callback) {
            devices.forEach(function(device) {
                if (device_data.id == device.id) {
                    device.saturation = saturation;

                    var colors = hsv_to_rgb(device.hue, saturation, device.dim);
                    pds.rgb(device.channel, colors[0], colors[1], colors[2]);
                    pds.send(device.ip);

                    module.exports.realtime(device, 'light_saturation', device.saturation);
                    callback(null, device.saturation);
                }
            });
        }
    }
}

module.exports.deleted = function(device_data, new_name) {
    devices.forEach(function(device) {
        if (device_data.id == device.id) {
            delete devices[devices.indexOf(device)];
        }
    });
}

function hsv_to_rgb(h, s, v) {
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
