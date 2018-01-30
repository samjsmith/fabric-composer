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

const validator = require('../lib/profileValidator.js');
const fs = require('fs');
const ajv = require('ajv');
const yaml = require('js-yaml');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
const assert = chai.assert;
chai.use(sinonChai);

describe('composer validate-profile CLI', function() {
    const sandbox = sinon.sandbox.create();
    let jsonSpy;
    let ajvStub;
    let consoleLogSpy;
    let GOOD_JSON_FILE = './test/data/connection.json';
    let BAD_JSON_FILE = './test/data/connectionBadJson.json';
    let GOOD_YAML_FILE = './test/data/connection.yaml';
    let BAD_YAML_FILE = './test/data/connectionBadYaml.yaml';

    beforeEach(function() {
        consoleLogSpy = sandbox.spy(console, 'log');
        jsonSpy = sandbox.spy(JSON, 'parse');
    });

    afterEach(function() {
        sandbox.restore();
    });

    describe('Input validation', function() {
        it('should throw an error when no arguments are specified', function() {
            expect(validator.validateProfile.bind(validator, '')).to.throw('Error: no file name specified');
        });

        it('should throw an error when an argument that ends in neither json or yaml is specified', function() {
            expect(validator.validateProfile.bind(validator, 'test')).to.throw('Usage ERROR: please supply a JSON or YAML connection profile');
        });
    });

    describe('File load', function () {

        let yamlSpy;
        let fsSpy;

        beforeEach(function() {
            fsSpy = sandbox.spy(fs, 'readFileSync');
            yamlSpy = sandbox.spy(yaml, 'safeLoad');
        });

        it('should throw an error when a JSON filename that cannot be resolved is specified ', function() {
            expect(validator.validateProfile.bind(validator, 'doesnotexist.json')).to.throw(Error, /^ENOENT.*$/);
        });

        it('should throw an error when a YAML filename that cannot be resolved is specified ', function() {
            expect(validator.validateProfile.bind(validator, 'doesnotexist.yaml')).to.throw(Error, /^ENOENT.*$/);
        });

        it('should throw an error when a file with unparseable JSON is supplied', function() {
            expect(validator.validateProfile.bind(validator, BAD_JSON_FILE)).to.throw(Error, 'Unexpected token n in JSON at position 1');
        });

        it('should throw an error when a file with unparseable YAML is supplied', function() {
            expect(validator.validateProfile.bind(validator, BAD_YAML_FILE)).to.throw();
        });

        it('should load an object using js-yaml when a file with good YAML content is specified', function() {
            validator.validateProfile(GOOD_YAML_FILE);
            expect(fsSpy).to.have.been.calledWith(sinon.match(/^.*connection.yaml$/));
            expect(yamlSpy).to.have.been.called;
        });

        it('should load an object using JSON when a file with good JSON content is specified', function() {
            validator.validateProfile(GOOD_JSON_FILE);
            expect(fsSpy).to.have.been.calledWith(sinon.match(/^.*connection.json$/));
            expect(jsonSpy).to.have.been.called;
        });

        it('should display success messages when a file containing a valid profile is specified ', function() {
            validator.validateProfile(GOOD_JSON_FILE);
            expect(consoleLogSpy).to.have.been.calledWith('Validating profile file: ' + GOOD_JSON_FILE);
            expect(consoleLogSpy).to.have.been.calledWith('SUCCESS: the profile is valid');
        });

    });

    describe('Schema and ajv Tests', function () {
        it('should throw an error from ajv if a bad schema is loaded', function() {
            let compiler = new ajv();
            let schemaFile = fs.readFileSync('./test/data/badschema.json', 'utf8');
            let schema = JSON.parse(schemaFile);
            expect(compiler.compile.bind(compiler, schema)).to.throw;
        });
        it('should load the real JSON Schema file successfully', function() {
            let compiler = new ajv();
            let schemaFile = fs.readFileSync('./schema/schema.json', 'utf8');
            let schema = JSON.parse(schemaFile);
            expect(compiler.compile.bind(compiler, schema)).to.not.throw;
        });
    });

    describe('Tests with real data', function() {

        it('should list no errors for a valid connection profile', function() {
            validator.validateProfile('./test/data/connection.json');
            expect(consoleLogSpy).to.have.been.calledWith('SUCCESS: the profile is valid');
        });

        it('should list an error if the connection profile doesn\'t contain a name property', function() {
            validator.validateProfile('./test/data/connection.no.name.json');
            expect(consoleLogSpy).not.to.have.been.calledWith('SUCCESS: the profile is valid');
        });

        it('should list an error if the connection profile name property is invalid', function() {
            validator.validateProfile('./test/data/connection.invalid.name.json');
            expect(consoleLogSpy).not.to.have.been.calledWith('SUCCESS: the profile is valid');
        });

        it('should list an error if the connection profile has a client section with no organization', function() {
            validator.validateProfile('./test/data/connection.client.no.org.json');
            expect(consoleLogSpy).not.to.have.been.calledWith('SUCCESS: the profile is valid');
        });

    });
});
