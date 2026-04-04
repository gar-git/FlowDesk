import axios from "../utils/axios";
import { API_Route } from "../utils/apiRoute";

export async function signup(reqData) {
  try {
    const response = await axios.post(API_Route.signup, reqData);
    return response;
  } catch (error) {
    return error;
  }
}

export async function login(reqData) {
  try {
    const response = await axios.post(API_Route.login, reqData);
    return response;
  } catch (error) {
    return error;
  }
}