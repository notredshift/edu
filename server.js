var http = require("http");
var httpProxy = require("http-proxy");

var TARGET = process.env.TARGET || "https://redshiftfun.org";
var PORT = parseInt(process.env.PORT, 10) || 3000;
var HOST_HEADER = TARGET.replace(/^https?:\/\//, "");

var proxy = httpProxy.createProxyServer({
    target: TARGET,
    changeOrigin: true,
    secure: true,
    ws: true,
    followRedirects: false,
    headers: { host: HOST_HEADER },
    cookieDomainRewrite: { "*": "" },
});

proxy.on("proxyRes", function (proxyRes) {
    delete proxyRes.headers["strict-transport-security"];
    delete proxyRes.headers["content-security-policy"];
    delete proxyRes.headers["content-security-policy-report-only"];
    delete proxyRes.headers["x-frame-options"];

    var loc = proxyRes.headers["location"];
    if (loc) {
        proxyRes.headers["location"] = loc.replace(
            new RegExp("https?://" + HOST_HEADER.replace(/\./g, "\\."), "g"),
            ""
        );
    }

    var ck = proxyRes.headers["set-cookie"];
    if (ck) {
        proxyRes.headers["set-cookie"] = ck.map(function (c) {
            return c
                .replace(/;\s*domain=[^;]*/gi, "")
                .replace(/;\s*secure/gi, "")
                .replace(/;\s*samesite=[^;]*/gi, "; SameSite=Lax");
        });
    }
});

proxy.on("error", function (err, req, res) {
    if (res.writeHead) {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end("upstream unreachable");
    }
});

var server = http.createServer(function (req, res) {
    proxy.web(req, res);
});

server.on("upgrade", function (req, socket, head) {
    proxy.ws(req, socket, head);
});

server.listen(PORT, "0.0.0.0", function () {
    console.log("listening on :" + PORT);
});
