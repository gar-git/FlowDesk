import axios from "../utils/axios";
import { API_Route } from "../utils/apiRoute";

export async function getProfile() {
  try {
    return await axios.get(API_Route.getProfile);
  } catch (error) {
    return error;
  }
}

export async function updateNotificationPrefs(payload) {
  try {
    return await axios.patch(API_Route.meNotifications, payload);
  } catch (error) {
    return error;
  }
}

export async function getTeam() {
  try {
    return await axios.get(API_Route.getTeam);
  } catch (error) {
    return error;
  }
}

export async function createUserByAdmin(payload) {
  try {
    return await axios.post(API_Route.createUser, payload);
  } catch (error) {
    return error;
  }
}

export async function getRoleDropdown() {
  try {
    return await axios.get(API_Route.getRoleDropdown);
  } catch (error) {
    return error;
  }
}

export async function getRoster() {
  try {
    return await axios.get(API_Route.roster);
  } catch (error) {
    return error;
  }
}

export async function changePassword(payload) {
  try {
    return await axios.patch(API_Route.changePassword, payload);
  } catch (error) {
    return error;
  }
}

export async function updateUserHierarchy(userId, payload) {
  try {
    return await axios.patch(API_Route.userHierarchy(userId), payload);
  } catch (error) {
    return error;
  }
}
