# jslint node: true

assert = require 'assert'
util = require 'util'
stream = require 'stream'

# @nodoc
EMPTY = new Buffer 0

# @nodoc
createEOF = () ->
  e = new Error('EOF')
  e.BufferStreamEOF = true
  e

# A buffer that grows in chunks, and allows waiting for a given number of
# bytes to be available.
#
# @method #writeUInt8(val)
#   Write an unsigned byte into the stream
#   @param val [Integer] the byte to write
#
# @method #writeUInt16LE(val)
#   Write an unsigned 16 bit integer into the stream in little endian order
#   to the stream
#   @param val [Integer]
#
# @method #writeUInt16BE(val)
#   Write an unsigned 16 bit integer into the stream in big endian order
#   to the stream
#   @param val [Integer]
#
# @method #writeUInt32LE(val)
#   Write an unsigned 32 bit integer into the stream in little endian order
#   to the stream
#   @param val [Integer]
#
# @method #writeUInt32BE(val)
#   Write an unsigned 32 bit integer into the stream in big endian order
#   to the stream
#   @param val [Integer]
#
# @method #writeInt8(val)
#   Write a signed 8 bit integer into the stream
#   to the stream
#   @param val [Integer]
#
# @method #writeInt16LE(val)
#   Write a signed 16 bit integer into the stream in little endian order
#   to the stream
#   @param val [Integer]
#
# @method #writeInt16BE(val)
#   Write a signed 16 bit integer into the stream in big endian order
#   to the stream
#   @param val [Integer]
#
# @method #writeInt32LE(val)
#   Write a signed 32 bit integer into the stream in little endian order
#   to the stream
#   @param val [Integer]
#
# @method #writeInt32BE(val)
#   Write a signed 32 bit integer into the stream in big endian order
#   to the stream
#   @param val [Integer]
#
# @method #writeFloatLE(val)
#   Write a single-precision IEEE 754 floating point number in little endian
#   order to the stream
#   @param val [Integer]
#
# @method #writeFloatBE(val)
#   Write a single-precision IEEE 754 floating point number in big endian order
#   to the stream
#   @param val [Integer]
#
# @method #writeDoubleLE(val)
#   Write a double-precision IEEE 754 floating point number in little endian
#   order to the stream
#   @param val [Integer]
#
# @method #writeDoubleBE(val)
#   Write a double-precision IEEE 754 floating point number in big endian order
#   to the stream
#   @param val [Integer]
class BufferStream extends stream.Writable
  # @param options [Object] can be as for stream, but also:
  # @option options [Buffer] bsInit initial buffer
  # @option options [Integer] bsGrowSize the number of bytes to grow when needed
  #   (default: 512)
  # @option options [Boolean] bsStartEmpty don't initialize with a growSize
  #   buffer (default: false)
  # @option options [Boolean] bsStartEnded after bsInit is appended, should
  #   we end the stream?
  #   if bsInit, defaults to `true`, else ignored
  # @option options [Boolean] bsZero whenever a new Buffer is added to the list,
  #   initialize it to zero (default: false)
  constructor: (options = {}) ->
    @clear()
    @_resetCB()

    super options
    @growSize = options.bsGrowSize ? 512
    @zero = options.bsZero ? false

    @on "finish", ()=>
      @_resetCB createEOF()

    # Sometimes we'll know the buffer we're working with,
    # and it will never grow.
    buf = options.bsInit
    if Buffer.isBuffer buf
      @append buf
      startEnded = options.bsStartEnded ? true
      if !!startEnded
        @end()

    else if !options.bsStartEmpty
      @grow()

  # Is the given object a BufferStream?
  # @param obj [Object] the object to check
  # @return [Boolean]
  @isBufferStream: (obj) ->
    obj instanceof BufferStream

  # Is the given Error an End Of File indicator?
  # @param er [Error] the error object to check
  # @return [Boolean]
  @isEOFError: (er) ->
    er and (er instanceof Error) and (er.BufferStreamEOF == true)

  # When this object gets passed to an Encoder, render it as a byte string.
  # @nodoc
  encodeCBOR: (enc) ->
    enc._packBuffer enc, @flatten()

  # Is this BufferStream valid?
  # Checks `@length`, `@left`, and the internal buffer list for consistency
  # @return [Boolean]
  isValid: () ->
    len = @bufs.reduce (prev, cur) ->
      prev + cur.length
    , 0
    len -= @left
    len == @length

  # @nodoc
  # Leave this in for debugging, please.
  _bufSizes: () ->
    @bufs.map (b) -> b.length

  # @nodoc
  _write: (chunk, encoding, cb) ->
    unless Buffer.isBuffer chunk
      cb(new Error 'String encoding not supported')
    else
      @append chunk
      cb()

  # @nodoc
  _resetCB: (args...) ->
    [cb, @waitingCB, @waitingLen] = [@waitingCB, null, Number.MAX_VALUE]
    if cb and args.length
      cb.apply @, args
    cb

  # @nodoc
  _notifyWaiter: () ->
    assert.ok @waitingCB

    buf = @read @waitingLen
    @_resetCB null, buf

  # Read from the BufferStream
  #
  # @param length [Integer] number of bytes to read, up to `@length`.
  # @option length [Integer] -1 get the first buffer
  # @option length [Integer] 0 read all
  read: (length) ->
    buf = null
    if @length == 0
      return EMPTY
    lenZ = @bufs[0].length
    length ?= 0
    lenW = switch length
      when 0 then @length
      when -1 then Math.min(@length, lenZ)
      else Math.min(@length, length)

    # TODO: don't keep slicing; maintain a start offset.

    # Note to self: none of the paths here need to modify @left
    # You don't need to check again.
    if lenZ == lenW
      # hey, it might happen, often if length=-1
      buf = @bufs.shift()
    else if lenZ > lenW
      # just return part of the first buf
      buf = @bufs[0].slice(0, lenW)
      @bufs[0] = @bufs[0].slice(lenW)
    else if lenW == @length
      # the guts of @flatten.  We know there's more than one buffer needed,
      # so skip some of the checks there.  Also don't destroy left.

      local_left = null
      if @left != 0
        lastbuf = @bufs[@bufs.length - 1]
        if @left == lastbuf.length
          # grown, but not added to yet.  This will break Buffer.concat.
          local_left = @bufs.pop()
        else
          local_left = lastbuf.slice(lastbuf.length - @left)

      buf = Buffer.concat @bufs, @length
      @bufs = if local_left then [local_left] else []
    else
      # We're going to need more than one.
      some = []
      got = 0
      while got < lenW
        b = @bufs.shift()
        some.push b
        got += b.length

      buf = Buffer.concat some, lenW
      if got > lenW
        # put the unread bytes back.  Those bytes will ALWAYS be in the last
        # chunk of some.
        last = some[some.length - 1]
        left = got - lenW
        @bufs.unshift last.slice(last.length - left)

    @length -= lenW
    @emit 'read', buf
    buf

  # Are we at the End of File?
  # @return [Boolean]
  isEOF: () ->
    (@length == 0) and @_writableState.finished

  # Wait for a given number of bytes to be available, then call the callback
  # @param length [Integer] number of bytes to wait for
  # @param cb [function] callback(error, buffer), where if the error is empty,
  #   the buffer will be exactly `length` bytes
  # @return [void]
  # @throw [Error] invalid state, a second wait() while one was already pending
  # @throw [Error] invalid `length`
  # @throw [Error] no callback specified
  wait: (length, cb) ->
    # TODO: should these be asserts?
    if @waitingCB
      throw new Error 'Invalid state.  Cannot wait while already waiting.'

    unless (typeof(length) == 'number') and (length >= 0)
      throw new Error "length required, must be non-negative number: #{length}"

    unless typeof(cb) == 'function'
      throw new Error 'cb required, must be function'

    if length == 0
      # I totally waited.  Really.
      process.nextTick ()=>
        cb.call @, null, EMPTY
    else
      @waitingCB = cb
      @waitingLen = length

      if @length >= length
        @_notifyWaiter()
      else if @_writableState.ended
        # never gonna fill you up
        # Damn you, me from months ago.  You just rolled yourself.
        @_resetCB createEOF()

  # Clear all bytes from the stream, without notifying any pending waits
  # @return [void]
  clear: () ->
    # if someone is waiting, they will have to keep waiting;
    # everything currently read is tossed
    @bufs = []
    @length = 0
    @left = 0

  # Trim the last buffer in the list, so that there are no unused bytes
  # @nodoc
  _trimLast: () ->
    # set left to 0, keeping any relevant info in the last buffer
    old = @left
    if @left > 0
      last = @bufs.pop()
      if @left != last.length
        @bufs.push(last.slice(0, last.length - @left))

      @left = 0
    old

  # @nodoc
  _lengthen: (size) ->
    assert.ok size > 0
    @length += size
    len = @length
    if @length >= @waitingLen
      @_notifyWaiter()
    len

  # @nodoc
  grow: (size) ->
    @_trimLast()

    s = size ? @growSize
    b = new Buffer(s)
    if @zero
      b.fill 0
    @bufs.push(b)
    @left = s
    b

  # Append a buffer to the stream
  # @param buf [Buffer] the buffer to add
  # @return [Integer] the number of bytes added
  append: (buf) ->
    assert.ok Buffer.isBuffer(buf)
    len = buf.length
    return if len == 0

    if @left == 0
      @bufs.push buf
    else if len > @left
      @_trimLast() # left always 0
      @bufs.push buf # still nothing left
    else
      lastbuf = @bufs[@bufs.length - 1]
      buf.copy lastbuf, lastbuf.length - @left
      @left -= len

    @_lengthen len

  # Smoosh everything into one buffer, with nothing left over
  # This probably should never be called aside from internally or from the
  # unit tests.  May be changed to _flatten in the future.
  #
  # @note This does not fire any waiting callbacks, or remove
  #   bytes from the stream.
  # @return [Buffer] the concatenated set of all bytes
  flatten: () ->
    if @length == 0
      @left = 0
      @bufs = []
      return EMPTY

    b = null
    switch @bufs.length
      # Note: this really is an assert, since it's protected by the
      # @length == 0 above
      when 0
        `// istanbul ignore next`
        assert.fail @length, "Invalid state.  No buffers when length>0."
        `// istanbul ignore next`
      when 1
        if @left == 0
          # already flat
          b = @bufs[0]
        else
          b = @bufs[0].slice 0, @length
          @bufs = [b]
          @left = 0
      else
        if @left == @bufs[@bufs.length - 1].length
          # grown, but not added to yet.  This will break Buffer.concat,
          # so just drop it as unused
          @bufs.pop()

        b = Buffer.concat @bufs, @length
        @bufs = [b]
        @left = 0
    b

  # Generate a buffer cropped by `start` and `end`.  Negative indexes start from
  # the end of the bytes currently in the stream.
  #
  # @note This does not fire any waiting callbacks, or remove bytes from
  #   the stream.
  # @param start [Integer] start offset (default: 0)
  # @param end [Integer] end offset (default: `@length`)
  # @return [Buffer] the generated slice
  slice: (start, end) ->
    @flatten().slice start, end

  # Fill the buffer with a given value.
  # @param val [Integer] the value to put in each byte
  # @param offset [Integer] beginning offset to modify (default: 0)
  # @param end [Integer] end offset (default: `@length`)
  fill: (val, offset, end) ->
    @flatten().fill val, offset, end

  # Convert the bytes to JSON, as a list of integers.
  # @return [String] JSON representation
  toJSON: () ->
    @flatten().toJSON()

  # Convert the bytes to a string, in the given encoding.
  # @param encoding [String] encoding name (default: 'hex')
  # @return [String] string representation
  toString: (encoding = 'hex') ->
    @flatten().toString(encoding)

  # Make sure that there are `len` bytes available for writing.
  # @nodoc
  ensure: (len) ->
    if @left < len
      @grow Math.max(@growSize, len)
    else
      @bufs[@bufs.length - 1]

  # Write a string into the stream
  # @param value [String] the string to write
  # @param length [Integer] the number of *bytes* to write
  #   (default: byte length of string in the given encoding)
  # @param encoding [String] The encoding to use for the string
  #   (default: 'utf8')
  writeString: (value, length, encoding = 'utf8') ->
    length ?= Buffer.byteLength value, encoding
    return if length == 0

    b = @ensure length
    b.write value, b.length - @left, length, encoding
    @left -= length
    @_lengthen length

  # @nodoc
  @_write_gen: (meth, len) ->
    (val) ->
      b = @ensure len
      b[meth].call b, val, b.length - @left, true
      @left -= len
      @_lengthen len

  writeUInt8:    @_write_gen 'writeUInt8',    1
  writeUInt16LE: @_write_gen 'writeUInt16LE', 2
  writeUInt16BE: @_write_gen 'writeUInt16BE', 2
  writeUInt32LE: @_write_gen 'writeUInt32LE', 4
  writeUInt32BE: @_write_gen 'writeUInt32BE', 4

  writeInt8:    @_write_gen 'writeInt8',    1
  writeInt16LE: @_write_gen 'writeInt16LE', 2
  writeInt16BE: @_write_gen 'writeInt16BE', 2
  writeInt32LE: @_write_gen 'writeInt32LE', 4
  writeInt32BE: @_write_gen 'writeInt32BE', 4

  writeFloatLE:  @_write_gen 'writeFloatLE',  4
  writeFloatBE:  @_write_gen 'writeFloatBE',  4
  writeDoubleLE: @_write_gen 'writeDoubleLE', 8
  writeDoubleBE: @_write_gen 'writeDoubleBE', 8

module.exports = BufferStream
