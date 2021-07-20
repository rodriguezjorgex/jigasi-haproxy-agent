const RestWatcher = require('../RestWatcher.js');
const healthyJibriResponse = {};

const healthyStatsResponse = {
    'graceful_shutdown': 0,
    'participants': 0,
    'stress_level': 0
};

const unhealthyJibriResponse = false;

const unhealthyStatsResponse = false;

const mockGoodRestClient = {
    getHealth: jest.fn().mockReturnValue(Promise.resolve(healthyJibriResponse)),
    getStats: jest.fn().mockReturnValue(Promise.resolve(healthyStatsResponse))
};

const mockBadRestClient = {
    getHealth: jest.fn().mockReturnValue(Promise.resolve(unhealthyJibriResponse)),
    getStats: jest.fn().mockReturnValue(Promise.resolve(unhealthyStatsResponse))
};


describe('RestWatcher', () => {
    let restWatcher;

    let mockRestClient;

    beforeEach(() => {
        mockRestClient = mockGoodRestClient;

        restWatcher = new RestWatcher({
            restClient: mockRestClient,
            healthInterval: 100,
            statsInterval: 100
        });
    });

    it('health returns true', async () => {
        const result = await restWatcher._getHealth();

        expect(result).toEqual(true);
    });

    it('stats returns values', async () => {
        const result = await restWatcher._getStats();

        expect(result).toEqual(healthyStatsResponse);
    });

    it('bad health returns false', async () => {
        restWatcher._options.restClient = mockBadRestClient;
        const result = await restWatcher._getHealth();

        expect(result).toEqual(false);
    });

    it('bad stats returns false', async () => {
        restWatcher._options.restClient = mockBadRestClient;
        const result = await restWatcher._getStats();

        expect(result).toEqual(false);
    });

    it('watch health returns true', async () => {
        await restWatcher.watchHealth();
        const health = await restWatcher.getHealth();

        expect(health).toEqual(true);
        restWatcher.stop();
    });

    it('watch stats returns true', async () => {
        await restWatcher.watchStats();
        const stats = await restWatcher.getStats();

        expect(stats).toEqual(healthyStatsResponse);
        restWatcher.stop();
    });

    it('watch health returns false then true', async () => {
        restWatcher._options.restClient = mockBadRestClient;
        await restWatcher.watchHealth();
        let health = restWatcher.getHealth();

        expect(health).toEqual(false);

        restWatcher._options.restClient = mockGoodRestClient;
        await new Promise(resolve => setTimeout(resolve, restWatcher._options.healthInterval + 5));

        health = restWatcher.getHealth();

        expect(health).toEqual(true);

    });

    it('watch stats returns false then true', async () => {
        restWatcher._options.restClient = mockBadRestClient;
        await restWatcher.watchStats();
        let stats = restWatcher.getStats();

        expect(stats).toEqual(false);

        restWatcher._options.restClient = mockGoodRestClient;
        await new Promise(resolve => setTimeout(resolve, restWatcher._options.statsInterval + 5));

        stats = restWatcher.getStats();

        expect(stats).toEqual(healthyStatsResponse);

    });

});
