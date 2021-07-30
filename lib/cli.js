/**
 * CLI-Required Tasks
 *
 */

// Dependencies
const readline = require("readline");
const events = require("events");
class _events extends events {}
const e = new _events();
const os = require("os");
const v8 = require("v8");
const _data = require("./data");
const helpers = require("./helpers");

// Instantiate the CLI module object
const cli = {};

// Input handlers
e.on("man", () => {
  cli.responders.help();
});

e.on("help", () => {
  cli.responders.help();
});

e.on("exit", () => {
  cli.responders.exit();
});

e.on("stats", () => {
  cli.responders.stats();
});

e.on("list users", () => {
  cli.responders.listUsers();
});

// Responders Object
cli.responders = {};

// Help | Man
cli.responders.help = () => {
  const commands = {
    exit: "Kill the CLI (and the rest of the application)",
    man: "Show this help page",
    help: "Alias of the man command",
    stats:
      "Get statistics on the underlying operating system and resource utilization",
    "list users":
      "Show a list of all the registered (undeleted) users in the system",
    "more user info --{userId}": "Show details of a specific user",
    "list checks --up --down":
      "Show a list of all the active checks in the system, including their state. The '--up' and the '--down' flags are both optional",
    "more check info --{checkId}": "Show detail of a specified check",
    "list logs":
      "Show a list of all the log files available to be read (compressed only)",
    "more log info --{fileName}": "Show details of a specified log file",
  };

  // Show header for the help page that is as wide as the screen
  cli.horizontalLine();
  cli.centered("CLI MANUAL");
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Show each command, followed by its explanation, in white and yellow respectively
  for (var key in commands) {
    if (commands.hasOwnProperty(key)) {
      var value = commands[key];
      var line = "\x1b[33m" + key + "\x1b[0m";
      var padding = 60 - line.length;
      for (i = 0; i < padding; i++) {
        line += " ";
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  }

  cli.verticalSpace(1);

  // End with another horizontal line
  cli.horizontalLine();
};

// Exit
cli.responders.exit = () => {
  process.exit(0);
};

// Stats
cli.responders.stats = () => {
  // Compile an object of stats
  var stats = {
    "Load Average": os.loadavg().join(" "),
    "CPU Count": os.cpus().length,
    "Free Memory": os.freemem(),
    "Current Malloced Memory": v8.getHeapStatistics().malloced_memory,
    "Peak Malloced Memory": v8.getHeapStatistics().peak_malloced_memory,
    "Allocated Heap Used (%)": Math.round(
      (v8.getHeapStatistics().used_heap_size /
        v8.getHeapStatistics().total_heap_size) *
        100
    ),
    "Available Heap Allocated (%)": Math.round(
      (v8.getHeapStatistics().total_heap_size /
        v8.getHeapStatistics().heap_size_limit) *
        100
    ),
    Uptime: os.uptime() + " Seconds",
  };

  // Create a header for the stats
  cli.horizontalLine();
  cli.centered("SYSTEM STATISTICS");
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Log out each stat
  for (var key in stats) {
    if (stats.hasOwnProperty(key)) {
      var value = stats[key];
      var line = "\x1b[33m" + key + "\x1b[0m";
      var padding = 60 - line.length;
      for (i = 0; i < padding; i++) {
        line += " ";
      }
      line += value;
      console.log(line);
      cli.verticalSpace();
    }
  }

  cli.verticalSpace(1);

  // End with another horizontal line
  cli.horizontalLine();
};

// List Users
cli.responders.listUsers = () => {
  _data.list("users", (err, userIds) => {
    if (!err && userIds && userIds.length > 0) {
      // Create header
      cli.horizontalLine();
      cli.centered("USERS");
      cli.horizontalLine();
      cli.verticalSpace(2);

      userIds.forEach((userId) => {
        _data.read("users", userId, (err, userData) => {
          if (!err && userData) {
            let line = `\x1b[33mName:\x1b[0m ${userData.firstName} ${userData.lastName} \x1b[33mEmail:\x1b[0m +${userData.email} \x1b[33mAddress:\x1b[0m +${userData.address}  \x1b[33mOrders: \x1b[0m`;
            const cartId =
              userData.cart === "string" && userData.cart.trim().length > 0
                ? userData.cart.trim()
                : false;
            let orderNumber = 0;
            if (cartId) {
              _data.list("orders", (err, orderIds) => {
                if (!err && orderIds && orderIds.length > 0) {
                  orderNumber = orderIds.filter(
                    (order) => order.email === userData.email
                  ).length;
                }
              });
            }
            line += orderNumber;
            console.log(line);
            cli.verticalSpace();
          }
        });
      });
    }
  });
};

// Create a vertical space
cli.verticalSpace = (lines) => {
  lines = typeof lines === "number" && lines > 0 ? lines : 1;
  for (i = 0; i < lines; i++) {
    console.log(" ");
  }
};

// Create a horizontal line across the screen
cli.horizontalLine = () => {
  // Get available screen size
  const width = process.stdout.columns;

  let line = "";
  for (i = 0; i < width; i++) {
    line += "-";
  }

  console.log(line);
};

// Create a centered text on the screen
cli.centered = (str) => {
  str = typeof str === "string" && str.trim().length > 0 ? str.trim() : "";

  // Get the available screen size
  const width = process.stdout.columns;

  // Calculate the left padding
  const leftPadding = Math.floor((width - str.length) / 2);

  // Put in left padded spaces before the string itself
  let line = "";
  for (i = 0; i < leftPadding; i++) {
    line += " ";
  }
  line += str;

  console.log(line);
};

// Input processor
cli.processInput = (str) => {
  try {
    str = typeof str === "string" && str.trim().length > 0 ? str.trim() : false;
    if (str) {
      // Codify the unique strings that identify the unique questions allowed to be asked
      const uniqueInputs = [
        "man",
        "help",
        "stats",
        "exit",
        "list users",
        "more user info",
        "list checks",
        "more check info",
        "list logs",
        "more log info",
      ];

      // Go through the possible inputs, emit an event when a match is found
      let matchFound = false;
      uniqueInputs.some((input) => {
        if (str.toLowerCase().indexOf(input) > -1) {
          matchFound = true;

          // Emit an event matching the unique input, and include the full string given
          e.emit(input, str);
          return true;
        }
      });

      // If no match is found, tell the user to try again
      if (!matchFound) {
        console.log(
          "Sorry, try again or type 'help' for a list of all commands"
        );
      }
    }
  } catch (e) {
    console.log(e);
  }
};

// Init script
cli.init = () => {
  // Send the start message to the console, in dark blue
  console.log("\x1b[34m%s\x1b[0m", "The CLI is running");

  // Start the Interface
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  // Create an initial prompt
  _interface.prompt();

  // Handle each line of the input separately
  _interface.on("line", async (str) => {
    // Send to the input processor
    cli.processInput(str);

    // Re-initialize the prompt afterwards
    _interface.prompt();
  });

  // If the user stops the CLI, kill the associated process
  _interface.on("close", () => {
    process.exit(0);
  });
};

// Export the module
module.exports = cli;
