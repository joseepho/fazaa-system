
import { storage } from "../server/storage";

async function listUsers() {
    try {
        const users = await storage.getTeamMembers();
        console.log("Users in DB:", users);
    } catch (error) {
        console.error("Error listing users:", error);
    }
}

listUsers();
