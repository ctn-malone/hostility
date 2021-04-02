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

    tester.test('set', () => {
        
        let initialContent, expectedContent, result, actualContent;

        initialContent = getInitialContent('01');
        parser.parse(initialContent);

        result = parser.setEntry('192.168.64.2', 'host2.landomain');
        tester.assert(!result, `result of {setEntry} should be {false} when entry already exists (192.168.64.2 => host2.landomain)`);
        actualContent = parser.get();
        compareText(actualContent, initialContent, '01');
        
        result = parser.setEntry('192.168.64.4', 'host4.landomain');
        tester.assert(result, `result of {setEntry} should be {true} when entry is new (192.168.64.4 => host4.landomain)`);
        
        result = parser.setEntry('192.168.64.4', 'host4');
        tester.assert(result, `result of {setEntry} should be {true} when entry is new (192.168.64.4 => host4)`);
        
        actualContent = parser.get();
        expectedContent = getExpectedContent('01', '1');
        compareText(actualContent, expectedContent, '01.1');

        result = parser.setEntry('192.168.64.1', 'host1.alias.landomain');
        tester.assert(result, `result of {setEntry} should be {true} when entry is new (192.168.64.1 => host1.alias.landomain)`);

        result = parser.setEntry('192.168.64.4', 'host4.alias.landomain', {first:true});
        tester.assert(result, `result of {setEntry} should be {true} when new entry is new (192.168.64.4 => host4.alias.landomain)`);

        actualContent = parser.get();
        expectedContent = getExpectedContent('01', '2');
        compareText(actualContent, expectedContent, '01.2');

    });
}
