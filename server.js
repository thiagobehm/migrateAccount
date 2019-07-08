const express = require('express');
const bodyParser = require('body-parser');
const request = require('request-promise');
const hbs = require('hbs');
const path = require('path');
const base64 = require('base-64');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const paginate = require('express-paginate');

//configures a variable to heroku environment
const port = process.env.PORT || 3000;

//starts express
let app = express();


//parses the body parameters
let urlencodedParser = bodyParser.urlencoded({
  extended: false
});

//register the directory templates of Handlebars
hbs.registerPartials(__dirname + '/views/partials');
app.set('view engine', 'hbs');

//defines the 'root' directory for public files
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(paginate.middleware(10, 50));

// initialize express-session to allow us track the logged-in user across sessions.
app.use(session({
  key: 'user_session',
  secret: 'migrateUsersRock',
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: 600000
  }
}));

app.get('/', urlencodedParser, (req, resp) => {
  resp.render('index.hbs');
});

app.post('/authenticate', urlencodedParser, (req, resp) => {
  let username = req.body.username;
  let password = req.body.password;
  let action = req.body.action;

  let authentication =  base64.encode(`${username}:${password}`);
  
  if(!req.body.instance) {
    resp.render('index.hbs', {
      error: "Please provide the instance URL!!!",
    });//end of the render
  } else {
    instance = req.body.instance;
    request.get( {
      url: `https://${instance}.atlassian.net/rest/api/2/issue/createmeta`,
      json: true,
    }, (err, res, body) => {
      // if result it's ok    
      if (res.statusCode === 200) {
        
        req.session.authentication = authentication;
        req.session.instance = instance;
        req.session.action = action;
        resp.redirect('/getUsers');
      } 
    });//end or get request
  }
});

app.get('/logout', (req, resp)=>{
  req.session.destroy(()=>{
    resp.render('index.hbs');
  })
});

//url just to render the page in case the customer access or to do some redirects on the application
app.get('/authentication', urlencodedParser, (req, resp) => {
  resp.render('index.hbs');
});

//link to the page that renders the request
app.get('/convert', urlencodedParser, (req, resp) =>{
  if (req.session.authentication) {
    resp.render('convert.hbs', {
      action: req.session.action,
    });
  } else { //401 = invalid credentials
    resp.redirect("/authentication");
  }  
});

app.get('/getUsers', urlencodedParser, (req, resp, next) => {

  let filter = req.session.action === 'activate' ? 'inactive' : 'active';
  
  request.get( {
    url: `https://${req.session.instance}.atlassian.net/rest/servicedesk/customer-management/noeyeball/1/local-servicedesk-user?active-filter=${filter}&start-index=0&max-results=5000`,
    headers: {
      'authorization': `Basic ${req.session.authentication}`        
    },
    json: true,
  }, (err, res, body) => {
    // if result it's ok    
    if (res.statusCode === 200) {
      //const pageCount = Math.ceil(30 / req.query.limit);
  
      resp.render('getUsers.hbs', {
        users: body.localCustomers,
        //pageCount,
        //pages: paginate.getArrayPages(req)(3, pageCount, req.query.page)
      });
    } else { //401 = invalid credentials        
      resp.render('index.hbs', {
        error: "Invalid credentials! Please, confirm your user and password and as well make sure that you have access to this instance...",
      });//end of the render
    }
  });//end or get request
});

app.post('/migrate', urlencodedParser, (req, resp) => {
  // let user = encodeURIComponent(req.body.username);
  let user = req.body.username;

  let options = {
    uri: `https://${req.session.instance}.atlassian.net/rest/servicedesk/customer-management/noeyeball/1/local-servicedesk-user/migrate-to-atlassian-account-user?username=${user}`,
    method: 'PUT',
    headers: {
      'authorization': `Basic ${req.session.authentication}`        
    },
    json: true
  }
  
  request(options)
  .then((data)=>{
    resp.send(data);
  })
  .catch((err)=>{
    resp.send(err);
  });
});


app.post('/deactivate', urlencodedParser, (req, resp) => {
  // let user = encodeURIComponent(req.body.username);
  let user = req.body.username;

  let options = {
  
    uri: `https://${req.session.instance}.atlassian.net/rest/servicedesk/customer-management/noeyeball/1/local-servicedesk-user/deactivate/?username=${user}`,
    // uri: `https://admin.atlassian.com/gateway/api/adminhub/customer-directory/directory/9d1a867a-c37b-4f88-961b-b716cdbfaee1/user/${user}`,
    method: 'PUT',
    headers: {
      'authorization': `Basic ${req.session.authentication}`    
    }
  }
  
  request(options)
  .then((data)=>{
    resp.send(data);
  })
  .catch((err)=>{
    resp.send(err);
  });
});

app.post('/activate', urlencodedParser, (req, resp) => {
  // let user = encodeURIComponent(req.body.username);
  let user = req.body.username;

  let options = {
  
    uri: `https://${req.session.instance}.atlassian.net/rest/servicedesk/customer-management/noeyeball/1/local-servicedesk-user/activate/?username=${user}`,
    // uri: `https://admin.atlassian.com/gateway/api/adminhub/customer-directory/directory/9d1a867a-c37b-4f88-961b-b716cdbfaee1/user/${user}`,
    method: 'PUT',
    headers: {
      'authorization': `Basic ${req.session.authentication}`    
    }
  }
  
  request(options)
  .then((data)=>{
    resp.send(data);
  })
  .catch((err)=>{
    resp.send(err);
  });
});

//start the server
app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});

