module.exports = {
    config: {
        options: {
            configFile: 'config/eslint/config.json'
        },
        src: [
            '*.js',
            'config/**/*.js'
        ]
    },
    src: {
        options: {
            configFile: 'config/eslint/src.json'
        },
        src: [
            'src/**/*.js'
        ]
    }
};
