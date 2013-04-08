var BufferStream = require('../lib/BufferStream');

exports.create = function(test) {
  var bs = new BufferStream();
  test.equals(bs.length, 0);
  test.deepEqual(bs.growSize, 512);
  test.deepEqual(bs.flatten(), new Buffer(0));
  bs = new BufferStream({bsInit: new Buffer('one')});
  test.deepEqual(bs.flatten(), new Buffer('one'));
  bs = new BufferStream({bsInit: new Buffer('one'), bsGrowSize: 128});
  test.deepEqual(bs.flatten(), new Buffer('one'));
  test.deepEqual(bs.growSize, 128);
  bs = new BufferStream({bsGrowSize: 128});
  test.deepEqual(bs.growSize, 128);
  test.deepEqual(bs.flatten(), new Buffer(0));

  test.done();
};

exports.append = function(test) {
  var bs = new BufferStream();
  bs.append(new Buffer('one'));
  bs.append(new Buffer('two'));
  test.deepEqual(bs.flatten(), new Buffer('onetwo'));
  test.done();
};

exports.cb = function(test) {
  var bs = new BufferStream();
  bs.bufs[0].fill(8);
  bs.wait(2, function(er, buf) {
    test.deepEqual(buf, new Buffer('12'));
  });
  bs.writeString('1');
  bs.writeString('23');
  bs.wait(1, function(er, buf) {
    test.deepEqual(buf, new Buffer('3'));
    test.done();
  });
}
