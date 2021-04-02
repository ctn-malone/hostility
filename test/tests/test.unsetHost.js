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

    tester.test('unset-host', () => {

        let initialContent, expectedContent, result, actualContent;

        initialContent = getInitialContent('04');
        parser.parse(initialContent);

        result = parser.unsetHostIfEquals('invalid-host');
        tester.assert(!result, `result of {unsetHostIfEquals} should be {false} when host does not match (invalid-host)`);
        result = parser.unsetIpaddrIfMatches(/invalid/);
        tester.assert(!result, `result of {unsetHostIfMatches} should be {false} when host2 does not match (/invalid/)`);

        actualContent = parser.get();
        expectedContent = getExpectedContent('04', '1');
        compareText(actualContent, expectedContent, '04.1');

        result = parser.unsetHostIfEquals('host2');
        tester.assert(result, `result of {unsetHostIfEquals} should be {true} when host matches (host2)`);

        actualContent = parser.get();
        expectedContent = getExpectedContent('04', '2');
        compareText(actualContent, expectedContent, '04.2');

        result = parser.unsetHostIfMatches(/host2/);
        tester.assert(result, `result of {unsetHostIfMatches} should be {true} when ip matches (/host2/)`);

        actualContent = parser.get();
        expectedContent = getExpectedContent('04', '3');
        compareText(actualContent, expectedContent, '04.3');
        
    });
}
