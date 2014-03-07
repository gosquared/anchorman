var Anchorman = require('../lib/Anchorman');
var should = require('should');

describe('Anchorman', function() {
  var anchorman = Anchorman();

  before(function(done) {
    anchorman.once('ready', done);
  });

  it('receives messages when published', function(done) {
    anchorman.on('message', function(name, payload) {
      name.should.equal('test');

      done();
    });

    anchorman.publish('test', 'hi');
  });
});
