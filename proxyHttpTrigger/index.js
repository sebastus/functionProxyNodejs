const createHandler = require("azure-function-express").createHandler;
const express = require("express");
const passport = require('passport');
const request = require('request');

var BearerStrategy = require("passport-azure-ad").BearerStrategy;
var options = {
    identityMetadata: "https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/v2.0/.well-known/openid-configuration",
    clientID: "e08cb344-1556-424a-9aeb-b3cfe4192b7f",
    issuer: "https://sts.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/",
    audience: "https://azuremonitorfunctionproxy.microsoft.onmicrosoft.com",
    loggingLevel: "info",
    passReqToCallback: false
};

var bearerStrategy = new BearerStrategy(options, function (token, done) {
    done(null, {}, token);
});

const app = express();

app.use(require('morgan')('combined'));
app.use(require('body-parser').urlencoded({"extended":true}));
app.use(passport.initialize());
passport.use(bearerStrategy);

var splunkToken = "044afcd1-24f8-4334-8d83-b9c5a809a6b6";

var options = {
    url: 'http://asplunk.uksouth.cloudapp.azure.com:8088/services/collector',
    auth: {
        bearer: 'Splunk ' + splunkToken
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

        options.body = req.body;
        console.log('body text: ', JSON.stringify(req.body));

        request.post(options, function (error, response, body) {
            if (error) {
                console.error('error:', error); // Print the error if one occurred
            } else {
                console.log('statusCode:', response && response.statusCode);
            }
        });
        res.status(200);
    }
);

module.exports = createHandler(app);