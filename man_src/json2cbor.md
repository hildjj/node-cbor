json2cbor(1) -- convert JSON formatted text to CBOR
===================================================

SYNOPSIS
--------

```
json2cbor test.json > test.cbor
```

DESCRIPTION
-----------

`json2cbor` output a CBOR data stream for an input set of files.

OPTIONS
-------

`-`: read from stdin instead of a file.  This is the default.

`-h`: output a hex-encoded version of the CBOR data, instead of the native
  CBOR data

SEE ALSO
--------

* [node-cbor](https://github.com/hildjj/node-cbor)
* [RFC 7049](http://tools.ietf.org/html/rfc7049)