/**
 * Menu handlers
 *
 */

// Dependencies
const { _tokens } = require("../tokens");
const menuItems = require("./menu");

// Menu Container
const menu = (data, callback) => {
  if (data.method === "get") {
    _menu[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for the menu submethods
const _menu = {};

// Menu - get
// Required data: email
// Optional data: none
_menu.get = (data, callback) => {
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
    // Get token from the headers
    const token =
      typeof data.headers.token === "string" ? data.headers.token : false;

    // Verify that token is valid for the given email
    _tokens.verifyToken(token, email, (tokenIsValid) => {
      if (tokenIsValid) {
        callback(200, menuItems);
      } else {
        callback(403, {
          Error: "Missing required token in header, or token is invalid",
        });
      }
    });
  } else {
    callback(400, { Error: "Missing required email field" });
  }
};

// Validate if item is on the menu
_menu.isValidMenuItem = (code) => {
  const menuItem = menuItems.find((item) => item.code === code);
  return menuItem !== undefined;
};

// Get menu item price
_menu.getItemPrice = (code) => {
  const menuItem = menuItems.find((item) => item.code === code);
  return menuItem.price;
};

module.exports = {
  menu,
  _menu,
};
