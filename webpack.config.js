const path = require('path');

module.exports = {
    mode: 'development',
    entry: './src/index.ts',
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
            vue: "vue/dist/vue.esm-bundler.js"
        }
    },
    output: {
        // filename: 'bundle.js',
        path: path.resolve(__dirname, 'static/js-built'),
        filename: "index.js"
    },
    watchOptions: {
        // Need this on NFS
        poll: 5000,
    }
};
