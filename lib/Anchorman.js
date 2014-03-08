var debug        = require('debug')('anchorman');
var Redis        = require('redis');
var extend       = require('extend');
var EventEmitter = require('events').EventEmitter;
var util         = require('util');
var async        = require('async');

var subRedis, subscribers = [];

var Anchorman = function(opts) {
  var self = this;

  EventEmitter.call(this);

  var conf = {
    redis: null,
    redisConfig: {
      port: 6379,
      host: 'localhost',
      database: 0
    },
    channelName: 'anchorman',
    log: debug
  };

  this.conf = extend(true, conf, opts || {});

  this.log = this.conf.log;
  this.redis = this.conf.redis;

  if (!this.redis) {
    this.redis = Redis.createClient(self.conf.redisConfig.port, self.conf.redisConfig.host);
    this.redis.select(self.conf.redisConfig.database);
  }

  // Only need to use one redis connection for subscriber client
  if (!subRedis){
    subRedis = Redis.createClient(self.conf.redisConfig.port, self.conf.redisConfig.host);
    subRedis.select(self.conf.redisConfig.database);
    subRedis.subscribe(self.conf.channelName);
    subRedis.on('message', function() {
      for (var i = 0; i < subscribers.length; i++) {
        var s = subscribers[i];
        s.apply(s, arguments);
      }
    });
  }

  this.subRedis = subRedis;

  subscribers.push(self.receiveMessage.bind(self));

  this.connections = [this.redis, this.subRedis];

  this.checkReady(function(err) {
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
    if (redis.connected) return cb(null, redis);

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
