assert = require 'assert'
util = require 'util'
stream = require 'stream'

EMPTY = new Buffer 0

createEOF = () ->
  e = new Error('EOF')
  e.BufferStreamEOF = true
  e

# new BufferStream([options])
# options can be as for stream, but also:
# - bsInit: Initial buffer
# - bsGrowSize: the number of bytes to grow when needed (default: 512)
# - bsStartEmpty: Don't initialize with a growSize buffer (default: false)
# - bsStartEnded: after bsInit is appended, should we end the stream?
#     if bsInit, defaults to true, else ignored
class BufferStream extends stream.Writable
  constructor: (options={})->
    @clear()
    @_resetCB()

    super options
    @growSize = options.bsGrowSize ? 512

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

  @isBufferStream: (b)->
    b instanceof BufferStream

  @isEOFError: (er)->
    er and (er instanceof Error) and (er.BufferStreamEOF == true)

  encodeCBOR: (gen)->
    gen._packBuffer @flatten()

  isValid: ()->
    len = @bufs.reduce (prev, cur)->
      prev + cur.length
    , 0
    len -= @left
    len == @length

  _bufSizes: ()->
    @bufs.map (b)-> b.length

  _write: (chunk, encoding, cb)->
    unless Buffer.isBuffer chunk
      cb(new Error 'String encoding not supported')
    else
      @append chunk
      cb()

  _resetCB: (args...)->
    [cb, @waitingCB, @waitingLen] = [@waitingCB, null, Number.MAX_VALUE]
    if cb and args.length
      cb.apply @, args
    cb

  _notifyWaiter: ()->
    assert.ok @waitingCB

    buf = @read(@waitingLen);
    @_resetCB null, buf

  # read(0) gives all
  # read(-1) gives first buffer, up to @length
  # else, reads length up to @length
  read: (length)->
    buf = null
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
        lastbuf = @bufs[@bufs.length-1]
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
        last = some[some.length-1]
        left = got-lenW
        @bufs.unshift last.slice(last.length - left)

    @length -= lenW
    buf

  isEOF: ()->
    (@length == 0) and @_writableState.finished

  wait: (length, cb)->
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

  clear: ()->
    # if someone is waiting, they will have to keep waiting;
    # everything currently read is tossed
    @bufs = []
    @length = 0
    @left = 0

  trimLast: ()->
    # set left to 0, keeping any relevant info in the last buffer
    old = @left
    if @left > 0
      last = @bufs.pop()
      if @left != last.length
        @bufs.push(last.slice(0, last.length-@left))

      @left = 0
    old

  lengthen: (size)->
    assert.ok size>0
    @length += size
    if @length >= @waitingLen
      @_notifyWaiter()

  grow: (size)->
    @trimLast()

    s = size ? @growSize
    b = new Buffer(s)
    @bufs.push(b)
    @left = s
    b

  append: (buf)->
    assert.ok Buffer.isBuffer(buf)
    len = buf.length
    return if len == 0

    if @left == 0
      @bufs.push buf
    else if len > @left
      @trimLast() # left always 0
      @bufs.push buf # still nothing left
    else
      lastbuf = @bufs[@bufs.length-1]
      buf.copy lastbuf, lastbuf.length - @left
      @left -= len

    @lengthen len

  flatten: ()->
    # smoosh everything into one buffer, with nothing left over
    # return said buffer
    if @length == 0
      @left = 0
      @bufs = []
      return EMPTY

    b = null
    switch @bufs.length
      when 0 then assert.fail @length, "Invalid state.  No buffers when length>0."
      when 1
        if @left == 0
          # already flat
          b = @bufs[0]
        else
          b = @bufs[0].slice 0, @length
          @bufs = [b]
          @left = 0
      else
        if @left == @bufs[@bufs.length-1].length
          # grown, but not added to yet.  This will break Buffer.concat,
          # so just drop it as unused
          @bufs.pop()

        b = Buffer.concat(@bufs, @length);
        @bufs = [b];
        @left = 0;
    b

  slice: (start, end)->
    @flatten().slice start, end

  fill: (val, offset, end)->
    @flatten().fill val, offset, end

  toJSON: ()->
    @flatten().toJSON()

  toString: (encoding='hex')->
    @flatten().toString(encoding)

  ensure: (len)->
    if @left < len
      @grow Math.max(@growSize, len)
    else
      @bufs[@bufs.length-1]

  writeString: (value, length, encoding='utf8')->
    length ?= Buffer.byteLength value, encoding
    return if length == 0

    b = @ensure length
    b.write value, b.length - @left, length, encoding
    @left -= length
    @lengthen length

  @_write_gen: (meth, len)->
    (val)->
      b = @ensure len
      b[meth].call b, val, b.length - @left, true
      @left -= len
      @lengthen len

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

module.exports = BufferStream;
