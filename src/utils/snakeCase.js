const _ = require('lodash');

const convertKeysToSnakeCase = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[_.snakeCase(key)] = value;
  }
  return result;
};

module.exports = convertKeysToSnakeCase;
