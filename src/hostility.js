import * as std from 'std';
import * as os from 'os';

import arg from 'ext/arg.js';
import * as path from 'ext/path.js';
import { HostsFileParser } from './lib/hosts-file-parser.js';
import { version } from 'ext/version.js';

const VERSION = '0.1.0';
const MIN_LIB_VERSION = '0.2.2';

const REG_IPADDR_V4 = /^\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b$/;
const REG_IPADDR_V6 = /^(?:[a-fA-F0-9]{0,4})(?::[a-fA-F0-9]{0,4}){1,5}$/;

const mySelf = path.getScriptName(true);

/**
 * Check whether or not string is a valid ip address
 *
 * @param {string} str string to check
 *
 * @return {boolean}
 */
const isValidIpaddr = (str) => {
    if (REG_IPADDR_V4.test(str)) {
        return true;
    }
    if (REG_IPADDR_V6.test(str)) {
        return true;
    }
    return false;
}

/**
 * Get regexp from a string
 */
const getRegexp = (str) => {
    try {
        return new RegExp(str);
    }
    // invalid regexp
    catch (e) {
        return undefined;
    }
}

/**
 * Get fullpath to hosts file (platform dependant)
 *
 * @return {string}
 */
const getHostsFile = () => {
    if ('darwin' == os.platform) {
        return '/private/etc/hosts'
    }
    return '/etc/hosts';
}

const getUsage = () => {
    const message = `
Usage: ${mySelf} [option]...

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
    --input                    : input file (default = ${getHostsFile()}, use - for stdin)
    --output                   : input file (default = same as input, use - for stdout)
    --verbose                  : display extra informations on stderr
    --dry-run                  : only indicate if content will change (1) or not (0)
    -h, --help                 : print help
`.trim();
    return message;
}

const getHelp = () => {
    const message = `
A command-line utility to manipulate "${getHostsFile()}"

https://github.com/ctn-malone/hostility

Version ${VERSION}
`.trimStart();
    const footer = `
Rules will be processed in the order they were provided on command line

Examples:

    ${mySelf} --unset '192.168.64.1:host1' --set '192.168.64.1:host2'
    ${mySelf} --unset-ip '192.168.64.1' --set '192.168.64.1:host1' --set '192.168.64.1:host2'
    ${mySelf} --unset-host '/^host[0-9]+/'
    ${mySelf} --unset-ip '/^192\.168\.0\./'
`.trimStart();
    return `${message}\n${getUsage()}\n\n${footer}`;
}

// ensure we have minimum lib version
if (!version.gte(MIN_LIB_VERSION)) {
    std.err.puts(`Minimum required library version is ${MIN_LIB_VERSION} (current is ${version.VERSION})\n`);
    std.exit(1);
}

let args;
try {
    args = arg({
        // set a single entry
        '--set': [(v, n, p, i) => {
            const value = v.trim();
            const arr = value.split(':');
            if (2 !== arr.length) {
                const err = new Error(`Invalid option value: ${n} ${value} (should match {ip}:{host})`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            const ipaddr = arr[0].trim();
            const host = arr[1].trim();
            if (!isValidIpaddr(ipaddr) ||
                '' === host
            ) {
                const err = new Error(`Invalid option value: ${n} ${value} (should match {ip}:{host})`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            return {index:i, argName:n, argValue:value, action:'set', entries:[{ipaddr:ipaddr, host:host}]};
        }],
        // set a single as first entry
        '--set-first': [(v, n, p, i) => {
            const value = v.trim();
            const arr = value.split(':');
            if (2 !== arr.length) {
                const err = new Error(`Invalid option value: ${n} ${value} (should match {ip}:{host})`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            const ipaddr = arr[0].trim();
            const host = arr[1].trim();
            if (!isValidIpaddr(ipaddr) ||
                '' === host
            ) {
                const err = new Error(`Invalid option value: ${n} ${value} (should match {ip}:{host})`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            return {index:i, argName:n, argValue:value, action:'set', entries:[{ipaddr:ipaddr, host:host}], opt:{first:true}};
        }],
        // set multiple entries
        '--set-from-file': (v, n, p, i) => {
            const value = v.trim();
            // check file
            if (0 !== os.stat(value)[1]) {
                const err = new Error(`Invalid option value: ${n} ${value} (file does not exist)`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            const content = std.loadFile(value);
            if (null === content) {
                const err = new Error(`Invalid option value: ${n} ${value} (could not read from file)`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            const entries = [];
            content.split("\n").forEach((str, lineIndex) => {
                const line = str.trim();
                // ignore empty lines or comments
                if ('' == line || line.startsWith('#')) {
                    return;
                }
                const arr = line.split(':');
                if (2 !== arr.length) {
                    const err = new Error(`Invalid option value: ${n} ${value} (line ${lineIndex + 1} should match {ip}:{host})`);
                    err.code = 'ARG_INVALID_OPTION';
                    throw err;
                }
                const ipaddr = arr[0].trim();
                const host = arr[1].trim();
                if (!isValidIpaddr(ipaddr) ||
                    '' === host
                ) {
                    const err = new Error(`Invalid option value: ${n} ${value} (line ${lineIndex + 1} should match {ip}:{host})`);
                    err.code = 'ARG_INVALID_OPTION';
                    throw err;
                }
                entries.push({ipaddr:ipaddr, host:host});
                return {index:i, argName:n, argValue:value, action:'set', entries:[{ipaddr:ipaddr, host:host}]};
            });
            return {index:i, argName:n, argValue:value, action:'set', entries:entries};
        },
        // remove a single entry
        '--unset': [(v, n, p, i) => {
            const value = v.trim();
            const arr = value.split(':');
            if (2 !== arr.length) {
                const err = new Error(`Invalid option value: ${n} ${value} (should match {ip}:{host})`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            const ipaddr = arr[0].trim();
            const host = arr[1].trim();
            if (!isValidIpaddr(ipaddr) ||
                '' === host
            ) {
                const err = new Error(`Invalid option value: ${n} ${value} (should match {ip}:{host})`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            return {index:i, argName:n, argValue:value, action:'unset', entries:[{ipaddr:ipaddr, host:host}]};
        }],
        // remove multiple entries
        '--unset-from-file': (v, n, p, i) => {
            const value = v.trim();
            // check file
            if (0 !== os.stat(value)[1]) {
                const err = new Error(`Invalid option value: ${n} ${value} (file does not exist)`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            const content = std.loadFile(value);
            if (null === content) {
                const err = new Error(`Invalid option value: ${n} ${value} (could not read from file)`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            const entries = [];
            content.split("\n").forEach((str, lineIndex) => {
                const line = str.trim();
                // ignore empty lines or comments
                if ('' == line || line.startsWith('#')) {
                    return;
                }
                const arr = line.split(':');
                if (2 !== arr.length) {
                    const err = new Error(`Invalid option value: ${n} ${value} (line ${lineIndex + 1} should match {ip}:{host})`);
                    err.code = 'ARG_INVALID_OPTION';
                    throw err;
                }
                const ipaddr = arr[0].trim();
                const host = arr[1].trim();
                if (!isValidIpaddr(ipaddr) ||
                    '' === host
                ) {
                    const err = new Error(`Invalid option value: ${n} ${value} (line ${lineIndex + 1} should match {ip}:{host})`);
                    err.code = 'ARG_INVALID_OPTION';
                    throw err;
                }
                entries.push({ipaddr:ipaddr, host:host});
                return {index:i, argName:n, argValue:value, action:'set', entries:[{ipaddr:ipaddr, host:host}]};
            });
            return {index:i, argName:n, argValue:value, action:'set', entries:entries};
        },
        // remove all entries matching an ip pattern
        '--unset-ip': [(v, n, p, i) => {
            const value = v.trim();
            const rule = {index:i, argName:n, argValue:value, action:'unsetIpaddr', pattern:value};
            // it is a regexp
            if (value.startsWith('/') && value.endsWith('/')) {
                // remove leading & trailing "/"
                const str = value.substring(1, value.length -1).trim();
                const reg = getRegexp(str);
                if ('' == str || undefined === reg) {
                    const err = new Error(`Invalid option value: ${n} ${v} (regexp is invalid or empty)`);
                    err.code = 'ARG_INVALID_OPTION';
                    throw err;
                }
                rule.pattern = reg;
            }
            return rule;
        }],
        '--unset-host': [(v, n, p, i) => {
            const value = v.trim();
            const rule = {index:i, argName:n, argValue:value, action:'unsetHost', pattern:value};
            // it is a regexp
            if (value.startsWith('/') && value.endsWith('/')) {
                // remove leading & trailing "/"
                const str = value.substring(1, value.length -1).trim();
                const reg = getRegexp(str);
                if ('' == str || undefined === reg) {
                    const err = new Error(`Invalid option value: ${n} ${v} (regexp is invalid)`);
                    err.code = 'ARG_INVALID_OPTION';
                    throw err;
                }
                rule.pattern = reg;
            }
            return rule;
        }],
        '--input': (v, n, p, i) => {
            const value = v.trim();
            if ('-' == value) {
                return value;
            }
            if (0 !== os.stat(value)[1]) {
                const err = new Error(`Invalid option value: ${n} ${value} (file does not exist)`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            return value;
        },
        '--output': (v, n, p, i) => {
            const value = v.trim();
            if ('-' == value) {
                return value;
            }
            let parentDir;
            const arr = value.split('/');
            // only a single entry (ie: we're in the same directory) => return cwd
            if (1 === arr.length) {
                parentDir = os.getcwd()[0];
            }
            else {
                // remove last entry
                arr.pop();
                parentDir = arr.join('/');
            }
            if (0 !== os.stat(parentDir)[1]) {
                const err = new Error(`Invalid option value: ${n} ${value} (parent directory does not exist)`);
                err.code = 'ARG_INVALID_OPTION';
                throw err;
            }
            return value;
        },
        '--strip-comments': Boolean,
        '--strip-blank-lines': Boolean,
        '--remove-duplicates': Boolean,
        '--verbose': Boolean,
        '--dry-run': Boolean,
        '--help': Boolean,
        // aliases
    	'-h': '--help'
    });
}
catch (e) {
    switch (e.code) {
        case 'ARG_UNKNOWN_OPTION':
        case 'ARG_INVALID_OPTION':
        case 'ARG_MISSING_REQUIRED_SHORTARG':
        case 'ARG_MISSING_REQUIRED_LONGARG':
            std.err.printf(`${e.message.trim()}\n`);
            std.err.printf(`${getUsage()}\n`);
            std.exit(2);
    }
    throw e;
}
if (args['--help']) {
    std.err.printf(`${getHelp()}\n`);
    std.exit(2);
}
// ensure all required arguments were provided
[].forEach((n) => {
    if (undefined === args[n]) {
        std.err.printf(`Option ${n} is required\n`);
        std.err.printf(`${getUsage()}\n`);
        std.exit(2);
    }
});

// add rules
const rules = [];
[
    '--set', '--set-first', '--set-from-file',
    '--unset', 'unset-from-file',
    '--unset-ip', '--unset-host'
].forEach((k) => {
    if (undefined === args[k]) {
        return;
    }
    if (Array.isArray(args[k])) {
        args[k].forEach((r) => {
            rules.push(r);
        });
    }
    else {
        rules.push(args[k]);
    }
});
// sort rules by their index on command-line (ie: the order they were typed)
rules.sort((a, b) => {
    return (a.index < b.index) ? -1 : 1;
});

// input file
let inputFile = getHostsFile();
if (undefined !== args['--input']) {
    inputFile = args['--input'];
}

// load content
let inputContent;
if ('-' !== inputFile) {
    // ensure file exists
    if (0 !== os.stat(inputFile)[1]) {
        std.err.printf(`Invalid option value: --input ${inputFile} (file does not exist)\n`);
        std.err.printf(`${getUsage()}\n`);
        std.exit(2);
    }
    const errObj = {};
    const file = std.open(inputFile, 'r', errObj);
    if (null === file) {
        std.err.printf(`Could not open file '${inputFile}' for reading (${errObj.errno})\n`);
        std.exit(1);
    }
    inputContent = file.readAsString();
    file.close();
}
// read from stdin
else {
    let line;
    const lines = [];
    while (null !== (line = std.in.getline())) {
        lines.push(line.trim());
    }
    inputContent = lines.join('\n').trim();
}

// parse input
const parser = new HostsFileParser({
    stripBlankLines:args['--strip-blank-lines'],
    stripComments:args['--strip-comments'],
    verbose:args['--verbose']
});
parser.parse(inputContent);

// remove duplicates ?
if (args['--remove-duplicates']) {
    parser.removeDuplicateHosts();
}

// apply rules
rules.forEach((r) => {
    if (args['--verbose']) {
        std.err.printf(`Processing rule ${r.argName} ${r.argValue} ...\n`);
    }
    if ('set' === r.action) {
        r.entries.forEach((e) => {
            parser.setEntry(e.ipaddr, e.host, r.opt);
        });
    }
    else if ('unset' === r.action) {
        r.entries.forEach((e) => {
            parser.unsetEntry(e.ipaddr, e.host);
        });
    }
    else if ('unsetIpaddr' === r.action) {
        if (r.pattern instanceof RegExp) {
            parser.unsetIpaddrIfMatches(r.pattern);
        }
        else {
            parser.unsetIpaddrIfEquals(r.pattern);
        }
    }
    else if ('unsetHost' === r.action) {
        if (r.pattern instanceof RegExp) {
            parser.unsetHostIfMatches(r.pattern);
        }
        else {
            parser.unsetHostIfEquals(r.pattern);
        }
    }
    else {
        throw new Error(`Unknown action '${r.action}'`);
    }
});

const hasChanged = parser.hasChanged();

if (args['--dry-run']) {
    if (hasChanged) {
        std.err.printf(`Content will change\n`);
        std.out.printf('1\n');
    }
    else {
        std.err.printf(`Content will not change\n`);
        std.out.printf('0\n');
    }
    std.exit(0);
}

// output
let outputContent = parser.get();
let outputFile = inputFile;
if (undefined !== args['--output']) {
    outputFile = args['--output'];
}
// print to stdout
if ('-' === outputFile) {
    std.out.printf(`${outputContent}\n`);
    std.exit(0);
}

outputContent += '\n';

// content did not change
if (!hasChanged) {
    // do nothing if output file is the same as input file
    if (inputFile == outputFile) {
        std.err.printf(`Nothing to do (content did not change)\n`);
        std.out.printf('0\n');
        std.exit(0);
    }
}
const errObj = {};
let file = std.open(outputFile, 'w', errObj);
if (null === file) {
    std.err.printf(`Could not open file '${outputFile}' for writing (${errObj.errno})\n`);
    std.exit(1);
}
file.puts(outputContent);
file.close();

std.err.printf(`Content successfully saved into '${outputFile}'\n`);
if (hasChanged) {
    std.out.printf('1\n');
}
else {
    std.out.printf('0\n');
}
