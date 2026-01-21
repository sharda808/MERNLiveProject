const ENV = process.env.NODE_ENV || 'production'
require('dotenv').config({
  path:`.env.${ENV}`
});
// core Module
const path = require('path');
const fs = require('fs');
// External Module
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const mongodb_session = require('connect-mongodb-session');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const MongoDbStore = mongodb_session(session);
const mongoose = require('mongoose');
// Local Module
const { hostRouter } = require('./routers/hostRouter');
const { authRouter } = require('./routers/authRouter');
const storeRouter = require('./routers/storeRouter');
const rootDir = require('./util/path-util');
const errorController = require('./controllers/errorController');


const MONGO_DB_URL = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@airbnb.s8zku2p.mongodb.net/${process.env.MONGO_DB_DATABASE}?appName=Airbnb`;
const sessionStore = new MongoDbStore({
  uri: MONGO_DB_URL,
  collection: 'sessions',
});

const storage = multer.diskStorage({
  destination:(req,file,cb) => {
cb(null,'uploads/');

  },
  filename:(req,file,cb) => {
cb(null, Date.now() + '-' + file.originalname);
  },
})
const fileFilter = (req,file,cb)=>{
// const isValidFile = file.mimetype ==='image/png' ||file.mimetype ==='image/jpeg' || file.mimetype ==='image/jpg';
const  isValidFile = ['image/png','image/jpeg','image/jpg'].includes(file.mimetype);
cb(null, isValidFile);
}
const loggingPath = path.join(rootDir,'access.log');
const loggingStream = fs.createWriteStream(loggingPath, {flag:'a'});
const app = express();
app.use(helmet());
app.use(compression());
app.use(morgan('combined',{stream: loggingStream}))
app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(express.static(path.join(rootDir, "public")));
app.use('/uploads',express.static(path.join(rootDir, "uploads")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer({storage:storage,fileFilter:fileFilter}).single('photo'));
app.use(session({
  secret: 'MERN LIVE BATCH',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
}));

// Make auth data available in all EJS views (navbar, etc.)
app.use((req, res, next) => {
  res.locals.isLoggedIn = !!req.session.isLoggedIn;
  res.locals.user = req.session.user || null;
  next();
});

// Mount routers
app.use('/auth', authRouter);  // Auth routes: /auth/login, /auth/signup, etc
app.use(storeRouter);          // Keep storeRouter as is

// Protect /host routes
app.use("/host", (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect("/auth/login");  // Fixed redirect to login
  }
  next();
});
app.use("/host", hostRouter);

// 404 handler
app.use(errorController.get404);

// Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;
mongoose.connect(MONGO_DB_URL)
  .then(() => {
    console.log("MongoDB connected successfully");
    app.listen(PORT, () => {
      console.log(`Server running at: http://localhost:${PORT}`);
    });
  })
  .catch(err => console.log(err));
