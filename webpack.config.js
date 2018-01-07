const path = require("path");
const APP_DIR = path.resolve(__dirname, 'js');
const phaserModulePath = path.join(__dirname, '/node_modules/phaser');

module.exports = {
    entry: "./public/js/game.js",
    output: {
        filename: './public/js/bundle.js'
    },
    module: {
        rules: [
            
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
                include: APP_DIR,
            },
            
            {
                test: /pixi\.js/,
                use: [{
                    loader: 'script-loader',
                    options: 'PIXI',
                    
                }],
            },
            {
                test: /phaser-split\.js$/,
                use: [{
                    loader: 'expose-loader',
                    options: 'Phaser',
                }],
            },
            {
                test: /p2\.js/,
                use: [{
                    loader: 'script-loader',
                    options: 'p2',
                }],
            },
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx', '.json'],
        modules: ['node_modules'],
        alias: {
            constants: `${APP_DIR}/constants`,
            phaser: path.join(phaserModulePath, 'build/custom/phaser-split.js'),
            pixi: path.join(phaserModulePath, 'build/custom/pixi.js'),
            p2: path.join(phaserModulePath, 'build/custom/p2.js')
        }
    }
};