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

    tester.test('unset-ip', () => {

        let initialContent, expectedContent, result, actualContent;

        initialContent = getInitialContent('03');
        parser.parse(initialContent);

        result = parser.unsetIpaddrIfEquals('192.168.64.0');
        tester.assert(!result, `result of {unsetIpaddrIfEquals} should be {false} when ip does not match (192.168.64.0)`);
        result = parser.unsetIpaddrIfMatches(/^255\.255\.255\./);
        tester.assert(!result, `result of {unsetIpaddrIfMatches} should be {false} when ip does not match (/^255\\.255\\.255\\./)`);
        
        actualContent = parser.get();
        expectedContent = getExpectedContent('03', '1');
        compareText(actualContent, expectedContent, '03.1');

        result = parser.unsetIpaddrIfEquals('192.168.64.2');
        tester.assert(result, `result of {unsetIpaddrIfEquals} should be {true} when ip matches (192.168.64.2)`);

        result = parser.unsetIpaddrIfMatches(/^192\.168\.65\./);
        tester.assert(result, `result of {unsetIpaddrIfMatches} should be {true} when ip matches (/^192\\.168\\.65\\./)`);

        actualContent = parser.get();
        expectedContent = getExpectedContent('03', '2');
        compareText(actualContent, expectedContent, '03.2');
        
    });
}
