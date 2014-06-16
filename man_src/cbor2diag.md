cbor2diag(1) -- convert CBOR wire protocol to diagnostic text
=============================================================

SYNOPSIS
--------

```
cbor2diag test.cbor > test.txt
```

DESCRIPTION
-----------

`cbor2diag` outputs the diagnostic format from RFC 7049 that corresponds to the
CBOR files that were input.  For example, the following input:

    0xc100
      c1                -- Tag 1 (Date)
        00              -- 0

produces:

    1(0)

OPTIONS
-------

`-`: read from stdin instead of a file.  This is the default.

`-x`: assume the input file is hex-encoded CBOR, which makes testing easier some days.

`-V, --version`: print the node-cbor version and exit

`-h, --help`: print some help text and exit

SEE ALSO
--------

* [node-cbor](https://github.com/hildjj/node-cbor)
* [RFC 7049](http://tools.ietf.org/html/rfc7049)
