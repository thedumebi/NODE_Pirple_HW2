There are five (5) endpoints - user, tokens, menu, carts and orders.

Users
The /users route accepts post, get, put and delete methods. 
For POST, the required data include firstName(string), lastName(string), email(string), address(string), password(string) and tosAgreement(boolean).
For GET, the required data is the email(string). This route is token protected, so there must be a token header present.
For PUT(token protected), the required data is the user's email(string) and any other field mentioned in the POST above is an optional data apart from tosAgreement.
For DELETE(token protected), the required field is email.

Tokens
The /tokens route accepts post, get, put and delete methods.
For POST, the required data includes the user email and password. Each token created has a lifespan of two hours.
For GET, the required data is the id(token id => string).
For PUT, the required data is id(string) && extend(boolean). Extending a token increases the expiry time by one hour.
For DELETE, the required data is the id(token id => string).

Menu
The /menu route accepts only a get method.
For Get(token prtected), the required data is email(string) which is the user's email.

Carts
the /carts route accepts post, get, put and delete.
For POST (token protected), the required data includes email(string), code(number) and quantity (number). The code is the item code as gotten from the menu while quantity is how many of the menu item you want to get. making a post request to this route adds a new item to the user's cart
For GET (token protected), the required data is the id(string), which is the cart id.
For PUT (token protected), the required data is the id(string), which is the cart id and optional data is items(array).
For DELETE (token protected), the required data is the id(string) which is the cart id.

Orders
The /orders route only accepts post and get.
For POST (token protected), the required data is the cartId(string) which is the id of the cart with the menu items and token(string). This route checks out a user's cart, creates an order and then integrates Stripe for payment and when payment is complete, sends an email to the user and updates the cart.
For GET (token protected), the required data is the id(string), which is the order id.
