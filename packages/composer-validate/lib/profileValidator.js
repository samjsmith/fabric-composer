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
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const validUrl = require('valid-url');

const rules = new Map ([
    ['profileHasValidNameProperty',  profileHasValidNameProperty],
    ['profileHasValidXTypeProperty', profileHasValidXTypeProperty],
    ['baseSectionsExist', baseSectionsExist],
    ['clientValidation', clientValidation],
    ['orderersValidation', orderersValidation]
]);

let errorList = new Array();

/**
 * validateProfile
 * validates connection profile
 * @param {String} filename the input filename
 */
function validateProfile(filename) {
    let path = validateInput(filename);
    let profile = loadProfile(path);
    console.log('Validating profile file: ' + filename);
    applyRules(profile);
    console.log(errorList);
    if(errorList.length!==0) {
        errorList.forEach((error) => {
            console.log(error);
        });
        errorList.length=0;
    } else {
        console.log('SUCCESS: the profile is valid');
    }
}

/**
 * Validate the input
 * @param {String} filename input file to validate
 * @return {String} the path to the file to load
 */
function validateInput(filename) {
    if(!filename) {
        throw new Error('Error: no file name specified');
    }
    const isJSON = filename.toLowerCase().endsWith('json');
    const isYAML = filename.toLowerCase().endsWith('yaml');
    if(!isJSON && !isYAML) {
        throw Error( 'Usage ERROR: please supply a JSON or YAML connection profile');
    }
    const filePath = path.resolve(filename);
    return filePath;
}

/**
 * Loads the profile into an object for validation.
 * @param {String} inputPath the path to the file to load
 * @return {Object} profile object
 */
function loadProfile(inputPath) {
    const filePath = path.resolve(inputPath);
    if (filePath.toLowerCase().endsWith('json')) {
        return JSON.parse(readFileSync(filePath));
    } else {
        return yaml.safeLoad(readFileSync(filePath));
    }
}

/**
 * Read a file from disc and return the result or throw an error.
 * @param {String} filePath file to load
 * @return {String} with contents or throws an error
*/
function readFileSync(filePath){
    let content;
    content = fs.readFileSync(filePath, 'utf8');
    return content;
}

/**
 * Applies the rules for connection profiles one by one.
 * @param {Object} profile the profile object to validate
 */
function applyRules(profile) {
    rules.forEach((rule) => {
        applyRule(rule, profile);
    });
}

/**
 * Applies the rules for connection profiles one by one.
 * @param {Srting} rule the function with the rule to apply
 * @param {Object} profile the profile object to validate
 */
function applyRule(rule, profile) {
    rule.call(this, profile);
}

/**
 * Ensure that the supplied profile object has a name property that only contains
 * alphanumerics.
 * TODO - Check this rule!
 * @param {Object} profile profile object to validate
*/
function profileHasValidNameProperty(profile) {
    if(!profile.name) {
        errorList.push('profile does not have a name property');
    } else {
        let regexp = RegExp(/^[a-z0-9]+$/i);
        if(!regexp.test(profile.name)) {
            errorList.push('profile name property value is not valid for Composer: '+profile.name);
        }
    }
}

/**
 * Ensure that the supplied profile object has a valid x-type property
 * TODO - Check this rule!
 * @param {Object} profile profile object to validate
*/
function profileHasValidXTypeProperty(profile) {
    if(!profile['x-type']) {
        errorList.push('profile does not have an x-type property');
    }
    else {
        let validXTypeValues = ['hlfv1', 'hlfv11'];
        if(!validXTypeValues.includes(profile['x-type'])) {
            errorList.push('profile x-type property value is not valid for Composer: '+profile['x-type']);
        }
    }
}

/**
 * Ensure that the supplied profile object has basic sections defined
 * @param {Object} profile profile object to validate
 */
function baseSectionsExist(profile) {
    if(!profile.client) {
        errorList.push('Profile does not specify a client');
    }
    if(!profile.channels) {
        errorList.push('Profile does not specify any channels');
    }
    if(!profile.certificateAuthorities) {
        errorList.push('Profile does not specify any certificateAuthorities');
    }
    if(!profile.orderers) {
        errorList.push('Profile does not specify any orderers');
    }
    if(!profile.organizations) {
        errorList.push('Profile does not specify any organizations');
    }
    if(!profile.peers) {
        errorList.push('Profile does not specify any peers');
    }
}

/**
 * Ensure that the supplied profile object has valid client config
 * @param {Object} profile profile object to validate
 */
function clientValidation(profile) {
    let org = profile.client.organization;
    if(!org) {
        errorList.push('Profile does not specify an owning organization for the client');
    } else {
        if(!profile.organizations[org]) {
            errorList.push('Profile client specfies an organization that is not included in the list of organizations: '+org);
        }
    }

}

/**
 * Ensure that the supplied profile object has valid orderers config
 * @param {Object} profile profile object to validate
 */
function orderersValidation(profile) {
    let orderers = profile.orderers;
    if(Object.keys(orderers).length === 0) {
        errorList.push('Profile does not specify any orderers');
    } else {
        Object.keys(orderers).forEach((key) => {
            let orderer = orderers[key];
            if (!Object.keys(orderer).includes('url')) {
                errorList.push('Orderer does not have a url property: '+key);
            } else {
                let suspect = orderers[key].url;
                if (!validUrl.isUri(suspect)){
                    console.log('NOT URI');
                    errorList.push('Orderer '+key+' does not have a valid url property: '+suspect);
                }
            }
        });
    }
}

module.exports = { validateProfile, applyRule, errorList, rules } ;

