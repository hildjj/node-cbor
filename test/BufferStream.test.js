var BufferStream = require('../lib/BufferStream');

exports.create = function(test) {
  var bs = new BufferStream();
  test.equals(bs.length, 0);
  test.deepEqual(bs.flatten(), new Buffer(0));
  test.done();
};
