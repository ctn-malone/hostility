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

    tester.test('remove-duplicates', () => {

        let initialContent, expectedContent, result, actualContent;

        initialContent = getInitialContent('07');
        parser.parse(initialContent);

        result = parser.removeDuplicateHosts();
        tester.assertEq(result, 2, '2 hosts should have been removed');

        actualContent = parser.get();
        expectedContent = getExpectedContent('07', '1');
        compareText(actualContent, expectedContent, '07.1');
        
    });
}
