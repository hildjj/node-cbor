cbor2comment(1) -- convert CBOR wire protocol to commented version
==================================================================

SYNOPSIS
--------

```
cbor2comment test.cbor > test.txt
```

DESCRIPTION
-----------

`cbor2comment` creates a commented version of an input bytestream.  For
example, if the input contained the two bytes (in hex) `61 61`, the output
would be:

      61                -- String, length: 1
        61              -- "a"
    0x6161

OPTIONS
-------

`-`: read from stdin instead of a file.  This is the default.

`-t NUM, --tabsize NUM`: the number of 2-space tab indents to move the '--' to the right.
Eventually, this will be replaced with an algorithm that takes two passes
over the input.

`-x [string]`: read the input from the hex-encoded string on the command line

`-V, --version`: print the node-cbor version and exit

`-h, --help`: print some help text and exit

TODO
----

* `cbor2comment` is not built for execution speed or reuse.
* Make 2 passes over the input.
* Move the summary hex output to the beginning.

SEE ALSO
--------

* [node-cbor](https://github.com/hildjj/node-cbor)
* [RFC 7049](http://tools.ietf.org/html/rfc7049)
