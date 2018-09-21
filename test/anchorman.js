var Anchorman = require('../lib/Anchorman');
var assert = require('assert');
var redis = require('redis');

var createRedisClient = function() {
  return redis.createClient();
};

describe('Anchorman', function() {
  var anchorman = Anchorman({
    createRedisClient: createRedisClient
  });

  before(function(done) {
    anchorman.checkReady(done);
  });

  it('receives messages when published', function(done) {
    anchorman.on('message', function(name, payload) {
      assert.equal(name, 'test');

      done();
    });

    anchorman.publish('test', 'hi');
  });
});
