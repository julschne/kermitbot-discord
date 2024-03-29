"use strict";

// =========================== //
// = Copyright (c) TheShad0w = //
// =========================== //

/**
 * @typedef {import("discord.js").Message & {channel: import("discord.js").GuildChannel}} Message
 */

// Core Modules
let path = require("path");

// Dependencies
let Discord = require("discord.js");
let express = require("express");
let favicon = require("serve-favicon");
let cors = require("cors");
let helmet = require("helmet");
let session = require("express-session");
let csrf = require("csurf");
let cookieParser = require("cookie-parser");
let MemoryStore = require("memorystore")(session);

// API


// Utils
let conf = require("./utils/configHandler");
let log = require("./utils/loggingHandler");
let meta = require("./utils/meta");

// Services
let portHandler = require("./web/services/portCheck");

const client = new Discord.Client();

let appname = conf.getName();
let version = conf.getVersion();

console.log(
    "\n" +
    " #" + "-".repeat(14 + appname.length + version.toString().length) + "#\n" +
    " # " + appname + " v" + version + " gestartet #\n" +
    " #" + "-".repeat(14 + appname.length + version.toString().length) + "#\n"
);

let app = express();

log.info(`Starte ${appname}...`);
const config = conf.getConfig();

meta((data) => {
    log.info(`Environment: ${data.environment}`);
    log.info(`NodeJS Version: ${data.nodeversion}`);
    log.info(`Operating System: ${data.os}`);
    log.info(`Server IP: ${data.ip}`);
});

app.enable("trust proxy");

app.set("view engine", "ejs");
app.set("port", portHandler(config.webserver.port));
app.set("views", path.join(__dirname, "web", "views"));

app.use(helmet());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(favicon(path.join(__dirname, "web", "public", "favicon.png")));
app.use(cookieParser());
app.use(session({
    secret: config.webserver.session_secret,
    resave: false,
    cookie: { maxAge: 3 * 60 * 60 * 1000 },
    store: new MemoryStore({ checkPeriod: 86400000 }),
    saveUninitialized: false
}));
app.use(csrf({ cookie: false }));
app.use(express.static((process.env.NODE_ENV && (process.env.NODE_ENV).toLowerCase() === "production")
    ? "./web/public-built"
    : "./web/public"
));

require("./web/router")(app, client);

process.on("unhandledRejection", (err, promise) => {
    log.error("Unhandled rejection (promise: " + promise + ", reason: " + err + ")");
});

client.on("ready", () => {
    log.info("Bot läuft...");
    log.info(`${client.users.cache.size} User, in ${client.channels.cache.size} Kanälen von ${client.guilds.cache.size} Guilden`);
    client.user.setActivity(config.bot_settings.bot_status);
});

client.on("guildCreate", (guild) => {
    log.info(`Neuer Gilde beigetreten: ${guild.name} (id: ${guild.id}) mit ${guild.memberCount} mitgliedern`);
});

client.on("guildDelete", (guild) => {
    log.info(`Von Gilde gelöscht: ${guild.name} (id: ${guild.id}).`);
});

client.on("guildMemberAdd", member => {
    member.send(`
Hallo, ${member.user.username}!
Willkommen auf dem offiziellen pr0gramm Discord.
Damit du auf dem Discord-Server schreiben kannst, musst du dich zuerst mit deinem pr0gramm Account authentifizieren. 
Um das zu tun, klicke auf folgenden Link und verknüpfe deinen Account:
<https://pr0gramm.com/discord>
Nachdem du das getan hast, wirst du automatisch freigeschaltet. 
Dann kannst du deinen Account auf dem Discord Server hier verwalten:
<https://discordpanel.pr0gramm.com>
Viel Spaß! :orange_heart:
`
    );
});

// client.on("message", (message) => {
//     if (message.author.bot) return;

//     if (message.content.startsWith("http") && message.content.match(/\bpr0gramm.com\//i)){
//         embedHandler.createEmbed(/** @type {Message} */ (message), (err, embed) => {
//             if (err) return log.error(`Konnte Embed nicht erstellen: ${err}`);
//             message.channel.send(embed);

//             if (config.bot_settings.delete_user_message) message.delete();
//             return null;
//         });
//     }

//     else messageHandler(message, client);
// });

// client.on("messageDelete", message => deletedHandler(message, client));

client.on("error", (err) => {
    log.error(err);
});

log.info("Validiere pr0gramm session...");

login.validSession((isValid) => {
    if (isValid) log.done("Bereits auf pr0gramm eingeloggt");
    else {
        log.warn("Noch nicht auf pr0gramm eingelogt. Versuche login...");
        login.performLogin(config.pr0api.username, config.pr0api.password);
    }
});

log.info("Versuche Token login...");

client.login(config.auth.bot_token).then(() => {
    log.done("Token login war erfolgreich!");
}, (err) => {
    log.error(`Token login war nicht erfolgreich: "${err}"`);
    log.error("Schalte wegen falschem Token ab...\n\n");
    process.exit(1);
});

app.listen(app.get("port"), (err) => {
    if (err){
        log.error(`Fehler auf Port ${app.get("port")}: ${err}`);
        process.exit(1);
    }
    log.info(`Listening auf Port ${app.get("port")}...`);
});