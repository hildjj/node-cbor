cbor(1) -- Batteries-included CBOR Read, Edit, Print Loop
=========================================================

SYNOPSIS
--------

```
# cbor
cbor [VERSION] (javascript output from typing 0x00)
cbor> ...
^D
```

DESCRIPTION
-----------

`cbor` is a version of the Node Read, Edit, Print Loop
([REPL](https://nodejs.org/api/repl.html)).  In this REPL:

- most interactive results output are followed by their CBOR representation
- input that starts with `0x`, `'`, `"`, or`` ` ``and is followed only by
  hex digits is taken as a hex-encoded binary string, decoded, and displayed
  in a format based on the `--type` option
- the following are already imported and in-scope of the REPL:
  - the `cbor` package
  - the `nofilter` package (as `NoFilter`)
  - all of the properties and functions of the cbor package (e.g. `encode`, `decode`)
  - Promises are automatically awaited, their results printed, and their results
    going into the `_` variable rather than the promise itself

Note that by default this command shares its history with the main Node REPL,
in the file `~/.node_repl_history`.  If you want to modify that, set the
`NODE_REPL_HISTORY` environment variable to the name of a file, or `''` to
disable history.

OPTIONS
-------

`-V, --version`: output the version number

`-c, --color`: Force color output even if stdout is not a TTY

`-t, --type <type>`: Output type (one of: javascript, diagnose, comment) (default: "javascript")

`-h, --help`: display help for

ENVIRONMENT VARIABLES
---------------------

All of the normal environment variables from Node apply.  In particular:

`NODE_REPL_HISTORY`: When a valid path is given, persistent REPL history will
be saved to the specified file rather than `.node_repl_history` in the user's
home directory. Setting this value to `''` (an empty string) will disable
persistent REPL history. Whitespace will be trimmed from the value. On Windows
platforms environment variables with empty values are invalid so set this
variable to one or more spaces to disable persistent REPL history.

`NODE_REPL_HISTORY_SIZE`: Controls how many lines of history will be
persisted if history is available. Must be a positive number. Default: 1000.

`NODE_REPL_MODE`: May be either 'sloppy' or 'strict'. Default: 'sloppy', which
will allow non-strict mode code to be run.

SEE ALSO
--------

* [node-cbor](https://github.com/hildjj/node-cbor/)
* [RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html)
