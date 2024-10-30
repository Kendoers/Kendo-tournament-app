import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { Tournament, User, Match, PointType } from "types/models";
import type {
  SignupForTournamentRequest,
  CreateTournamentRequest,
  LoginRequest,
  RegisterRequest,
  AddPointRequest,
  EditUserRequest,
  ResetPasswordRequest,
  EditTournamentRequest,
  ChangeCourtTimeRequest
} from "types/requests";

export const API_BASE_URL =
  process.env.REACT_APP_API_URL ?? "http://localhost:8080";
export const AUTH_API = "/api/auth";
export const USER_API = "/api/user";
export const TOURNAMENTS_API = "/api/tournaments";
export const MATCH_API = "/api/match";

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 10000
});

// Create a separate instance for authentication requests to avoid
// infinite retry loop inside the axios instance interceptor.
export const axiosAuthInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 10000
});

const responseBody = <T>(response: AxiosResponse<T>): T => response.data;

const request = {
  get: async <T>(url: string, requestConfig?: AxiosRequestConfig) => {
    const response = await axiosInstance.get<T>(url, requestConfig);
    return responseBody(response);
  },

  delete: async <T>(url: string, requestConfig?: AxiosRequestConfig) => {
    const response = await axiosInstance.delete<T>(url, requestConfig);
    return responseBody(response);
  },

  post: async <T>(
    url: string,
    body: unknown,
    requestConfig?: AxiosRequestConfig
  ) => {
    const response = await axiosInstance.post<T>(url, body, requestConfig);
    return responseBody(response);
  },

  put: async <T>(
    url: string,
    body: unknown,
    requestConfig?: AxiosRequestConfig
  ) => {
    const response = await axiosInstance.put<T>(url, body, requestConfig);
    return responseBody(response);
  },
  patch: async <T>(
    url: string,
    body?: unknown,
    requestConfig?: AxiosRequestConfig
  ) => {
    const response = await axiosInstance.patch<T>(url, body, requestConfig);
    return responseBody(response);
  }
};

const user = {
  details: async (id: string) => await request.get<User>(`${USER_API}/${id}`),

  register: async (body: RegisterRequest) =>
    await request.post(`${USER_API}/register`, body),

  update: async (id: string, body: EditUserRequest) =>
    await request.put<User>(`${USER_API}/${id}`, body),

  delete: async (id: string) => await request.delete(`${USER_API}/${id}`)
};

const auth = {
  login: async (body: LoginRequest) => {
    return await request.post<{ userId: string }>(`${AUTH_API}/login`, body);
  },

  logout: async () => {
    await request.post(`${AUTH_API}/logout`, {});
  },

  refresh: async () => {
    await request.get(`${AUTH_API}/refresh`);
  },

  checkAuth: async () => {
    return await request.get<{ userId: string }>(`${AUTH_API}/check-auth`);
  },

  recoverPassword: async (email: string) => {
    await request.post(`${AUTH_API}/recover`, {}, { params: { email } });
  },

  resetPassword: async (body: ResetPasswordRequest) => {
    await request.patch(`${AUTH_API}/reset`, body);
  }
};

const tournaments = {
  getAll: async () => {
    return await request.get<Tournament[]>(`${TOURNAMENTS_API}`);
  },

  getTournament: async (tournamentId: string) => {
    return await request.get<Tournament>(`${TOURNAMENTS_API}/${tournamentId}`);
  },

  addTeamToTournament: async (tournamentId: string, teamName: string) => {
    return await request.post<Tournament>(
      `${TOURNAMENTS_API}/${tournamentId}/add-team`,
      { name: teamName }
    );
  },

  removeTeamFromTournament: async (tournamentId: string, teamId: string) => {
    return await request.delete<Tournament>(
      `${TOURNAMENTS_API}/${tournamentId}/remove-team`,
      { data: { teamId } }
    );
  },

  joinTeam: async (tournamentId: string, teamId: string, userId: string) => {
    return await request.post<Tournament>(
      `${TOURNAMENTS_API}/${tournamentId}/teams/${teamId}/join`,
      { userId }
    );
  },

  leaveTeam: async (tournamentId: string, teamId: string, userId: string) => {
    return await request.delete(
      `${TOURNAMENTS_API}/${tournamentId}/teams/${teamId}/leave`,
      { data: { userId } }
    );
  },

  kickPlayerFromTeam: async (
    tournamentId: string,
    teamId: string,
    userId: string
  ) => {
    return await request.delete(
      `${TOURNAMENTS_API}/${tournamentId}/teams/${teamId}/kickPlayer`,
      { data: { userId } }
    );
  },

  createNew: async (body: CreateTournamentRequest) => {
    return await request.post<Tournament>(`${TOURNAMENTS_API}`, body);
  },

  createSchedule: async (tournamentId: string): Promise<Tournament> => {
    const res = await request.post(
      `${TOURNAMENTS_API}/${tournamentId}/create-schedule`,
      {}
    );
    return res as Tournament;
  },

  signup: async (tournamentId: string, body: SignupForTournamentRequest) => {
    return await request.put(
      `${TOURNAMENTS_API}/${tournamentId}/sign-up`,
      body
    );
  },

  cancelSignup: async (tournamentId: string, userId: string) => {
    return await request.delete(
      `${TOURNAMENTS_API}/${tournamentId}/cancel-signup`,
      {
        data: {
          playerId: userId
        }
      }
    );
  },

  update: async (tournamentId: string, body: EditTournamentRequest) => {
    return await request.put<Tournament>(
      `${TOURNAMENTS_API}/${tournamentId}/update`,
      body
    );
  },

  delete: async (tournamentId: string) => {
    return await request.delete(`${TOURNAMENTS_API}/${tournamentId}/delete`);
  },

  markUserMatchesLost: async (tournamentId: string, userId: string) => {
    return await request.put(
      `${TOURNAMENTS_API}/${tournamentId}/mark-user-matches-lost`,
      { userId }
    );
  }
};

const match = {
  info: async (matchId: string) => {
    return await request.get<Match>(`${MATCH_API}/${matchId}`);
  },
  addPoint: async (matchId: string, body: AddPointRequest) => {
    await request.patch(`${MATCH_API}/${matchId}/points`, body);
  },
  changeCourtAndTime: async (matchId: string, body: ChangeCourtTimeRequest) => {
    await request.patch(`${MATCH_API}/${matchId}/court-time`, body);
  },
  startTimer: async (matchId: string) => {
    await request.patch(`${MATCH_API}/${matchId}/start-timer`);
  },
  stopTimer: async (matchId: string) => {
    await request.patch(`${MATCH_API}/${matchId}/stop-timer`);
  },
  checkForTie: async (matchId: string) => {
    await request.patch(`${MATCH_API}/${matchId}/check-tie`);
  },
  addTimekeeper: async (matchId: string, userId: string) => {
    await request.patch(`${MATCH_API}/${matchId}/add-timekeeper`, {
      timeKeeperId: userId
    });
  },
  removeTimekeeper: async (matchId: string, userId: string) => {
    await request.patch(`${MATCH_API}/${matchId}/remove-timekeeper`, {
      timeKeeperId: userId
    });
  },
  addPointmaker: async (matchId: string, userId: string) => {
    await request.patch(`${MATCH_API}/${matchId}/add-pointmaker`, {
      pointMakerId: userId
    });
  },
  removePointmaker: async (matchId: string, userId: string) => {
    await request.patch(`${MATCH_API}/${matchId}/remove-pointmaker`, {
      pointMakerId: userId
    });
  },
  deleteRecentPoint: async (matchId: string) => {
    await request.delete(`${MATCH_API}/${matchId}/delete-recent`);
  },

  modifyRecentPoint: async (matchId: string, newPointType: PointType) => {
    await request.patch(`${MATCH_API}/${matchId}/modify-recent`, {
      newPointType
    });
  },
  resetMatch: async (matchId: string) => {
    await request.patch(`${MATCH_API}/${matchId}/reset-match`);
  },
  resetRoles: async (matchId: string) => {
    await request.patch(`${MATCH_API}/${matchId}/reset-roles`);
  }
};

const api = {
  auth,
  user,
  tournaments,
  match
};

export default api;
