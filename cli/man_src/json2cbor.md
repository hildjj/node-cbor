json2cbor(1) -- convert JSON formatted text to CBOR
===================================================

SYNOPSIS
--------

```
json2cbor test.json > test.cbor
```

DESCRIPTION
-----------

`json2cbor` output a CBOR data stream for an input set of files.  The files
can either consist of a single JSON item, or an
[RFC 7464](https://tools.ietf.org/html/rfc7464) encoded JSON text series.  
In the latter case, each JSON item starts with the byte "1e" (hex), "30" (dec),
otherwise known as "Record Separator" (RS), and finishes with a newline.

An example sequence:

    ␞{"d":"2014-09-22T21:58:35.270Z","value":6}␤
    ␞{"d":"2014-09-22T21:59:15.117Z","value":12}␤

You can generate a sequence like this from a newline-separated JSON file like
this:

    sed -e s/^/\x1e/g [FILE]

(note: your shell might need $'' around the sed pattern to work.  I'll look
for a more shell-inspecific way of encdoding this later.)

The reason I'm making you go through this pain is that more of your JSON items
have newlines embedded in them than you think.  Ideally, you would write
your files out using RFC 7464, and you'd also get some of the benefits of
that format, including:

 * Detect a truncated file due to a process dying in the middle of writing
   your data.
 * Recovery while parsing from such a truncated file that was later appended to.
 * Detect when multiple processes are writing to the same file in an
   uncoordinated way.
 * Maintain newlines in your JSON.  They'll sneak in there anyway.

OPTIONS
-------

`-`: read from stdin instead of a file.  This is the default.

`-x, --hex`: output a hex-encoded version of the CBOR data, instead of the native
  CBOR data

`-V, --version`: print the node-cbor version and exit

`-h, --help`: print some help text and exit


SEE ALSO
--------

* [node-cbor](https://github.com/hildjj/node-cbor)
* [RFC 7049](http://tools.ietf.org/html/rfc7049)
