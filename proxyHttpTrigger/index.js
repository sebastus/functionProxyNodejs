var createHandler = require("azure-function-express").createHandler;
var express = require("express");
var passport = require('passport');
var util = require('util');
var request = require('request');
var serializeError = require('serialize-error');

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
    //console.log('token: ', JSON.stringify(token));
    done(null, {}, token);
});
passport.use(bearerStrategy);
// done with set up structures

app.post(
    "/api/sendToSplunk",
    passport.authenticate("oauth-bearer", { session: false }),
    function (req, res) {

        console.log('Received a post from upstream.');

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

        if (typeof(req.body)=='object') {
            requestOptions.json = true;
        } else {
            console.log('typeof(req.body): ', typeof(req.body));
            requestOptions.json = false;
            requestOptions.headers['Content-Length'] = Buffer.byteLength(req.body);
        }
        
        request.post(requestOptions, function (error, response, body) {

            console.log('Callback function for post to Splunk.');

            if (error) {

                console.error('An error occurred.');
                console.error('requestOptions: ', JSON.stringify(requestOptions));

                var msg = '';
                if (typeof(error) == 'object') {
                    msg = serializeError(error);
                } else {
                    msg = error;
                }
                console.error('error:', msg);

            } else if (response) {
                
                if (response.statusCode != 200) {
                    console.log('request body: ', req.body);
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
