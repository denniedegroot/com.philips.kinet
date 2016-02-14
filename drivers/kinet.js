"use strict";

var async = require('async');
var dgram = require('dgram');
var Struct = require('struct');

KiNET.prototype.Header = function() {
	var Header = Struct()
	.word32Ube('magic')
	.word16Ube('version')
	.word16Ube('type')
	.word32Ube('sequence')
	.word8('port')
	.word8('padding')
	.word16Ube('flags')
	.word32Ube('timer')
	.word8('universe')

	Header.allocate();

	Header.fields.magic = 0x0401dc4a;
	Header.fields.version = 0x0100;
	Header.fields.type = 0x0101;
	Header.fields.sequence = 0x00000000;
	Header.fields.port = 0x00;
	Header.fields.padding = 0x00;
	Header.fields.flags = 0x0000;
	Header.fields.timer = 0xffffffff;
	Header.fields.universe = 0x00;

	return Header.buffer();
}

KiNET.prototype.HeaderDiscoverSupplies = function() {
	var Header = Struct()
	.word32Ube('magic')
	.word16Ube('version')
	.word16Ube('type')
	.word32Ube('sequence')
	.word32Ube('command');

	Header.allocate();

	Header.fields.magic = 0x0401dc4a;
	Header.fields.version = 0x0100;
	Header.fields.type = 0x0100;
	Header.fields.sequence = 0x00000000;
	Header.fields.command = 0xc0a80189;

	return Header.buffer();
}

KiNET.prototype.HeaderDiscoverSuppliesReply = function() {
	var Header = Struct()
	.word32Ube('magic')
	.word16Ube('version')
	.word16Ube('type')
	.word32Ube('sequence')
	.array('source_ip', 4, 'word8')
	.array('mac_address', 6, 'word8')
	.chars('data', 2)
	.word32Ube('serial')
	.word32Ube('zero_1')
	.chars('node_name', 64)
	.chars('firmware_version', 4)
	.word16Ube('zero_2')
	.chars('node_label', 31);

	Header.allocate();

	return Header;
}

KiNET.prototype.HeaderDiscoverFixturesSerialRequest = function(ip_address) {
	var Header = Struct()
	.word32Ube('magic')
	.word16Ube('version')
	.word16Ube('type')
	.array('ip_address', 4, 'word8');

	Header.allocate();

	Header.fields.magic = 0x0401dc4a;
	Header.fields.version = 0x0100;
	Header.fields.type = 0x0102;
	Header.fields.ip_address = ip_address;

	return Header.buffer();
}

KiNET.prototype.HeaderDiscoverFixturesSerialReply = function() {
	var Header = Struct()
	.word32Ube('magic')
	.word16Ube('version')
	.word16Ube('type')
	.array('ip_address', 4, 'word8')
	.word32Ube('serial');

	Header.allocate();

	return Header;
}

KiNET.prototype.HeaderDiscoverFixturesChannelRequest = function(ip_address, serial) {
	var Header = Struct()
	.word32Ube('magic')
	.word16Ube('version')
	.word16Ube('type')
	.array('ip_address', 4, 'word8')
	.word32Ube('serial')
	.word16Ube('something');

	Header.allocate();

	Header.fields.magic = 0x0401dc4a;
	Header.fields.version = 0x0100;
	Header.fields.type = 0x0302;
	Header.fields.ip_address = ip_address;
	Header.fields.serial = serial;
	Header.fields.something = 0x4100;

	return Header.buffer();
}

KiNET.prototype.HeaderDiscoverFixturesChannelReply = function() {
	var Header = Struct()
	.word32Ube('magic')
	.word16Ube('version')
	.word16Ube('type')
	.array('ip_address', 4, 'word8')
	.word32Ube('serial')
	.word16Ube('something')
	.word8('channel')
	.word8('ok');

	Header.allocate();

	return Header;
}

KiNET.prototype.HeaderDiscoverFixturesSignedChannelRequest = function(ip_address, serial) {
	var Header = Struct()
	.word32Ube('magic')
	.word16Ube('version')
	.word16Ube('type')
	.array('ip_address', 4, 'word8')
	.word32Ube('serial')
	.word16Ube('something');

	Header.allocate();

	Header.fields.magic = 0x0401dc4a;
	Header.fields.version = 0x0100;
	Header.fields.type = 0x0302;
	Header.fields.ip_address = ip_address;
	Header.fields.serial = serial;
	Header.fields.something = 0x4000;

	return Header.buffer();
}

KiNET.prototype.HeaderDiscoverFixturesChannelSignedReply = function() {
	var Header = Struct()
	.word32Ube('magic')
	.word16Ube('version')
	.word16Ube('type')
	.array('ip_address', 4, 'word8')
	.word32Ube('serial')
	.word16Ube('something')
	.word8('signed')
	.word8('ok');

	Header.allocate();

	return Header;
}

KiNET.prototype.DiscoverFixturesChannelSigned = function(ip_address, serial, callback) {
	var self = this;

	var client = dgram.createSocket('udp4');
	var data = self.HeaderDiscoverFixturesSignedChannelRequest(ip_address, serial);
	var ip = ip_address[0] + '.' + ip_address[1] + '.' + ip_address[2] + '.' + ip_address[3];
	client.send(data, 0, data.length, self.port, ip);

	client.on('message', function(message, remote) {
		var buffer = self.HeaderDiscoverFixturesChannelSignedReply();
		buffer._setBuff(message);

		callback(serial, buffer.fields.signed);
	});

	client.on('error', function(err) {
		console.log('send error: ' + err);
		client.close();
	});
}

KiNET.prototype.DiscoverFixturesChannel = function(ip_address, serial, callback) {
	var self = this;

	var client = dgram.createSocket('udp4');
	var data = self.HeaderDiscoverFixturesChannelRequest(ip_address, serial);
	var ip = ip_address[0] + '.' + ip_address[1] + '.' + ip_address[2] + '.' + ip_address[3];
	client.send(data, 0, data.length, self.port, ip);

	client.on('message', function(message, remote) {
		var buffer = self.HeaderDiscoverFixturesChannelReply();
		buffer._setBuff(message);

		self.DiscoverFixturesChannelSigned(ip_address, buffer.fields.serial, function(serial, signed) {
			callback(serial, signed ? buffer.fields.channel + 256 : buffer.fields.channel);
		});
	});

	client.on('error', function(err) {
		console.log('send error: ' + err);
		client.close();
	});
}

KiNET.prototype.DiscoverFixturesSerial = function(ip_address, callback) {
	var self = this;
	var fixtures = [];

	var client = dgram.createSocket('udp4');
	var data = self.HeaderDiscoverFixturesSerialRequest(ip_address);
	var ip = ip_address[0] + '.' + ip_address[1] + '.' + ip_address[2] + '.' + ip_address[3];
	client.send(data, 0, data.length, self.port, ip);

	client.on('message', function(message, remote) {
		var buffer = self.HeaderDiscoverFixturesSerialReply();
		buffer._setBuff(message);

		fixtures.push(buffer.fields.serial);
	});

	client.on('error', function(err) {
		console.log('send error: ' + err);
		client.close();
	});

	setTimeout(function() {
		var i = 0;
		var devices = [];

		async.forEachSeries(fixtures, function(fixture, next) {
			self.DiscoverFixturesChannel(ip_address, fixture, function(serial, channel) {
				devices.push({'serial':format_serial(serial), 'channel':channel});
				next();
			});
		}, function() {
			callback(devices);
		});
	}, this.discoverfixture_timeout);
}

KiNET.prototype.Discover = function(callback) {
	var self = this;
	var powerdatasupply = [];

	var client = dgram.createSocket('udp4');
	var data = self.HeaderDiscoverSupplies();

	client.bind(function() {
		client.setBroadcast(true);
	});

	client.send(data, 0, data.length, self.port, '255.255.255.255');

	client.on('message', function(message, remote) {
		var buffer = self.HeaderDiscoverSuppliesReply();
		buffer._setBuff(message);

		powerdatasupply.push({'ip':buffer.fields.source_ip, 'node_label':buffer.fields.node_label});
	});

	client.on('error', function(err) {
		console.log('send error: ' + err);
		client.close();
	});

	setTimeout(function() {
		var devices = [];

		async.forEachSeries(powerdatasupply, function(pds, next) {
			self.DiscoverFixturesSerial(pds.ip, function(found_devices) {
				async.forEachSeries(found_devices, function(device, next) {
					device.ip = pds.ip[0] + '.' + pds.ip[1] + '.' + pds.ip[2] + '.' + pds.ip[3];
					device.name = pds.node_label;
					devices.push(device);
					next();
				}, function() {
					next();
				});
			});
		}, function() {
			client.close();
			callback(devices);
		});
	}, this.discoverpds_timeout);
}

KiNET.prototype.data = function() {
	var self = this;
	var data = new Buffer(512).fill(0);

	for (var id in self.data) {
		data.writeUInt8(self.data[Number(id)].R, Number(id));
		data.writeUInt8(self.data[Number(id)].G, Number(id) + 1);
		data.writeUInt8(self.data[Number(id)].B, Number(id) + 2);
	}

	return data;
}

KiNET.prototype.rgb = function(id, R, G, B) {
	this.data[id] = {'R':R,'G':G,'B':B};
}

KiNET.prototype.send = function(ip_address) {
	var self = this;
	var data = Buffer.concat([self.Header(), self.data()]);

	var client = dgram.createSocket('udp4');
	client.send(data, 0, data.length, self.port, ip_address, function() {
		client.close();
	});

	client.on('error', function(err) {
		console.log('send error: ' + err);
		client.close();
	});
}

function format_serial(number) {
	var serial = [];
	serial[0] = ('0' + (Number(number >>> 24).toString(16))).slice(-2).toUpperCase();
	serial[1] = ('0' + (Number(number >>> 16 & 0xFF).toString(16))).slice(-2).toUpperCase();
	serial[2] = ('0' + (Number(number >>> 8 & 0xFF).toString(16))).slice(-2).toUpperCase();
	serial[3] = ('0' + (Number(number & 0xFF).toString(16))).slice(-2).toUpperCase();

	return serial[3] + serial[2] + serial[1] + serial[0];
}

function parse_opt(opts, name, defaultvalue) {
	return opts && opts[name] !== undefined ? opts[name] : defaultvalue;
}

function KiNET(opts) {
	this.port = parse_opt(opts, 'port', 6038);
	this.discoverpds_timeout = parse_opt(opts, 'discoverpds_timeout', 1000);
	this.discoverfixture_timeout = parse_opt(opts, 'discoverfixture_timeout', 5000);
}

module.exports = KiNET;
