/*
 * Server related tasks
 *
 */

// Dependencies
const http = require("http");
const https = require("https");
const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const fs = require("fs");
const path = require("path");
const util = require("util");
const debug = util.debuglog("server");
const handlers = require("./handlers");
const helpers = require("./helpers");

// Instantiate a server module object
const server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, "..", "/https/key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "..", "/https/cert.pem")),
};

server.httpsServer = https.createServer(
  server.httpsServerOptions,
  (req, res) => {
    server.unifiedServer(req, res);
  }
);

// Server Logic for http and https server
server.unifiedServer = (req, res) => {
  // Get the url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path from the url
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the HTTP Method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload if any
  const decoder = new StringDecoder("utf-8");
  var buffer = "";

  req.on("data", (data) => {
    buffer += decoder.write(data);
  });

  req.on("end", () => {
    buffer += decoder.end();

    // Choose the handler the request should go to.

    let chosenHandler =
      typeof server.router[trimmedPath] !== "undefined"
        ? server.router[trimmedPath]
        : handlers.notFound;

    // If the request is within the public directory, use the public handler instead
    chosenHandler =
      trimmedPath.indexOf("public/") > -1 ? handlers.public : chosenHandler;

    // Construct data to each handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer),
    };

    // Route the request to the handler specified
    chosenHandler(data, (statusCode, payload, contentType) => {
      // Determine the type of response (fallback to JSON)
      contentType = typeof contentType === "string" ? contentType : "json";

      // Use the status code called back by the handler, or default to 200
      statusCode = typeof statusCode === "number" ? statusCode : 200;

      // Return thhe response parts that are content specific
      var payloadString = "";

      if (contentType === "json") {
        res.setHeader("Content-Type", "application/json");
        // Use the payload called back by the handler, or default to an empty object
        payload = typeof payload === "object" ? payload : {};
        // Convert the payload to a string
        payloadString = JSON.stringify(payload);
      }
      if (contentType === "html") {
        res.setHeader("Content-Type", "text/html");
        payloadString = typeof payload === "string" ? payload : "";
      }
      if (contentType === "favicon") {
        res.setHeader("Content-Type", "image/x-icon");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }
      if (contentType === "css") {
        res.setHeader("Content-Type", "text/css");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }
      if (contentType === "png") {
        res.setHeader("Content-Type", "image/png");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }
      if (contentType === "jpg") {
        res.setHeader("Content-Type", "image/jpeg");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }
      if (contentType === "plain") {
        res.setHeader("Content-Type", "text/plain");
        payloadString = typeof payload !== "undefined" ? payload : "";
      }

      // Return the response part common to all content-types
      res.writeHead(statusCode);
      res.end(payloadString);

      // If the response is 200, print green otherwise print red
      if (statusCode === 200) {
        debug(
          "\x1b[32m%s\x1b[0m",
          method.toUpperCase() + " /" + trimmedPath + " " + statusCode
        );
      } else {
        debug(
          "\x1b[31m%s\x1b[0m",
          method.toUpperCase() + " /" + trimmedPath + " " + statusCode
        );
      }
    });
  });
};

// Define a request router
server.router = {
  "": handlers.index,
  "account/create": handlers.accountCreate,
  "account/edit": handlers.accountEdit,
  "account/deleted": handlers.accountDeleted,
  "pizza/list": handlers.pizzaList,
  "pizza/cart": handlers.cartFill,
  "pizza/order": handlers.pizzaOrder,
  "session/create": handlers.sessionCreate,
  "session/deleted": handlers.sessionDeleted,
  "favicon.ico": handlers.favicon,
  public: handlers.public,
  "api/users": handlers.users,
  "api/tokens": handlers.tokens,
  "api/menu": handlers.menu,
  "api/orders": handlers.orders,
  "api/carts": handlers.carts,
};

// Init script
server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log(
      "\x1b[41m\x1b[33m%s\x1b[0m",
      `Server is listening on port ${config.httpPort} in ${config.envName} mode`
    );
  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log(
      "\x1b[41m\x1b[32m%s\x1b[0m",
      `Server is listening on port ${config.httpsPort} in ${config.envName} mode`
    );
  });
};

// Export the module
module.exports = server;
