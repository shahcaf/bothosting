const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
  // Alter table (ignore error if column already exists)
  db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';", (err) => {
    // If error, it implies it already exists or table issue, we proceed either way
    db.run("INSERT OR REPLACE INTO users (email, password, role) VALUES ('viki222222997@gmail.com', '190472', 'admin')", (err) => {
      if (err) console.error(err);
      else console.log('Admin user created successfully! You can now login with these credentials.');
      db.close();
    });
  });
});
