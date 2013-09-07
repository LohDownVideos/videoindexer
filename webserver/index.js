var express = require('express');
var _ = require('lodash');
var request = require('request');
var config = require('./config');
var util = require('util');

var app = express();

// Serve static files if they exist
app.use(express.static(__dirname + '/' + config.webserver.staticfiles));

// API functions
app.use(express.bodyParser({
  keepExtensions: true, uploadDir: config.videoStorage.uploadDirPath
}));

// Receives video file metadata, indexes it into elastic search, returns a json
// object with the uploadID.
app.post('/api/upload', function(req, res) {
  if (!req.is('application/json')) {
    res.send(400, 'Request must be made with JSON');
    return;
  }

  console.log('indexing request body:');
  console.dir(req.body);
  indexVideoMetadata(req.body, function(err, id) {
    if (err) {
      res.send(500, 'Failed to index video metadata into ElasticSearch:' + err);
      return;
    }
    res.json({
      'uploadID': id
    });
    console.log('Upload ID: ' + id);

    //var videoFileExtension = getFileExtension(req.body.fileName);
    //var videoFilePath = getFilePath(id, videoFileExtension);
    //setVideoPath(videoFilePath, id, function(err) {
    //  if (err) {
    //    res.send(500, 'Failed to set video file path');
    //    return;
    //  }

    //  res.json({
    //    'uploadID': id
    //  });
    //});
  });
});

app.put('/api/uploadvideo', function(req, res) {
  var id = req.query.uploadID;
  if (!id) {
    res.send(400, 'uploadID is required');
    return;
  }

  console.log('Uploaded files:');
  console.dir(req.files);
  console.log('Body:');
  console.log(req.body);
  var filePath = req.files.video.path;
  setVideoPath(filePath, id, function(err) {
    if (err) {
      res.send(500, 'Could not save file path: ' + err);
      // TODO delete the file path if we aren't using it
    }
  });
});

// Stores metadata in ElasticSearch and passes the ID of the video to callback.
function indexVideoMetadata(metadata, callback) {
  if (!metadata) {
    callback(new Error('metadata is undefined'));
    return;
  }

  var url = util.format(
    'http://%s:%s/%s/%s',
    config.elasticsearch.host,
    config.elasticsearch.port,
    config.elasticsearch.index,
    config.elasticsearch.videoType
  );

  request({
    'url': url,
    method: 'POST',
    json: metadata
  }, function onElasticSearchResponse(err, res, resBody) {
    if (err) {
      callback(err);
    } else {
      // Send the callback the ID of the new video - this is the upload ID
      console.log('ElasticSearch response:');
      console.log(resBody);
      callback(null, resBody._id);
    }
  });
}

// Updates the metadata for a video to point to the specified path.
function setVideoPath(path, id, callback) {
  if (!path || !id) {
    callback(new Error('path or id were undefined'));
    return;
  }

  var url = util.format(
    'http://%s:%s/%s/%s/%s/_update',
    config.elasticsearch.host,
    config.elasticsearch.port,
    config.elasticsearch.index,
    config.elasticsearch.videoType,
    id
  );

  var reqBody = {
    'script': 'ctx._source.path = ' + path
  };

  request({
    'url': url,
    method: 'POST',
    json: reqBody
  }, function onESUpdateResponse(err, res, resBody) {
    if (err) {
      callback(err);
    } else {
      callback();
    }
  });
}

// Queries ElasticSearch for a particular document ID and calls callback with an
// error or the designated file path.
function getStoragePath(id, callback) {
  if (!id) {
    callback(new Error('id must not be undefined'));
    return;
  }

  var url = util.format(
    'http://%s:%s/%s/%s/%s',
    config.elasticsearch.host,
    config.elasticsearch.port,
    config.elasticsearch.index,
    config.elasticsearch.videoType,
    id
  );

  request({
    'url': url,
    method: 'GET'
  }, function onESGetResponse(err, data) {
    if (err) {
      callback(err);
      return;
    }

    callback(null, data._source.path);
  });
}

//function getFilePath(id, extension) {
//  return util.format('%s%s.%s',
//                     config.videoStorage.pathPrefix,
//                     id,
//                     extension);
//}
//
//function getFileExtension(fileName) {
//  // TODO
//  throw new Error('Not implemented');
//}

app.listen(config.webserver.port, config.webserver.host);
