import * as Helper from './testHelpers';

before(async () => {
    await Helper.initializeTestDb(); // Open the database connection for testing
});

after(async () => {
    await Helper.closeTestDb(); // Close the database connection after all tests
});

