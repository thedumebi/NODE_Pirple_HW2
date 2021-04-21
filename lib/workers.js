/**
 * Worker-related tasks
 *
 */

// Dependencies
const path = require("path");
const fs = require("fs");
const _data = require("./data");
const util = require("util");
const debug = util.debuglog("workers");

// instantiate the worker object
const workers = {};

// Lookup all tokens, get their data and send to a validator
workers.gatherTokens = () => {
  // List all the tokens
  _data.list("tokens", (err, tokens) => {
    if (!err && tokens && tokens.length > 0) {
      tokens.forEach((token) => {
        // Read in token data
        _data.read("tokens", token, (err, tokenData) => {
          if (!err && tokenData) {
            // Pass to token validator
            workers.validateToken(tokenData);
          } else {
            debug("Error reading one of the token data");
          }
        });
      });
    } else {
      debug("Error: could not find any tokens to process");
    }
  });
};

// Validate token and Delete if it has expired
workers.validateToken = (tokenData) => {
  tokenData =
    typeof tokenData === "object" && tokenData !== null ? tokenData : false;

  if (tokenData) {
    if (tokenData.expires < Date.now()) {
      _data.delete("tokens", tokenData.id, (err) => {
        if (!err) {
          debug("\x1b[32m%s\x1b[0m", "Expired token deleted successfully");
        } else {
          debug(
            "\x1b[31m%s\x1b[0m",
            "Error: One of the expired tokens sould not be deleted"
          );
        }
      });
    }
  } else {
    debug("Error: One of the tokens is not formatted.Skipping it.");
  }
};

// Timer to execute the token validate process
workers.validateTokenLoop = () => {
  setInterval(() => {
    workers.gatherTokens();
  }, 1000 * 60 * 60 * 2);
};

// Init script
workers.init = () => {
  console.log("\x1b[33m%s\x1b[0m", "Background workers are running");

  // Validate all tokens immediately
  workers.gatherTokens();

  // Call validate token loop so that checks continue to happen
  workers.validateTokenLoop();
};

// Export the module
module.exports = workers;
