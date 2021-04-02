import { tester } from 'ext/tester.js';
import { HostsFileParser } from '../../src/lib/hosts-file-parser.js';

import * as std from 'std';

const getDataDir = (id) => {
    return `./data/${id}`;
}

const getInitialContent = (id) => {
    const dir = getDataDir(id);
    const file = `${dir}/hosts.initial`;
    return std.loadFile(file).trimEnd();
}

const getExpectedContent = (id, subId = undefined) => {
    const dir = getDataDir(id);
    let file = `${dir}/hosts.expected`;
    if (undefined !== subId) {
        file += `.${subId}`;
    }
    return std.loadFile(file).trimEnd();
}

const compareText = (actualContent, expectedContent, id) => {
    const actualLines = actualContent.split("\n");
    const expectedLines = expectedContent.split("\n");
    tester.assertEq(actualLines, expectedLines, `final content should be as expected (${id})`);
}

export default () => {
    const parser = new HostsFileParser({verbose:false});

    tester.test('unset', () => {

        let initialContent, expectedContent, result, actualContent;

        initialContent = getInitialContent('02');
        parser.parse(initialContent);
        
        result = parser.unsetEntry('192.168.64.4', 'invalid.landomain');
        tester.assert(!result, `result of {unsetEntry} should be {false} when entry does not exist (192.168.64.4 => invalid.landomain)`);
        actualContent = parser.get();
        compareText(actualContent, initialContent, '02');

        result = parser.unsetEntry('192.168.64.2', 'host2');
        tester.assert(result, `result of {unsetEntry} should be {true} when deleting existing entry (192.168.64.2 => host2)`);
        
        actualContent = parser.get();
        expectedContent = getExpectedContent('02', '1');
        compareText(actualContent, expectedContent, '02.1');

        result = parser.unsetEntry('192.168.64.2', 'host2.landomain');
        tester.assert(result, `result of {unsetEntry} should be {true} when deleting existing entry (192.168.64.2 => host2.landomain)`);

        actualContent = parser.get();
        expectedContent = getExpectedContent('02', '2');
        compareText(actualContent, expectedContent, '02.2');

    });
}
