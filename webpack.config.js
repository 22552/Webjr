var WebpackNotifierPlugin = require('webpack-notifier');

module.exports = {
    // Webpack 4's source-map plugin and bundled TerserPlugin rely on MD4 in
    // places that modern Node/OpenSSL disables. Keep Webpack responsible for
    // bundling only; Webjr can use a modern minifier separately later.
    devtool: false,
    entry: {
        app: './src/entry/app.js'
    },
    output: {
        path: __dirname + '/src/build/bundles',
        filename: '[name].bundle.js',
        hashFunction: 'sha256'
    },
    optimization: {
        minimize: false
    },
    performance: {
        hints: false
    },
    watchOptions: {
        ignored: ["node_modules", "src/build/**/*"]
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: /node_modules/,
                loaders: ['strip-sourcemap-loader']
            },
            {
                loader: 'babel-loader',
                exclude: /node_modules/,
                test: /\.jsx?$/,
                query: {
                    presets: ['es2015', 'stage-3']
                }
            }
        ]
    },
    plugins: [
        new WebpackNotifierPlugin({
            title: "ScratchJr",
            alwaysNotify: true
        })
    ]
};
