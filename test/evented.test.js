/*jslint node: true */
"use strict";

var temp = require('temp');
var fs = require('fs');

var cbor = require('../lib/cbor');
var Evented = cbor.Evented;
var hex = require('../lib/utils').hex;
var BufferStream = require('../lib/BufferStream');

exports.input_string = function(test) {
  var parser = new Evented({
    input: 'AAE=',
    encoding: 'base64',
    offset: 1
  });
  var foundValue = false;
  parser.on('value', function(value, tags, kind) {
    foundValue = value;
  });
  parser.on('end', function() {
    test.deepEqual(foundValue, 1);
    test.done();
  });
  parser.on('error', function(er) {
    test.fail(er);
  });
  parser.start();
};

exports.input_bufferstream = function(test) {
  var parser = new Evented({
    input: new BufferStream({bsInit: new Buffer([1])})
  });
  var foundValue = false;
  parser.on('value', function(value, tags, kind) {
    foundValue = value;
  });
  parser.on('end', function() {
    test.deepEqual(foundValue, 1);
    test.done();
  });
  parser.on('error', function(er) {
    test.fail(er);
  });
  parser.start();
};

exports.input_buffer = function(test) {
  var parser = new Evented({
    input: new Buffer('01', 'hex')
  });
  var foundValue = false;
  parser.on('value', function(value, tags, kind) {
    foundValue = value;
  });
  parser.on('end', function() {
    test.deepEqual(foundValue, 1);
    test.done();
  });
  parser.on('error', function(er) {
    test.fail(er);
  });
  parser.start();
};

exports.input_buffer_offset = function(test) {
  var parser = new Evented({
    input: new Buffer('0001', 'hex'),
    offset: 1
  });
  var foundValue = false;
  parser.on('value', function(value, tags, kind) {
    foundValue = value;
  });
  parser.on('end', function() {
    test.deepEqual(foundValue, 1);
    test.done();
  });
  parser.on('error', function(er) {
    test.fail(er);
  });
  parser.start();
};

exports.stream = function(test) {
  var parser = new Evented();
  var foundValue = false;
  parser.on('value', function(value, tags, kind) {
    foundValue = value;
  });
  parser.on('end', function() {
    test.deepEqual(foundValue, 1);
    test.done();
  });
  parser.on('error', function(er) {
    test.fail(er);
  });

  temp.track();
  var f = temp.createWriteStream();
  f.end(new Buffer('01', 'hex'), function(er){
    var g = fs.createReadStream(f.path);
    g.pipe(parser);
  });

};

exports.errors = function(test) {
  test.throws(function() {
    new Evented({
      input: 0
    });
  }, "invalid input");
  test.done();
}
