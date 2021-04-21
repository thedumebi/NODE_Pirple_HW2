/*
 * Library for storing and editing data
 *
 */

// Dependencies
var fs = require("fs");
var path = require("path");
var helpers = require("./helpers");

// Container for the module (to be exported)
var lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, "..", "/.data/");

// Write to a file
lib.create = (dir, fileName, data, callback) => {
  // Make directory if it doesnt already exist
  fs.mkdir(lib.baseDir + dir, { recursive: true }, (err) => {
    if (err) {
      callback("Error creating the directory");
    }
  });

  // Open the file for writing
  fs.open(lib.baseDir + dir + "/" + fileName + ".json", "wx", (err, fd) => {
    if (!err && fd) {
      // Convert data to String
      const stringData = JSON.stringify(data);

      // Write to file and close it
      fs.writeFile(fd, stringData, (err) => {
        if (!err) {
          fs.close(fd, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback("Error closing new file");
            }
          });
        } else {
          callback("Error writing to new file");
        }
      });
    } else {
      callback("Could not create a new file, it may already exists");
    }
  });
};

// Read data from a file
lib.read = (dir, fileName, callback) => {
  fs.readFile(
    lib.baseDir + dir + "/" + fileName + ".json",
    "utf8",
    (err, data) => {
      if (!err && data) {
        const parsedData = helpers.parseJsonToObject(data);
        callback(false, parsedData);
      } else {
        callback(err, data);
      }
    }
  );
};

// Update data inside a file
lib.update = (dir, fileName, data, callback) => {
  fs.open(lib.baseDir + dir + "/" + fileName + ".json", "r+", (err, fd) => {
    if (!err && fd) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Truncate the file content
      fs.ftruncate(fd, (err) => {
        if (!err) {
          fs.writeFile(fd, stringData, (err) => {
            if (!err) {
              fs.close(fd, (err) => {
                if (!err) {
                  callback(false);
                } else {
                  callback("Error closing file");
                }
              });
            } else {
              callback("Error writing to existing file");
            }
          });
        } else {
          callback("Error truncating file");
        }
      });
    } else {
      callback("Could not open the file for updating, it may not exist yet");
    }
  });
};

// Delete a file
lib.delete = (dir, fileName, callback) => {
  fs.unlink(lib.baseDir + dir + "/" + fileName + ".json", (err) => {
    if (!err) {
      callback(false);
    } else {
      callback("Error deleting file");
    }
  });
};

// List all the items in a directory
lib.list = (dir, callback) => {
  fs.readdir(lib.baseDir + dir + "/", (err, files) => {
    if (!err && files && files.length > 0) {
      const trimmedFileNames = [];
      files.forEach((file) => {
        trimmedFileNames.push(file.replace(".json", ""));
      });
      callback(false, trimmedFileNames);
    } else {
      callback(err, files);
    }
  });
};

// Export the module
module.exports = lib;
