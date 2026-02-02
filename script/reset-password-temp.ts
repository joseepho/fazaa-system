
import { storage } from "../server/storage";
import { hashPassword } from "../server/auth";

async function resetAdminPassword() {
    const email = "admin@fazza.com";
    const newPassword = "admin123";

    try {
        const user = await storage.getTeamMemberByEmail(email);
        if (!user) {
            console.log(`User ${email} not found!`);
            return;
        }

        const hashedPassword = await hashPassword(newPassword);

        // Using updateTeamMember as confirmed in storage interface
        await storage.updateTeamMember(user.id, {
            password: hashedPassword
        });

        console.log(`Password for ${email} has been reset to: ${newPassword}`);
        console.log("Please try logging in now.");
    } catch (error) {
        console.error("Error resetting password:", error);
    }
}

resetAdminPassword();
