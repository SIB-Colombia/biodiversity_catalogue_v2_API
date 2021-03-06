var mongoose = require('mongoose');
var extend = require('mongoose-schema-extend');
var Schema = mongoose.Schema;
var ad_objects = require('./additionalModels.js');
var Element = require('mongoose').model('Element').schema;
var ElementVersion = require('mongoose').model('ElementVersion').schema;
var MeasurementOrFact = require('mongoose').model('MeasurementOrFact').schema;
var AncillaryData = require('mongoose').model('AncillaryData').schema;
var RecordVersion = require('mongoose').model('RecordVersion').schema;

var LifeCycleAtomized = new Schema ({
	measurementOrFact : MeasurementOrFact,
	ancillaryData : AncillaryData
},{ versionKey: false });

var LifeCycle = Element.extend({
	lifeCycleAtomized : [LifeCycleAtomized],
	lifeCycleUnstructured : String
},{ versionKey: false });

var LifeCycleVersion = ElementVersion.extend({
	lifeCycle : LifeCycle
},{ collection: 'LifeCycleVersion', versionKey: false });

module.exports = mongoose.model('LifeCycleVersion', LifeCycleVersion );