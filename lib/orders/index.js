/**
 * Order handlers
 *
 */

// Dependencies
const helpers = require("../helpers");
const _data = require("../data");
const util = require("util");
const debug = util.debuglog("handlers");
const { _tokens } = require("../tokens");
const menu = require("../menu/menu");

// Orders Container
const orders = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    _orders[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the orders submethods
const _orders = {};

// Orders - post
// Required data: name, quantity, email
// Optional data: none
_orders.post = (data, callback) => {
  // Check that all the required fields are filled out
  const name =
    typeof data.payload.name === "string" &&
    data.payload.name.trim().length > 0 &&
    menu.find((el) => el.name === data.payload.name.trim())
      ? data.payload.name.trim()
      : false;
  const quantity =
    typeof data.payload.quantity === "number" && data.payload.quantity >= 1
      ? data.payload.quantity
      : false;
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    RegExp(
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    ).test(data.payload.email.trim())
      ? data.payload.email.trim()
      : false;

  if (name && quantity && email) {
    // Get token from the headers
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // Verify that token is valid for the given email
    _tokens.verifyToken(token, email, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup user
        _data.read("users", email, (err, userData) => {
          if (!err && userData) {
            // Create the order
            const orderId = helpers.createRandomString(20);
            const orderObject = {
              id: orderId,
              email: userData.email,
              deliveryAddress: userData.address,
              itemName: name,
              itemQuantity: quantity,
            };

            // Store the order
            _data.create("orders", orderId, orderObject, (err) => {
              if (!err) callback(200, orderObject);
              else callback(500, { Error: "Could not create the order" });
            });
          } else {
            callback(404, { Error: "Could not find the specified user" });
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

// Order - get
// Required data: id
// Optional data: none
_orders.get = (data, callback) => {
  // Check that the id is valid
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // Lookup the order
    _data.read("orders", id, (err, orderData) => {
      if (!err && orderData) {
        // Get token from headers
        const token =
          typeof data.headers.token === "string" ? data.headers.token : false;

        // Verify thet the given token is valid and belongs to the user who created the check
        _tokens.verifyToken(token, orderData.email, (tokenIsValid) => {
          if (tokenIsValid) {
            // Return the order data
            callback(200, orderData);
          } else {
            callback(403, {
              Error: "Missing required token in header, or token is invalid",
            });
          }
        });
      } else {
        callback(404, { Error: "Order not found" });
      }
    });
  } else {
    callback(400, { Error: "Missing required fields" });
  }
};

module.exports = {
  orders,
  _orders,
};
