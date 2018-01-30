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
const yaml = require('js-yaml');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
const assert = chai.assert;
chai.use(sinonChai);

describe('composer validate-profile CLI', function() {
    const sandbox = sinon.sandbox.create();
    let valSpy;
    let consoleLogSpy;
    let JSONFILE = './test/data/connection.json';
    let BADJSONFILE = './test/data/connectionBadJson.json';
    let YAMLFILE = './test/data/connection.yaml';
    let BADYAMLFILE = './test/data/connectionBadYaml.yaml';

    beforeEach(function() {
        valSpy = sinon.spy(validator, 'validateProfile');
        consoleLogSpy = sandbox.spy(console, 'log');
    });

    afterEach(function() {
        validator.errorList.length=0;
        sandbox.restore();
        valSpy.restore();
    });

    it('should throw an error when no arguments are specified', function() {
        expect(validator.validateProfile.bind(validator, '')).to.throw('Error: no file name specified');
    });

    it('should throw an error when an argument that ends in neither json or yaml is specified', function() {
        expect(validator.validateProfile.bind(validator, 'test')).to.throw('Usage ERROR: please supply a JSON or YAML connection profile');
    });

    it('should throw an error when a JSON filename that cannot be resolved is specified ', function() {
        expect(validator.validateProfile.bind(validator, 'doesnotexist.json')).to.throw(Error, /^ENOENT.*$/);
    });

    it('should run the command when a good JSON filename that can be resolved is specified ', function() {
        validator.validateProfile(JSONFILE);
        expect(valSpy).to.have.been.calledWith(JSONFILE);
        expect(consoleLogSpy).to.have.been.calledWith('Validating profile file: ' + JSONFILE);
    });

    it('should display success messages when a good JSON filename that can be resolved is specified ', function() {
        validator.validateProfile(JSONFILE);
        expect(valSpy).to.have.been.calledWith(JSONFILE);
        expect(consoleLogSpy).to.have.been.calledWith('Validating profile file: ' + JSONFILE);
        expect(consoleLogSpy).to.have.been.calledWith('SUCCESS: the profile is valid');
    });

    it('should throw an error when a file with unparseable JSON is supplied', function() {
        expect(validator.validateProfile.bind(validator, BADJSONFILE)).to.throw(Error, 'Unexpected token n in JSON at position 1');
    });

    it('should run the command when a good YAML filename that can be resolved is specified ', function() {
        validator.validateProfile(YAMLFILE);
        expect(valSpy).to.have.been.calledWith(YAMLFILE);
    });

    it('should throw an error when a file with unparseable JSON is supplied', function() {
        expect(validator.validateProfile.bind(validator, BADYAMLFILE)).to.throw();
    });

    it('should load an object using the JSON parser when a file with good JSON content is specified', function() {
        let jsonSpy = sinon.spy(JSON, 'parse');
        validator.validateProfile(JSONFILE);
        expect(jsonSpy).to.have.been.called;
    });

    it('should load an object using js-yaml when a file with good YAML content is specified', function() {
        let yamlSpy = sinon.spy(yaml, 'safeLoad');
        validator.validateProfile(YAMLFILE);
        expect(yamlSpy).to.have.been.called;
    });

    describe('profileHasValidNameProperty', function() {

        let rule = validator.rules.get('profileHasValidNameProperty');

        it('rule should exist', function () {
            assert.isOk(rule);
        });

        it('should not add any errors when a valid name property is specified', function() {
            validator.applyRule(rule, {'name':'test'});
            expect(validator.errorList.length).to.equal(0);
        });

        it('should add an error when no name property is specified', function() {
            validator.applyRule(rule, {'nonameproperty':'test'});
            expect(validator.errorList[0]).to.equal('profile does not have a name property');
        });

        it('should add an error when an invalid name property is specified', function() {
            validator.applyRule(rule, {'name':'%test%'});
            expect(validator.errorList[0]).to.equal('profile name property value is not valid for Composer: %test%');
        });
    });

    describe('profileHasValidXTypeProperty', function() {

        let rule = validator.rules.get('profileHasValidXTypeProperty');

        it('rule should exist', function () {
            assert.isOk(rule);
        });

        it('should add an error when no name property is specified', function() {
            validator.applyRule(rule, {'noxtypeproperty':'test'});
            expect(validator.errorList[0]).to.equal('profile does not have an x-type property');
        });

        it('should add an error when an invalid name property is specified', function() {
            validator.applyRule(rule, {'x-type':'hlfv99'});
            expect(validator.errorList[0]).to.equal('profile x-type property value is not valid for Composer: hlfv99');
        });

        it('should not add any errors when a valid x-type property is specified', function() {
            validator.applyRule(rule, {'x-type':'hlfv1'});
            validator.applyRule(rule, {'x-type':'hlfv11'});
            expect(validator.errorList.length).to.equal(0);
        });

    });

    //{ client:{},channels:{},orderers:{},organizations:{},peers:{},certificateAuthorities:{} }
    describe('baseSectionsExist', function() {
        let rule = validator.rules.get('baseSectionsExist');
        it('rule should exist', function () {
            assert.isOk(rule);
        });
        it('should add no errors if all base sections are present', function () {
            validator.applyRule(rule, { client:{},channels:{},orderers:{},organizations:{},peers:{},certificateAuthorities:{} } );
            expect(validator.errorList.length).to.equal(0);
        });
        it('should add an error if no client section is specified', function () {
            validator.applyRule(rule, {channels:{},orderers:{},organizations:{},peers:{},certificateAuthorities:{} } );
            expect(validator.errorList[0]).to.equal('Profile does not specify a client');
        });
        it('should add an error if no channels section is specified', function () {
            validator.applyRule(rule, { client:{},orderers:{},organizations:{},peers:{},certificateAuthorities:{} } );
            expect(validator.errorList[0]).to.equal('Profile does not specify any channels');
        });
        it('should add an error if no certificateAuthorities section is specified', function () {
            validator.applyRule(rule, { client:{},channels:{},orderers:{},organizations:{},peers:{} } );
            expect(validator.errorList[0]).to.equal('Profile does not specify any certificateAuthorities');
        });
        it('should add an error if no orderers section is specified', function () {
            validator.applyRule(rule, { client:{},channels:{},organizations:{},peers:{},certificateAuthorities:{} } );
            expect(validator.errorList[0]).to.equal('Profile does not specify any orderers');
        });
        it('should add an error if no organizations section is specified', function () {
            validator.applyRule(rule, { client:{},channels:{},orderers:{},peers:{},certificateAuthorities:{} } );
            expect(validator.errorList[0]).to.equal('Profile does not specify any organizations');
        });
        it('should add an error if no peers section is specified', function () {
            validator.applyRule(rule, { client:{},channels:{},orderers:{},organizations:{},certificateAuthorities:{} } );
            expect(validator.errorList[0]).to.equal('Profile does not specify any peers');
        });
    });

    describe('clientValidation', function() {
        let rule = validator.rules.get('clientValidation');
        it('rule should exist', function () {
            assert.isOk(rule);
        });

        it('should add an error if the client section does not have an organization property specified', function () {
            validator.applyRule(rule, { client : {}} );
            expect(validator.errorList[0]).to.include('Profile does not specify an owning organization for the client');
        });
        it('should add an error when a client is assigned to an organization that doesn\'t exist in the organizations section', function () {
            validator.applyRule(rule, {'client' : { 'organization' : 'Org1' }, 'organizations': { 'NoOrg1Here': {} } } );
            expect(validator.errorList[0]).to.equal('Profile client specfies an organization that is not included in the list of organizations: Org1');
        });
        it('should not add an error when a client is assigned to an organization that exists in the organizations section', function () {
            validator.applyRule(rule, {'client' : { 'organization' : 'Org1' }, 'organizations': { 'Org1': {} } } );
            expect(validator.errorList.length).to.equal(0);
        });
    });

    describe('orderersValidation', function() {
        let rule = validator.rules.get('orderersValidation');
        it('rule should exist', function () {
            assert.isOk(rule);
        });

        it('should add an error if the profile includes no orderers', function() {
            validator.applyRule(rule, { 'orderers' : {} } );
            expect(validator.errorList[0]).to.equal('Profile does not specify any orderers');
        });

        it('should add an error if an orderer definition does not have a url property', function() {
            validator.applyRule(rule, {'orderers':{'orderer1':{'url':'grpc://localhost:7050'},'orderer2':{'foo':'bar'}}});
            expect(validator.errorList[0]).to.equal('Orderer does not have a url property: orderer2');
        });

        it('should add an error if an orderer has an invalid url property value', function() {
            validator.applyRule(rule, {'orderers':{'orderer1':{'url':'grpc://localhost:7050'},'orderer2':{'url':'bar'}}});
            expect(validator.errorList[0]).to.equal('Orderer orderer2 does not have a valid url property: bar');
        });

    });

});






