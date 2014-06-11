var debug        = require('debug')('anchorman');
var extend       = require('extend');
var EventEmitter = require('events').EventEmitter;
var util         = require('util');
var async        = require('async');

var subscribers = [];

var Anchorman = function(createRedisClient, opts) {
  var self = this;

  EventEmitter.call(self);

  var conf = {
    redis: false,
    subscriberRedis: false,
    channelName: 'anchorman',
    log: debug
  };

  self.conf = extend(true, conf, opts || {});

  self.log = self.conf.log;
  self.redis = self.conf.redis || createRedisClient();

  self.subRedis = self.conf.subscriberRedis || createRedisClient();
  self.subRedis.subscribe(self.conf.channelName);
  self.subRedis.on('message', function() {
    for (var i = 0; i < subscribers.length; i++) {
      var s = subscribers[i];
      s.apply(s, arguments);
    }
  });

  subscribers.push(self.receiveMessage.bind(self));

  self.connections = [self.redis, self.subRedis];

  self.checkReady(function(err) {
    if (err) self.log(err);

    self.emit('ready');
  });
};

util.inherits(Anchorman, EventEmitter);

Anchorman.prototype.receiveMessage = function(channel, message) {
   var obj;

  try{
    obj = this.decodeMessage(message);
  }
  catch(e){
    return this.log('invalid message');
  }

  if(!obj || !obj.name || !obj.payload) return this.log('ignored message');

  var name = obj.name;
  var payload = obj.payload;

  this.emit('message', name, payload);
};

Anchorman.prototype.publish = function(name, payload, cb) {

  var message = {
    name: name,
    payload: payload
  };

  this.redis.publish(this.conf.channelName, this.encodeMessage(message), cb);
};

Anchorman.prototype.checkReady = function(cb) {
  var self = this;

  var checkReady = function(redis, cb) {
    if (redis.connected) {
      return setImmediate(function() {
          cb(null, redis);
        });
    }

    redis.once('ready', function() {
      return cb(null, redis);
    });
  };

  async.map(this.connections, checkReady, cb);
};

Anchorman.prototype.decodeMessage = JSON.parse;
Anchorman.prototype.encodeMessage = JSON.stringify;

module.exports = function(opts) {
  return new Anchorman(opts);
};
