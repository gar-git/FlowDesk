import axios from "../utils/axios";
import { API_Route } from "../utils/apiRoute";

export async function createCompany(reqData) {
  try {
    const response = await axios.post(API_Route.createCompany, reqData);
    return response;
  } catch (error) {
    return error;
  }
}

export async function getCompanyMe() {
  try {
    return await axios.get(API_Route.companyMe);
  } catch (error) {
    return error;
  }
}
