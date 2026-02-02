
import { db } from "../server/db";
import { teamMembers } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkUser() {
    const user = await db.select().from(teamMembers).where(eq(teamMembers.email, "ahmed@fazaa.com")).get();
    console.log("User details:", user);
    process.exit(0);
}

checkUser();
