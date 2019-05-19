const createHandler = require("azure-function-express").createHandler;
const express = require("express");
const passport = require('passport');
const request = require('request');
const util = require('util');

var tenantId = process.env.TENANT_ID;
var clientId = process.env.CLIENT_ID;
var audience = process.env.AUDIENCE;

var s1 = util.format("https://login.microsoftonline.com/%s/v2.0/.well-known/openid-configuration", tenantId);
var s2 = util.format("https://sts.windows.net/%s/", tenantId);

var BearerStrategy = require("passport-azure-ad").BearerStrategy;
var bearerStrategyOptions = {
    identityMetadata: "https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/v2.0/.well-known/openid-configuration",
    clientID: "e08cb344-1556-424a-9aeb-b3cfe4192b7f",
    issuer: "https://sts.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/",
    audience: "https://azuremonitorfunctionproxy.microsoft.onmicrosoft.com",
    loggingLevel: "info",
    passReqToCallback: false
};

var bearerStrategy = new BearerStrategy(bearerStrategyOptions, function (token, done) {
    done(null, {}, token);
});

const app = express();

app.use(require('morgan')('combined'));
app.use(require('body-parser').urlencoded({"extended":true}));
app.use(passport.initialize());
passport.use(bearerStrategy);

var splunkToken = process.env.SPLUNK_TOKEN;

var options = {
    url: 'http://asplunk.uksouth.cloudapp.azure.com:8088/services/collector',
    headers: {
        'Authorization': 'Splunk ' + splunkToken
    }
}
// This is where your API methods are exposed
app.post(
    "/api/sendToSplunk",
    passport.authenticate("oauth-bearer", { session: false }),
    function (req, res) {
        // var claims = req.authInfo;
        // console.log("User info: ", req.user);
        // console.log("Validated claims: ", JSON.stringify(claims));

        console.log("Bearer strategy options: ", JSON.stringify(bearerStrategyOptions));
        console.log("s1: ", s1);
        console.log("s2: ", s2);

        options.body = JSON.stringify(req.body);
        // console.log('body text: ', JSON.stringify(req.body));

        request.post(options, function (error, response, body) {
            if (error) {
                console.error('error:', error); // Print the error if one occurred
                res.status(500);
            } else {
                // console.log('statusCode:', response && response.statusCode);
                res.status(200).end();
            }
        });
    }
);

module.exports = createHandler(app);