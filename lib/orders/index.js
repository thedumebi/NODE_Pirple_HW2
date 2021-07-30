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
const { _carts } = require("../cart");
const stripe = require("../stripe");
const mailgun = require("../mailgun");

// Orders Container
const orders = (data, callback) => {
  const acceptableMethods = ["post", "get"];
  if (acceptableMethods.indexOf(data.method) > -1) {
    _orders[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the orders submethods
const _orders = {};

// Orders - post
// Required data: cartId, token
// Optional data: none
_orders.post = (data, callback) => {
  // Check that all the required fields are filled out
  const cartId =
    typeof data.payload.cartId === "string" &&
    data.payload.cartId.trim().length === 20
      ? data.payload.cartId.trim()
      : false;
  const paymentToken =
    typeof data.payload.token === "string" &&
    data.payload.token.trim().length > 0
      ? data.payload.token.trim()
      : false;

  if (cartId && paymentToken) {
    // Read the cart
    _data.read("carts", cartId, (err, cartData) => {
      if (!err && cartData) {
        // Get token from the headers
        const token =
          typeof data.headers.token === "string" ? data.headers.token : false;

        // Verify that token is valid for the given email
        _tokens.verifyToken(token, cartData.email, (tokenIsValid) => {
          if (tokenIsValid) {
            // Get cart total
            _carts.calculateTotal(cartId, (err, totalAmount) => {
              if (!err && totalAmount) {
                // Create order
                const orderId = helpers.createRandomString(20);
                const orderObject = {
                  id: orderId,
                  email: cartData.email,
                  cartId,
                  status: "payment pending",
                  amount: totalAmount / 100,
                };

                // Save order
                _data.create("orders", orderId, orderObject, (err) => {
                  if (!err) {
                    // Perform payment with Stripe
                    const description = `Your order with id ${orderId}`;
                    stripe.performPayment(
                      orderId,
                      totalAmount,
                      description,
                      paymentToken,
                      (err, stripeData) => {
                        if (!err && stripeData.paid) {
                          // Read order
                          _data.read("orders", orderId, (err, orderData) => {
                            if (!err && orderData) {
                              orderData.status = "paid";
                              orderData.stripeId = stripeData.id;
                              // Update
                              _data.update(
                                "orders",
                                orderId,
                                orderData,
                                (err) => {
                                  if (!err) {
                                    // Send an email using Mailgun
                                    const mailText = `The following item will be delivered for $${
                                      totalAmount / 100
                                    } \n ${JSON.stringify(cartData)}`;

                                    mailgun.sendMail(
                                      orderData.email,
                                      `Order ${orderId} receipt`,
                                      mailText,
                                      (err) => {
                                        if (!err) {
                                          // Empty user cart
                                          cartData.items = [];

                                          // Update cart
                                          _data.update(
                                            "carts",
                                            cartId,
                                            cartData,
                                            (err) => {
                                              if (!err) {
                                                callback(200);
                                              } else {
                                                callback(500, {
                                                  Error: "Could not empty user",
                                                });
                                              }
                                            }
                                          );
                                        } else {
                                          callback(500, {
                                            Error:
                                              "Could not send receipt to user",
                                          });
                                        }
                                      }
                                    );
                                  } else {
                                    callback(500, {
                                      Error: "Could not update order to paid",
                                    });
                                  }
                                }
                              );
                            } else {
                              callback(500, {
                                Error: "Could not read order data",
                              });
                            }
                          });
                        } else {
                          callback(500, {
                            Error: "Could not perform payment with stripe",
                          });
                        }
                      }
                    );
                  } else {
                    callback(500, { Error: "Error creating order item" });
                  }
                });
              } else {
                callback(500, {
                  Error: "An error occured while getting total amount of cart",
                });
              }
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
