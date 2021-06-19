/**
 * Frontend HTML handlers
 *
 */

// Dependencies
const helpers = require("../helpers");
const _data = require("../data");
const util = require("util");
const debug = util.debuglog("handlers");

const frontend = {};

// Public assets
frontend.public = (data, callback) => {
  // Reject any request that isn't a GET
  if (data.method === "get") {
    // Get the filename being requested
    const trimmedAssetName = data.trimmedPath.replace("public/", "");
    if (trimmedAssetName.length > 0) {
      // Read in the asset's data
      helpers.getStaticAsset(trimmedAssetName, (err, data) => {
        if (!err && data) {
          // Determine the content type (default to plain text)
          let contentType = "plain";

          if (trimmedAssetName.indexOf(".css") > -1) {
            contentType = "css";
          }
          if (trimmedAssetName.indexOf(".png") > -1) {
            contentType = "png";
          }
          if (trimmedAssetName.indexOf(".jpg") > -1) {
            contentType = "jpg";
          }
          if (trimmedAssetName.indexOf(".ico") > -1) {
            contentType = "favicon";
          }

          // Callback the data
          callback(200, data, contentType);
        } else {
          callback(404);
        }
      });
    } else {
      callback(404);
    }
  } else {
    callback(405);
  }
};

// Favicon
frontend.favicon = (data, callback) => {
  // Reject any request that isn't a GET
  if (data.method === "get") {
    // Read in the favicon's data
    helpers.getStaticAsset("favicon.ico", (err, data) => {
      if (!err && data) {
        // Callback the data
        callback(200, data, "favicon");
      } else {
        callback(404);
      }
    });
  } else {
    callback(405);
  }
};

// Index
frontend.index = (data, callback) => {
  // Request any request that isn't a GET
  if (data.method === "get") {
    // Prepare data for interpolation
    const templateData = {
      "head.title": "Pizza Delivery System",
      "head.description":
        "We offer fast delivery for any order you place. Once you pay, your order would be delivered instantly",
      "body.class": "index",
    };

    // Read in template as a string
    helpers.getTemplate("index", templateData, (err, str) => {
      if (!err && str) {
        helpers.addUniversalTemplates(str, templateData, (err, newStr) => {
          if (!err && newStr) {
            callback(200, newStr, "html");
          } else {
            callback(500, undefined, "html");
          }
        });
      } else {
        callback(500, undefined, "html");
      }
    });
  } else {
    callback(405, undefined, "html");
  }
};

module.exports = frontend;
