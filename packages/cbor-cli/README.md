# cbor-cli

A command-line interface for encoding and parse data in the Concise Binary
Object Representation (CBOR) data format
([RFC7049](http://tools.ietf.org/html/rfc7049)).

## Supported Node.js versions

This project now only supports versions of Node that the Node team is
[currently supporting](https://github.com/nodejs/Release#release-schedule).
Ava's [support
statement](https://github.com/avajs/ava/blob/master/docs/support-statement.md)
is what we will be using as well.  Currently, that means Node `10`+ is
required.  If you need to support an older version of Node (back to version
6), use cbor version 5.2.x, which will get nothing but security updates from
here on out.

## Installation:

```bash
$ npm install -g cbor-cli
```

## Documentation:

There is a full [API](../cbor) that this library depends on.

For all of these tools, if a hex string is not specified, or if the file name provided is `-`, they will read from stdin and write to stdout.

From the command line:

### `cbor`

```
$ cbor.js -h
Usage: cbor [options]

Options:
  -V, --version      output the version number
  -c, --color        Force color output even if stdout is not a TTY
  -t, --type <type>  Output type (one of: javascript, diagnose, comment) (default: "javascript")
  -h, --help         display help for command
```

Starts a Read, Edit, Print Loop (REPL), with the cbor package and all of its
symbols already available.  Almost everything you do in the REPL will also
output the CBOR encoding of the result in hex, after the normal result.

### `cbor2comment`

```
$ cbor2comment -h
Usage: cbor2comment [options] <file ...>

Options:
  -V, --version           output the version number
  -x, --hex <string>      Hex string input
  -t, --tabsize [spaces]  Indent amount
  -h, --help              display help for command
```

Convert the given file or hex string into the CBOR comment format.  This is
useful for understanding what each byte means.

### `cbor2diag`

```
$ cbor2diag -h
Usage: cbor2diag [options] <file ...>

Options:
  -V, --version       output the version number
  -x, --hex <STRING>  Hex string input
  -h, --help          display help for command
```

Convert the given file or hex string into the CBOR [diagnostic
format](https://www.rfc-editor.org/rfc/rfc8949.html#name-diagnostic-notation).
This is useful for getting a slightly more nuanced view into what CBOR came in
on the wire than you would if you turned it all the way into javascript.

### `cbor2js`

```
$ cbor2js -h
Usage: cbor2js [options] <file ...>

Options:
  -V, --version       output the version number
  -x, --hex <STRING>  Hex string input
  -H, --hidden        Include non-enumerable symbols and properties
  -h, --help          display help for command
```

Convert the given file or hex string into javascript objects, then use
[`util.inspect`](https://nodejs.org/api/util.html#util_util_inspect_object_options)
to format them for consumption.  This usually gives a much better idea of type
information, and is easier to read than JSON.

### `cbor2json`

```
$ cbor2json -h
Usage: cbor2json [options] <file ...>

Options:
  -V, --version       output the version number
  -x, --hex <STRING>  Hex string input
  -h, --help          display help for command
```

Convert the given file or hex string into [JSON](https://tools.ietf.org/html/rfc8259).  This loses type information, but does the best it can if you want interoperability with existing JSON tooling.  For example, JSON can't express Dates, so they are output as [ISO 8601](https://xkcd.com/1179/) strings.

### `js2cbor`

```
$ js2cbor -h
Usage: js2cbor [options] <file ...>

Options:
  -V, --version    output the version number
  -x, --hex        Hex string output
  -c, --canonical  Canonical output
  -h, --help       display help for command
```

Read the input files or stdin as if it were a commonjs package

### `json2cbor`

```
$ json2cbor -h
Usage: json2cbor [options] <file ...>

Options:
  -V, --version    output the version number
  -x, --hex        Hex string output
  -c, --canonical  Canonical output
  -h, --help       display help for command
```

Converts the given JSON or [JSON Text
Sequence](https://tools.ietf.org/html/rfc7464) file into binary CBOR.  If `-x`
is given, instead outputs a hex-encoded version of the CBOR.
