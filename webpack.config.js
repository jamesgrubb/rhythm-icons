const path               = require("path");
const HtmlWebpackPlugin  = require("html-webpack-plugin");
const CopyWebpackPlugin  = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const fs = require("fs");
const os = require("os");

// Only read SSL certs in development when they exist
const isDevelopment = process.env.NODE_ENV !== 'production';
const certKeyPath = path.join(os.homedir(), '.office-addin-dev-certs/localhost.key');
const certCrtPath = path.join(os.homedir(), '.office-addin-dev-certs/localhost.crt');
const hasCerts = isDevelopment && fs.existsSync(certKeyPath) && fs.existsSync(certCrtPath);

// Read certs only if they exist (to avoid ENOENT in production)
let sslKey, sslCert;
if (hasCerts) {
  sslKey = fs.readFileSync(certKeyPath);
  sslCert = fs.readFileSync(certCrtPath);
}

module.exports = {
  entry: {
    taskpane: ["./taskpane.css", "./auth.js", "./icons.js", "./taskpane.js"],
  },
  output: {
    path:     path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js",
    clean:    true,
  },
  resolve: {
    extensions: [".js"],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: { loader: "babel-loader", options: { presets: ["@babel/preset-env"] } },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      filename: "taskpane.html",
      template: "./taskpane.html",
      chunks:   ["taskpane"],
    }),
    new HtmlWebpackPlugin({
      filename: "auth-dialog.html",
      template: "./auth-dialog.html",
      chunks:   [], // No webpack bundles needed, uses CDN scripts
    }),
    new MiniCssExtractPlugin({ filename: "[name].css" }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "manifest.xml",    to: "manifest.xml" },
        { from: "public/assets",   to: "assets",  noErrorOnMissing: true },
      ],
    }),
  ],
  devServer: hasCerts ? {
    port:    3000,
    server: {
      type: 'https',
      options: {
        key: sslKey,
        cert: sslCert,
      },
    },
    static:  path.join(__dirname, "dist"),
    headers: { "Access-Control-Allow-Origin": "*" },
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3001',
        secure: false,
        changeOrigin: true,
      },
    ],
  } : {
    // Minimal config for production build (devServer not actually used)
    port: 3000,
  },
};
