import mongoose from 'mongoose';
import async from 'async';
import InteractionsVersion from '../models/interactions.js';
import add_objects from '../models/additionalModels.js';
import { logger }  from '../../server/log';

function postInteractions(req, res) {
  var interactions_version  = req.body; 
    interactions_version._id = mongoose.Types.ObjectId();
    interactions_version.created=Date();
    interactions_version.state="to_review";
    //interactions_version.state="accepted";
    interactions_version.element="interactions";
    var user = interactions_version.id_user;
    var elementValue = interactions_version.interactions;
    interactions_version = new InteractionsVersion(interactions_version);
    var id_v = interactions_version._id;
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
                if(data.interactionsVersion && data.interactionsVersion.length !=0){
                  var leninteractions = data.interactionsVersion.length;
                  var idLast = data.interactionsVersion[leninteractions-1];
                  InteractionsVersion.findById(idLast , function (err, doc){
                    if(err){
                      callback(new Error("failed getting the last version of interactionsVersion:" + err.message));
                    }else{
                      var prev = doc.interactionsVersion;
                      var next = interactions_version.interactionsVersion;
                      //if(!compare.isEqual(prev,next)){ //TODO
                      if(true){
                        interactions_version.id_record=id_rc;
                        interactions_version.version=leninteractions+1;
                        callback(null, interactions_version);
                      }else{
                        callback(new Error("The data in interactionsVersion is equal to last version of this element in the database"));
                      }
                    }
                  });
                }else{
                  interactions_version.id_record=id_rc;
                  interactions_version.version=1;
                  callback(null, interactions_version);
                }
              }else{
                callback(new Error("The Record (Ficha) with id: "+id_rc+" doesn't exist."));
              }
            },
            function(interactions_version, callback){ 
                ver = interactions_version.version;
                interactions_version.save(function(err){
                  if(err){
                      callback(new Error("failed saving the element version:" + err.message));
                  }else{
                      callback(null, interactions_version);
                  }
                });
            },
            function(interactions_version, callback){ 
                add_objects.RecordVersion.findByIdAndUpdate( id_rc, { $push: { "interactionsVersion": id_v } },{ safe: true, upsert: true }).exec(function (err, record) {
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
                  logger.error('Error Creation of a new InteractionsVersion', JSON.stringify({ message:err }) );
                  res.status(400);
                  res.json({ ErrorResponse: {message: ""+err }});
                }else{
                  logger.info('Creation a new InteractionsVersion sucess', JSON.stringify({id_record: id_rc, version: ver, _id: id_v, id_user: user}));
                  res.json({ message: 'Save InteractionsVersion', element: 'interactions', version : ver, _id: id_v, id_record : id_rc });
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

function getInteractions(req, res) {
    var id_rc = req.swagger.params.id.value;
    var version = req.swagger.params.version.value;

    InteractionsVersion.findOne({ id_record : id_rc, version: version }).exec(function (err, elementVer) {
            if(err){
              logger.error('Error getting the indicated InteractionsVersion', JSON.stringify({ message:err, id_record : id_rc, version: version }) );
              res.status(400);
              res.send(err);
            }else{
              if(elementVer){
                res.json(elementVer);
              }else{
                logger.warn("Doesn't exist a InteractionsVersion with id_record", JSON.stringify({ id_record : id_rc, version: version }) );
                res.status(400);
                res.json({message: "Doesn't exist a InteractionsVersion with id_record: "+id_rc+" and version: "+version});
              }
            }
    });

}


function setAcceptedInteractions(req, res) {
  var id_rc = req.swagger.params.id.value;
  var version = req.swagger.params.version.value;
  var id_rc = req.swagger.params.id.value;

  if(typeof  id_rc!=="undefined" && id_rc!=""){
    async.waterfall([
      function(callback){ 
        InteractionsVersion.findOne({ id_record : id_rc, state: "to_review", version : version }).exec(function (err, elementVer) {
          if(err){
            callback(new Error(err.message));
          }else if(elementVer == null){
            callback(new Error("Doesn't exist a InteractionsVersion with the properties sent."));
          }else{
            callback();
          }
        });
      },
      function(callback){ 
        InteractionsVersion.update({ id_record : id_rc, state: "accepted" },{ state: "deprecated" }, { multi: true },function (err, raw){
          if(err){
            callback(new Error(err.message));
          }else{
            console.log("response: "+raw);
            callback();
          }
        });
        
      },
      function(callback){ 
        InteractionsVersion.update({ id_record : id_rc, state: "to_review", version : version }, { state: "accepted" }, function (err, elementVer) {
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
        logger.error('Error to set InteractionsVersion accepted', JSON.stringify({ message:err }) );
        res.status(400);
        res.json({ ErrorResponse: {message: ""+err }});
      }else{
        logger.info('Updated InteractionsVersion to accepted', JSON.stringify({ version:version, id_record: id_rc }) );
        res.json({ message: 'Updated InteractionsVersion to accepted', element: 'interactions', version : version, id_record : id_rc });
      }      
    });
  }else{
      logger.warn("The url doesn't have the id for the Record (Ficha)");
      res.status(400);
      res.json({message: "The url doesn't have the id for the Record (Ficha)"});
  }
}

function getToReviewInteractions(req, res) {
  var id_rc = req.swagger.params.id.value;
  InteractionsVersion.find({ id_record : id_rc, state: "to_review" }).exec(function (err, elementList) {
    if(err){
      logger.error('Error getting the list of InteractionsVersion at state to_review', JSON.stringify({ message:err }) );
      res.status(400);
      res.send(err);
    }else{
      if(elementList){
        //var len = elementVer.length;
        logger.info('Get list of InteractionsVersion with state to_review', JSON.stringify({ id_record: id_rc }) );
        res.json(elementList);
      }else{
        logger.warn("Doesn't exist a InteractionsVersion with the indicated id_record");
        res.status(406);
        res.json({message: "Doesn't exist a InteractionsVersion with id_record: "+id_rc});
      }
    }
  });
}

function getLastAcceptedInteractions(req, res) {
  var id_rc = req.swagger.params.id.value;
  InteractionsVersion.find({ id_record : id_rc, state: "accepted" }).exec(function (err, elementVer) {
    if(err){
      logger.error('Error getting the last InteractionsVersion at state accepted', JSON.stringify({ message:err }) );
      res.status(400);
      res.send(err);
    }else{
      if(elementVer){
        logger.info('Get last InteractionsVersion with state accepted', JSON.stringify({ id_record: id_rc }) );
        var len = elementVer.length;
        res.json(elementVer[len-1]);
      }else{
        res.status(400);
        res.json({message: "Doesn't exist a InteractionsVersion with id_record: "+id_rc});
      }
    }
  });
}

module.exports = {
  postInteractions,
  getInteractions,
  setAcceptedInteractions,
  getToReviewInteractions,
  getLastAcceptedInteractions
};