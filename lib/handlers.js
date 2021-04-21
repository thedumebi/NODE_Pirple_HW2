/**
 * Request handlers
 *
 */

// Dependencies
const helpers = require("./helpers");
const config = require("./config");
const _data = require("./data");
const util = require("util");
const debug = util.debuglog("handlers");

// Define the handlers
const handlers = {};

// Users Container
handlers.users = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users submethods
handlers._users = {};

// Users - post
// Required data: firstName, lastName, email, address, password, tosAgrement
// Optional data: none
handlers._users.post = (data, callback) => {
  debug(data.payload);
  // Check that all the required fields are filled out
  const firstName =
    typeof data.payload.firstName === "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName === "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    RegExp(
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    ).test(data.payload.email.trim())
      ? data.payload.email.trim()
      : false;
  const address =
    typeof data.payload.address === "string" &&
    data.payload.address.trim().length > 0
      ? data.payload.address.trim()
      : false;
  const password =
    typeof data.payload.password === "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;
  const tosAgreement =
    typeof data.payload.tosAgreement === "boolean" &&
    data.payload.tosAgreement === true
      ? true
      : false;

  if (firstName && lastName && email && address && password && tosAgreement) {
    // Make sure that the user does not already exist
    _data.read("users", email, (err, data) => {
      if (err) {
        // Hash the password
        const hashedPassword = helpers.hash(password);

        // Create the user object
        if (hashedPassword) {
          const userObject = {
            firstName,
            lastName,
            email,
            address,
            hashedPassword,
            tosAgreement,
          };

          // Store the user
          _data.create("users", email, userObject, (err) => {
            if (!err) {
              callback(200);
            } else {
              debug(err);
              callback(500, { Error: "Could not create the new user" });
            }
          });
        }
      } else {
        // User exists
        callback(400, {
          Error: "A user with that email address already exists",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Users - get
// Required data: email
// Optional data: none
handlers._users.get = (data, callback) => {
  // Check that the email is valid
  const email =
    typeof data.queryStringObject.email === "string" &&
    data.queryStringObject.email.trim().length > 0 &&
    RegExp(
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    ).test(data.queryStringObject.email.trim())
      ? data.queryStringObject.email.trim()
      : false;

  if (email) {
    // Get the token from the headers
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // Verify that the token is valid for the given number
    handlers._tokens.verifyToken(token, email, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read("users", email, (err, data) => {
          if (!err && data) {
            // Remove th hashed password from user object
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

// Users - put
// Required data: email
// Optional data: firstName, lastName, password, address
handlers._users.put = (data, callback) => {
  // Check for the required field
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    RegExp(
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    ).test(data.payload.email.trim())
      ? data.payload.email.trim()
      : false;

  // Check for the optional fields
  const firstName =
    typeof data.payload.firstName === "string" &&
    data.payload.firstName.trim().length > 0
      ? data.payload.firstName.trim()
      : false;
  const lastName =
    typeof data.payload.lastName === "string" &&
    data.payload.lastName.trim().length > 0
      ? data.payload.lastName.trim()
      : false;
  const address =
    typeof data.payload.address === "string" &&
    data.payload.address.trim().length > 0
      ? data.payload.address.trim()
      : false;
  const password =
    typeof data.payload.password === "string" &&
    data.payload.password.trim().length > 0
      ? data.payload.password.trim()
      : false;

  // Error if email is invalid
  if (email) {
    // Error if nothing is sent to update
    if (firstName || lastName || address || password) {
      //Get token from header
      const token =
        typeof data.headers.token === "string" ? data.headers.token : false;

      // Verify token
      handlers._tokens.verifyToken(token, email, (tokenIsValid) => {
        if (tokenIsValid) {
          // Look up the user
          _data.read("users", email, (err, userData) => {
            if (!err && userData) {
              // Update the fields neccesary
              if (firstName) userData.firstName = firstName;
              if (lastName) userData.lastName = lastName;
              if (password) userData.hashedPassword = helpers.hash(password);

              // Store the new updates
              _data.update("users", email, userData, (err) => {
                if (!err) {
                  callback(200);
                } else {
                  debug(err);
                  callback(500, { Error: "Could not update the user" });
                }
              });
            } else {
              callback(400, { Error: "The specified user does not exist" });
            }
          });
        } else {
          callback(403, {
            Error: "Missing required token in header or token is invalid",
          });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Users - delete
// Required field: email
handlers._users.delete = (data, callback) => {
  // Check that the email is valid
  const email =
    typeof data.queryStringObject.email === "string" &&
    data.queryStringObject.email.trim().length > 0 &&
    RegExp(
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    ).test(data.queryStringObject.email.trim())
      ? data.queryStringObject.email.trim()
      : false;

  if (email) {
    // Get the token from the headers
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // Verify token
    handlers._tokens.verifyToken(token, email, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup user
        _data.read("users", email, (err, userData) => {
          if (!err && userData) {
            _data.delete("users", email, (err) => {
              if (!err) {
                // Delete users tokens
                _data.delete("tokens", token, (err) => {
                  if (!err) callback(200);
                  else
                    callback(500, {
                      Error:
                        "Error encountered while trying to delete user token",
                    });
                });
              } else {
                callback(500, { Error: "Could not delete the specified user" });
              }
            });
          } else {
            callback(404, { Error: "The requested user does not exist" });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in headers, or token is invalid",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Tokens Container
handlers.tokens = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the tokens submethods
handlers._tokens = {};

// Tokens - post
// Required data: email, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
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
handlers._tokens.get = (data, callback) => {
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
handlers._tokens.put = (data, callback) => {
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
handlers._tokens.delete = (data, callback) => {
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
handlers._tokens.verifyToken = (id, email, callback) => {
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

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Export the module
module.exports = handlers;
