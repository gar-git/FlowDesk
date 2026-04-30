import axios from '../utils/axios';
import { API_Route } from '../utils/apiRoute';

export async function listTasks() {
    try {
        return await axios.get(API_Route.getAllTasks);
    } catch (error) {
        return error;
    }
}

export async function listIncomingForwards() {
    try {
        return await axios.get(API_Route.forwardIncoming);
    } catch (error) {
        return error;
    }
}

export async function createTask(payload) {
    try {
        return await axios.post(API_Route.createTask, payload);
    } catch (error) {
        return error;
    }
}

export async function updateTask(taskId, payload) {
    try {
        return await axios.patch(API_Route.updateTask(taskId), payload);
    } catch (error) {
        return error;
    }
}

export async function deleteTask(taskId) {
    try {
        return await axios.delete(API_Route.deleteTask(taskId));
    } catch (error) {
        return error;
    }
}

export async function forwardTask(taskId, targetUserId) {
    try {
        return await axios.put(API_Route.forwardTask(taskId), {
            target_user_id: targetUserId,
        });
    } catch (error) {
        return error;
    }
}

export async function acceptForward(taskId) {
    try {
        return await axios.post(API_Route.acceptForward(taskId));
    } catch (error) {
        return error;
    }
}

export async function rejectForward(taskId) {
    try {
        return await axios.post(API_Route.rejectForward(taskId));
    } catch (error) {
        return error;
    }
}
