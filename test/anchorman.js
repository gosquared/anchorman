var Anchorman = require('../lib/Anchorman');
var should = require('should');
var redis = require('redis');

var createRedisClient = function() {
  return redis.createClient();
};

describe('Anchorman', function() {
  var anchorman = Anchorman(createRedisClient);

  before(function(done) {
    anchorman.checkReady(done);
  });

  it('receives messages when published', function(done) {
    anchorman.on('message', function(name, payload) {
      name.should.equal('test');

      done();
    });

    anchorman.publish('test', 'hi');
  });
});
