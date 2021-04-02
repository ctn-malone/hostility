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

    tester.test('multi', () => {

        let initialContent, expectedContent, result, actualContent;

        initialContent = getInitialContent('05');
        parser.parse(initialContent);

        result = parser.unsetHostIfEquals('host2');
        tester.assert(result, `result of {unsetHostIfEquals} should be {true} when host matches (host2)`);
        
        result = parser.setEntry('192.168.64.2', 'host2');
        tester.assert(result, `result of {setEntry} should be {true} when entry is new (192.168.64.2 => host2)`);
        
        result = parser.setEntry('192.168.64.20', 'host2');
        tester.assert(result, `result of {setEntry} should be {true} when entry is new (192.168.64.20 => host2)`);

        result = parser.unsetEntry('192.168.65.2', 'host65-2');
        tester.assert(result, `result of {unsetEntry} should be {true} when deleting existing entry (192.168.64.2 => host65-1)`);

        result = parser.unsetIpaddrIfMatches(/^192\.168\.6[45]\.1$/);
        tester.assert(result, `result of {unsetIpaddrIfMatches} should be {true} when ip matches (/^192\\.168\\.6[45]\\.1$/)`);

        actualContent = parser.get();
        expectedContent = getExpectedContent('05', '1');
        compareText(actualContent, expectedContent, '05.1');

    });
}
