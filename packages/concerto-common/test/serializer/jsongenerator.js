/*
 * IBM Confidential
 * OCO Source Materials
 * IBM Concerto - Blockchain Solution Framework
 * Copyright IBM Corp. 2016
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has
 * been deposited with the U.S. Copyright Office.
 */

'use strict';

// const Factory = require('../../lib/factory');
// const Field = require('../../lib/introspect/field');
const JSONGenerator = require('../../lib/serializer/jsongenerator');
const JSONWriter = require('../../lib/codegen/jsonwriter');
const ModelManager = require('../../lib/modelmanager');
const Relationship = require('../../lib/model/relationship');
const Resource = require('../../lib/model/resource');
const TypedStack = require('../../lib/serializer/typedstack');

require('chai').should();
const sinon = require('sinon');

describe('JSONGenerator', () => {

    let modelManager;
    // let mockFactory;
    let jsonGenerator;
    let mockJSONWriter;
    let sandbox;
    // let assetDeclaration1;
    let relationshipDeclaration1;
    let relationshipDeclaration2;
    let relationshipDeclaration3;
    let relationshipDeclaration4;

    before(() => {
        modelManager = new ModelManager();
        modelManager.addModelFile(`
            namespace org.acme
            asset MyAsset1 identified by assetId {
                o String assetId
            }
            asset MyAsset2 identified by assetId {
                o String assetId
                o Integer integerValue
            }
            asset MyContainerAsset1 identified by assetId {
                o String assetId
                o MyAsset1 myAsset
            }
            asset MyContainerAsset1 identified by assetId {
                o String assetId
                o MyAsset1[] myAssets
            }
            transaction MyTx1 identified by transactionId {
                o String transactionId
                --> MyAsset1 myAsset
            }
            transaction MyTx2 identified by transactionId {
                o String transactionId
                --> MyAsset1[] myAssets
            }
            asset SimpleAssetCircle identified by assetId {
                o String assetId
                --> SimpleAssetCircle next
            }
            asset SimpleAssetCircleArray identified by assetId {
                o String assetId
                --> SimpleAssetCircleArray[] next
            }
        `);
        // assetDeclaration1 = modelManager.getType('org.acme.SimpleAssetCircle').getProperty('myAsset');
        relationshipDeclaration1 = modelManager.getType('org.acme.MyTx1').getProperty('myAsset');
        relationshipDeclaration2 = modelManager.getType('org.acme.MyTx2').getProperty('myAssets');
        relationshipDeclaration3 = modelManager.getType('org.acme.SimpleAssetCircle').getProperty('next');
        relationshipDeclaration4 = modelManager.getType('org.acme.SimpleAssetCircleArray').getProperty('next');
    });

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        // mockFactory = sinon.createStubInstance(Factory);
        jsonGenerator = new JSONGenerator();
        mockJSONWriter = sinon.createStubInstance(JSONWriter);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('#visit', () => {

        it('should throw an error for an unrecognized type', () => {
            (() => {
                jsonGenerator.visit(3.142, {});
            }).should.throw(/Unrecognised/);
        });

    });

    describe('#visitRelationshipDeclaration', () => {

        it('should serialize a relationship', () => {
            let mockRelationship = sinon.createStubInstance(Relationship);
            mockRelationship.getIdentifier.returns('DOGE_1');
            mockRelationship.getNamespace.returns('org.acme');
            let options = {
                stack: new TypedStack({}),
                writer: mockJSONWriter,
                modelManager: modelManager
            };
            options.stack.push(mockRelationship);
            jsonGenerator.visitRelationshipDeclaration(relationshipDeclaration1, options);
            sinon.assert.calledOnce(mockJSONWriter.writeStringValue);
            sinon.assert.calledWith(mockJSONWriter.writeStringValue, 'DOGE_1');
        });

        it('should throw when serializing a resource by default', () => {
            let mockResource = sinon.createStubInstance(Resource);
            mockResource.getIdentifier.returns('DOGE_1');
            mockResource.getNamespace.returns('org.acme');
            let options = {
                stack: new TypedStack({}),
                writer: mockJSONWriter,
                modelManager: modelManager
            };
            options.stack.push(mockResource);
            (() => {
                jsonGenerator.visitRelationshipDeclaration(relationshipDeclaration1, options);
            }).should.throw(/Did not find a relationship/);
        });

        it('should serialize a resource if option is specified', () => {
            jsonGenerator = new JSONGenerator(false, true);
            let mockResource = sinon.createStubInstance(Resource);
            mockResource.getIdentifier.returns('DOGE_1');
            mockResource.getNamespace.returns('org.acme');
            mockResource.getFullyQualifiedIdentifier.returns('org.acme.Doge#DOGE_1');
            let options = {
                stack: new TypedStack({}),
                writer: mockJSONWriter,
                modelManager: modelManager,
                seenResources: new Set()
            };
            options.stack.push(mockResource);
            jsonGenerator.visitRelationshipDeclaration(relationshipDeclaration1, options);
            sinon.assert.calledOnce(mockJSONWriter.openObject);
            sinon.assert.calledOnce(mockJSONWriter.closeObject);
        });

        it('should serialize a circular resource if option is specified', () => {
            jsonGenerator = new JSONGenerator(false, true);
            let mockResource1 = sinon.createStubInstance(Resource);
            let mockResource2 = sinon.createStubInstance(Resource);
            let mockResource3 = sinon.createStubInstance(Resource);
            mockResource1.getIdentifier.returns('DOGE_1');
            mockResource1.getNamespace.returns('org.acme');
            mockResource1.getFullyQualifiedIdentifier.returns('org.acme.SimpleAssetCircle#DOGE_1');
            mockResource1.assetId = 'DOGE_1';
            mockResource2.getIdentifier.returns('DOGE_2');
            mockResource2.getNamespace.returns('org.acme');
            mockResource2.getFullyQualifiedIdentifier.returns('org.acme.SimpleAssetCircle#DOGE_2');
            mockResource2.assetId = 'DOGE_2';
            mockResource3.getIdentifier.returns('DOGE_3');
            mockResource3.getNamespace.returns('org.acme');
            mockResource3.getFullyQualifiedIdentifier.returns('org.acme.SimpleAssetCircle#DOGE_3');
            mockResource3.assetId = 'DOGE_3';
            mockResource1.next = mockResource2;
            mockResource2.next = mockResource3;
            mockResource3.next = mockResource1;
            let options = {
                stack: new TypedStack({}),
                writer: new JSONWriter(),
                modelManager: modelManager,
                seenResources: new Set()
            };
            options.stack.push(mockResource1);
            jsonGenerator.visitRelationshipDeclaration(relationshipDeclaration3, options);
            options.writer.getBuffer().should.equal('"next":{"$class":"org.acme.SimpleAssetCircle","assetId":"DOGE_1","next":{"$class":"org.acme.SimpleAssetCircle","assetId":"DOGE_2","next":{"$class":"org.acme.SimpleAssetCircle","assetId":"DOGE_3","next":"DOGE_1"}}}');
        });

        it('should serialize an array of relationships', () => {
            let mockRelationship1 = sinon.createStubInstance(Relationship);
            let mockRelationship2 = sinon.createStubInstance(Relationship);
            mockRelationship1.getIdentifier.returns('DOGE_1');
            mockRelationship1.getNamespace.returns('org.acme');
            mockRelationship2.getIdentifier.returns('DOGE_2');
            mockRelationship2.getNamespace.returns('org.acme');
            let options = {
                stack: new TypedStack({}),
                writer: mockJSONWriter,
                modelManager: modelManager
            };
            options.stack.push([mockRelationship1, mockRelationship2]);
            jsonGenerator.visitRelationshipDeclaration(relationshipDeclaration2, options);
            sinon.assert.calledOnce(mockJSONWriter.openArray);
            sinon.assert.calledTwice(mockJSONWriter.writeArrayStringValue);
            sinon.assert.calledWith(mockJSONWriter.writeArrayStringValue, 'DOGE_1');
            sinon.assert.calledWith(mockJSONWriter.writeArrayStringValue, 'DOGE_2');
            sinon.assert.calledOnce(mockJSONWriter.closeArray);
        });

        it('should throw when serializing an array of resources by default', () => {
            let mockResource1 = sinon.createStubInstance(Resource);
            let mockResource2 = sinon.createStubInstance(Resource);
            mockResource1.getIdentifier.returns('DOGE_1');
            mockResource1.getNamespace.returns('org.acme');
            mockResource2.getIdentifier.returns('DOGE_2');
            mockResource2.getNamespace.returns('org.acme');
            let options = {
                stack: new TypedStack({}),
                writer: mockJSONWriter,
                modelManager: modelManager
            };
            options.stack.push([mockResource1, mockResource2]);
            (() => {
                jsonGenerator.visitRelationshipDeclaration(relationshipDeclaration2, options);
            }).should.throw(/Did not find a relationship/);
        });

        it('should serialize an array of resources if option is specified', () => {
            jsonGenerator = new JSONGenerator(false, true);
            let mockResource1 = sinon.createStubInstance(Resource);
            let mockResource2 = sinon.createStubInstance(Resource);
            mockResource1.getIdentifier.returns('DOGE_1');
            mockResource1.getNamespace.returns('org.acme');
            mockResource1.getFullyQualifiedIdentifier.returns('org.acme.Doge#DOGE_1');
            mockResource2.getIdentifier.returns('DOGE_2');
            mockResource2.getNamespace.returns('org.acme');
            mockResource2.getFullyQualifiedIdentifier.returns('org.acme.Doge#DOGE_2');
            let options = {
                stack: new TypedStack({}),
                writer: mockJSONWriter,
                modelManager: modelManager,
                seenResources: new Set()
            };
            options.stack.push([mockResource1, mockResource2]);
            jsonGenerator.visitRelationshipDeclaration(relationshipDeclaration2, options);
            sinon.assert.calledOnce(mockJSONWriter.openArray);
            sinon.assert.calledTwice(mockJSONWriter.writeComma);
            sinon.assert.calledTwice(mockJSONWriter.openObject);
            sinon.assert.calledTwice(mockJSONWriter.closeObject);
            sinon.assert.calledOnce(mockJSONWriter.closeArray);
        });

        it('should serialize a circular array of resources if option is specified', () => {
            jsonGenerator = new JSONGenerator(false, true);
            let mockResource1 = sinon.createStubInstance(Resource);
            let mockResource2 = sinon.createStubInstance(Resource);
            let mockResource3 = sinon.createStubInstance(Resource);
            mockResource1.getIdentifier.returns('DOGE_1');
            mockResource1.getNamespace.returns('org.acme');
            mockResource1.getFullyQualifiedIdentifier.returns('org.acme.SimpleAssetCircle#DOGE_1');
            mockResource1.assetId = 'DOGE_1';
            mockResource2.getIdentifier.returns('DOGE_2');
            mockResource2.getNamespace.returns('org.acme');
            mockResource2.getFullyQualifiedIdentifier.returns('org.acme.SimpleAssetCircle#DOGE_2');
            mockResource2.assetId = 'DOGE_2';
            mockResource3.getIdentifier.returns('DOGE_3');
            mockResource3.getNamespace.returns('org.acme');
            mockResource3.getFullyQualifiedIdentifier.returns('org.acme.SimpleAssetCircle#DOGE_3');
            mockResource3.assetId = 'DOGE_3';
            mockResource1.next = [mockResource2, mockResource3];
            mockResource2.next = [mockResource3, mockResource1];
            mockResource3.next = [mockResource1, mockResource2];
            let options = {
                stack: new TypedStack({}),
                writer: new JSONWriter(),
                modelManager: modelManager,
                seenResources: new Set()
            };
            options.stack.push([mockResource1, mockResource2, mockResource3]);
            jsonGenerator.visitRelationshipDeclaration(relationshipDeclaration4, options);
            options.writer.getBuffer().should.equal('"next":[{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_1","next":[{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_2","next":[{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_3","next":["DOGE_1""DOGE_2"]}"DOGE_1"]},{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_3","next":["DOGE_1",{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_2","next":["DOGE_3""DOGE_1"]}]}]},{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_2","next":[{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_3","next":[{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_1","next":["DOGE_2""DOGE_3"]}"DOGE_2"]},{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_1","next":["DOGE_2",{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_3","next":["DOGE_1""DOGE_2"]}]}]},{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_3","next":[{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_1","next":[{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_2","next":["DOGE_3""DOGE_1"]}"DOGE_3"]},{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_2","next":["DOGE_3",{"$class":"org.acme.SimpleAssetCircleArray","assetId":"DOGE_1","next":["DOGE_2""DOGE_3"]}]}]}]');
        });

    });

    describe('#getRelationshipText', () => {

        it('should return a relationship string for a relationship', () => {
            let mockRelationship = sinon.createStubInstance(Relationship);
            mockRelationship.getIdentifier.returns('DOGE_1');
            mockRelationship.getNamespace.returns('org.acme');
            jsonGenerator.getRelationshipText(relationshipDeclaration1, mockRelationship).should.equal('DOGE_1');
        });

        it('should return a relationship string for a relationship in another namespace', () => {
            let mockRelationship = sinon.createStubInstance(Relationship);
            mockRelationship.getIdentifier.returns('DOGE_1');
            mockRelationship.getNamespace.returns('org.elsewhere');
            mockRelationship.getFullyQualifiedIdentifier.returns('org.elsewhere.MyAsset1#DOGE_1');
            jsonGenerator.getRelationshipText(relationshipDeclaration1, mockRelationship).should.equal('org.elsewhere.MyAsset1#DOGE_1');
        });

        it('should throw an error for a resource if not permitted', () => {
            let mockResource = sinon.createStubInstance(Resource);
            (() => {
                jsonGenerator.getRelationshipText(relationshipDeclaration1, mockResource);
            }).should.throw(/Did not find a relationship/);
        });

        it('should return a relationship string for a resource if permitted', () => {
            jsonGenerator = new JSONGenerator(true); // true enables convertResourcesToRelationships
            let mockResource = sinon.createStubInstance(Resource);
            mockResource.getIdentifier.returns('DOGE_1');
            mockResource.getNamespace.returns('org.acme');
            jsonGenerator.getRelationshipText(relationshipDeclaration1, mockResource).should.equal('DOGE_1');
        });

    });

});