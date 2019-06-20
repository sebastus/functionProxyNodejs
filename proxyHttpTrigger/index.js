var createHandler = require("azure-function-express").createHandler;
var express = require("express");
var passport = require('passport');
var util = require('util');
var request = require('request');

var fs = require('fs');
var path = require('path');
var cacertFile = path.resolve(__dirname, 'ssl/splunkcacert.pem');

var tenantId = process.env.TENANT_ID;
var clientId = process.env.CLIENT_ID;
var audience = process.env.AUDIENCE;
var loggingLevel = process.env.LOGGING_LEVEL || "error";
var splunkToken = process.env.SPLUNK_TOKEN;
var splunkAddress = process.env.SPLUNK_ADDRESS;
var splunkCertCN = process.env.SPLUNK_CERT_CN || "SplunkServerDefaultCert";

var app = express();

// set up structures needed to authenticate this app with AAD
app.use(passport.initialize());

var s1 = util.format("https://login.microsoftonline.com/%s/v2.0/.well-known/openid-configuration", tenantId);
var s2 = util.format("https://sts.windows.net/%s/", tenantId);

var bearerStrategyOptions = {
    identityMetadata: s1,
    clientID: clientId,
    issuer: s2,
    audience: audience,
    loggingLevel: loggingLevel,
    passReqToCallback: false
};

var BearerStrategy = require("passport-azure-ad").BearerStrategy;
var bearerStrategy = new BearerStrategy(bearerStrategyOptions, function (token, done) {
    console.log('token: ', JSON.stringify(token));
    done(null, {}, token);
});
passport.use(bearerStrategy);
// done with set up structures

app.post(
    "/api/sendToSplunk",
    passport.authenticate("oauth-bearer", { session: false }),
    function (req, res) {
        console.log('request body: ', req.body);

        var requestOptions = {
            url: splunkAddress,
            headers: {
                'Content-Type': 'text/plain',
                'Authorization': 'Splunk ' + splunkToken,
                'Host': splunkCertCN
            },
            agentOptions: {
                ca: fs.readFileSync(cacertFile)
            },
            body: req.body
        };
        
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
                    console.log('request body: ', req.body);
                    console.log('requestOptions.body: ', requestOptions.body);
                    console.log('response body: ', JSON.stringify(response.body));
                    console.log('headers: ', JSON.stringify(response.headers));
                }

                res.status(response.statusCode).end();

            } else {
                res.status(500).end();
            }
        });
        
        res.status(200).end();
    }
);

module.exports = createHandler(app);
