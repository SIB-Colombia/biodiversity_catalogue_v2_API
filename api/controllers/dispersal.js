import mongoose from 'mongoose';
import async from 'async';
import DispersalVersion from '../models/dispersal.js';
import add_objects from '../models/additionalModels.js';
import { logger }  from '../../server/log';

function postDispersal(req, res) {
  var dispersal_version  = req.body; 
    dispersal_version._id = mongoose.Types.ObjectId();
    dispersal_version.created=Date();
    dispersal_version.state="to_review";
    //dispersal_version.state="approved_in_use";
    dispersal_version.element="dispersal";
    var user = dispersal_version.id_user;
    var elementValue = dispersal_version.dispersal;
    dispersal_version = new DispersalVersion(dispersal_version);
    var id_v = dispersal_version._id;
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
                if(data.dispersalVersion && data.dispersalVersion.length !=0){
                  var lendispersal = data.dispersalVersion.length;
                  var idLast = data.dispersalVersion[lendispersal-1];
                  DispersalVersion.findById(idLast , function (err, doc){
                    if(err){
                      callback(new Error("failed getting the last version of dispersalVersion:" + err.message));
                    }else{
                      var prev = doc.dispersalVersion;
                      var next = dispersal_version.dispersalVersion;
                      //if(!compare.isEqual(prev,next)){ //TODO
                      if(true){
                        dispersal_version.id_record=id_rc;
                        dispersal_version.version=lendispersal+1;
                        callback(null, dispersal_version);
                      }else{
                        callback(new Error("The data in dispersalVersion is equal to last version of this element in the database"));
                      }
                    }
                  });
                }else{
                  dispersal_version.id_record=id_rc;
                  dispersal_version.version=1;
                  callback(null, dispersal_version);
                }
              }else{
                callback(new Error("The Record (Ficha) with id: "+id_rc+" doesn't exist."));
              }
            },
            function(dispersal_version, callback){ 
                ver = dispersal_version.version;
                dispersal_version.save(function(err){
                  if(err){
                      callback(new Error("failed saving the element version:" + err.message));
                  }else{
                      callback(null, dispersal_version);
                  }
                });
            },
            function(dispersal_version, callback){ 
                add_objects.RecordVersion.findByIdAndUpdate( id_rc, { $push: { "dispersalVersion": id_v } },{ safe: true, upsert: true }).exec(function (err, record) {
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
                  logger.error('Error Creation of a new DispersalVersion', JSON.stringify({ message:err }) );
                  res.status(400);
                  res.json({ ErrorResponse: {message: ""+err }});
                }else{
                  logger.info('Creation a new DispersalVersion sucess', JSON.stringify({id_record: id_rc, version: ver, _id: id_v, id_user: user}));
                  res.json({ message: 'Save DispersalVersion', element: 'dispersal', version : ver, _id: id_v, id_record : id_rc });
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

function getDispersal(req, res) {
    var id_rc = req.swagger.params.id.value;
    var version = req.swagger.params.version.value;

    DispersalVersion.findOne({ id_record : id_rc, version: version }).exec(function (err, elementVer) {
            if(err){
              logger.error('Error getting the indicated DispersalVersion', JSON.stringify({ message:err, id_record : id_rc, version: version }) );
              res.status(400);
              res.send(err);
            }else{
              if(elementVer){
                res.json(elementVer);
              }else{
                logger.warn("Doesn't exist a DispersalVersion with id_record", JSON.stringify({ id_record : id_rc, version: version }) );
                res.status(400);
                res.json({message: "Doesn't exist a DispersalVersion with id_record: "+id_rc+" and version: "+version});
              }
            }
    });

}


function setApprovedInUseDispersal(req, res) {
  var id_rc = req.swagger.params.id.value;
  var version = req.swagger.params.version.value;
  var id_rc = req.swagger.params.id.value;

  if(typeof  id_rc!=="undefined" && id_rc!=""){
    async.waterfall([
      function(callback){ 
        DispersalVersion.findOne({ id_record : id_rc, state: "to_review", version : version }).exec(function (err, elementVer) {
          if(err){
            callback(new Error(err.message));
          }else if(elementVer == null){
            callback(new Error("Doesn't exist a DispersalVersion with the properties sent."));
          }else{
            callback();
          }
        });
      },
      function(callback){ 
        DispersalVersion.update({ id_record : id_rc, state: "approved_in_use" },{ state: "approved" }, { multi: true },function (err, raw){
          if(err){
            callback(new Error(err.message));
          }else{
            console.log("response: "+raw);
            callback();
          }
        });
        
      },
      function(callback){ 
        DispersalVersion.findOneAndUpdate({ id_record : id_rc, state: "to_review", version : version }, { state: "approved_in_use" }, function (err, elementVer) {
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
        add_objects.Record.update({_id:id_rc},{ dispersalApprovedInUse: elementVer, update_date: update_date }, function(err, result){
          if(err){
            callback(new Error(err.message));
          }else{
            callback();
          }
        });
      }
    ],
    function(err, result) {
      if (err) {
        logger.error('Error to set DispersalVersion approved_in_use', JSON.stringify({ message:err }) );
        res.status(400);
        res.json({ ErrorResponse: {message: ""+err }});
      }else{
        logger.info('Updated DispersalVersion to approved_in_use', JSON.stringify({ version:version, id_record: id_rc }) );
        res.json({ message: 'Updated DispersalVersion to approved_in_use', element: 'dispersal', version : version, id_record : id_rc });
      }      
    });
  }else{
      logger.warn("The url doesn't have the id for the Record (Ficha)");
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
  }
}

function getToReviewDispersal(req, res) {
  var id_rc = req.swagger.params.id.value;
  DispersalVersion.find({ id_record : id_rc, state: "to_review" }).exec(function (err, elementList) {
    if(err){
      logger.error('Error getting the list of DispersalVersion at state to_review', JSON.stringify({ message:err }) );
      res.status(400);
      res.send(err);
    }else{
      if(elementList){
        //var len = elementVer.length;
        logger.info('Get list of DispersalVersion with state to_review', JSON.stringify({ id_record: id_rc }) );
        res.json(elementList);
      }else{
        logger.warn("Doesn't exist a DispersalVersion with the indicated id_record");
        res.status(406);
        res.json({message: "Doesn't exist a DispersalVersion with id_record: "+id_rc});
      }
    }
  });
}

function getLastApprovedInUseDispersal(req, res) {
  var id_rc = req.swagger.params.id.value;
  DispersalVersion.find({ id_record : id_rc, state: "approved_in_use" }).exec(function (err, elementVer) {
    if(err){
      logger.error('Error getting the last DispersalVersion at state approved_in_use', JSON.stringify({ message:err }) );
      res.status(400);
      res.send(err);
    }else{
      if(elementVer){
        logger.info('Get last DispersalVersion with state approved_in_use', JSON.stringify({ id_record: id_rc }) );
        var len = elementVer.length;
        res.json(elementVer[len-1]);
      }else{
        res.status(400);
        res.json({message: "Doesn't exist a DispersalVersion with id_record: "+id_rc});
      }
    }
  });
}

module.exports = {
  postDispersal,
  getDispersal,
  setApprovedInUseDispersal,
  getToReviewDispersal,
  getLastApprovedInUseDispersal
};