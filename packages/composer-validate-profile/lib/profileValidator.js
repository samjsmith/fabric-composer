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
const ajv = require('ajv');

/**
 * validateProfile
 * validates connection profile
 * @param {String} filename the input filename
 */
function validateProfile(filename) {
    let path = validateInput(filename);
    let profile = loadProfile(path);
    let schema = loadSchema();
    let compiler = new ajv();
    let validate = compiler.compile(schema);
    console.log('Validating profile file: ' + filename);
    validate(profile);
    if(validate.errors) {
        validate.errors.forEach(err => {
            console.log(err);
        });
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
 * @return {Object} JSON profile object
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
 * Loads the JSON Schema into an object for compilation.
 * @return {Object} JSON schema object
 */
function loadSchema() {
    const filePath = path.resolve('./schema/schema.json');
    return JSON.parse(readFileSync(filePath));
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

module.exports = { validateProfile } ;

