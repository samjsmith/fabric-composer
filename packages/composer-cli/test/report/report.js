/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const ReportCmd = require('../../lib/cmds/report/reportCommand.js');
const composerReport = require('composer-report');
const chai = require('chai');
const sinon = require('sinon');
const assert = sinon.assert;
const sinonChai = require('sinon-chai');
chai.use(sinonChai);

describe('composer report CLI', function() {
    const sandbox = sinon.sandbox.create();
    let consoleLogSpy;
    let setupStub;
    let reportStub;
    let archiveStub;

    beforeEach(function() {
        consoleLogSpy = sandbox.spy(console, 'log');
        setupStub = sandbox.stub(composerReport, 'setupReportDir').returns('DIR');
        reportStub = sandbox.stub(composerReport, 'createNodeReport');
        archiveStub = sandbox.stub(composerReport, 'archiveReport').returns('ARCHIVE');
    });

    afterEach(function() {
        sandbox.restore();
    });

    it('should successfully run the composer report command', function() {
        const args = {};
        return ReportCmd.handler(args).then(() => {
            assert.calledThrice(consoleLogSpy);
            // assert.calledWithMatch(consoleLogSpy, /^Creating Composer report/);
            // assert.calledWith(consoleLogSpy, sinon.match(/^Triggering node report.../));
            // assert.calledWithMatch(consoleLogSpy, /^Created archive file: ARCHIVE/);
            assert.calledOnce(setupStub);
            assert.calledWith(reportStub, 'DIR');
            assert.calledWith(archiveStub, 'DIR');
        });
    });
});
