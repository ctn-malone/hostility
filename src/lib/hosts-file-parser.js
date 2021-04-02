import * as os from 'os';
import * as std from 'std';

/*
    Parse /etc/hosts content and build an object representation
 */

export class HostsFileParser {

    /**
     * Constructor
     *
     * @param {object} opt options
     * @param {boolean} opt.stripBlankLines whether or not empty lines should be ignored (default = false)
     * @param {boolean} opt.stripComments whether or not comments should be ignored (default = false)
     * @param {boolean} opt.verbose unable / disable verbose mode (default = false)
     */
    constructor(opt) {
        if (undefined === opt) {
            opt = {};
        }
        this._stripBlankLines = false;
        if (true === opt.stripBlankLines) {
            this._stripBlankLines = true;
        }
        this._stripComments = false;
        if (true === opt.stripComments) {
            this._stripComments = true;
        }
        this._verbose = false;
        if (true === opt.verbose) {
            this._verbose = true;
        }
        this._reset();
    }

    /**
     * Parse content of hosts file
     *
     * @param {string} content
     */
    parse(content) {
        this._reset();
        content.trim().split('\n').map((l) => {
            /*
                Replace tabs with space & reduce spaces
             */
            return l.trim().replace(/\t+/g, ' ').replace(/ +/g, ' ');
        }).forEach((l) => {
            /*
                Parse each line as an object
             */
            const entry = {
                // whether or not line is empty(ie: no ip or comment)
                isBlank:false,
                // whether or not line is a comment
                isComment:false,
                // whether or not entry has been updated
                updated:false,
                // whether or not entry should be ignored
                shouldIgnore:false
            };
            const commentPos = l.indexOf('#');
            // we have a comment
            if (-1 !== commentPos) {
                // extract comment
                entry.comment = l.substring(commentPos + 1).trimEnd();
                // if we need to strip comments, entry will be changed
                if (this._stripComments) {
                    entry.updated = true;
                }
                l = l.substring(0, commentPos).trim();
                if ('' == l && undefined !== entry.comment) {
                    entry.isComment = true;
                    // if we need to strip comments, this will be a blank line
                    if (this._stripComments) {
                        entry.isBlank = true;
                    }
                }
            }
            // line without content
            if ('' === l) {
                // mark line as blank if it has no comment
                if (undefined === entry.comment) {
                    entry.isBlank = true;
                }
                if (entry.isBlank) {
                    // if we need to strip blank lines, entry will be ignored
                    if (this._stripBlankLines) {
                        entry.shouldIgnore = true;
                    }
                }
            }
            if (entry.isBlank || entry.isComment) {
                this._entries.push(entry);
                return;
            }
            const arr = l.split(' ');
            entry.ipaddr = arr.shift();
            // we don't have any host (should not happen with a correct file)
            if (0 === arr.length) {
                entry.shouldIgnore = true;
                delete entry.ipaddr;
            }
            else {
                entry.hosts = [];
                // remove duplicates
                arr.forEach((h) => {
                    if (!entry.hosts.includes(h)) {
                        entry.hosts.push(h);
                    }
                    else {
                        entry.updated = true;
                    }
                });
            }
            this._entries.push(entry);
        });
        /*
            Update hashes
         */
        this._entries.forEach((e) => {
            if (e.shouldIgnore) {
                return;
            }
            if (e.isBlank) {
                return;
            }
            if (e.isComment) {
                return;
            }
            // update ip hash
            if (undefined === this._entriesByIp[e.ipaddr]) {
                this._entriesByIp[e.ipaddr] = e;
                // update host hash
                e.hosts.forEach((h) => {
                    if (undefined === this._entriesByHost[h]) {
                        this._entriesByHost[h] = [];
                    }
                    this._entriesByHost[h].push(e);
                });
                return;
            }
            const existingEntry = this._entriesByIp[e.ipaddr];
            // ip already exists => ignore entry
            e.shouldIgnore = true;
            // add hosts to previous entry
            const newHosts = [];
            e.hosts.forEach((h) => {
                if (!existingEntry.hosts.includes(h)) {
                    existingEntry.hosts.push(h);
                    newHosts.push(h);
                }
            });
            // reset hosts
            e.hosts = [];
            // update host hash
            newHosts.forEach((h) => {
                if (undefined === this._entriesByHost[h]) {
                    this._entriesByHost[h] = [];
                }
                this._entriesByHost[h].push(existingEntry);
            });
        });
    }

    /**
     * Remove duplicate hosts (ie: only keep the first version of each host)
     *
     * @return {integer} number of removed duplicate hosts
     */
    removeDuplicateHosts() {
        let count = 0;
        const hosts = Object.keys(this._entriesByHost);
        hosts.forEach((h) => {
            if (this._verbose) {
                std.err.printf(`Checking duplicates for host '${h}' ...\n`);
            }
            // no duplicate
            if (1 === this._entriesByHost[h].length) {
                if (this._verbose) {
                    std.err.printf(`  + Found no duplicate\n`);
                }
                return;
            }
            const duplicates = [];
            for (let i = 1, max = this._entriesByHost[h].length; i < max; ++i) {
                duplicates.push(this._entriesByHost[h][i].ipaddr);
            }
            if (this._verbose) {
                std.err.printf(`  + Found ${duplicates.length} duplicate(s) (${this._entriesByHost[h][0].ipaddr}|${duplicates.join(',')})\n`);
            }
            count += duplicates.length;
            for (let i = 1, max = this._entriesByHost[h].length; i < max; ++i) {
                this._removeHostForEntry(this._entriesByHost[h][i], h, this._verbose);
            };
            this._rebuildMappingForHost(h, this._verbose);
        });
        return count;
    }

    /**
     * Set an entry if it does not already exists
     *
     * @param {string} ipaddr ipv4 or ipv6
     * @param {string} host
     * @param {object} opt options
     * @param {boolean} opt.first if {true}, host will be added as first host (default = {false})
     *
     * @return {boolean} {true} if entry did not exist or was at wrong position, {false} otherwise
     */
    setEntry(ipaddr, host, opt) {
        if (undefined === opt) {
            opt = {};
        }
        // ip address already exists
        if (undefined !== this._entriesByIp[ipaddr]) {
            let alreadyExists = true;
            if (this._verbose) {
                std.err.printf(`  + Ip address '${ipaddr}' exists (${this._entriesByIp[ipaddr].shouldIgnore ? 'disabled' : 'enabled'})\n`);
            }
            // host already exists
            if (this._entriesByIp[ipaddr].hosts.includes(host)) {
                // host should be first one
                if (true === opt.first) {
                    const pos = this._entriesByIp[ipaddr].hosts.indexOf(host);
                    // host is not the first one => remove it
                    if (0 != pos) {
                        if (this._verbose) {
                            std.err.printf(`  + host already exists but is not the first (it will be removed)\n`);
                        }
                        alreadyExists = false;
                        this._entriesByIp[ipaddr].hosts.splice(pos, 1);
                    }
                }
                if (alreadyExists) {
                    if (this._verbose) {
                        std.err.printf(`  + host already exists\n`);
                    }
                    return false;
                }
            }
            // just in case all hosts were previously removed
            if (this._entriesByIp[ipaddr].shouldIgnore) {
                this._entriesByIp[ipaddr].shouldIgnore = false;
                if (this._verbose) {
                    std.err.printf(`  + Ip address '${ipaddr}' has been enabled\n`);
                }
            }
            if (true === opt.first) {
                this._entriesByIp[ipaddr].hosts.unshift(host);
            }
            else {
                this._entriesByIp[ipaddr].hosts.push(host);
            }
            this._entriesByIp[ipaddr].updated = true;
            if (undefined === this._entriesByHost[host]) {
                this._entriesByHost[host] = [];
            }
            this._entriesByHost[host].push(this._entriesByIp[ipaddr]);
            if (this._verbose) {
                std.err.printf(`  + Host '${host}' has been added (${true === opt.first ? 'first' : 'last'})\n`);
            }
            return true;
        }
        // new entry
        else {
            if (this._verbose) {
                std.err.printf(`  + Ip address '${ipaddr}' has been added\n`);
                std.err.printf(`  + Host '${host}' has been added (${true === opt.first ? 'first' : 'last'})\n`);
            }
            const entry = {
                ipaddr:ipaddr,
                hosts:[host],
                isBlank:false,
                // whether or not entry has been updated
                updated:true,
                // whether or not entry should be ignored
                shouldIgnore:false
            };
            this._entries.push(entry);
            this._entriesByIp[ipaddr] = entry;
            this._entriesByHost[host] = [entry];
            return true;
        }
    }

    /**
     * Unset an entry if it exists
     *
     * @param {string} ipaddr ipv4 or ipv6
     * @param {string} host
     *
     * @return {boolean} {true} if entry did exist, {false} otherwise
     */
    unsetEntry(ipaddr, host) {
        // ip address is not defined
        if (undefined === this._entriesByIp[ipaddr]) {
            if (this._verbose) {
                std.err.printf(`  + Ip address '${ipaddr}' does not exist\n`);
            }
            return false;
        }
        if (this._verbose) {
            std.err.printf(`  + Ip address '${ipaddr}' exists (${this._entriesByIp[ipaddr].shouldIgnore ? 'disabled' : 'enabled'})\n`);
        }
        // ip address is disabled
        if (this._entriesByIp[ipaddr].shouldIgnore) {
            return false;
        }
        // host does not exists
        if (!this._entriesByIp[ipaddr].hosts.includes(host)) {
            if (this._verbose) {
                std.err.printf(`  + Host does not exist\n`);
            }
            return false;
        }
        if (this._verbose) {
            std.err.printf(`  + Host '${host}' has been removed\n`);
        }
        // rebuild hosts
        this._removeHostForEntry(this._entriesByIp[ipaddr], host, this._verbose);
        // rebuild mapping for removed host
        this._rebuildMappingForHost(host, false);
        return true;
    }

    /**
     * Remove line with a given ip address
     *
     * @param {string} ipaddr ipv4 or ipv6
     *
     * @return {boolean} {true} if a change occured, {false} otherwise
     */
    unsetIpaddrIfEquals(ipaddr) {
        // ip address is not defined
        if (undefined === this._entriesByIp[ipaddr]) {
            if (this._verbose) {
                std.err.printf(`  + Ip address does not exist\n`);
            }
            return false;
        }
        if (this._verbose) {
            std.err.printf(`  + Ip address exists (${this._entriesByIp[ipaddr].shouldIgnore ? 'disabled' : 'enabled'})\n`);
        }
        // ip address is disabled
        if (this._entriesByIp[ipaddr].shouldIgnore) {
            return false;
        }
        const hosts = this._entriesByIp[ipaddr].hosts;
        this._entriesByIp[ipaddr].updated = true;
        this._entriesByIp[ipaddr].hosts = [];
        this._entriesByIp[ipaddr].shouldIgnore = true;
        if (this._verbose) {
            std.err.printf(`  + Ip address '${ipaddr}' has been disabled\n`);
        }
        // rebuild mapping for each host
        hosts.forEach((h) => {
            this._rebuildMappingForHost(h, this._verbose);
        });
        return true;
    }

    /**
     * Remove lines ip address matching regexp
     *
     * @param {RegExp} regexp
     *
     * @return {boolean} {true} if a change occured, {false} otherwise
     */
    unsetIpaddrIfMatches(regexp) {
        // how many changes occured
        let changes = 0;
        this._entries.forEach((e) => {
            // ipaddr does not match
            if (!(regexp.test(e.ipaddr))) {
                return;
            }
            if (this._verbose) {
                std.err.printf(`  + Found matching ip address '${e.ipaddr}'\n`);
            }
            // ip address is disabled
            if (e.shouldIgnore) {
                if (this._verbose) {
                    std.err.printf(`  + Ip address '${e.ipaddr}' is disabled\n`);
                }
                return;
            }
            const hosts = e.hosts;
            ++changes;
            e.updated = true;
            e.hosts = [];
            e.shouldIgnore = true;
            if (this._verbose) {
                std.err.printf(`  + Ip address '${e.ipaddr}' has been disabled\n`);
            }
            // rebuild mapping for each host
            hosts.forEach((h) => {
                this._rebuildMappingForHost(h, this._verbose);
            });
        });
        return (0 !== changes);
    }

    /**
     * Remove host
     *
     * @param {string} host
     *
     * @return {boolean} {true} if a change occured, {false} otherwise
     */
    unsetHostIfEquals(host) {
        // host is not defined
        if (undefined === this._entriesByHost[host]) {
            if (this._verbose) {
                std.err.printf(`  + Host does not exist\n`);
            }
            return false;
        }
        if (this._verbose) {
            std.err.printf(`  + Host exists\n`);
        }
        this._entriesByHost[host].forEach((e) => {
            // ip address is disabled
            if (e.shouldIgnore) {
                if (this._verbose) {
                    std.err.printf(`  + Ip address '${e.ipaddr}' is disabled\n`);
                }
                return;
            }
            this._removeHostForEntry(e, host, this._verbose);
        });
        if (this._verbose) {
            std.err.printf(`  + host '${host}' has been removed\n`);
        }
        delete this._entriesByHost[host];
        return true;
    }

    /**
     * Remove hosts matching a regexp from all lines
     *
     * @param {RegExp} regexp
     *
     * @return {boolean} {true} if a change occured, {false} otherwise
     */
    unsetHostIfMatches(regexp) {
        // how many changes occured
        let changes = 0;
        // matching hosts
        const hosts = [];
        Object.keys(this._entriesByHost).forEach((h) => {
            // host does not match
            if (!(regexp.test(h))) {
                return;
            }
            hosts.push(h);
        });
        hosts.forEach((h) => {
            if (this._verbose) {
                std.err.printf(`  + Found matching host '${h}'\n`);
            }
            this._entriesByHost[h].forEach((e) => {
                // ip address is disabled
                if (e.shouldIgnore) {
                    if (this._verbose) {
                        std.err.printf(`  + Ip address '${e.ipaddr}' is disabled\n`);
                    }
                    return;
                }
                this._removeHostForEntry(e, h, this._verbose);
            });
            if (this._verbose) {
                std.err.printf(`  + Host '${h}' has been removed\n`);
            }
            delete this._entriesByHost[h];
            ++changes;
        });
        return (0 !== changes);
    }

    /**
     * Indicates whether or not content has changed
     *
     * @return {boolean} {true} if at least one line changed, {false} otherwise
     */
    hasChanged() {
        for (let i = 0, max = this._entries.length; i < max; ++i) {
            if (this._entries[i].updated || this._entries[i].shouldIgnore) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get new content
     *
     * @return {string} new content
     */
    get() {
        const lines = [];
        this._entries.forEach((e) => {
            if (e.shouldIgnore) {
                return;
            }
            let line;
            if (e.isBlank || e.isComment) {
                line = '';
            }
            else {
                line = e.ipaddr;
                const hosts = {};
                e.hosts.forEach((h) => {
                    if (undefined === hosts[h]) {
                        line += ` ${h}`;
                        hosts[h] = true;
                    }
                });
            }
            // add comment
            if (undefined !== e.comment) {
                if (!this._stripComments) {
                    if ('' !== line) {
                        line += ' ';
                    }
                    line += `#${e.comment}`;
                }
                // ignore line if we're supposed to strip comments and line is empty
                else {
                    if ('' == line) {
                        return;
                    }
                }
            }
            lines.push(line);
        });
        return lines.join('\n');
    }

    /**
     * Reset entries
     */
    _reset() {
        // list of all entries (even blank lines)
        this._entries = [];
        // mapping ip address => entry
        this._entriesByIp = {};
        // mapping host => entries
        this._entriesByHost = {};
    }

    /**
     * Rebuild hosts for a given entry
     *
     * @param {object} entry entry to update
     * @param {string} host host to remove
     * @param {boolean} verbose whether or not verbose output should be printed
     */
    _removeHostForEntry(entry, host, verbose) {
        const hosts = [];
        entry.hosts.forEach((h) => {
            if (h === host) {
                return;
            }
            hosts.push(h);
        });
        entry.hosts = hosts;
        entry.updated = true;
        if (0 === entry.hosts.length) {
            entry.shouldIgnore = true;
            if (verbose) {
                std.err.printf(`  + Ip address '${entry.ipaddr}' has been disabled\n`);
            }
        }
    }

    /**
     * Rebuilds {this._entriesByHost} for a given host
     *
     * @param {string} host
     * @param {boolean} verbose whether or not verbose output should be printed
     */
    _rebuildMappingForHost(host, verbose) {
        let size = 0;
        this._entriesByHost[host].forEach((e) => {
            if (e.shouldIgnore) {
                return;
            }
            ++size;
        });
        if (0 === size) {
            if (verbose) {
                std.err.printf(`  + Host '${host}' has been removed\n`);
            }
            delete this._entriesByHost[host];
        }
    }

}
