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


app.post('/migrate', urlencodedParser, (req, resp) => {
  let user = encodeURIComponent(req.body.username);
  
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

app.get('/', urlencodedParser, (req, resp) => {
  resp.render('index.hbs');
});

app.post('/authenticate', urlencodedParser, (req, resp) => {
  let username = req.body.username;
  let password = req.body.password;
  let instance = req.body.instance;

  let authentication =  base64.encode(`${username}:${password}`);


  request.get( {
      url: `https://${instance}.atlassian.net/rest/api/2/issue/createmeta`,
    json: true,
  }, (err, res, body) => {
    // if result it's ok    
    if (res.statusCode === 200) {
      
      req.session.authentication = authentication;
      req.session.instance = instance;
      resp.redirect('/getUsers');
    } else { //401 = invalid credentials
        console.log(res.statusCode);
    }
  })//end or get request
});

//url just to render the page in case the customer access /authentication
app.get('/authentication', urlencodedParser, (req, resp) => {
  resp.render('index.hbs');
});

//link to the page that renders the request
app.get('/convert', urlencodedParser, (req, resp) =>{

  request.get( {
    url: `https://${req.session.instance}.atlassian.net/rest/servicedesk/customer-management/noeyeball/1/local-servicedesk-user?active-filter=active&start-index=1&max-results=1000`,
      headers: {
        'authorization': `Basic ${req.session.authentication}`        
      },
      json: true,
    }, (err, res, body) => {
    // if result it's ok    
    if (res.statusCode === 200) {
      resp.render('convert.hbs');
    } else { //401 = invalid credentials
        resp.redirect("/authentication");
    }
  })//end or get request
  
});


app.get('/getUsers', urlencodedParser, (req, resp, next) => {

  request.get( {
      url: `https://${req.session.instance}.atlassian.net/rest/servicedesk/customer-management/noeyeball/1/local-servicedesk-user?active-filter=active&start-index=0&max-results=1000`,
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
        resp.redirect('/authentication');
    }
  });//end or get request
});

//start the server
app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});



