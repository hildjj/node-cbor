var csrequire = require('covershot').require.bind(null, require);
var BufferStream = csrequire('../lib/BufferStream');
var utils = csrequire('../lib/utils');
var fs = require('fs');

exports.create = function(test) {
  var bs = new BufferStream();
  test.ok(bs.isValid());
  test.ok(BufferStream.isBufferStream(bs));
  test.ok(!BufferStream.isBufferStream(null));
  test.ok(!BufferStream.isBufferStream(new Buffer(0)));

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
  bs.append(new Buffer(0));
  test.deepEqual(bs.length, 0);

  bs.append(new Buffer('one'));
  bs.append(new Buffer('two'));
  test.deepEqual(bs.flatten(), new Buffer('onetwo'));

  bs.clear();
  bs.grow(4);
  bs.append(new Buffer('onetwo'));
  test.deepEqual(bs.flatten(), new Buffer('onetwo'));
  test.done();
};

exports.flatten = function(test) {
  var bs = new BufferStream();
  var input = new Buffer(1024);
  input.fill(9);
  bs.append(input);
  bs.grow();

  var output = bs.flatten();
  test.deepEqual(input, output);
  test.done();
};

exports.funcEdges = function(test) {
  var bs = new BufferStream({bsInit: new Buffer('123'), bsStartEmpty:true});
  test.deepEqual(bs.flatten(), new Buffer('123'));
  bs.grow();
  bs.writeString('4');
  test.deepEqual(bs.slice(2), new Buffer('34'));

  bs.writeString('');
  bs.fill(0x61); // a
  test.deepEqual(bs.flatten(), new Buffer('aaaa'));

  test.done();
};

exports.cb = function(test) {
  var bs = new BufferStream();
  bs.bufs[0].fill(8);
  bs.wait(2, function(er, buf) {
    test.ok(!er);
    test.deepEqual(buf, new Buffer('12'));
  });
  bs.writeString('1');
  bs.writeString('23');
  bs.wait(1, function(er, buf) {
    test.ok(!er);
    test.deepEqual(buf, new Buffer('3'));
    bs.clear();
    // notify with exact size
    bs.wait(2, function(er, buf) {
      test.ok(!er);
      test.deepEqual(buf, new Buffer('45'));
      bs.clear();

      // notify with multiple chunks
      bs.wait(3, function(er, buf) {
        test.ok(!er);
        test.deepEqual(buf, new Buffer('678'));
        test.done();
      });
      bs.append(new Buffer('67'));
      bs.append(new Buffer('89'));
    });
    bs.append(new Buffer('45'));
  });
};

exports.waitEdges = function(test) {
  var bs = new BufferStream();
  test.throws(function() {
    bs.wait();
  }, "no length");
  test.throws(function() {
    bs.wait(2);
  }, "no fun");
  test.throws(function() {
    bs.wait(4, function(er, buf) {
      test.ok(false, "Never called");
    });
    bs.wait(4, function(er, buf) {
      test.ok(false, "Never called");
    });
  });
  bs = new BufferStream();
  bs.wait(0, function(er, buf) {
    test.ok(!er);
    test.deepEqual(buf, new Buffer(0));
  });

  bs.wait(100, function(er, buf) {
    // EOF while waiting
    test.ok(er);
    test.ok(BufferStream.isEOFError(er));
    test.ok(bs.isEOF(er));
    test.ok(!buf);
    test.done();
  });

  bs.end();
};

exports.stream = function(test) {
  var bs = new BufferStream({bsStartEmpty: true});
  var str = fs.createReadStream(__filename);
  test.ok(str);
  str.pipe(bs);
  bs.on('finish', function() {
    test.done();
  });
};

exports.streamDecoded = function(test) {
  var bs = new BufferStream({decodeStrings: false});
  bs.on('error', function(er) {
    test.ok(er);
    test.done();
  });
  bs.write("foo", "utf8");
};

exports.streamWaitEnded = function(test) {
  var bs = new BufferStream();
  bs.end();
  bs.wait(1, function(er, buf) {
    test.ok(er);
    test.ok(!buf);
    test.done();
  });
};

exports.streamAppendSecond = function(test) {
  var bs = new BufferStream();
  bs.append(new Buffer(1));
  bs.append(new Buffer(1024));
  test.deepEqual(bs.bufs.length, 2);
  test.done();
};

exports.JSON = function(test) {
  var bs = new BufferStream();
  bs.writeString('a');
  test.deepEqual(bs.toJSON(), [97]);
  test.done();
};

exports.writeNums = function(test) {
  var bs = new BufferStream({bsStartEmpty: true});
  bs.writeInt8(1);
  bs.writeUInt8(0xff);

  bs.writeInt16LE(-257);
  bs.writeUInt16LE(0xfeff);
  bs.writeInt16BE(-257);
  bs.writeUInt16BE(0xfeff);

  bs.writeInt32LE(-65537);
  bs.writeUInt32LE(0xfeff0102);
  bs.writeInt32BE(-65537);
  bs.writeUInt32BE(0xfeff0102);

  bs.writeFloatLE(NaN);
  bs.writeDoubleLE(0);
  bs.writeFloatBE(Infinity);
  bs.writeDoubleBE(Number.MAX_VALUE);

  test.deepEqual(bs.flatten(), new Buffer(
    [1,
     0xff,

     0xff, 0xfe,
     0xff, 0xfe,
     0xfe, 0xff,
     0xfe, 0xff,

     0xff, 0xff, 0xfe, 0xff,
     0x02, 0x01, 0xff, 0xfe,
     0xff, 0xfe, 0xff, 0xff,
     0xfe, 0xff, 0x01, 0x02,

     0x00, 0x00, 0xc0, 0x7f,
     0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
     0x7f, 0x80, 0x00, 0x00,
     0x7f, 0xef, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
     ]));
  test.done();
};

exports.read = function(test) {
  var bs = new BufferStream();
  var buf = bs.read();
  test.deepEqual(buf.length, 0);
  var probe = new Buffer([1,2,3,4]);
  bs.append(probe);
  buf = bs.read(-1);
  test.ok(utils.bufferEqual(buf, probe));
  bs.clear();
  test.ok(utils.arrayEqual(bs._bufSizes(), []));
  bs.append(probe);
  bs.append(probe);
  test.ok(utils.arrayEqual(bs._bufSizes(), [4, 4]));
  buf = bs.read(8);
  test.deepEqual(buf.length, 8);

  bs.clear();
  bs.append(probe);
  bs.append(probe);
  bs.grow(4);
  test.ok(utils.arrayEqual(bs._bufSizes(), [4,4,4]));
  buf = bs.read(8);
  test.deepEqual(buf.length, 8);

  bs.clear();
  bs.append(probe);
  bs.grow(6);
  bs.append(probe);
  test.ok(utils.arrayEqual(bs._bufSizes(), [4, 6]));
  buf = bs.read(8);
  test.deepEqual(buf.length, 8);

  test.done();
};

exports.zero = function(test) {
  var bs = new BufferStream({bsZero: true, bsStartEmpty: true, bsGrowSize: 4});
  test.ok(utils.arrayEqual(bs._bufSizes(), []));
  bs.grow();
  test.ok(utils.arrayEqual(bs._bufSizes(), [4]));
  test.ok(utils.bufferEqual(bs.bufs[0], new Buffer([0,0,0,0])));
  test.done();
}

exports.string = function(test) {
  var bs = new BufferStream();
  bs.write('01020304', 'hex');
  test.deepEqual(bs.toString(), "01020304");
  test.done();
}
