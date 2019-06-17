var createHandler = require("azure-function-express").createHandler;
var express = require("express");
var passport = require('passport');
var request = require('request');
var util = require('util');
var fs = require('fs');
var path = require('path');
var cacertFile = path.resolve(__dirname, 'ssl/splunkcacert.pem');

var tenantId = process.env.TENANT_ID;
var clientId = process.env.CLIENT_ID;
var audience = process.env.AUDIENCE;
var splunkToken = process.env.SPLUNK_TOKEN;
var splunkAddress = process.env.SPLUNK_ADDRESS;
var loggingLevel = process.env.LOGGING_LEVEL;
var splunkCertCN = process.env.SPLUNK_CERT_CN || "SplunkServerDefaultCert";

// ******************* INSECURE *************************
//process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
// ******************* INSECURE *************************

var app = express();
app.use(require('morgan')('immediate'));
app.use(require('body-parser').urlencoded({"extended":true}));
app.use(passport.initialize());

if (!tenantId || !clientId || !audience || !splunkAddress || !splunkToken) {
    console.log("Environment variables are required: TENANT_ID, CLIENT_ID, AUDIENCE, SPLUNK_ADDRESS, SPLUNK_TOKEN.");
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
        'Authorization': 'Splunk ' + splunkToken,
        'Host': splunkCertCN
    },
    agentOptions: {
        ca: fs.readFileSync(cacertFile)
    }
};
// cert: certString,
// key: keyString,
// passphrase: 'MoDP@ssWyrd'

// console.log("requestOptions: ", JSON.stringify(requestOptions));

app.use(require('morgan')('combined'));

// This is where your API methods are exposed
app.post(
    "/api/sendToSplunk",
    passport.authenticate("oauth-bearer", { session: false }),
    function (req, res) {

        //console.log("Bearer strategy options: ", JSON.stringify(bearerStrategyOptions));
        //console.log("AuthInfo: ", JSON.stringify(req.authInfo));
        
        //console.log("s1: ", s1);
        //console.log("s2: ", s2);

        requestOptions.body = JSON.stringify(req.body);

        request.post(requestOptions, function (error, response, body) {
            if (error) {
                var msg = '';
                if (typeof(error) == 'object') {
                    msg = JSON.stringify(error);
                } else {
                    msg = error;
                }
                console.error('error:', msg);
                res.status(500).end();
            } else if (response) {
                
                if (response.statusCode != 200) {
                    console.log('request body: ', JSON.stringify(req.body));
                    console.log('response body: ', JSON.stringify(response.body));
                    console.log('headers: ', JSON.stringify(response.headers));
                }

                res.status(response.statusCode).end();

            } else {
                res.status(500).end();
            }
        });
    }
);

module.exports = createHandler(app);