const _ = require('lodash');

const convertKeysToSnakeCase = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[_.snakeCase(key)] = value;
  }
  return result;
};

const convertKeysToCamelCase = (obj) => {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    result[_.camelCase(key)] = value;
  }
  return result;
};

module.exports = { convertKeysToSnakeCase, convertKeysToCamelCase };
