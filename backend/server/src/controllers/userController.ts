import {
  Route,
  Controller,
  Get,
  Path,
  Tags,
  Security,
  Body,
  Post,
  Put,
  Delete
} from "tsoa";
import { type User } from "../models/userModel.js";
import { UserService } from "../services/userService.js";
import {
  EditUserRequest,
  ObjectIdString,
  RegisterRequest,
  InvitePlayersByClubRequest
} from "../models/requestModel.js";

@Route("user")
export class UserController extends Controller {
  @Get("clubs")
  @Security("jwt")
  @Tags("User")
  public async getUniqueClubNames(): Promise<string[]> {
    this.setStatus(200);

    return await this.service.getUniqueClubNames();
  }

  @Get("{id}")
  @Security("jwt")
  @Tags("User")
  public async getUser(@Path() id: ObjectIdString): Promise<User> {
    this.setStatus(200);

    return await this.service.getUserById(id);
  }

  @Get("{id}/invitations")
  @Security("jwt")
  public async getPlayerInvitations(
    @Path() id: ObjectIdString
  ): Promise<string[]> {
    this.setStatus(200);
    return await this.service.getPlayerInvitations(id);
  }

  @Post("invite-by-club")
  @Security("jwt")
  public async invitePlayersByClub(
    @Body() requestBody: InvitePlayersByClubRequest
  ): Promise<void> {
    this.setStatus(200);
    await this.service.invitePlayersByClub(requestBody);
  }

  @Post("register")
  @Tags("User")
  public async registerUser(
    @Body() requestBody: RegisterRequest
  ): Promise<void> {
    this.setStatus(201);

    await this.service.registerUser(requestBody);
  }

  @Put("{id}")
  @Security("jwt")
  @Tags("User")
  public async editUser(
    @Path() id: ObjectIdString,
    @Body() requestBody: EditUserRequest
  ): Promise<void> {
    this.setStatus(204);

    await this.service.updateUserById(id, requestBody);
  }

  @Delete("{id}")
  @Security("jwt")
  @Tags("User")
  public async deleteUser(@Path() id: ObjectIdString): Promise<void> {
    this.setStatus(204);

    await this.service.deleteUserById(id);
  }

  private get service(): UserService {
    return new UserService();
  }
}
