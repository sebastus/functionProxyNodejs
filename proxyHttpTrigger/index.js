const createHandler = require("azure-function-express").createHandler;
const express = require("express");
const passport = require('passport');
const request = require('request');

var tenantId = process.env.TENANT_ID;
var clientId = process.env.CLIENT_ID;
var audience = process.env.AUDIENCE;

var BearerStrategy = require("passport-azure-ad").BearerStrategy;
var bearerStrategyOptions = {
    identityMetadata: util.format("https://login.microsoftonline.com/%s/v2.0/.well-known/openid-configuration", tenantId),
    clientID: clientId,
    issuer: util.format("https://sts.windows.net/%s/", tenantId),
    audience: audience,
    loggingLevel: "info",
    passReqToCallback: false
};

const app = express();
app.use(require('morgan')('combined'));
app.use(require('body-parser').urlencoded({"extended":true}));

app.use(passport.initialize());
var bearerStrategy = new BearerStrategy(bearerStrategyOptions, function (token, done) {
    done(null, {}, token);
});
passport.use(bearerStrategy);

console.log("Bearer strategy options: ", JSON.stringify(bearerStrategyOptions));

var requestOptions = {
    url: process.env.SPLUNK_ADDRESS,
    headers: {
        'Authorization': 'Splunk ' + process.env.SPLUNK_TOKEN
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

        requestOptions.body = JSON.stringify(req.body);
        // console.log('body text: ', JSON.stringify(req.body));

        request.post(requestOptions, function (error, response, body) {
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