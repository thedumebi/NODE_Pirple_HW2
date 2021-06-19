/**
 * Helpers for varios tasks
 */

// Dependencies
const crypto = require("crypto");
const config = require("./config");
const path = require("path");
const fs = require("fs");

// Container for all the helpers
var helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
  if (typeof str === "string" && str.length > 0) {
    const hash = crypto
      .createHmac("sha256", config.hashingSecret)
      .update(str)
      .digest("hex");
    return hash;
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all cases without throwing
helpers.parseJsonToObject = (str) => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (e) {
    return {};
  }
};

// Create token string of given length
helpers.createRandomString = (strLength) => {
  strLength =
    typeof strLength === "number" && strLength > 0 ? strLength : false;
  if (strLength) {
    // Define all possible characters that could go into a string
    const possibleCharacters =
      "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Start the final string
    var str = "";
    for (i = 1; i <= strLength; i++) {
      // Get a random character
      const randomCharacter = possibleCharacters.charAt(
        Math.floor(Math.random() * possibleCharacters.length)
      );

      // Append the character to the string
      str += randomCharacter;
    }

    // Return the final string
    return str;
  } else {
    return false;
  }
};

// Get the string content of a template
helpers.getTemplate = (templateName, data, callback) => {
  templateName =
    typeof templateName === "string" && templateName.trim().length > 0
      ? templateName
      : false;
  data = typeof data === "object" && data !== null ? data : {};

  if (templateName) {
    const templateDir = path.join(__dirname, "..", "/templates/");
    fs.readFile(templateDir + templateName + ".html", "utf8", (err, str) => {
      if (!err && str && str.length > 0) {
        // Do the interpolation on the string
        const finalString = helpers.interpolate(str, data);
        callback(false, finalString);
      } else {
        callback("No template could be found");
      }
    });
  } else {
    callback("A valid template name wasn't specified");
  }
};

// Add the universal header and footer to a string and pass provided data object to header and footer for interpolation
helpers.addUniversalTemplates = (str, data, callback) => {
  str = typeof str === "string" && str.trim().length > 0 ? str : "";
  data = typeof data === "object" && data !== null ? data : {};
  // Get header
  helpers.getTemplate("_header", data, (err, headerStr) => {
    if (!err && headerStr) {
      // Get footer
      helpers.getTemplate("_footer", data, (err, footerStr) => {
        if (!err && footerStr) {
          // Add them all
          const fullString = `${headerStr}${str}${footerStr}`;
          callback(false, fullString);
        } else {
          callback("Could not find the footer template");
        }
      });
    } else {
      callback("Could not find the header template");
    }
  });
};

// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = (str, data) => {
  str = typeof str === "string" && str.trim().length > 0 ? str : "";
  data = typeof data === "object" && data !== null ? data : {};

  // Add the templateGlobals to the data objects, prepending their key name with global
  for (const keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data[`global.${keyName}`] = config.templateGlobals[keyName];
    }
  }

  // For each key in the data object, insert its value into the string at the corresponding placeholder
  for (const key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] === "string") {
      const replace = data[key];
      const find = `{${key}}`;
      str = str.replace(find, replace);
    }
  }

  return str;
};

// Get the contents pf a static (public) asset
helpers.getStaticAsset = (fileName, callback) => {
  fileName =
    typeof fileName === "string" && fileName.length > 0 ? fileName : false;

  if (fileName) {
    const publicDir = path.join(__dirname, "..", "/public/");
    fs.readFile(`${publicDir}${fileName}`, (err, data) => {
      if (!err && data) {
        callback(false, data);
      } else {
        callback("No file could be found");
      }
    });
  } else {
    callback("A valid file name was not specified");
  }
};

// Export the module
module.exports = helpers;
