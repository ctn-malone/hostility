Easy manipulation of `/etc/hosts` through command-line

Requires [QuickJS](https://github.com/ctn-malone/quickjs-cross-compiler/releases/tag/2021-03-27_1+ext-lib-0.2.2) for compilation

# Compile

```
qjsc.sh -o hostility src/hostility.js
```

This will compile a static binary

# Usage

```
./hostility -h
A command-line utility to manipulate "/etc/hosts"

https://github.com/ctn-malone/hostility

Version 0.1.0

Usage: hostility [option]...

    --set {ip}:{host}          : add host with hostname {host} and ip address {ip}
    --set-first {ip}:{host}    : add host with hostname {host} and ip address {ip} (hostname will be inserted before any existing)
    --set-from-file {file}     : add all hosts listed in file {file} (each line should be {ip}:{host})
    --unset {ip}:{host}        : remove host with hostname {host} and ip address {ip}
    --unset-from-file {file}   : remove all hosts listed in file {file} (each line should be {ip}:{host})
    --unset-host {pattern}     : remove all hosts with an hostname matching {pattern} (can be a string or a regexp)
    --unset-ip {pattern}       : remove all hosts with an ip address matching {pattern} (can be a string or a regexp)
    --strip-comments           : remove all comments
    --strip-blank-lines        : remove all empty lines
    --remove-duplicates        : remove duplicate hosts (only keep the first declaration of each host)
    --input                    : input file (default = /etc/hosts, use - for stdin)
    --output                   : input file (default = same as input, use - for stdout)
    --verbose                  : display extra informations on stderr
    --dry-run                  : only indicate if content will change (1) or not (0)
    -h, --help                 : print help

Rules will be processed in the order they were provided on command line

Examples:

    hostility --unset '192.168.64.1:host1' --set '192.168.64.1:host2'
    hostility --unset-ip '192.168.64.1' --set '192.168.64.1:host1' --set '192.168.64.1:host2'
    hostility --unset-host '/^host[0-9]+/'
    hostility --unset-ip '/^192.168.0./'
```

* program will not overwrite hosts file if no change is needed
* program will output `0` (no change) or `1` (a change occured) on *stdout*

# Run unit tests

Run `run.js` under `test` directory

```
qjs.sh run.js
```