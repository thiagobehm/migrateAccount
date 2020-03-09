const express = require('express');
const bodyParser = require('body-parser');
const request = require('request-promise');
const hbs = require('hbs');
const path = require('path');
const base64 = require('base-64');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parse')


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

const upload = multer({
  'preservePath': true,
  //storage: multer.memoryStorage(),
  dest: 'tmp/',
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.csv$/)) {
      return cb('Please upload a CSV file!')
    }
    cb(undefined, true)
  }
});

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

async function read_csv(csv_file) {
  let idColumnFound = false;
  let emailColumnFound = false;
  let readStream = fs.createReadStream(csv_file.path);
  let header = true;
  let idLocation = 0;
  let emailLocation = 0;
  let result = [ ];
  let obj;

  readStream
  .pipe(csv())
  .on('data', (data) => {
      //use an object instead
      // result.push(data);
        if (header) {
        for (let i = 0; i < data.length; i++) {          
          if (data[i] == 'username') {
            idLocation = i;
            idColumnFound = true;
            break;
          }
        }

        for (let i = 0; i < data.length; i++) {          
          if (data[i] == 'email') {
            emailLocation = i;
            emailColumnFound = true;
            break;
          }
        }
        header = false;   
      } else {
        obj = {
          username: data[idLocation],
          emailAddress: data[emailLocation]
        }
        result.push(obj);              
      }    
    })
  .on('error', function (err) {
    console.log(err);
  })
  .on('end', function () {
    fs.unlink(csv_file.path, function (err) {
      if (err) {
        console.log(err)
      }
    });
  })
  
  // if (!idColumnFound && !emailColumnFound) {
  //   throw new Error('Please make sure that your CSV file has at least a column named "username" and "email"');
  // }

  return result;
}

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
  if (req.session.cookieSession) {
    resp.render('convert.hbs', {
      action: req.session.action,
    });
  } else { //401 = invalid credentials
    resp.redirect("/authentication");
  }  
});

app.post('/getUsers', upload.single('csv_file'), (req, resp, next) => {

  let cloudID = req.body['cloudID'];
  let cookieSession = req.body['token'];
  let action = req.body['action'];

  let csv_file = req.file;
  let authentication = `cloud.session.token=${cookieSession}`;

  let filter = action === 'activate' ? 'inactive' : 'active';
  
  if(!cloudID) {
    resp.render('index.hbs', {
      error: "Please provide the instance Cloud ID!!!",
    });//end of the render
  } else {

    request.get({
      // url: `https://${instance}.atlassian.net/rest/api/2/issue/createmeta`,
      url: `https://admin.atlassian.com/gateway/api/ex/jira/${cloudID}/rest/servicedesk/customer-management/noeyeball/1/local-servicedesk-user?active-filter=${filter}&max-results=1000&start-index=0`,
      headers: {
        'cookie': authentication
      },
      json: true,
    }, (err, res, body) => {
    // if result it's ok    
    if (res.statusCode === 200) {
      req.session.cookieSession = authentication;
      req.session.cloudID = cloudID;
      req.session.action = action;

      if (csv_file) {
        read_csv(csv_file).then((data)=>{          
          resp.render('getUsers.hbs', {
            users: data,            
          });
        }).catch((err)=>{
          resp.render('index.hbs', {
            error: err.message
          })
        })
      } else {
        console.log('it worked')
        resp.render('getUsers.hbs', {
          users: body.localCustomers,        
        });
      }      
    } else { //401 = invalid credentials       
      console.log('not working')
      resp.render('index.hbs', {
        error: "Invalid credentials! Please, confirm your user and password and as well make sure that you have access to this instance...",
      });//end of the render
    }
  });//end or get request
  }//else
});

app.post('/migrate', urlencodedParser, (req, resp) => {
  // let user = encodeURIComponent(req.body.username);
  let user = req.body.username;

  let options = {
    uri: `https://admin.atlassian.com/gateway/api/ex/jira/${req.session.cloudID}/rest/servicedesk/customer-management/noeyeball/1/local-servicedesk-user/migrate-to-atlassian-account-user/${user}`,
    method: 'PUT',
    headers: {
      'cookie': `${req.session.cookieSession}`        
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
    uri: `https://admin.atlassian.com/gateway/api/adminhub/customer-directory/directory/${req.session.cloudID}/user/${user}`,
    method: 'PATCH',
    headers: {
      'cookie': `${req.session.cookieSession}`,
      'content-type': 'application/json',
      'origin': 'https://admin.atlassian.com',
      'referer': `https://admin.atlassian.com/s/${req.session.cloudID}/jira-service-desk/portal-only-customers?filter=${user}`,
      'sec-fetch-site': 'same-origin'
    },
    data: {
      "account_status": "inactive"
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
      'cookie': `${req.session.cookieSession}`    
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

app.post('/delete', urlencodedParser, (req, resp) => {
  
  let user = req.body.username;
  
  let options = {
    uri: `https://admin.atlassian.com/gateway/api/adminhub/customer-directory/directory/14faaa98-f013-4d28-a8f7-7d97bee6d9d9/user/${user}`,
    method: 'DELETE',
    headers: {
      'cookie': `${req.session.cookieSession}`,
      'origin': 'https://admin.atlassian.com',
      'referer': `https://admin.atlassian.com/s/${req.session.cloudID}/jira-service-desk/portal-only-customers?filter=${user}`,
      'sec-fetch-site': 'same-origin'
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

