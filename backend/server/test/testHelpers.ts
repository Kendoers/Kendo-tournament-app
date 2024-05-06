import jwt from 'jsonwebtoken';
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import UserModel, { type User as any } from "../src/models/userModel.ts"
import config from "../src/utility/config.ts";

let mongo: MongoMemoryServer;

/*const schema = new Schema<User, UserMethods>(
  {
    email: {
      type: String,
      required: true,
      index: {
        name: "email_idx",
        unique: true,
        collation: { locale: "en", strength: 2 }
      }
    },
    userName: { type: String, set: omitEmptyString },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    inNationalTeam: { type: Boolean, default: false },
    nationality: { type: String, set: omitEmptyString },
    suomisportId: { type: String, set: omitEmptyString },
    clubName: { type: String, set: omitEmptyString },
    danRank: { type: String, set: omitEmptyString },
    underage: { type: Boolean, default: false },
    guardiansEmail: { type: String, set: omitEmptyString },

    // Internal properties 
    password: { type: String, required: true, select: false },
    refreshToken: { type: String, required: false, select: false },
    resetPasswordToken: { type: String, required: false, select: false },
    resetPasswordExpires: { type: Date, required: false, select: false }
  },
  {
    timestamps: true
  }
);*/

// Valid test user 1
const testUser: any = {
  email: 'test-user@gmail.com',
  userName: 'testUser',
  firstName: 'Test',
  lastName: 'User',
  phoneNumber: '045123456789',
  password: 'FooBar123',
  inNationalTeam: false,
  underage: false
};

// Valid test user 2
const testUser2: any = {
  email: 'test-user2@gmail.com',
  userName: 'testUser2',
  firstName: 'Other',
  lastName: 'User',
  phoneNumber: '045987654321',
  password: 'FooBar123',
  inNationalTeam: false,
  underage: false
};

// Valid test user 3
const testUser3: any = {
  email: 'test-user3@gmail.com',
  userName: 'testUser3',
  firstName: 'Another',
  lastName: 'User',
  phoneNumber: '045987789987',
  password: 'FooBar123',
  inNationalTeam: false,
  underage: false
};

// Valid underage user
const underageUser: any = {
  email: 'underage@gmail.com',
  userName: 'underage1',
  firstName: 'Another',
  lastName: 'User',
  phoneNumber: '045123321123',
  password: 'FooBar123',
  inNationalTeam: false,
  underage: true,
  guardiansEmail: 'guardian@gmail.com'
};

// Underage user without guardian email provided
const faultyUnderage: any = {
  email: 'underage@gmail.com',
  userName: 'testUser3',
  firstName: 'Another',
  lastName: 'User',
  phoneNumber: '045123321123',
  password: 'FooBar123',
  inNationalTeam: false,
  underage: true
};

// User with bad password
const badPassword: any = {
  email: 'test-user@gmail.com',
  userName: 'testUser',
  firstName: 'Test',
  lastName: 'User',
  phoneNumber: '045123456789',
  password: 'paska_salasana',
  inNationalTeam: false,
  underage: false
};


function initializeTestDb() {
  return new Promise(async (resolve, reject) => {
    console.log('Creating test database...');
    try {
      mongo = await MongoMemoryServer.create();
      const mongoUri = mongo.getUri();

      await mongoose.connect(mongoUri);
      console.log(`Connected to test database at ${mongoUri}`);

      // Prepopulate the database with test data
      await UserModel.create([testUser, testUser2]); 
      resolve(mongo); // Resolve the promise with the mongo server instance
    } catch (error) {
      console.error('Failed to initialize test database:', error);
      reject(error); // Reject the promise if there's an error
    }
  });
}


async function closeTestDb() {
  await mongoose.disconnect();
  await mongo.stop();
  console.log('Test database disconnected');
};

async function getTestUsers() {
  return await UserModel.find({});
};

async function getTestUserByEmail(email: string) {
  return await UserModel.findOne({email: email});
};

/*
authService.ts
const tokenPayload: TokenPayload = {
      id: user.id,
      adminTournaments: adminTournaments.map((tournament) => tournament.id),
      officialTournaments: officialTournaments.map(
        (tournament) => tournament.id
      )
    };

    const accessToken = generateAccessToken(tokenPayload);

jwtHelper.ts
export interface TokenPayload {
  id: string;
  adminTournaments: string[];
  officialTournaments: string[];
}

export const generateAccessToken = (
  payload: TokenPayload,
  expiresIn: string = "1h"
): string => {
  return jwt.sign(payload, config.ACCESS_JWT_SECRET, { expiresIn });
};
*/

function createTestJwtToken(email: string): string {
  /*const user = UserModel.findOne({email: email});
  const admin: string[] = [];
  const official: string[] = [];
  return jwt.sign({user.id, admin, official}, config.ACCESS_JWT_SECRET, '1h')*/
  return '';
};

export { 
  badPassword, 
  testUser,
  testUser2,
  testUser3,
  underageUser,
  faultyUnderage,
  getTestUsers, 
  getTestUserByEmail, 
  initializeTestDb, 
  closeTestDb,
  createTestJwtToken
};
