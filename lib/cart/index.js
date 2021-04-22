/**
 * Shopping cart handlers
 *
 */

// Dependencies
const helpers = require("../helpers");
const _data = require("../data");
const util = require("util");
const debug = util.debuglog("handlers");
const { _tokens } = require("../tokens");
const { _users } = require("../users");
const { _menu } = require("../menu");

// Cart Container
const carts = (data, callback) => {
  const acceptableMethods = ["post", "get", "put", "delete"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    _carts[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the carts submethods
const _carts = {};

// Carts - post
// Required data: email
// Optional data: items
_carts.post = (data, callback) => {
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    _users.isValidEmail(data.payload.email)
      ? data.payload.email.trim()
      : false;

  const items =
    typeof data.payload.items === "object" &&
    data.payload.items instanceof Array &&
    data.payload.items.length > 0
      ? data.payload.items
      : false;

  if (email) {
    // Get token from the headers
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // Verify that token is valid for the given email
    _tokens.verifyToken(token, email, (tokenIsValid) => {
      if (tokenIsValid) {
        //   Lookup user
        _data.read("users", email, (err, userData) => {
          if (!err && userData) {
            // Create the shopping cart
            const cartId = helpers.createRandomString(20);
            const shoppingCart = {
              id: cartId,
              email: userData.email,
              items: [],
            };
            if (items) {
              items.forEach((item) => {
                // Check if item is valid
                if (
                  item.code &&
                  item.price &&
                  item.quantity >= 1 &&
                  _menu.isValidMenuItem(item.code)
                ) {
                  shoppingCart.items.push(item.id);
                } else {
                  debug(
                    `Error: Item with code ${item.code} was not added to the shopping cart. Either the code, or quantity is invalid`
                  );
                }
              });
            }

            // Store the cart
            _data.create("carts", cartId, shoppingCart, (err) => {
              if (!err) {
                // Add the cart to the user Object
                userData.cart = cartId;

                // Save the new user data
                _data.update("users", email, userData, (err) => {
                  if (!err) callback(200, shoppingCart);
                  else {
                    callback(500, {
                      Error: "Could not update the user with the new cart",
                    });
                  }
                });
              } else {
                callback(500, { Error: "Could not create the shopping cart" });
              }
            });
          } else {
            callback(404, { error: "Could not find the specified user" });
          }
        });
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Carts - get
// Required data: id
// Optional data: none
_carts.get = (data, callback) => {
  // Check that the id is valid
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // Lookup the cart
    _data.read("carts", id, (err, cartData) => {
      if (!err && cartData) {
        // Get token from headers
        const token =
          typeof data.headers.token === "string" ? data.headers.token : false;

        // Verify thet the given token is valid and belongs to the user who created the check
        _tokens.verifyToken(token, cartData.email, (tokenIsValid) => {
          if (tokenIsValid) {
            // Return the cart data
            callback(200, cartData);
          } else {
            callback(403, {
              Error: "Missing required token in header, or token is invalid",
            });
          }
        });
      } else {
        callback(404, { Error: "Shopping Cart requested for deos not exist" });
      }
    });
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Carts - put
// Required data: id
// Optional data: items
_carts.put = (data, callback) => {
  const id =
    typeof data.payload.id === "string" && data.payload.id.trim().length === 20
      ? data.payload.id.trim()
      : false;

  const items =
    typeof data.payload.items === "object" &&
    data.payload.items instanceof Array &&
    data.payload.items.length > 0
      ? data.payload.items
      : false;

  if (id) {
    // Check to see that there's something to update
    if (items) {
      // Lookup cart
      _data.read("carts", id, (err, cartData) => {
        if (!err && cartData) {
          // Get token from headers
          const token =
            typeof data.headers.token === "string" ? data.headers.token : false;

          // Verify thet the given token is valid and belongs to the user who created the check
          _tokens.verifyToken(token, cartData.email, (tokenIsValid) => {
            if (tokenIsValid) {
              cartData.items = [];
              items.forEach((item) => {
                // Check to see if item is valid
                if (
                  item.code &&
                  item.quantity >= 1 &&
                  _menu.isValidMenuItem(item.code)
                ) {
                  cartData.items.push(item);
                } else {
                  debug(
                    `Item with code ${item.code} could not be added to the shopping cart`
                  );
                }
              });

              // Store the updates
              _data.update("carts", id, cartData, (err) => {
                if (!err) callback(200, cartData);
                else callback(500, { Error: "Could not update cart" });
              });
            } else {
              callback(403, {
                Error: "Missing required token in header, or token is invalid",
              });
            }
          });
        } else {
          callback(404, { Error: "Requested cart does not exist" });
        }
      });
    } else {
      callback(400, { Error: "Missing fields to update" });
    }
  } else {
    callback(400, { Error: "Missing required field" });
  }
};

// Carts - delete
// Required data: id
_carts.delete = (data, callback) => {
  // Check that the id is valid
  const id =
    typeof data.queryStringObject.id == "string" &&
    data.queryStringObject.id.trim().length == 20
      ? data.queryStringObject.id.trim()
      : false;

  if (id) {
    // Lookup cart
    _data.read("carts", id, (err, cartData) => {
      if (!err && cartData) {
        // Get the token
        const token =
          typeof data.headers.token === "string" ? data.headers.token : false;

        // Verify token
        _tokens.verifyToken(token, cartData.email, (tokenIsValid) => {
          if (tokenIsValid) {
            // Delete cart data
            _data.delete("carts", id, (err) => {
              if (!err) {
                const orders =
                  typeof cartData.items === "object" &&
                  cartData.items instanceof Array
                    ? cartData.items
                    : [];

                if (orders.length > 0) {
                  var ordersDeleted = 0;
                  var deletionErrors = false;
                  // Loop through the orders
                  orders.forEach((orderId) => {
                    // Delete the order
                    _data.delete("orders", orderId, (err) => {
                      if (err) {
                        deletionErrors = true;
                      }
                      ordersDeleted++;
                      if (ordersDeleted === orders.length) {
                        if (!deletionErrors) {
                          _data.read(
                            "users",
                            cartData.email,
                            (err, userData) => {
                              if (!err && userData) {
                                delete userData.cart;
                                // update user data
                                _data.update(
                                  "users",
                                  cartData.email,
                                  userData,
                                  (err) => {
                                    if (!err) callback(200);
                                    else
                                      callback(500, {
                                        Error:
                                          "Failed to update user after deleting user cart",
                                      });
                                  }
                                );
                              } else {
                                callback(404, {
                                  Error: "Owner of Cart not found",
                                });
                              }
                            }
                          );
                        } else {
                          callback(500, {
                            Error:
                              "Errors encountered while attempting to delete all the cart items",
                          });
                        }
                      }
                    });
                  });
                } else {
                  // Delete cart from user
                  _data.read("users", cartData.email, (err, userData) => {
                    if (!err && userData) {
                      delete userData.cart;
                      // update user data
                      _data.update("users", cartData.email, userData, (err) => {
                        if (!err) callback(200);
                        else
                          callback(500, {
                            Error:
                              "Failed to update user after deleting user cart",
                          });
                      });
                    } else {
                      callback(404, { Error: "Owner of Cart not found" });
                    }
                  });
                }
              } else
                [
                  callback(500, {
                    Error: "Could not delete the requested cart data",
                  }),
                ];
            });
          } else {
            callback(403, {
              Error: "Missin required token in header, or token is invalid",
            });
          }
        });
      } else {
        callback(404, { Error: "Requested Cart does not exist" });
      }
    });
  } else {
    callback(400, { Error: "Midding required field" });
  }
};

// get a shopping cart
_carts.getCart = (id, callback) => {
  _data.read("carts", id, (err, cartData) => {
    if (!err && cartData) {
      callback(false, cartData);
    } else {
      callback(err);
    }
  });
};

// calculate a cart total
_carts.calculateTotal = (cartId, callback) => {
  _carts.getCart(cartId, (err, cartData) => {
    if (!err && cartData) {
      let totalAmount = 0;
      cartData.items.forEach((item) => {
        if (_menu.isValidMenuItem(item.code)) {
          totalAmount += item.quantity * item.price;
        }
      });

      // Multiply by 100 because stripe accepts charge amount in cents
      callback(false, totalAmount * 100);
    } else {
      callback(err);
    }
  });
};

// export module
module.exports = {
  carts,
  _carts,
};
