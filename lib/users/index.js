/**
 * User handlers
 *
 */

// Dependencies
const helpers = require("../helpers");
const _data = require("../data");
const util = require("util");
const debug = util.debuglog("handlers");
const { _tokens } = require("../tokens");

// Users Container
const users = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    _users[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the users submethods
const _users = {};

// Users - post
// Required data: firstName, lastName, email, address, password, tosAgrement
// Optional data: none
_users.post = (data, callback) => {
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
    _users.isValidEmail(data.payload.email)
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
_users.get = (data, callback) => {
  // Check that the email is valid
  const email =
    typeof data.queryStringObject.email === "string" &&
    data.queryStringObject.email.trim().length > 0 &&
    _users.isValidEmail(data.queryStringObject.email)
      ? data.queryStringObject.email.trim()
      : false;

  if (email) {
    // Get the token from the headers
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // Verify that the token is valid for the given email
    _tokens.verifyToken(token, email, (tokenIsValid) => {
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
_users.put = (data, callback) => {
  // Check for the required field
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    _users.isValidEmail(data.payload.email)
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
      _tokens.verifyToken(token, email, (tokenIsValid) => {
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
_users.delete = (data, callback) => {
  // Check that the email is valid
  const email =
    typeof data.queryStringObject.email === "string" &&
    data.queryStringObject.email.trim().length > 0 &&
    _users.isValidEmail(data.queryStringObject.email)
      ? data.queryStringObject.email.trim()
      : false;

  if (email) {
    // Get the token from the headers
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // Verify token
    _tokens.verifyToken(token, email, (tokenIsValid) => {
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

// Check for valid email
_users.isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  return emailRegex.test(email.trim());
};

// export module
module.exports = {
  users,
  _users,
};
