cbor2json(1) -- convert CBOR wire protocol to JSON
==================================================================

SYNOPSIS
--------

```
cbor2json test.cbor > test.json
```

DESCRIPTION
-----------

`cbor2json` creates a JSON file that mirrors (somewhat) the intent of the input
set of CBOR files.  For the subset of CBOR that directly maps to JSON, the
output will seem reasonable.  For CBOR inputs that do not map nicely to JSON,
substitutions are made that may or may not match your expectations.  For
example, the input:

    0xc100
      c1                -- Tag 1 (Date)
        00              -- 0

produces the following output that does not round-trip back to the same CBOR
input:

    "1970-01-01T00:00:00.000Z"

OPTIONS
-------

`-`: read from stdin instead of a file.  This is the default.

`-x [string]`: read the input from the hex-encoded string on the command line

`-V, --version`: print the node-cbor version and exit

`-h, --help`: print some help text and exit

SEE ALSO
--------

* [node-cbor](https://github.com/hildjj/node-cbor)
* [RFC 7049](http://tools.ietf.org/html/rfc7049)
