import { Configuration } from 'webpack';
import WebpackTreeDenpendensPlugin from '@webpack-tree-denpendens-plugin/core';
import path from 'path';
import HTMLPlugin from 'html-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

export default [
    {
        entry: {
            denpendens: './index.js',
        },
        mode: 'production',
        target: 'node',
        devtool: 'cheap-source-map',
        output: {
            path: path.resolve('dist'),
            filename: '[name].js',
        },
        resolve: {
            // extensions: ['.js', '.ts', '.json'],
        },
        plugins: [new WebpackTreeDenpendensPlugin()],
    } as Configuration,
    {
        entry: {
            web: './processProfile.ts',
        },
        mode: 'development',
        target: 'web',
        devtool: 'cheap-source-map',
        output: {
            path: path.resolve('dist'),
            filename: '[name].js',
            // library: 'ProcessProfile',
            // library: {
            //     amd: 'ProcessProfile',
            //     name: 'ProcessProfile'
            // },
            libraryTarget: 'window',
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    use: ['ts-loader'],
                },
            ],
        },
        plugins: [new HTMLPlugin({ template: path.resolve('public/index.html'), scriptLoading: 'blocking' })],
    } as Configuration,
];
