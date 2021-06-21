/**
 *  Frontend Logic for the application
 *
 */

// Container for frontend application
var app = {};

// Config
app.config = {
  sessionToken: false,
};

// AJAX Client (for RESTful API)
app.client = {};

// Interface for making API calls
app.client.request = function (
  headers,
  path,
  method,
  queryStringObject,
  payload,
  callback
) {
  // Set defaults
  headers = typeof headers == "object" && headers !== null ? headers : {};
  path = typeof path == "string" ? path : "/";
  method =
    typeof method == "string" &&
    ["POST", "GET", "PUT", "DELETE"].indexOf(method.toUpperCase()) > -1
      ? method.toUpperCase()
      : "GET";
  queryStringObject =
    typeof queryStringObject == "object" && queryStringObject !== null
      ? queryStringObject
      : {};
  payload = typeof payload == "object" && payload !== null ? payload : {};
  callback = typeof callback == "function" ? callback : false;

  // For each query string parameter sent, add it to the path
  var requestUrl = path + "?";
  var counter = 0;
  for (var queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      counter++;
      // If at least one query string parameter has already been added, prepend new ones with an ampersand
      if (counter > 1) {
        requestUrl += "&";
      }
      // Add the key and value
      requestUrl += queryKey + "=" + queryStringObject[queryKey];
    }
  }

  // Form the http request as a JSON type
  var xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-Type", "application/json");

  // For each header sent, add it to the request
  for (var headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // If there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader("token", app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      var statusCode = xhr.status;
      var responseReturned = xhr.responseText;

      // Callback if requested
      if (callback) {
        try {
          var parsedResponse = JSON.parse(responseReturned);
          callback(statusCode, parsedResponse);
        } catch (e) {
          callback(statusCode, false);
        }
      }
    }
  };

  // Send the payload as JSON
  var payloadString = JSON.stringify(payload);
  xhr.send(payloadString);
};

// Bind the logout button
app.bindLogoutButton = function () {
  document
    .getElementById("logoutButton")
    .addEventListener("click", function (e) {
      // Stop it from redirecting anywhere
      e.preventDefault();

      // Log the user out
      app.logUserOut();
    });
};

// Log the uesr out then redirect them
app.logUserOut = function (redirectUser) {
  // Set redirectUser t0 default to true
  redirectUser = typeof redirectUser === "boolean" ? redirectUser : true;

  // Get current token id
  var tokenId =
    typeof app.config.sessionToken.id === "string"
      ? app.config.sessionToken.id
      : false;

  // Send the currnt token to the tokens endpoint to delete it
  var queryStringObject = {
    id: tokenId,
  };
  app.client.request(
    undefined,
    "api/tokens",
    "DELETE",
    queryStringObject,
    undefined,
    function (statusCode, responsePayload) {
      // Set the app.config token as false
      app.setSessionToken(false);

      // Send the user to te logged out page
      if (redirectUser) {
        window.location = "/session/deleted";
      }
    }
  );
};

// Bind the forms
app.bindForms = function () {
  if (document.querySelector("form")) {
    var bodyClasses = document.querySelector("body").classList;
    var primaryClass =
      typeof bodyClasses[0] === "string" ? bodyClasses[0] : false;
    var allForms = document.querySelectorAll("form");
    for (var i = 0; i < allForms.length; i++) {
      allForms[i].addEventListener("submit", function (e) {
        // Stop it from submitting
        e.preventDefault();
        var formId = this.id;
        var path = this.action;
        var method = this.method.toUpperCase();

        if (primaryClass === "pizzaOrder") formId = primaryClass;

        // Hide the error message (if it's currently shown due to a previous error)
        if (document.querySelector("#" + formId + " .formError")) {
          document.querySelector("#" + formId + " .formError").style.display =
            "none";
        }
        // Hide the success message (if it's currently shown due to a previous success)
        if (document.querySelector("#" + formId + " .formSuccess")) {
          document.querySelector("#" + formId + " .formSuccess").style.display =
            "none";
        }

        // Turn the inputs into a payload
        var payload = {};
        var elements = this.elements;
        for (var i = 0; i < elements.length; i++) {
          if (elements[i].type !== "submit") {
            // Determine the class of element and set value accordingly
            var classOfElement =
              typeof elements[i].classList.value === "string" &&
              elements[i].classList.value.length > 0
                ? elements[i].classList.value
                : "";
            var valueOfElement =
              elements[i].type === "checkbox" &&
              classOfElement.indexOf("multiselect") === -1
                ? elements[i].checked
                : classOfElement.indexOf("intval") === -1
                ? elements[i].value
                : parseInt(elements[i].value);
            var elementIsChecked = elements[i].checked;
            // override the method of the form if the input's name is _method
            var nameOfElement = elements[i].name;
            if (nameOfElement === "_method") {
              method = valueOfElement;
            } else {
              // Create a payload field named "method" if the elements name is actually httpmethod
              if (nameOfElement == "httpmethod") {
                nameOfElement = "method";
              }
              // Create a payload field names "id" if the elements name is actually uid
              if (nameOfElement === "uid") {
                nameOfElement = "id";
              }
              if (nameOfElement === "quantity" || nameOfElement === "code") {
                valueOfElement = Number(valueOfElement);
              }
              // If the element has the class "multiselect", add its value(s) as array elements
              if (classOfElement.indexOf("multiselect") > -1) {
                if (elementIsChecked) {
                  payload[nameOfElement] =
                    typeof payload[nameOfElement] === "object" &&
                    payload[nameOfElement] instanceof Array
                      ? payload[nameOfElement]
                      : [];
                  payload[nameOfElement].push(valueOfElement);
                }
              } else {
                payload[nameOfElement] = valueOfElement;
              }
            }
          }
        }

        // If the method is DELETE, the payload should be a querystringObject instead
        var queryStringObject = method === "DELETE" ? payload : {};

        // Call the API
        app.client.request(
          undefined,
          path,
          method,
          queryStringObject,
          payload,
          function (statusCode, responsePayload) {
            // Display an error on the form if needed
            if (statusCode !== 200) {
              if (statusCode === 403) {
                // log the user out
                app.logUserOut();
              } else {
                // Try to get the error from the api, or set a default error message
                var error =
                  typeof responsePayload.Error === "string"
                    ? responsePayload.Error
                    : "An error has occured, please try again";

                // Set the formError field with the error text
                document.querySelector("#" + formId + " .formError").innerHTML =
                  error;

                // Show (unhide) the for error field on the form
                document.querySelector(
                  "#" + formId + " .formError"
                ).style.display = "block";
              }
            } else {
              // If successful, send to form response processor
              app.formResponseProcessor(formId, payload, responsePayload);
            }
          }
        );
      });
    }
  }
};

// Form response processor
app.formResponseProcessor = function (formId, requestPayload, responsePayload) {
  var functionToCall = false;
  // If account creation was successful, try to immediately log the user in
  if (formId === "accountCreate") {
    // Take the email and password, and use it to log the user in
    var newPayload = {
      email: requestPayload.email,
      password: requestPayload.password,
    };

    app.client.request(
      undefined,
      "api/tokens",
      "POST",
      undefined,
      newPayload,
      function (newStatusCode, newResponsePayload) {
        // Display an error on the form if needed
        if (newStatusCode !== 200) {
          // Try to get the error from the api, or set a default error message
          var error =
            typeof responsePayload.Error == "string"
              ? responsePayload.Error
              : "Sorry, an error has occured, please try again";

          // Set the formError field with the error text
          document.querySelector("#" + formId + " .formError").innerHTML =
            error;

          // Show (unhide) the form error field on the form
          document.querySelector("#" + formId + " .formError").style.display =
            "block";
        } else {
          // If successful, set the token and redirect the user
          app.setSessionToken(newResponsePayload);
          window.location = "/pizza/list";
        }
      }
    );
  }

  // If login was successful, set the token in localstorage and redirect the user
  if (formId === "sessionCreate") {
    app.setSessionToken(responsePayload);
    window.location = "/pizza/list";
  }

  // If forms saved successfully and they have success messages, show them
  var formsWithSuccessMessages = [
    "accountEdit1",
    "accountEdit2",
    "checksEdit1",
    "cartFill",
  ];
  if (formsWithSuccessMessages.indexOf(formId) > -1) {
    document.querySelector("#" + formId + " .formSuccess").style.display =
      "block";
  }

  // If the user just deleted their account, redirect them to the account-delete page
  if (formId === "accountEdit3") {
    app.logUserOut(false);
    window.location = "/account/deleted";
  }

  // If the user just successfully created a new check, redirect back to the dashboard
  if (formId === "checksCreate") {
    window.location = "/checks/all";
  }

  // If the user just deleted a check, redirect them to the dashboard
  if (formId === "checksEdit2") {
    window.location = "/checks/all";
  }
};

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = function () {
  var tokenString = localStorage.getItem("token");
  if (typeof tokenString === "string") {
    try {
      var token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      if (typeof token === "object") {
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    } catch (e) {
      app.setLoggedInClass(false);
    }
  }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = function (add) {
  var target = document.querySelector("body");
  if (add) {
    target.classList.add("loggedIn");
  } else {
    target.classList.remove("loggedIn");
  }
};

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = function (token) {
  app.config.sessionToken = token;
  var tokenString = JSON.stringify(token);
  localStorage.setItem("token", tokenString);
  if (typeof token === "object") {
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

// Renew the token
app.renewToken = function (callback) {
  var currentToken =
    typeof app.config.sessionToken === "object"
      ? app.config.sessionToken
      : false;
  if (currentToken) {
    // Update the token with a new Expiration
    var payload = {
      id: currentToken.id,
      extend: true,
    };
    app.client.request(
      undefined,
      "api/tokens",
      "PUT",
      undefined,
      payload,
      function (statusCode, responsePayload) {
        // Display an error on the form if needed
        if (statusCode === 200) {
          // Get the new token details
          var queryStringObject = { id: currentToken.id };
          app.client.request(
            undefined,
            "api/tokens",
            "GET",
            queryStringObject,
            undefined,
            function (statusCode, responsePayload) {
              // Display an error on the form if needed
              if (statusCode === 200) {
                app.setSessionToken(responsePayload);
                callback(false);
              } else {
                app.setSessionToken(false);
                callback(true);
              }
            }
          );
        } else {
          app.setSessionToken(false);
          callback(true);
        }
      }
    );
  }
};

// Loop to renew token often
app.tokenRenewalLoop = function () {
  setInterval(function () {
    app.renewToken(function (err) {
      if (!err) {
        console.log(
          "Token renewed successfully @ " + Date.now().toLocaleString()
        );
      }
    });
  }, 1000 * 60);
};

// Load data on the page
app.loadDataOnPage = function () {
  // Get the current page from the body class
  var bodyClasses = document.querySelector("body").classList;
  var primaryClass =
    typeof bodyClasses[0] === "string" ? bodyClasses[0] : false;

  // Logic for account settings page
  if (primaryClass === "accountEdit") {
    app.loadAccountEditPage();
  }

  // Logic for menu page
  if (primaryClass === "pizzaList") {
    app.loadPizzaListPage();
  }

  // Logic for add to cart page
  if (primaryClass === "cartFill") {
    app.loadCartFillPage("cartFill");
  }

  // Logic for add to cart page
  if (primaryClass === "pizzaOrder") {
    app.loadPizzaOrderPage("pizzaOrder");
  }
};

// Load the account edit page specifically
app.loadAccountEditPage = function () {
  // Get the email from the current token, or log the user out if there is none
  var email =
    typeof app.config.sessionToken.email === "string"
      ? app.config.sessionToken.email
      : false;
  if (email) {
    // Fetch the user data
    var queryStringObject = {
      email,
    };
    app.client.request(
      undefined,
      "api/users",
      "GET",
      queryStringObject,
      undefined,
      function (statusCode, responsePayload) {
        if (statusCode === 200) {
          // Put data into the form as values where needed
          document.querySelector("#accountEdit1 .firstNameInput").value =
            responsePayload.firstName;
          document.querySelector("#accountEdit1 .lastNameInput").value =
            responsePayload.lastName;
          document.querySelector("#accountEdit1 .displayEmailInput").value =
            responsePayload.email;

          // Put the hidden email fiels into both forms
          var hiddenEmailInputs = document.querySelectorAll(
            "input.hiddenEmailInput"
          );
          for (var i = 0; i < hiddenEmailInputs.length; i++) {
            hiddenEmailInputs[i].value = responsePayload.email;
          }
        } else {
          // if the request comes back with anything other than 200
          app.logUserOut();
        }
      }
    );
  } else {
    app.logUserOut();
  }
};

// Load the items list page specifically
app.loadPizzaListPage = () => {
  // Get email from current token, or log user out if none
  const email =
    typeof app.config.sessionToken.email === "string"
      ? app.config.sessionToken.email
      : false;
  if (email) {
    // Fetch menu data
    const queryStringObject = { email };
    app.client.request(
      undefined,
      "api/menu",
      "GET",
      queryStringObject,
      undefined,
      (statusCode, responsePayload) => {
        if (statusCode === 200) {
          // check how many items are available
          const allItems =
            typeof responsePayload === "object" &&
            responsePayload instanceof Array &&
            responsePayload.length > 0
              ? responsePayload
              : [];
          if (allItems.length >= 0) {
            // show each item as a new row in the table
            const table = document.getElementById("pizzaTable");
            allItems.forEach((item, index) => {
              const tr = table.insertRow(-1);
              tr.classList.add("itemRow");
              const td0 = tr.insertCell(0);
              const td1 = tr.insertCell(1);
              const td2 = tr.insertCell(2);
              const td3 = tr.insertCell(3);
              const td4 = tr.insertCell(4);
              td0.innerHTML = index + 1;
              td1.innerHTML = item.name;
              td2.innerHTML = item.price;
              td3.innerHTML = item.code;
              td4.innerHTML = `<a href="/pizza/cart?code=${item.code}">Add to Cart</a>`;
            });
          } else {
            // show no item available message
            document.getElementById("noPizzaMessage").style.display =
              "table-row";
          }
        } else {
          app.logUserOut();
        }
      }
    );
  } else {
    app.logUserOut();
  }
};

// Load the add to cart page specifically
app.loadCartFillPage = (formId) => {
  // Get email from current token, or log user out if none
  const email =
    typeof app.config.sessionToken.email === "string"
      ? app.config.sessionToken.email
      : false;
  if (email) {
    const queryParams = window.location.search;
    const urlParams = new URLSearchParams(queryParams);
    // Get the pizza code from the query string. if none is found then redirect to items list page
    const code =
      typeof urlParams.get("code") === "string" &&
      urlParams.get("code").length > 0
        ? urlParams.get("code")
        : false;
    if (code && code > 0) {
      const queryStringObject = { email, code: Number(code) };
      app.client.request(
        undefined,
        "api/menu",
        "GET",
        queryStringObject,
        undefined,
        (statusCode, responsePayload) => {
          if (statusCode === 200) {
            // Put the hidden email and code inputs in the form
            document.querySelector("input.hiddenEmailInput").value = email;
            document.querySelector("input.hiddenCodeInput").value =
              responsePayload.code;

            // Put the other data into the form
            document.querySelector("#cartFill .itemNameInput").value =
              responsePayload.name;
            document.querySelector("#cartFill .itemPriceInput").value =
              responsePayload.price;
          } else {
            // Try to get the error from the api, or set a default error message
            const error =
              typeof responsePayload.Error == "string"
                ? responsePayload.Error
                : "Sorry, an error has occured, please try again";

            // Set the formError field with the error text
            document.querySelector("#" + formId + " .formError").innerHTML =
              error;

            // Show (unhide) the form error field on the form
            document.querySelector("#" + formId + " .formError").style.display =
              "block";
          }
        }
      );
    } else {
      window.location = "/pizza/list";
    }
  } else {
    app.logUserOut();
  }
};

// load order page
app.loadPizzaOrderPage = () => {
  // Get email from current token, or log user out if none
  const email =
    typeof app.config.sessionToken.email === "string"
      ? app.config.sessionToken.email
      : false;
  if (email) {
    // Fetch the user data
    const queryStringObject = {
      email,
    };
    app.client.request(
      undefined,
      "api/users",
      "GET",
      queryStringObject,
      undefined,
      (statusCode, responsePayload) => {
        if (statusCode === 200) {
          // Determine if the user has a cart or not
          const cart =
            typeof responsePayload.cart === "string" &&
            responsePayload.cart.length > 0
              ? responsePayload.cart
              : false;
          if (cart) {
            // get cart data
            const newQueryStringObject = { id: cart };
            app.client.request(
              undefined,
              "api/carts",
              "GET",
              newQueryStringObject,
              undefined,
              (newStatusCode, newResponsePayload) => {
                if (newStatusCode === 200) {
                  // put out items in the cart
                  const cartItems = newResponsePayload.items;
                  if (cartItems.length > 0) {
                    document.querySelector("input.hiddenIdField").value = cart;

                    cartItems.forEach((cartItem) => {
                      const table = document.getElementById("cartListTable");
                      const tr = table.insertRow(-1);
                      tr.classList.add("orderRow");
                      const td0 = tr.insertCell(0);
                      const td1 = tr.insertCell(1);
                      const td2 = tr.insertCell(2);
                      td0.innerHTML = cartItem.id;
                      td1.innerHTML = cartItem.itemCode;
                      td2.innerHTML = cartItem.quantity;
                    });

                    // schow the createOrder CTA
                    document.getElementById("createOrderCTA").style.display =
                      "block";
                  } else {
                    // Show you have no items in your cart
                    document.getElementById("noPizzaMessage").style.display =
                      "table-row";
                  }
                } else {
                  // Try to get the error from the api, or set a default error message
                  const error =
                    typeof responsePayload.Error == "string"
                      ? responsePayload.Error
                      : "Sorry, an error has occured, please try again";

                  // Set the formError field with the error text
                  document.querySelector("#pizzaOrder .formError").innerHTML =
                    error;

                  // Show (unhide) the error field on the form
                  document.querySelector(
                    "#pizzaOrder .formError"
                  ).style.display = "block";
                }
              }
            );
          } else {
            // Show you have no cart message
            document.getElementById("noCartMessage").style.display = "block";

            // schow the start shopping CTA
            document.getElementById("startShopping").style.display = "block";
          }
        } else {
          app.logUserOut();
        }
      }
    );
  } else {
    app.logUserOut();
  }
};

// Init (bootstrapping)
app.init = function () {
  // Bind all the form submissions
  app.bindForms();

  // Bind logout button
  app.bindLogoutButton();

  // Get the token from localstorage
  app.getSessionToken();

  // Renew token
  app.tokenRenewalLoop();

  // Load data on page
  app.loadDataOnPage();
};

// Call the init processes after the window loads
window.onload = function () {
  app.init();
};
