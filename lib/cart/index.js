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
// Optional data: code, quantity
_carts.post = (data, callback) => {
  // Check that required field is filled
  const email =
    typeof data.payload.email === "string" &&
    data.payload.email.trim().length > 0 &&
    _users.isValidEmail(data.payload.email)
      ? data.payload.email.trim()
      : false;

  // Optional fields
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
  const items =
    typeof data.payload.items === "object" &&
    data.payload.items instanceof Array &&
    data.payload.items.length > 0
      ? data.payload.items
      : false;

  if (email && code && quantity) {
    // Get token from the headers
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // Verify that token is valid for the given email
    _tokens.verifyToken(token, email, (tokenIsValid) => {
      if (tokenIsValid) {
        //   Lookup user
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
              // Create the shopping cart
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

                  // Save new user data
                  _data.update("users", email, userData, (err) => {
                    if (err) {
                      callback(500, {
                        Error: "Could not update the user with the new cart",
                      });
                    }
                  });
                } else {
                  callback(500, {
                    Error: "Could not create a cart for the user",
                  });
                }
              });
            }

            const userCart = cart ?? cartId;

            if (_menu.isValidMenuItem(code)) {
              const order = {
                id: helpers.createRandomString(20),
                itemCode: code,
                quantity,
              };

              // Add item to user cart
              _data.read("carts", userCart, (err, cartData) => {
                if (!err && cartData) {
                  // Add order to cart
                  cartData.items.push(order);

                  // Save new cart data
                  _data.update("carts", userCart, cartData, (err) => {
                    if (!err) {
                      callback(200, cartData);
                    } else {
                      callback(500, {
                        Error: "Could not update te cart with the new item",
                      });
                    }
                  });
                } else {
                  callback(500, { Error: "Could not read user cart" });
                }
              });
            } else {
              callback(400, {
                Error: "No item found matches the provided code",
              });
            }
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
        if (_menu.isValidMenuItem(item.itemCode)) {
          const price = _menu.getItemPrice(item.itemCode);
          totalAmount += item.quantity * price;
        } else {
          callback("Invalid Item");
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
