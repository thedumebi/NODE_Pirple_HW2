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
const { _menu } = require("../menu");
const { _users } = require("../users");

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
// Required data: code, quantity, email
// Optional data: none
_orders.post = (data, callback) => {
  // Check that all the required fields are filled out
  const code =
    typeof data.payload.code === "number" &&
    data.payload.code > 0 &&
    _menu.isValidMenuItem(data.payload.code)
      ? data.payload.code
      : false;
  const quantity =
    typeof data.payload.quantity === "number" && data.payload.quantity >= 1
      ? data.payload.quantity
      : false;
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    _users.isValidEmail(data.payload.email)
      ? data.payload.email.trim()
      : false;

  if (code && quantity && email) {
    // Get token from the headers
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // Verify that token is valid for the given email
    _tokens.verifyToken(token, email, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup user
        _data.read("users", email, (err, userData) => {
          if (!err && userData) {
            // Check if user has a cart

            const cart =
              typeof userData.cart === "string" &&
              userData.cart.trim().length > 0
                ? userData.cart
                : null;
            const cartId = helpers.createRandomString(20);

            if (!cart) {
              const shoppingCart = {
                id: cartId,
                email: userData.email,
                items: [],
              };

              // Save the cart
              _data.create("carts", cartId, shoppingCart, (err) => {
                if (!err) {
                  // Add cart to user
                  userData.cart = cartId;

                  // Save the new user data
                  _data.update("users", email, userData, (err) => {
                    if (err)
                      callback(500, {
                        Error: "Could not update the user with the new cart",
                      });
                  });
                } else {
                  callback(500, {
                    Error: "Could not create a cart for the user",
                  });
                }
              });
            }
            const userCart = cart ?? cartId;
            debug("user cart: ", userCart);
            // Create the order
            const orderId = helpers.createRandomString(20);
            const orderObject = {
              id: orderId,
              email: userData.email,
              deliveryAddress: userData.address,
              itemCode: code,
              itemQuantity: quantity,
            };

            // Store the order
            _data.create("orders", orderId, orderObject, (err) => {
              if (!err) {
                // Add the order to the user's cart
                _data.read("carts", userCart, (err, cartData) => {
                  if (!err && cartData) {
                    // Add order to cart
                    cartData.items.push(orderId);

                    // Save new cart data
                    _data.update("carts", userCart, cartData, (err) => {
                      if (!err) {
                        callback(200, orderObject);
                      } else {
                        callback(500, {
                          Error: "Could not update the cart with the new order",
                        });
                      }
                    });
                  } else {
                    callback(500, { Error: "Could not add order to cart" });
                  }
                });
              } else {
                callback(500, { Error: "Could not create the order" });
              }
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
