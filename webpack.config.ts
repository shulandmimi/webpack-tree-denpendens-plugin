import { Configuration } from 'webpack';
import WebpackTreeDenpendensPlugin from './dist/index';
import path from 'path';

export default {
    entry: {
        index: './examples/run/index.js',
    },
    mode: 'development',
    devtool: 'cheap-module-source-map',
    output: {
        path: path.resolve('./examples/dist/'),
        filename: '[name].js',
    },
    plugins: [new WebpackTreeDenpendensPlugin()],
} as Configuration;
