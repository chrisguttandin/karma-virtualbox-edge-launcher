const virtualBoxEdgeLauncher = require('../../src/module.js');

describe('karma-virtualbox-edge-launcher', () => {

    it('should export the launcher', () => {
        expect(virtualBoxEdgeLauncher['launcher:VirtualBoxEdge']).to.not.be.undefined;
    });

});
