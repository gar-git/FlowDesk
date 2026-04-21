import axios from "../utils/axios";
import { API_Route } from "../utils/apiRoute";

export async function listProjects() {
  try {
    return await axios.get(API_Route.projects);
  } catch (error) {
    return error;
  }
}

export async function createProject(payload) {
  try {
    return await axios.post(API_Route.projects, payload);
  } catch (error) {
    return error;
  }
}

export async function getProjectMembers(projectId) {
  try {
    return await axios.get(API_Route.projectMembers(projectId));
  } catch (error) {
    return error;
  }
}

export async function addProjectMember(projectId, userId) {
  try {
    return await axios.post(API_Route.projectMembers(projectId), { userId });
  } catch (error) {
    return error;
  }
}

export async function removeProjectMember(projectId, userId) {
  try {
    return await axios.delete(API_Route.projectMember(projectId, userId));
  } catch (error) {
    return error;
  }
}
