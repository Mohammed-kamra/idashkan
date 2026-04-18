const webpack = require("webpack");
const pkg = require("./package.json");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.plugins.push(
        new webpack.DefinePlugin({
          __APP_VERSION__: JSON.stringify(pkg.version || "0.0.0"),
        }),
      );
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        { module: /stylis-plugin-rtl/ },
      ];
      return webpackConfig;
    },
  },
};
