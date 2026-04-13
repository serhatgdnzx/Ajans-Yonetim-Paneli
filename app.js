require('dotenv').config();

if (!process.env.MONGODB_URI || !String(process.env.MONGODB_URI).trim()) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/ajans';
}

const path = require('path');
const ejs = require('ejs');
const ejsExpressOrig = ejs.__express;
ejs.__express = function (filePath, data, cb) {
  if (data && typeof data === 'object') {
    delete data.include;
  }
  return ejsExpressOrig(filePath, data, cb);
};
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const { connectDB } = require('./config/db');
const { attachUser } = require('./middleware/auth');
const portalRoutes = require('./routes/portal');
const { sanitizeEjsLocals } = require('./middleware/sanitizeEjsLocals');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const clientsRoutes = require('./routes/clients');
const projectsRoutes = require('./routes/projects');
const tasksRoutes = require('./routes/tasks');
const reportsRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users');
const workLogsRoutes = require('./routes/workLogs');
const deliveriesRoutes = require('./routes/deliveries');
const socialRoutes = require('./routes/social');
const revisionsRoutes = require('./routes/revisions');
const callsRoutes = require('./routes/calls');
const pendingRoutes = require('./routes/pending');
const excelRoutes = require('./routes/excel');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

delete app.locals.include;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(
  methodOverride(function (req) {
    if (req.body && req.body._method) return req.body._method;
    if (req.query && req.query._method) return req.query._method;
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 14 * 24 * 60 * 60,
    }),
    cookie: { maxAge: 14 * 24 * 60 * 60 * 1000 },
  })
);

app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.use(sanitizeEjsLocals);

app.use(attachUser);

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  if (req.session.clientId) return res.redirect('/portal');
  res.render('landing', { title: 'Ajans Yönetim Paneli' });
});

app.use('/portal', portalRoutes);

app.use('/auth', authRoutes);

app.use(requireAuth);
app.use('/dashboard', dashboardRoutes);
app.use('/clients', clientsRoutes);
app.use('/projects', projectsRoutes);
app.use('/tasks', tasksRoutes);
app.use('/reports', reportsRoutes);
app.use('/users', usersRoutes);
app.use('/work-logs', workLogsRoutes);
app.use('/deliveries', deliveriesRoutes);
app.use('/social', socialRoutes);
app.use('/revisions', revisionsRoutes);
app.use('/calls', callsRoutes);
app.use('/pending-jobs', pendingRoutes);
app.use('/excel', excelRoutes);

app.use((req, res) => {
  res.status(404).render('error', { title: 'Bulunamadı', message: 'Sayfa bulunamadı.' });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
