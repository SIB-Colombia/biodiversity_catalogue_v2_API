var mongoose = require('mongoose');
var async = require('async');
var fs = require('fs');
var TaxonRecordNameVersion = require('../models/taxonRecordName.js');
var SynonymsAtomizedVersion = require('../models/synonymsAtomized.js');
var CommonNamesAtomizedVersion = require('../models/commonNamesAtomized.js');
var HierarchyVersion = require('../models/hierarchy.js');
var ThreatStatusVersion = require('../models/threatStatus.js');
var add_objects = require('../models/additionalModels.js');
var parse = require('csv-parse');
var rest = require('restler');
var Schema = mongoose.Schema;

var CatalogoDb = mongoose.createConnection('mongodb://localhost:27017/catalogoDbNewAPI', function(err) {
	if(err){
		console.log('connection error', err);
	}else{
		async.waterfall([
			function(callback){ 
    			console.log("Read the csv file ");
        		//RecordModel.find({}).exec(callback);
        		//Leer el archivo, Read the file
        		var data = [];
        		var input = fs.createReadStream("/home/oscar/Desktop/TAX.csv");
        		var parser = parse({delimiter: ','});
        		parser.on('readable', function(){
  					while(record = parser.read()){
    					data.push(record);
  					}
				});
				parser.on('finish', function(){
					callback(null, data);
				});
				input.pipe(parser);
        		//var stream = fs.createReadStream(inputFile).pipe(parser);
        		
        	},
        	function(data,callback){
        		console.log("Number of scientific names to insert: "+data.length);
        		var newRecordSchema = add_objects.Record.schema;
          		var newRecordModel = CatalogoDb.model('Record', newRecordSchema );
          		data=data.slice(1, data.length);
          		async.eachSeries(data, function(line, callback) {
          			//console.log(line);
          			line = line+"";
          			//var name =line.split(",")[2];
          			var name='zantedeschia aethiopicax';
          			var image = 'test.jpg';
          			console.log(name);
          			var reg_ex = '^'+name;
          			async.waterfall([
          				function(callback){
          					//newRecordModel.findOne({'scientificNameSimple': new RegExp('^'+name+'$', "i") }, 'scientificNameSimple', function(err, record){
          					newRecordModel.findOne({'scientificNameSimple': {'$regex' : reg_ex, '$options' : 'i'} }, 'scientificNameSimple', function(err, record){
          						if(err){
          							console.log("Error finding scientificName in the database!: " + taxName);
									callback(new Error("Error to get EcologicalSignificance element for the record with id: "+record_data._id+" : " + err.message));
          						}else{	
          							if(record){
          								/*
          								console.log(record);
          								console.log(record._id);
          								*/
          								callback(null, record._id, record.scientificNameSimple);
          							}else{
          								console.log("no record");
          								callback(null, '', name);
          							}
          						}
          					});
          				},
          				function(id,sciname,callback){
          					console.log(id);
          					console.log(sciname);
          					if(id == ''){
          						//call the api
          						/*
          						var temp_name = name.trim().replace(/ /g,"%20");
          						console.log("Scientific Name to search in the GBIF API: "+name);
          						rest.get('http://api.gbif.org/v1/species?name='+temp_name+'&limit=1').on('complete', function(data) {
          							console.log("gbif api for "+ name +JSON.stringify(data));
          							if(data.results.length > 0){
          								var taxonRecordName = {};
          								taxonRecordName.scientificName = {};
          								taxonRecordName.scientificName.canonicalName = {};
          								taxonRecordName.scientificName.canonicalAuthorship = {};
          								taxonRecordName.scientificName.publishedln = {};
  										taxonRecordName.scientificName.simple = (data.results[0].scientificName !== undefined) ? data.results[0].scientificName : '';
										taxonRecordName.scientificName.rank = (data.results[0].rank !== undefined) ? data.results[0].rank : '';
										taxonRecordName.scientificName.canonicalName.simple = (data.results[0].canonicalName !== undefined) ? data.results[0].canonicalName : '';
										taxonRecordName.scientificName.canonicalAuthorship.simple = (data.results[0].authorship !== undefined) ? data.results[0].authorship : '';
										taxonRecordName.scientificName.publishedln.simple = (data.results[0].publishedIn !== undefined) ? data.results[0].publishedIn : '';
										var create_new_record=true;
          							}else{
          								console.log("No results for the name!: " + name);
          								var create_new_record=false;
          							}
          						});
								*/
								var taxonRecordName = {};
								taxonRecordName.scientificName.canonicalName = {};
								taxonRecordName.scientificName.simple = sciname;
								taxonRecordName.scientificName.canonicalName.simple = cannoname;
								var create_new_record=true;
          					}else{
          						var create_new_record=false;
          						callback(null,taxonRecordNameObj,id);
          					}
          				},
          				function(id,callback){
          					console.log();
          				}
          			],function (err, result) {
    		
					});

          			/*
          			
          			*/

          		},function(err){
            		if(err){
                  		callback(new Error("Error: "+err));
              		}else{
                  		callback(null, data);
              		}
          		});
        	}

		], function (err, result) {
    		
		});

	}

});