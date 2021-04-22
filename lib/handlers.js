/**
 * Request handlers
 *
 */

// Dependencies
const userHandlers = require("./users");
const tokenHandlers = require("./tokens");
const menuHandlers = require("./menu");
const orderHandlers = require("./orders");
const cartHandlers = require("./cart");

// Define the handlers
const handlers = {
  ...userHandlers,
  ...tokenHandlers,
  ...menuHandlers,
  ...orderHandlers,
  ...cartHandlers,
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Export the module
module.exports = handlers;
