var createHandler = require("azure-function-express").createHandler;
var express = require("express");
var passport = require('passport');
var request = require('request');
var util = require('util');
var fs = require('fs');
var path = require('path');
var certFile = path.resolve(__dirname, 'ssl/splunk.crt');
var keyFile = path.resolve(__dirname, 'ssl/splunk.key');
var cacertFile = path.resolve(__dirname, 'ssl/splunkcacert.pem');

var tenantId = process.env.TENANT_ID;
var clientId = process.env.CLIENT_ID;
var audience = process.env.AUDIENCE;
var splunkToken = process.env.SPLUNK_TOKEN;
var splunkAddress = process.env.SPLUNK_ADDRESS;
var loggingLevel = process.env.LOGGING_LEVEL;

// ******************* INSECURE *************************
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
// ******************* INSECURE *************************

var app = express();
app.use(require('morgan')('immediate'));
app.use(require('body-parser').urlencoded({"extended":true}));
app.use(passport.initialize());

if (!tenantId || !clientId || !audience || !splunkAddress || !splunkToken) {
    console.log("Environment variables are required: TENANT_ID, CLIENT_ID, AUDIENCE, SPLUNK_ADDRESS, SPLUNK_TOKEN.");
}

try {
    var certString = fs.readFileSync(certFile);
    var keyString = fs.readFileSync(keyFile);
} catch(err) {
    console.log("Unable to read cert files. Error: ", JSON.stringify(err));
}

var s1 = util.format("https://login.microsoftonline.com/%s/v2.0/.well-known/openid-configuration", tenantId);
var s2 = util.format("https://sts.windows.net/%s/", tenantId);

var BearerStrategy = require("passport-azure-ad").BearerStrategy;
var bearerStrategyOptions = {
    identityMetadata: s1,
    clientID: clientId,
    issuer: s2,
    audience: audience,
    loggingLevel: loggingLevel || "error",
    passReqToCallback: false
};

var bearerStrategy = new BearerStrategy(bearerStrategyOptions, function (token, done) {
    done(null, {}, token);
});

passport.use(bearerStrategy);

var requestOptions = {
    url: splunkAddress,
    headers: {
        'Authorization': 'Splunk ' + splunkToken
    },
    ca: fs.readFileSync(cacertFile)    
};
//console.log("requestOptions: ", JSON.stringify(requestOptions));

app.use(require('morgan')('combined'));

// This is where your API methods are exposed
app.post(
    "/api/sendToSplunk",
    passport.authenticate("oauth-bearer", { session: false }),
    function (req, res) {

        //console.debug("Bearer strategy options: ", JSON.stringify(bearerStrategyOptions));
        //console.debug("AuthInfo: ", JSON.stringify(req.authInfo));
        
        //console.debug("s1: ", s1);
        //console.debug("s2: ", s2);

        requestOptions.body = JSON.stringify(req.body);
        //console.debug('body text: ', JSON.stringify(req.body));

        request.post(requestOptions, function (error, response, body) {
            if (error) {
                console.error('error:', JSON.stringify(error));
                res.status(500).end();
            } else {
                res.status(200).end();
            }
        });
    }
);

module.exports = createHandler(app);