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

    tester.test('strip', () => {

        let initialContent, expectedContent, result, actualContent;
        let parser;

        initialContent = getInitialContent('06');
        
        parser = new HostsFileParser({verbose:false, stripComments:true, stripBlankLines:false});
        parser.parse(initialContent);
        actualContent = parser.get();
        expectedContent = getExpectedContent('06', '1');
        compareText(actualContent, expectedContent, '06.1');

        parser = new HostsFileParser({verbose:false, stripComments:false, stripBlankLines:true});
        parser.parse(initialContent);
        actualContent = parser.get();
        expectedContent = getExpectedContent('06', '2');
        compareText(actualContent, expectedContent, '06.2');

        parser = new HostsFileParser({verbose:false, stripComments:true, stripBlankLines:true});
        parser.parse(initialContent);
        actualContent = parser.get();
        expectedContent = getExpectedContent('06', '3');
        compareText(actualContent, expectedContent, '06.3');

    });
}
