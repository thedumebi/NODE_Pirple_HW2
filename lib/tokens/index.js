/**
 * Token handlers
 *
 */

// Dependencies
const helpers = require("../helpers");
const _data = require("../data");
const util = require("util");
const debug = util.debuglog("handlers");

// Tokens Container
const tokens = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    _tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the tokens submethods
const _tokens = {};

// Tokens - post
// Required data: email, password
// Optional data: none
_tokens.post = (data, callback) => {
  // Check that the required fields are filled out
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    RegExp(
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    ).test(data.payload.email.trim())
      ? data.payload.email.trim()
      : false;
  const password =
    typeof data.payload.password === "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  if (email && password) {
    // Lookup user
    _data.read("users", email, (err, userData) => {
      if (!err && userData) {
        // Hash password and compare it
        const hashedPassword = helpers.hash(password);
        if (hashedPassword === userData.hashedPassword) {
          // create a new token with expiration date 2 hours in future
          const tokenId = helpers.createRandomString(60);
          const expires = Date.now() + 1000 * 60 * 60 * 2;
          const tokenObject = {
            email,
            id: tokenId,
            expires,
          };

          // Store the token
          _data.create("tokens", tokenId, tokenObject, (err) => {
            if (!err) callback(200, tokenObject);
            else callback(500, { Error: "Could not create the token" });
          });
        } else {
          callback(400, {
            Error:
              "Password did not match the specified user's stored password",
          });
        }
      } else {
        callback(404, { Error: "Could not find the specified user" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
_tokens.get = (data, callback) => {
  // Check that the id is valid
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 60
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // Lookup the token
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404, { Error: "Token not found" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
_tokens.put = (data, callback) => {
  const id =
    typeof data.payload.id === "string" && data.payload.id.trim().length === 60
      ? data.payload.id.trim()
      : false;
  const extend =
    typeof data.payload.extend === "boolean" && data.payload.extend === true
      ? data.payload.extend
      : false;

  if (id && extend) {
    // Lookup token
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        // Check to see token hasn't expired
        if (tokenData.expires > Date.now()) {
          // Set expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updates
          _data.update("tokens", id, tokenData, (err) => {
            if (!err) callback(200);
            else {
              debug(err);
              callback(500, {
                Error: "Could not update the token's expiration",
              });
            }
          });
        } else {
          callback(400, {
            Error: "The token has already expired and cannot be extended",
          });
        }
      } else {
        callback(404, { Error: "Specified token does not exist" });
      }
    });
  } else {
    callback(400, {
      Error: "Missing required field(s) or field(s) are invalid",
    });
  }
};

// Tokens - delete
// Required data: id
_tokens.delete = (data, callback) => {
  // Check that id is valid
  const id =
    typeof data.queryStringObject.id === "string" &&
    data.queryStringObject.id.trim().length === 60
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // lookup token
    _data.read("tokens", id, (err, tokenData) => {
      if (!err && tokenData) {
        _data.delete("tokens", id, (err) => {
          if (!err) callback(200);
          else {
            debug(err);
            callback(500, { Error: "Could not delete the specified token" });
          }
        });
      } else {
        callback(404, { Error: "Specified token does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Verify a token
_tokens.verifyToken = (id, email, callback) => {
  // Lookup token
  _data.read("tokens", id, (err, tokenData) => {
    if (!err && tokenData) {
      // Check that token is for a given user and has not expired
      if (tokenData.email === email && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

module.exports = {
  tokens,
  _tokens,
};
