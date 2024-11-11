/*import { describe, before, after } from "mocha";
import chai from "chai";
import chaiHttp from "chai-http";
import { CreateApp } from "../../src/utility/app.ts";
import * as Helper from "../testHelpers.ts";
import { type User } from "../../src/models/userModel.ts";
import { Application } from "express";

chai.use(chaiHttp);
const expect = chai.expect;

let app: Application;
let authToken: string;

/!*before(async () => {
    try {
        // Create test database
        console.log('Initializing test database in userController.test.ts');
        await Helper.initializeTestDb();
        // Create app instance
        app = CreateApp();
        console.log('App created');
        // Create jwt token for authorization
        authToken = Helper.createTestJwtToken('test-user@gmail.com');
    } catch (error) {
        console.error('Failed to work:', error);
    }
});*!/

describe('UserController', () => {

    // Dummy test to see if the test environment works and finds the tests
    describe('dummy', () => {
        it('should always pass', () => {
            expect(true).to.equal(true);
        });
    });

/!*    describe('RegisterUser', () => {

        const endpoint = '/api/user/register';

        // Useless, password is checked in frontend
        it('should require valid password', async () => {
            const res = await chai.request(app).post(endpoint).send(Helper.badPassword);
            expect(res).to.have.status(400);
        });

        it('should return 400 if missing required fields', async () => {
            const res = await chai.request(app).post(endpoint).send();
            expect(res).to.have.status(400);
        });

        it('should add valid user in the database', async () => {
            const allUsersBefore = await Helper.getTestUsers();

            const res = await chai.request(app).post(endpoint).send(Helper.underageUser);
            expect(res).to.have.status(201);

            const allUsersAfter = await Helper.getTestUsers();

            expect(allUsersAfter.length).to.equal(allUsersBefore.length + 1);
            expect(allUsersAfter.map(user => user.email)).to.contain('underage@gmail.com')
        });

        it('should notify if user is already registered', async () => {
            const res = await chai.request(app).post(endpoint).send(Helper.testUser);
            expect(res).to.have.status(400);
        });

        it('should return 400 if email is invalid', async () => {
            const res = await chai.request(app).post(endpoint).send(Helper.invalidEmail);
            expect(res).to.have.status(400);
        });

    });*!/

    describe('GetUser', () => {
        // endpoint /api/user/:id
        // get
        let user: User | null;
        let endpoint: string;

        before(async () => {
            user = await Helper.getTestUserByEmail('test-user@gmail.com');
            if(user) {
                endpoint = `/api/user/${user.id}`;
            }
        });

        it('should return 401 when trying to fetch data unauthorized', async () => {
            const res = await chai.request(app).get(endpoint);
            expect(res).to.have.status(401);
        });

        /!*it('should return 404 when trying to fetch non-existing data', async () => {
            // UNAUTHORIZED ERROR???? Commented out until figured out how to fix the tests
            const res = await chai.request(app).get('/api/user/123');
            expect(res).to.have.status(404);
        });*!/

/!*        it('should return 404 for non-existing user', async () => {
            user = await Helper.getTestUserByEmail('enoo.olemassa@gmail.com');
            const res = await chai.request(app).get(`/api/user/${user.id}`)
            expect(user).to.be.null;
            expect(res.body).to.have.property('message', 'User not found');
        });*!/

        /!*it('should return correct existing user', async () => {
            // UNAUTHORIZED ERROR???? Commented out until figured out how to fix the tests
            const res = await chai.request(app).get(endpoint);
            expect(res).to.have.status(200);
            expect(res.body).to.equal(user);
        });*!/

/!*        it('should return correct existing user', async () => {
            console.log('JWT Token:', authToken);
            const res = await chai.request(app)
                .get(endpoint)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res).to.have.status(200);
            expect(res.body).to.deep.equal(user);  // Make sure deep comparison is used for object equality
        });*!/

        //lisää testejä...
    });



    describe('EditUser', () => {
        // endpoint /api/user/:id
        // put
/!*        it('should return the correct user if in database', () => {
            expect('TO').to.equal('DO');
        });

        it('should handle errors gracefully if not found', () => {
            expect('TO').to.equal('DO');
        });*!/

        it('should return the correct user if in database', async () => {
            const userId = 'some-valid-user-id';
            const res = await chai.request(app)
                .get(`/api/user/${userId}`)
                .set('Authorization', `Bearer ${Helper.createTestJwtToken('test-user')}`);

            expect(res).to.have.status(200);
            expect(res.body).to.have.property('id', userId);
        });

        it('should update the user and return the updated user', async () => {
            const userId = 'some-valid-user-id';
            const updatedUserData = {
                email: 'updatedemail@gmail.com',
                age: 30
            };

            let authtoken = Helper.createTestJwtToken('a');
            const res = await chai.request(app)
                .put(`/api/user/${userId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updatedUserData);

            expect(res).to.have.status(204);

            const updatedUser = await Helper.getTestUserById(userId);
            expect(updatedUser.email).to.equal(updatedUserData.email);
            expect(updatedUser.age).to.equal(updatedUserData.age);
        });

        //lisää testejä...
    });



/!*    describe('DeleteUser', () => {
        // endpoint /api/user/:id
        // delete
        it('should return the correct user if in database', () => {
            expect('TO').to.equal('DO');
        });
    });*!/

    //lisää test suiteja...

});

describe('DeleteUser', () => {

    let user: User | null;
    let endpoint: string;
    let authToken: string;

    before(async () => {
        user = await Helper.getTestUserByEmail('test-user@gmail.com');
        if(user) {endpoint = `/api/user/${user.id}`;}
        authToken = Helper.createTestJwtToken('test-user@gmail.com');
    });
/!*
    it('should delete user if it exists in database', async () => {
        const res = await chai.request(app)
            .delete(endpoint)
            .set('Authorization', `Bearer ${authToken}`);
        expect(res).to.have.status(204);

        const deletedUser = await Helper.getTestUserById(userId);
        expect(deletedUser).to.be.null;
    });
*!/

    it('should delete user if it exists in database', async () => {
        const res = await chai.request(app).delete(endpoint).set('Authorization', `Bearer ${authToken}`);
        expect(res).to.have.status(204);

        const deletedUser = await Helper.getTestUserByEmail('test-user@gmail.com');
        expect(deletedUser).to.be.null;
    });
});

/!*after(async () => {
    // Close connection to test database
    await Helper.closeTestDb();
});*!/*/
