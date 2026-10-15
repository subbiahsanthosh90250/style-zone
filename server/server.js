require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const { router: authRouter } = require('./auth');
const itemsRouter = require('./items');

const app = express();
const PORT = process.env.PORT || 8080;
const rootDir = path.join(__dirname, '..');

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax' },
  })
);

app.use('/api/admin', authRouter);
app.use('/api', itemsRouter);

// Uploaded images may physically live on a separate persistent disk (DATA_DIR
// in production) rather than under assets/ in the repo — serve them at the
// same /assets/uploads URL path the frontend already expects either way.
app.use('/assets/uploads', express.static(itemsRouter.uploadsDir));

app.use(express.static(rootDir));

app.listen(PORT, () => {
  console.log(`STYLE ZONE server running at http://localhost:${PORT}`);
});
