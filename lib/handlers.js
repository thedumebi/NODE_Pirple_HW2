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
const frontendHandlers = require("./frontend");

// Define the handlers
const handlers = {
  ...userHandlers,
  ...tokenHandlers,
  ...menuHandlers,
  ...orderHandlers,
  ...cartHandlers,
  ...frontendHandlers,
};

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

// Export the module
module.exports = handlers;
