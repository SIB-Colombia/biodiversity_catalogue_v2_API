import mongoose from 'mongoose';
import async from 'async';
import CommonNamesAtomizedVersion from '../models/commonNamesAtomized.js';
import add_objects from '../models/additionalModels.js';
import { logger }  from '../../server/log';

function postCommonNamesAtomized(req, res) {
  var common_names_atomized  = req.body; 
    common_names_atomized._id = mongoose.Types.ObjectId();
    common_names_atomized.created=Date();
    common_names_atomized.state="to_review";
    //common_names_atomized.state="approved_in_use";
    common_names_atomized.element="commonNamesAtomized";
    var user = common_names_atomized.id_user;
    var elementValue = common_names_atomized.commonNamesAtomized;
    common_names_atomized = new CommonNamesAtomizedVersion(common_names_atomized);
    var id_v = common_names_atomized._id;
    var id_rc = req.swagger.params.id.value;

    var ob_ids= new Array();
    ob_ids.push(id_v);

    var ver = "";

    if(typeof  id_rc!=="undefined" && id_rc!=""){
      if(typeof  elementValue!=="undefined" && elementValue!=""){
        async.waterfall([
          function(callback){ 
                add_objects.RecordVersion.findById(id_rc , function (err, data){
                  if(err){
                      callback(new Error("The Record (Ficha) with id: "+id_rc+" doesn't exist.:" + err.message));
                  }else{
                      callback(null, data);
                  }
                });
            },
            function(data,callback){
              if(data){
                if(data.commonNamesAtomizedVersion && data.commonNamesAtomizedVersion.length !=0){
                  var lencommonNamesAtomized = data.commonNamesAtomizedVersion.length;
                  var idLast = data.commonNamesAtomizedVersion[lencommonNamesAtomized-1];
                  CommonNamesAtomizedVersion.findById(idLast , function (err, doc){
                    if(err){
                      callback(new Error("failed getting the last version of commonNamesAtomizedVersion:" + err.message));
                    }else{
                      var prev = doc.commonNamesAtomizedVersion;
                      var next = common_names_atomized.commonNamesAtomizedVersion;
                      //if(!compare.isEqual(prev,next)){ //TODO
                      if(true){
                        common_names_atomized.id_record=id_rc;
                        common_names_atomized.version=lencommonNamesAtomized+1;
                        callback(null, common_names_atomized);
                      }else{
                        callback(new Error("The data in commonNamesAtomizedVersion is equal to last version of this element in the database"));
                      }
                    }
                  });
                }else{
                  common_names_atomized.id_record=id_rc;
                  common_names_atomized.version=1;
                  callback(null, common_names_atomized);
                }
              }else{
                callback(new Error("The Record (Ficha) with id: "+id_rc+" doesn't exist."));
              }
            },
            function(common_names_atomized, callback){ 
                ver = common_names_atomized.version;
                common_names_atomized.save(function(err){
                  if(err){
                      callback(new Error("failed saving the element version:" + err.message));
                  }else{
                      callback(null, common_names_atomized);
                  }
                });
            },
            function(common_names_atomized, callback){ 
                add_objects.RecordVersion.findByIdAndUpdate( id_rc, { $push: { "commonNamesAtomizedVersion": id_v } },{ safe: true, upsert: true }).exec(function (err, record) {
                  if(err){
                      callback(new Error("failed added id to RecordVersion:" + err.message));
                  }else{
                      callback();
                  }
                });
            }
            ],
            function(err, result) {
                if (err) {
                  logger.error('Error Creation of a new CommonNamesAtomizedVersion', JSON.stringify({ message:err }) );
                  res.status(400);
                  res.json({ ErrorResponse: {message: ""+err }});
                }else{
                  logger.info('Creation a new CommonNamesAtomizedVersion sucess', JSON.stringify({id_record: id_rc, version: ver, _id: id_v, id_user: user}));
                  res.json({ message: 'Save CommonNamesAtomizedVersion', element: 'commonNamesAtomized', version : ver, _id: id_v, id_record : id_rc });
               }      
            });

      }else{
        logger.warn('Empty data in version of the element' );
        res.status(400);
        res.json({message: "Empty data in version of the element"});
      }
    }else{
      logger.warn("The url doesn't have the id for the Record (Ficha)");
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
    }

}

function getCommonNamesAtomized(req, res) {
    var id_rc = req.swagger.params.id.value;
    var version = req.swagger.params.version.value;

    CommonNamesAtomizedVersion.findOne({ id_record : id_rc, version: version }).exec(function (err, elementVer) {
            if(err){
              logger.error('Error getting the indicated CommonNamesAtomizedVersion', JSON.stringify({ message:err, id_record : id_rc, version: version }) );
              res.status(400);
              res.send(err);
            }else{
              if(elementVer){
                res.json(elementVer);
              }else{
                logger.warn("Doesn't exist a CommonNamesAtomizedVersion with id_record", JSON.stringify({ id_record : id_rc, version: version }) );
                res.status(400);
                res.json({message: "Doesn't exist a CommonNamesAtomizedVersion with id_record: "+id_rc+" and version: "+version});
              }
            }
    });

}


function setApprovedInUseCommonNamesAtomized(req, res) {
  var id_rc = req.swagger.params.id.value;
  var version = req.swagger.params.version.value;

  if(typeof  id_rc!=="undefined" && id_rc!=""){
    async.waterfall([
      function(callback){ 
        CommonNamesAtomizedVersion.findOne({ id_record : id_rc, state: "to_review", version : version }).exec(function (err, elementVer) {
          if(err){
            callback(new Error(err.message));
          }else if(elementVer == null){
            callback(new Error("Doesn't exist a CommonNamesAtomizedVersion with the properties sent."));
          }else{
            callback();
          }
        });
      },
      function(callback){ 
        CommonNamesAtomizedVersion.update({ id_record : id_rc, state: "approved_in_use" },{ state: "approved" }, { multi: true },function (err, raw){
          if(err){
            callback(new Error(err.message));
          }else{
            console.log("response: "+raw);
            callback();
          }
        });
        
      },
      function(callback){ 
        CommonNamesAtomizedVersion.findOneAndUpdate({ id_record : id_rc, state: "to_review", version : version }, { state: "approved_in_use" }, function (err, elementVer) {
          if(err){
            callback(new Error(err.message));
          }else{
            callback(null, elementVer);
          }
        });
      },
      function(elementVer,callback){ 
        elementVer.state="approved_in_use";
        var update_date = Date();
        if(typeof elementVer.commonNamesAtomized !== 'undefined' && elementVer.commonNamesAtomized.length !== 0){
          var commonNames = [];
          var commonNamesValues = {};
          for(var i=0; i<elementVer.commonNamesAtomized; i++){
            commonNamesValues.language = elementVer.commonNamesAtomized[i].language;
            commonNamesValues.name = elementVer.commonNamesAtomized[i].name;
            commonNames.push(commonNamesValues);
          }
          add_objects.Record.update({_id:id_rc},{ commonNamesAtomizedApprovedInUse: elementVer, update_date: update_date, commonNames: commonNames }, function(err, result){
            if(err){
              callback(new Error(err.message));
            }else{
              callback();
            }
          });
        }else{
          add_objects.Record.update({_id:id_rc},{ commonNamesAtomizedApprovedInUse: elementVer, update_date: update_date }, function(err, result){
            if(err){
              callback(new Error(err.message));
            }else{
              callback();
            }
          });
        }
        
      }
    ],
    function(err, result) {
      if (err) {
        logger.error('Error to set CommonNamesAtomizedVersion approved_in_use', JSON.stringify({ message:err }) );
        res.status(400);
        res.json({ ErrorResponse: {message: ""+err }});
      }else{
        logger.info('Updated CommonNamesAtomizedVersion to approved_in_use', JSON.stringify({ version:version, id_record: id_rc }) );
        res.json({ message: 'Updated CommonNamesAtomizedVersion to approved_in_use', element: 'commonNamesAtomized', version : version, id_record : id_rc });
      }      
    });
  }else{
      logger.warn("The url doesn't have the id for the Record (Ficha)");
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
  }
}

function getToReviewCommonNamesAtomized(req, res) {
  var id_rc = req.swagger.params.id.value;
  CommonNamesAtomizedVersion.find({ id_record : id_rc, state: "to_review" }).exec(function (err, elementList) {
    if(err){
      logger.error('Error getting the list of CommonNamesAtomizedVersion at state to_review', JSON.stringify({ message:err }) );
      res.status(400);
      res.send(err);
    }else{
      if(elementList){
        //var len = elementVer.length;
        logger.info('Get list of CommonNamesAtomizedVersion with state to_review', JSON.stringify({ id_record: id_rc }) );
        res.json(elementList);
      }else{
        logger.warn("Doesn't exist a CommonNamesAtomizedVersion with the indicated id_record");
        res.status(406);
        res.json({message: "Doesn't exist a CommonNamesAtomizedVersion with id_record: "+id_rc});
      }
    }
  });
}

function getLastApprovedInUseCommonNamesAtomized(req, res) {
  var id_rc = req.swagger.params.id.value;
  CommonNamesAtomizedVersion.find({ id_record : id_rc, state: "approved_in_use" }).exec(function (err, elementVer) {
    if(err){
      logger.error('Error getting the last CommonNamesAtomizedVersion at state approved_in_use', JSON.stringify({ message:err }) );
      res.status(400);
      res.send(err);
    }else{
      if(elementVer){
        logger.info('Get last CommonNamesAtomizedVersion with state approved_in_use', JSON.stringify({ id_record: id_rc }) );
        var len = elementVer.length;
        res.json(elementVer[len-1]);
      }else{
        res.status(400);
        res.json({message: "Doesn't exist a CommonNamesAtomizedVersion with id_record: "+id_rc});
      }
    }
  });
}

module.exports = {
  postCommonNamesAtomized,
  getCommonNamesAtomized,
  setApprovedInUseCommonNamesAtomized,
  getToReviewCommonNamesAtomized,
  getLastApprovedInUseCommonNamesAtomized
};