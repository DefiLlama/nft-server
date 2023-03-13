const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../config.env') });

const pgp = require('pg-promise')({
  /* initialization options */
  capSQL: true, // capitalize all generated SQL
});
// set type options (pg-promise returns integers and numeric types as strings)
// id 20 = INTEGER
// id 1700 = NUMERIC
pgp.pg.types.setTypeParser(20, parseInt);
pgp.pg.types.setTypeParser(1700, parseFloat);

// on first connect, cache db connection for reuse so we don't
// need to connect on new requests
let conn = null;

// const connect = async (db_env_name) => {
//   if (conn === null) {
//     console.log('using new db connection');
//     // set connection
//     conn = pgp({
//       connectionString:
//         db_env_name === 'indexa'
//           ? process.env.DATABASE_URL_INDEXA
//           : process.env.DATABASE_URL_NFT,
//       // max milliseconds a client can go unused before it is removed
//       // from the connection pool and destroyed.
//       // overriding default of 30sec to 60sec to decrease nb of potential reconnects of 1 lambda
//       // running multiple adapters
//       idleTimeoutMillis: 60000,
//     });
//   }
//   return conn;
// };

const connect = async (db_env_name) => {
  if (db_env_name !== 'indexa') {
    if (conn !== null) {
      console.log('killing current db connection');
      await conn.$pool.end(); // kill the current connection
      conn = null; // set connection to null
    }
  }

  if (conn === null) {
    console.log('using new db connection');
    // set connection
    conn = pgp({
      connectionString:
        db_env_name === 'indexa'
          ? process.env.DATABASE_URL_INDEXA
          : process.env.DATABASE_URL_NFT,
      idleTimeoutMillis: 60000,
    });
  }

  return conn;
};

module.exports = {
  pgp,
  connect,
};
