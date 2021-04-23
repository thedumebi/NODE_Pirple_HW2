/*
 *  Client library to send mails using mailgun
 *
 */

// Dependencies
const https = require("https");
const querystring = require("querystring");
const config = require("./config");
const helpers = require("./helpers");
const util = require("util");
const debug = util.debuglog("handlers");

const mailgun = {};

mailgun.sendMail = function (toEmail, subject, mailText, callback) {
  const payload = {
    from: config.mailgun.from,
    to: toEmail,
    subject: subject,
    bcc: config.mailgun.from,
    text: mailText,
  };

  const stringPayload = querystring.stringify(payload);

  const requestDetails = {
    protocol: "https:",
    hostname: "api.mailgun.net",
    method: "post",
    path: "/v3/sandbox9cbaec82702046a7b8cebfed1e378a8f.mailgun.org/messages",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(stringPayload),
      Authorization:
        "Basic " +
        Buffer.from("api:" + config.mailgun.apikey, "utf8").toString("base64"),
    },
  };

  const req = https.request(requestDetails, function (res) {
    // Grab the status of the send request
    const status = res.statusCode;
    var responseString = "";

    res.on("data", function (data) {
      responseString += data;
      // save all the data from response
    });

    res.on("end", function () {
      const mailgunPayload = helpers.parseJsonToObject(responseString);
      // debug({ mailgunPayload });
      if (status === 200 || status === 201) {
        callback(false, mailgunPayload);
      } else {
        callback("Status code returned was " + status);
      }
    });
  });

  //Bind to the err event so it doesn't get thrown
  req.on("error", function (e) {
    callback(e);
  });

  req.write(stringPayload);
  req.end();
};

module.exports = mailgun;
