var createHandler = require("azure-function-express").createHandler;
var express = require("express");
var passport = require('passport');
var util = require('util');

var tenantId = process.env.TENANT_ID;
var clientId = process.env.CLIENT_ID;
var audience = process.env.AUDIENCE;
var loggingLevel = process.env.LOGGING_LEVEL || "error";

var app = express();
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
    console.log('token: ', token);
    done(null, {}, token);
});
passport.use(bearerStrategy);

app.post(
    "/api/sendToSplunk",
    passport.authenticate("oauth-bearer", { session: false }),
    function (req, res) {
        console.log('request body: ', req.body);

        res.status(200).end();
    }
);

module.exports = createHandler(app);
