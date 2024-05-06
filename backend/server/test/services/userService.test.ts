import { describe, beforeEach, afterEach } from "mocha";
import * as chai from "chai";
import sinon, { SinonStub } from "sinon";
import chaiAsPromised from "chai-as-promised";
import * as Helper from "../testHelpers.ts";
import UserModel from "../../src/models/userModel.ts";
import { UserService } from "../../src/services/userService.ts";
import NotFoundError from "../../src/errors/NotFoundError.ts";
import { EditUserRequest, RegisterRequest } from "../../src/models/requestModel.ts";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('UserService', () => {
    let userService: UserService;
    let getUserDocumentByIdStub: SinonStub;
    let testUser: any;

    before(async () => {
        testUser = await UserModel.findOne({email: 'test-user@gmail.com'});
    });

    beforeEach(() => {
      userService = new UserService();
      getUserDocumentByIdStub = sinon.stub(userService, 'getUserDocumentById');
    });
  
    afterEach(() => {
      sinon.restore();
    });

    describe('getUserById', () => {

        it('should return user object by ID', async () => {
            getUserDocumentByIdStub.resolves(testUser);

            const res = await userService.getUserById(testUser.id);
            // await expect(userService.getUserById(user.id)).to.eventually.include({email: 'test-user@gmail.com'});
            expect(res).to.include({email: 'test-user@gmail.com'});
            expect(res).to.include({firstName: 'Test'});
            expect(res).to.include({underage: false});
        });

        it('should throw NotFoundError if user is not found', async () => {
            getUserDocumentByIdStub.rejects(new NotFoundError({message: "User not found"}));

            await expect(userService.getUserById('000000000000'))
            .to.be.rejectedWith(NotFoundError);
        });
    });

    describe('registerUser', () => {

        let registerReq: RegisterRequest;

        beforeEach(() => {
            registerReq = {...Helper.testUser3};
        });

        it('should register a new user successfully', async () => {
            const newUser = {...registerReq};

            await expect(userService.registerUser(newUser)).not.to.be.rejected;

            const createdUser = await UserModel.findOne({ email: newUser.email });
            expect(createdUser).to.exist;
            expect(createdUser).to.have.property('firstName', newUser.firstName);
        });

        it('should throw BadRequestError if email already exists', async () => {

            await expect(userService.registerUser(registerReq))
                .to.be.rejectedWith("Email already exists");
        });

        it('should throw BadRequestError if underage user without guardian email', async () => {
            const underageUser = {...registerReq, underage: true, guardiansEmail: ''};

            await expect(userService.registerUser(underageUser))
                .to.be.rejectedWith("Guardian's email is required for underage users");
        });

    });

    describe('updateUserById', () => {

        let updateReq: EditUserRequest;

        beforeEach(() => {
            updateReq = {...Helper.testUser};
        });

        it('should update user successfully', async () => {
            updateReq.firstName = 'Modified';

            getUserDocumentByIdStub.resolves(testUser);

            await expect(userService.updateUserById(testUser.id, updateReq))
            .not.to.be.rejected;

            const updatedDoc: any | undefined = await UserModel.findOne({firstName: updateReq.firstName});

            expect(updatedDoc).to.exist;
            expect(updatedDoc).to.have.property('email');
            expect(updatedDoc.email).to.equal('test-user@gmail.com');

            expect( await UserModel.findOne({firstName: 'Modified'})).to.exist;
        });

        it('should throw error when underage user doesn\'t have guardian email', async () => {
            updateReq.underage = true;

            getUserDocumentByIdStub.resolves(testUser);

            await expect(userService.updateUserById(testUser.id, updateReq))
            .to.be.rejectedWith("Guardian's email is required for underage users");
            
        });

        it('should throw error when email is already in use', async () => {
            updateReq.underage = false;
            updateReq.email = 'test-user2@gmail.com';

            getUserDocumentByIdStub.resolves(testUser);

            await expect(userService.updateUserById(testUser.id, updateReq))
            .to.be.rejectedWith("Email already exists");
        });

        it('should throw NotFoundError if user is not found', async () => {
            getUserDocumentByIdStub.rejects(new NotFoundError({message: "User not found"}));

            await expect(userService.updateUserById('000000000000', updateReq))
            .to.be.rejectedWith(NotFoundError);
        });

    });

    describe('deleteUserById', () => {
        it('should throw NotFoundError if user is not found', async () => {
            getUserDocumentByIdStub.rejects(new NotFoundError({message: "User not found"}));

            await expect(userService.deleteUserById('000000000000'))
            .to.be.rejectedWith(NotFoundError);
        });

        it('should delete information of deleted user', async () => {
            getUserDocumentByIdStub.resolves(testUser);

            await expect(userService.deleteUserById(testUser.id))
            .not.to.be.rejected
            .and.to.equal(undefined);

            const res: any | undefined = await UserModel.findById(testUser.id);
            expect(res).to.exist;
            expect(res).to.have.property('email');
            expect(res.email).to.include('deleted_user_');
        });
    });
});